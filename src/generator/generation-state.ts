import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { AppError } from '../errors/app-error.js';

export type GenerationStatus =
  'pending' | 'writing' | 'reviewing' | 'rewriting' | 'publishing' | 'published' | 'failed';

export type GenerationStage = 'writer' | 'reviewer' | 'rewriter' | 'publisher';

export interface GenerationArtifacts {
  draft: string;
  review: string;
  rewritten: string;
  chapter: string;
}

export interface GenerationState {
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  status: GenerationStatus;
  completedStages: GenerationStage[];
  artifactPaths: GenerationArtifacts;
  startedAt: string;
  completionTime?: string;
  provider: string;
  failedStage?: GenerationStage;
  errorSummary?: string;
}

export class GenerationStateStore {
  public constructor(
    private readonly statePath: string,
    private readonly writer: AtomicFileWriter = new AtomicFileWriter(),
  ) {}

  public async load(): Promise<GenerationState | undefined> {
    try {
      await access(this.statePath);
      const raw = await readFile(this.statePath, 'utf8');
      return JSON.parse(raw) as GenerationState;
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') return undefined;
      throw new AppError(`Could not read generation state: ${this.statePath}`, undefined, {
        cause: error,
      });
    }
  }

  public async save(state: GenerationState): Promise<void> {
    await this.writer.write(this.statePath, `${JSON.stringify(state, null, 2)}\n`);
  }

  public static artifactPaths(chapterDirectory: string): GenerationArtifacts {
    return {
      draft: path.join(chapterDirectory, 'draft.md'),
      review: path.join(chapterDirectory, 'review.md'),
      rewritten: path.join(chapterDirectory, 'rewritten.md'),
      chapter: path.join(chapterDirectory, 'chapter.md'),
    };
  }
}
