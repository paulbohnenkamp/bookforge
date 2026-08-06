import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import type { LlmProvider } from '../llm/llm-provider.js';
import { AppError, errorMessage } from '../errors/app-error.js';
import { ConsoleLogger, type Logger } from '../logging/logger.js';
import { PromptLoader } from '../loaders/prompt-loader.js';
import { BookResolver, type ResolvedChapter } from './book-resolver.js';
import { PromptContextBuilder, type PromptResources } from './prompt-context.js';
import {
  GenerationStateStore,
  type GenerationStage,
  type GenerationState,
} from './generation-state.js';
import { AtomicFileWriter } from './atomic-file-writer.js';

export interface GenerationOptions {
  bookId: string;
  chapterNumber: number;
  providerName: string;
  force?: boolean;
}

export interface GenerationResult {
  state: GenerationState;
  skipped: boolean;
}

const orderedStages: GenerationStage[] = ['writer', 'reviewer', 'rewriter', 'publisher'];

export class ChapterGenerator {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly promptLoader: PromptLoader,
    private readonly styleGuidePath: string,
    private readonly generatedDirectory: string,
    private readonly provider: LlmProvider,
    private readonly contextBuilder: PromptContextBuilder = new PromptContextBuilder(),
    private readonly fileWriter: AtomicFileWriter = new AtomicFileWriter(),
    private readonly logger: Logger = new ConsoleLogger(),
  ) {}

  public async generate(options: GenerationOptions): Promise<GenerationResult> {
    if (options.providerName !== 'mock') {
      throw new AppError(
        `Unsupported provider: ${options.providerName}`,
        'Milestone 2 supports only --provider mock.',
      );
    }

    const resolved = await this.resolver.resolve(options.bookId, options.chapterNumber);
    const chapterDirectory = path.join(
      this.generatedDirectory,
      resolved.bookId,
      'chapters',
      `${String(resolved.chapterNumber).padStart(2, '0')}-${resolved.chapter.id}`,
    );
    const stateStore = new GenerationStateStore(
      path.join(this.generatedDirectory, resolved.bookId, 'generation-state.json'),
      this.fileWriter,
    );
    const artifacts = GenerationStateStore.artifactPaths(chapterDirectory);
    const existing = await stateStore.load();

    if (!options.force && existing && (await this.isPublished(existing, resolved, artifacts))) {
      this.logger.info(`Chapter ${resolved.chapterNumber} is already published; skipping.`);
      return { state: existing, skipped: true };
    }

    if (options.force && (await this.exists(artifacts.chapter))) {
      const backupPath = path.join(
        path.dirname(artifacts.chapter),
        `chapter.backup-${this.backupTimestamp()}.md`,
      );
      await this.fileWriter.write(backupPath, await readFile(artifacts.chapter, 'utf8'));
      this.logger.info(`Backed up published chapter to ${backupPath}`);
    }

    const state = this.prepareState(
      existing,
      resolved,
      artifacts,
      options.providerName,
      options.force === true,
    );
    await stateStore.save(state);
    const resources = await this.loadResources();
    const firstIncomplete = await this.firstIncompleteStage(state, artifacts);

    try {
      if (firstIncomplete <= 0)
        await this.runWriter(state, stateStore, resolved, resources, artifacts);
      if (firstIncomplete <= 1)
        await this.runReviewer(state, stateStore, resolved, resources, artifacts);
      if (firstIncomplete <= 2)
        await this.runRewriter(state, stateStore, resolved, resources, artifacts);
      if (firstIncomplete <= 3) await this.runPublisher(state, stateStore, artifacts);
      state.status = 'published';
      state.completionTime = new Date().toISOString();
      await stateStore.save(state);
      this.logger.info(`Published chapter ${resolved.chapterNumber}: ${artifacts.chapter}`);
      return { state, skipped: false };
    } catch (error) {
      const failedStage = this.stageForStatus(state.status);
      state.status = 'failed';
      state.failedStage = failedStage;
      state.errorSummary = errorMessage(error);
      await stateStore.save(state);
      throw new AppError(
        `Chapter ${resolved.chapterNumber} failed during ${failedStage}: ${state.errorSummary}`,
        'Review generation-state.json for completed artifacts and rerun to resume.',
        { cause: error },
      );
    }
  }

  private async loadResources(): Promise<PromptResources> {
    const [styleGuide, writerPrompt, reviewerPrompt, rewriterPrompt] = await Promise.all([
      this.promptLoader.loadFile(this.styleGuidePath, 'style guide'),
      this.promptLoader.load('writer'),
      this.promptLoader.load('reviewer'),
      this.promptLoader.load('rewriter'),
    ]);
    return { styleGuide, writerPrompt, reviewerPrompt, rewriterPrompt };
  }

  private async runWriter(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    state.status = 'writing';
    await stateStore.save(state);
    const context = this.contextBuilder.buildWriterContext(
      resolved.book,
      resolved.chapter,
      resources,
    );
    const output = await this.provider.complete(this.contextBuilder.renderWriter(context));
    await this.writeStage(state, stateStore, 'writer', artifacts.draft, output);
  }

  private async runReviewer(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    state.status = 'reviewing';
    await stateStore.save(state);
    const draft = await readFile(artifacts.draft, 'utf8');
    const context = this.contextBuilder.buildReviewerContext(resolved.chapter, resources, draft);
    const output = await this.provider.complete(this.contextBuilder.renderReviewer(context));
    await this.writeStage(state, stateStore, 'reviewer', artifacts.review, output);
  }

  private async runRewriter(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    state.status = 'rewriting';
    await stateStore.save(state);
    const [draft, review] = await Promise.all([
      readFile(artifacts.draft, 'utf8'),
      readFile(artifacts.review, 'utf8'),
    ]);
    const context = this.contextBuilder.buildRewriterContext(
      resolved.chapter,
      resources,
      draft,
      review,
    );
    const output = await this.provider.complete(this.contextBuilder.renderRewriter(context));
    await this.writeStage(state, stateStore, 'rewriter', artifacts.rewritten, output);
  }

  private async runPublisher(
    state: GenerationState,
    stateStore: GenerationStateStore,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    state.status = 'publishing';
    await stateStore.save(state);
    await this.fileWriter.write(artifacts.chapter, await readFile(artifacts.rewritten, 'utf8'));
    state.completedStages = this.withCompletedStage(state.completedStages, 'publisher');
    await stateStore.save(state);
  }

  private async writeStage(
    state: GenerationState,
    stateStore: GenerationStateStore,
    stage: GenerationStage,
    filePath: string,
    output: string,
  ): Promise<void> {
    if (output.trim().length === 0) throw new AppError(`${stage} provider output was empty.`);
    await this.fileWriter.write(filePath, output);
    state.completedStages = this.withCompletedStage(state.completedStages, stage);
    await stateStore.save(state);
  }

  private prepareState(
    existing: GenerationState | undefined,
    resolved: ResolvedChapter,
    artifacts: GenerationState['artifactPaths'],
    provider: string,
    force: boolean,
  ): GenerationState {
    if (
      !force &&
      existing &&
      existing.bookId === resolved.bookId &&
      existing.chapterNumber === resolved.chapterNumber &&
      existing.chapterId === resolved.chapter.id
    ) {
      const resumed: GenerationState = {
        ...existing,
        artifactPaths: this.relativeArtifacts(artifacts),
      };
      delete resumed.errorSummary;
      delete resumed.failedStage;
      delete resumed.completionTime;
      return resumed;
    }
    return {
      bookId: resolved.bookId,
      chapterId: resolved.chapter.id,
      chapterNumber: resolved.chapterNumber,
      status: 'pending',
      completedStages: [],
      artifactPaths: this.relativeArtifacts(artifacts),
      startedAt: new Date().toISOString(),
      provider,
    };
  }

  private async firstIncompleteStage(
    state: GenerationState,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<number> {
    for (const [index, stage] of orderedStages.entries()) {
      if (
        !state.completedStages.includes(stage) ||
        !(await this.exists(this.pathForStage(stage, artifacts)))
      )
        return index;
    }
    return orderedStages.length;
  }

  private pathForStage(
    stage: GenerationStage,
    artifacts: GenerationState['artifactPaths'],
  ): string {
    return stage === 'writer'
      ? artifacts.draft
      : stage === 'reviewer'
        ? artifacts.review
        : stage === 'rewriter'
          ? artifacts.rewritten
          : artifacts.chapter;
  }

  private withCompletedStage(stages: GenerationStage[], stage: GenerationStage): GenerationStage[] {
    return stages.includes(stage) ? stages : [...stages, stage];
  }

  private async isPublished(
    state: GenerationState | undefined,
    resolved: ResolvedChapter,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<boolean> {
    return Boolean(
      state &&
      state.status === 'published' &&
      state.bookId === resolved.bookId &&
      state.chapterNumber === resolved.chapterNumber &&
      state.completedStages.includes('publisher') &&
      (await this.exists(artifacts.chapter)),
    );
  }

  private stageForStatus(status: GenerationState['status']): GenerationStage {
    if (status === 'writing') return 'writer';
    if (status === 'reviewing') return 'reviewer';
    if (status === 'rewriting') return 'rewriter';
    return 'publisher';
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private relativeArtifacts(
    artifacts: GenerationState['artifactPaths'],
  ): GenerationState['artifactPaths'] {
    return {
      draft: path.relative(this.generatedDirectory, artifacts.draft),
      review: path.relative(this.generatedDirectory, artifacts.review),
      rewritten: path.relative(this.generatedDirectory, artifacts.rewritten),
      chapter: path.relative(this.generatedDirectory, artifacts.chapter),
    };
  }

  private backupTimestamp(): string {
    return new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
  }
}
