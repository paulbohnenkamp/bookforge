import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { AppError } from '../errors/app-error.js';
import type { UsageMetadata } from '../llm/llm-provider.js';

export type GenerationStatus =
  'pending' | 'writing' | 'reviewing' | 'rewriting' | 'publishing' | 'published' | 'failed';

export type GenerationStage = 'writer' | 'reviewer' | 'rewriter' | 'publisher';

export interface GenerationArtifacts {
  draft: string;
  review: string;
  rewritten: string;
  chapter: string;
  summary: string;
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
  usage?: Partial<Record<GenerationStage, UsageMetadata>>;
  totalUsage?: UsageMetadata;
  publishedChecksum?: string;
  failedStage?: GenerationStage;
  errorSummary?: string;
}

export interface BookGenerationState {
  bookId: string;
  updatedAt: string;
  chapters: Record<string, GenerationState>;
}

type StoredGenerationState = GenerationState & {
  chapters?: Record<string, GenerationState>;
  updatedAt?: string;
};

export class GenerationStateStore {
  public constructor(
    private readonly statePath: string,
    private readonly writer: AtomicFileWriter = new AtomicFileWriter(),
  ) {}

  public async loadChapter(
    bookId: string,
    chapterNumber: number,
  ): Promise<GenerationState | undefined> {
    const stored = await this.readStoredState();
    if (!stored) return undefined;
    if (stored.chapters?.[String(chapterNumber)]) return stored.chapters[String(chapterNumber)];
    return stored.bookId === bookId && stored.chapterNumber === chapterNumber ? stored : undefined;
  }

  public async loadBook(bookId: string): Promise<BookGenerationState> {
    const stored = await this.readStoredState();
    if (!stored) return { bookId, updatedAt: new Date(0).toISOString(), chapters: {} };
    if (stored.chapters) {
      return {
        bookId: stored.bookId,
        updatedAt: stored.updatedAt ?? new Date(0).toISOString(),
        chapters: stored.chapters,
      };
    }
    if (stored.bookId && stored.chapterNumber) {
      return {
        bookId: stored.bookId,
        updatedAt: stored.updatedAt ?? stored.completionTime ?? stored.startedAt,
        chapters: { [String(stored.chapterNumber)]: stored },
      };
    }
    return { bookId, updatedAt: new Date(0).toISOString(), chapters: {} };
  }

  private async readStoredState(): Promise<StoredGenerationState | undefined> {
    try {
      await access(this.statePath);
      const raw = await readFile(this.statePath, 'utf8');
      return JSON.parse(raw) as StoredGenerationState;
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') return undefined;
      throw new AppError(`Could not read generation state: ${this.statePath}`, undefined, {
        cause: error,
      });
    }
  }

  public async save(state: GenerationState): Promise<void> {
    const existing = await this.readStoredState();
    const chapters = existing?.chapters ?? {};
    if (existing && !existing.chapters && existing.chapterNumber) {
      chapters[String(existing.chapterNumber)] = existing;
    }
    chapters[String(state.chapterNumber)] = state;
    const stored = { ...state, updatedAt: new Date().toISOString(), chapters };
    await this.writer.write(this.statePath, `${JSON.stringify(stored, null, 2)}\n`);
  }

  public async removeChapter(bookId: string, chapterNumber: number): Promise<void> {
    const current = await this.loadBook(bookId);
    const chapterKey = String(chapterNumber);
    current.chapters = Object.fromEntries(
      Object.entries(current.chapters).filter(([key]) => key !== chapterKey),
    );
    await this.writer.write(
      this.statePath,
      `${JSON.stringify({ ...current, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
  }

  public static artifactPaths(chapterDirectory: string): GenerationArtifacts {
    return {
      draft: path.join(chapterDirectory, 'draft.md'),
      review: path.join(chapterDirectory, 'review.md'),
      rewritten: path.join(chapterDirectory, 'rewritten.md'),
      chapter: path.join(chapterDirectory, 'chapter.md'),
      summary: path.join(chapterDirectory, 'summary.md'),
    };
  }
}
