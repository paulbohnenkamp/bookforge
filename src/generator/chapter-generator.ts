import path from 'node:path';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import type { LlmCompletion, LlmProvider, LlmRequest, UsageMetadata } from '../llm/llm-provider.js';
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
import { chapterDirectoryPath } from './paths.js';
import { QualityValidator } from '../quality/quality-validator.js';

export interface GenerationOptions {
  bookId: string;
  chapterNumber: number;
  providerName: string;
  force?: boolean;
  signal?: AbortSignal;
  previousChapters?: Array<{ number: number; title: string; summary?: string }>;
}

export interface GenerationResult {
  state: GenerationState;
  skipped: boolean;
  resumed: boolean;
}

const orderedStages: GenerationStage[] = [
  'writer',
  'reviewer',
  'rewriter',
  'validator',
  'publisher',
];

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
    private readonly qualityValidator: QualityValidator = new QualityValidator(),
  ) {}

  public async generate(options: GenerationOptions): Promise<GenerationResult> {
    const resolved = await this.resolver.resolve(options.bookId, options.chapterNumber);
    const chapterDirectory = chapterDirectoryPath(
      this.generatedDirectory,
      resolved.bookId,
      resolved.chapterNumber,
      resolved.chapter.id,
    );
    const stateStore = new GenerationStateStore(
      path.join(this.generatedDirectory, resolved.bookId, 'generation-state.json'),
      this.fileWriter,
    );
    const artifacts = GenerationStateStore.artifactPaths(chapterDirectory);
    const existing = await stateStore.loadChapter(resolved.bookId, resolved.chapterNumber);
    if (
      existing?.status === 'approved' &&
      existing.approval &&
      (await this.exists(artifacts.chapter))
    ) {
      const currentHash = createHash('sha256')
        .update(await readFile(artifacts.chapter, 'utf8'))
        .digest('hex');
      if (currentHash !== existing.approval.chapterHash) {
        existing.status = 'needs_review';
        delete existing.approval;
        await stateStore.save(existing);
      }
    }

    if (!options.force && existing && (await this.isComplete(existing, resolved, artifacts))) {
      this.logger.info(
        `Chapter ${resolved.chapterNumber} is already ${existing.status}; skipping.`,
      );
      return { state: existing, skipped: true, resumed: false };
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
    const resources = await this.loadResources(options.bookId);
    const firstIncomplete = await this.firstIncompleteStage(state, artifacts);
    const resumed = Boolean(existing && firstIncomplete > 0 && !options.force);

    try {
      if (firstIncomplete <= 0)
        await this.runWriter(
          state,
          stateStore,
          resolved,
          resources,
          artifacts,
          options.signal,
          options.previousChapters ?? [],
        );
      if (firstIncomplete <= 1)
        await this.runReviewer(
          state,
          stateStore,
          resolved,
          resources,
          artifacts,
          options.signal,
          options.previousChapters ?? [],
        );
      if (firstIncomplete <= 2)
        await this.runRewriter(
          state,
          stateStore,
          resolved,
          resources,
          artifacts,
          options.signal,
          options.previousChapters ?? [],
        );
      if (firstIncomplete <= 3)
        await this.runPublisher(state, stateStore, resolved.book, resolved.chapter, artifacts);
      await this.ensureSummary(state, stateStore, resolved.chapter, artifacts);
      state.status = 'needs_review';
      state.completionTime = new Date().toISOString();
      await stateStore.save(state);
      this.logger.info(
        `Chapter ${resolved.chapterNumber} needs human review: ${artifacts.chapter}`,
      );
      return { state, skipped: false, resumed };
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

  private async loadResources(bookId: string): Promise<PromptResources> {
    const [styleGuide, writerPrompt, reviewerPrompt, rewriterPrompt] = await Promise.all([
      this.promptLoader.loadFile(this.styleGuidePath, 'style guide'),
      this.promptLoader.load('writer'),
      this.promptLoader.load('reviewer'),
      this.promptLoader.load('rewriter'),
    ]);
    const bookPrompt = await this.promptLoader.loadOptional(bookId);
    return {
      styleGuide,
      writerPrompt,
      reviewerPrompt,
      rewriterPrompt,
      ...(bookPrompt ? { bookPrompt } : {}),
    };
  }

  private async runWriter(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
    signal: AbortSignal | undefined,
    previousChapters: Array<{ number: number; title: string; summary?: string }>,
  ): Promise<void> {
    state.status = 'writing';
    await stateStore.save(state);
    this.throwIfAborted(signal);
    const context = this.contextBuilder.buildWriterContext(
      resolved.book,
      resolved.chapter,
      resources,
      previousChapters,
    );
    const completion = await this.complete({
      prompt: this.contextBuilder.renderWriter(context),
      systemInstruction:
        'Write one complete technical-book chapter in Markdown. Follow the supplied style guide.',
      ...(signal ? { signal } : {}),
    });
    this.recordUsage(state, 'writer', completion.usage);
    await this.writeStage(state, stateStore, 'writer', artifacts.draft, completion.text);
  }

  private async runReviewer(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
    signal: AbortSignal | undefined,
    previousChapters: Array<{ number: number; title: string; summary?: string }>,
  ): Promise<void> {
    state.status = 'reviewing';
    await stateStore.save(state);
    this.throwIfAborted(signal);
    const draft = await readFile(artifacts.draft, 'utf8');
    const context = this.contextBuilder.buildReviewerContext(
      resolved.book,
      resolved.chapter,
      resources,
      draft,
      previousChapters,
    );
    const completion = await this.complete({
      prompt: this.contextBuilder.renderReviewer(context),
      systemInstruction:
        'Review the supplied chapter draft. Return only specific strengths, weaknesses, missing topics, incorrect statements, and suggested improvements.',
      ...(signal ? { signal } : {}),
    });
    this.recordUsage(state, 'reviewer', completion.usage);
    await this.writeStage(state, stateStore, 'reviewer', artifacts.review, completion.text);
  }

  private async runRewriter(
    state: GenerationState,
    stateStore: GenerationStateStore,
    resolved: ResolvedChapter,
    resources: PromptResources,
    artifacts: GenerationState['artifactPaths'],
    signal: AbortSignal | undefined,
    previousChapters: Array<{ number: number; title: string; summary?: string }>,
  ): Promise<void> {
    state.status = 'rewriting';
    await stateStore.save(state);
    this.throwIfAborted(signal);
    const [draft, review] = await Promise.all([
      readFile(artifacts.draft, 'utf8'),
      readFile(artifacts.review, 'utf8'),
    ]);
    const context = this.contextBuilder.buildRewriterContext(
      resolved.book,
      resolved.chapter,
      resources,
      draft,
      review,
      previousChapters,
    );
    const completion = await this.complete({
      prompt: this.contextBuilder.renderRewriter(context),
      systemInstruction:
        'Rewrite the chapter using the review feedback. Return the complete final chapter as Markdown.',
      ...(signal ? { signal } : {}),
    });
    this.recordUsage(state, 'rewriter', completion.usage);
    await this.writeStage(state, stateStore, 'rewriter', artifacts.rewritten, completion.text);
  }

  private async runPublisher(
    state: GenerationState,
    stateStore: GenerationStateStore,
    book: ResolvedChapter['book'],
    chapter: ResolvedChapter['chapter'],
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    state.status = 'validating';
    await stateStore.save(state);
    const rewritten = await readFile(artifacts.rewritten, 'utf8');
    const report = await this.qualityValidator.validate(
      book,
      chapter,
      state.chapterNumber,
      state.bookId,
      rewritten,
      await readFile(artifacts.review, 'utf8'),
    );
    await this.fileWriter.write(
      artifacts.qualityReportJson,
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await this.fileWriter.write(
      artifacts.qualityReportMarkdown,
      this.qualityValidator.renderMarkdown(report),
    );
    state.qualityVerdict = report.verdict;
    if (report.summary.errors > 0)
      throw new AppError(
        'Automated quality validation found blocking errors.',
        'Review quality-report.md and correct or regenerate the chapter.',
      );
    await this.fileWriter.write(artifacts.chapter, rewritten);
    state.status = 'needs_review';
    state.completedStages = this.withCompletedStage(state.completedStages, 'validator');
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

  private async ensureSummary(
    state: GenerationState,
    stateStore: GenerationStateStore,
    chapter: ResolvedChapter['chapter'],
    artifacts: GenerationState['artifactPaths'],
  ): Promise<void> {
    const concepts = chapter.topics ?? chapter.objectives ?? [];
    const canonical = chapter.canonicalExample;
    const summary = [
      `# ${chapter.title}`,
      '',
      `## Purpose\n${chapter.objectives?.join(' ') ?? `This chapter provides practical guidance for ${chapter.title}.`}`,
      '',
      `## Concepts Introduced\n${concepts.length > 0 ? concepts.map((item) => `- ${item}`).join('\n') : '- No explicit concepts were configured.'}`,
      '',
      `## Terminology and Examples\n${canonical ? `Canonical example: **${canonical.name}**. Entities: ${(canonical.entities ?? []).join(', ') || 'not specified'}.` : 'No canonical example was configured.'}`,
      '',
      `## Assumptions\n${canonical?.constraints?.map((item) => `- ${item}`).join('\n') || '- Use the book style guide and chapter specification as the editorial contract.'}`,
      '',
      `## Deferred Topics\n${chapter.topicsToAvoid?.map((item) => `- ${item}`).join('\n') || '- None specified.'}`,
      '',
      '## Continuity Risks\n- Keep terminology and canonical example APIs stable in later chapters.\n- Recheck version-specific claims and code examples during human review.',
      '',
    ].join('\n');
    await this.fileWriter.write(artifacts.summary, summary);
    await this.fileWriter.write(
      artifacts.summaryJson,
      `${JSON.stringify({ chapterId: chapter.id, title: chapter.title, purpose: chapter.objectives ?? [], concepts, terminology: canonical?.entities ?? [], canonicalExample: canonical ?? null, assumptions: canonical?.constraints ?? [], deferred: chapter.topicsToAvoid ?? [], continuityRisks: ['Keep terminology and canonical example APIs stable in later chapters.', 'Recheck version-specific claims and code examples during human review.'] }, null, 2)}\n`,
    );
    const published = await readFile(artifacts.chapter, 'utf8');
    state.publishedChecksum = createHash('sha256').update(published).digest('hex');
    await stateStore.save(state);
  }

  private async complete(request: LlmRequest): Promise<LlmCompletion> {
    if (this.provider.completeWithMetadata) return this.provider.completeWithMetadata(request);
    return { text: await this.provider.complete(request.prompt) };
  }

  private recordUsage(
    state: GenerationState,
    stage: GenerationStage,
    usage: UsageMetadata | undefined,
  ): void {
    if (!usage) return;
    state.usage = { ...state.usage, [stage]: usage };
    const totals = Object.values(state.usage).reduce(
      (total, current) => ({
        inputTokens: (total.inputTokens ?? 0) + (current?.inputTokens ?? 0),
        outputTokens: (total.outputTokens ?? 0) + (current?.outputTokens ?? 0),
        totalTokens: (total.totalTokens ?? 0) + (current?.totalTokens ?? 0),
      }),
      {},
    );
    state.totalUsage = {
      ...(totals.inputTokens ? { inputTokens: totals.inputTokens } : {}),
      ...(totals.outputTokens ? { outputTokens: totals.outputTokens } : {}),
      ...(totals.totalTokens ? { totalTokens: totals.totalTokens } : {}),
    };
  }

  private throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) {
      throw new AppError(
        'Chapter generation was interrupted.',
        'Rerun the command to resume completed stages.',
      );
    }
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
        (stage === 'validator'
          ? !(await this.isFreshQualityReport(artifacts))
          : !(await this.exists(this.pathForStage(stage, artifacts))))
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
          : stage === 'validator'
            ? artifacts.qualityReportJson
            : artifacts.chapter;
  }

  private withCompletedStage(stages: GenerationStage[], stage: GenerationStage): GenerationStage[] {
    return stages.includes(stage) ? stages : [...stages, stage];
  }

  private async isComplete(
    state: GenerationState | undefined,
    resolved: ResolvedChapter,
    artifacts: GenerationState['artifactPaths'],
  ): Promise<boolean> {
    return Boolean(
      state &&
      (state.status === 'needs_review' || state.status === 'approved') &&
      state.bookId === resolved.bookId &&
      state.chapterNumber === resolved.chapterNumber &&
      state.completedStages.includes('publisher') &&
      (await this.exists(artifacts.chapter)) &&
      (await this.exists(artifacts.summary)) &&
      (await this.isFreshQualityReport(artifacts)),
    );
  }

  private stageForStatus(status: GenerationState['status']): GenerationStage {
    if (status === 'pending') return 'writer';
    if (status === 'writing') return 'writer';
    if (status === 'reviewing') return 'reviewer';
    if (status === 'rewriting') return 'rewriter';
    if (status === 'validating') return 'validator';
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

  private async isFreshQualityReport(
    artifacts: GenerationState['artifactPaths'],
  ): Promise<boolean> {
    try {
      const report = JSON.parse(await readFile(artifacts.qualityReportJson, 'utf8')) as {
        chapterHash?: string;
      };
      const chapter = await readFile(artifacts.chapter, 'utf8');
      return report.chapterHash === createHash('sha256').update(chapter).digest('hex');
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
      summary: path.relative(this.generatedDirectory, artifacts.summary),
      summaryJson: path.relative(this.generatedDirectory, artifacts.summaryJson),
      qualityReportJson: path.relative(this.generatedDirectory, artifacts.qualityReportJson),
      qualityReportMarkdown: path.relative(
        this.generatedDirectory,
        artifacts.qualityReportMarkdown,
      ),
    };
  }

  private backupTimestamp(): string {
    return new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
  }
}
