import path from 'node:path';
import { access } from 'node:fs/promises';
import { BookResolver } from './book-resolver.js';
import { GenerationStateStore } from './generation-state.js';
import { chapterDirectoryPath } from './paths.js';

export interface ChapterStatus {
  number: number;
  id: string;
  title: string;
  status: string;
  provider?: string;
  latestGeneration?: string;
  error?: string;
}

export interface BookStatus {
  bookId: string;
  title: string;
  totalChapters: number;
  publishedChapters: number;
  incompleteChapters: number;
  failedChapters: number;
  chapters: ChapterStatus[];
  totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  generatedDirectory: string;
  latestGeneration?: string;
}

export class BookStatusReporter {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
  ) {}

  public async getStatus(bookId: string): Promise<BookStatus> {
    const resolved = await this.resolver.resolve(bookId, 1);
    const stateStore = new GenerationStateStore(
      path.join(this.generatedDirectory, bookId, 'generation-state.json'),
    );
    const bookState = await stateStore.loadBook(bookId);
    const chapters: ChapterStatus[] = [];
    for (let number = 1; number <= resolved.book.chapters.length; number += 1) {
      const chapter = resolved.book.chapters[number - 1];
      if (!chapter) continue;
      const state = bookState.chapters[String(number)];
      const published =
        state?.status === 'published' &&
        (await this.exists(
          path.join(
            chapterDirectoryPath(this.generatedDirectory, bookId, number, chapter.id),
            'chapter.md',
          ),
        ));
      chapters.push({
        number,
        id: chapter.id,
        title: chapter.title,
        status: published ? 'published' : (state?.status ?? 'incomplete'),
        ...(state?.provider ? { provider: state.provider } : {}),
        ...(state?.completionTime || state?.startedAt
          ? { latestGeneration: state.completionTime ?? state.startedAt }
          : {}),
        ...(state?.errorSummary ? { error: state.errorSummary } : {}),
      });
    }
    const usages = Object.values(bookState.chapters).flatMap((state) =>
      state.totalUsage ? [state.totalUsage] : [],
    );
    const totalUsage = usages.reduce<{
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    }>(
      (total, usage) => ({
        inputTokens: total.inputTokens + (usage.inputTokens ?? 0),
        outputTokens: total.outputTokens + (usage.outputTokens ?? 0),
        totalTokens: total.totalTokens + (usage.totalTokens ?? 0),
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    );
    return {
      bookId,
      title: resolved.book.book.title,
      totalChapters: chapters.length,
      publishedChapters: chapters.filter((chapter) => chapter.status === 'published').length,
      incompleteChapters: chapters.filter(
        (chapter) => chapter.status !== 'published' && chapter.status !== 'failed',
      ).length,
      failedChapters: chapters.filter((chapter) => chapter.status === 'failed').length,
      chapters,
      totalUsage,
      generatedDirectory: path.join(this.generatedDirectory, bookId),
      ...(bookState.updatedAt !== new Date(0).toISOString()
        ? { latestGeneration: bookState.updatedAt }
        : {}),
    };
  }

  public render(status: BookStatus): string {
    const lines = [
      `Book: ${status.title} (${status.bookId})`,
      `Chapters: ${status.publishedChapters}/${status.totalChapters} published; ${status.incompleteChapters} incomplete; ${status.failedChapters} failed`,
      `Generated directory: ${status.generatedDirectory}`,
      `Overall usage: ${status.totalUsage.totalTokens} tokens (${status.totalUsage.inputTokens} input, ${status.totalUsage.outputTokens} output)`,
      `Latest generation: ${status.latestGeneration ?? 'not recorded'}`,
      '',
      'Chapter status:',
      ...status.chapters.map(
        (chapter) =>
          `  ${chapter.number}. ${chapter.title}: ${chapter.status}${chapter.error ? ` — ${chapter.error}` : ''}`,
      ),
    ];
    return `${lines.join('\n')}\n`;
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
