import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';
import { ConsoleLogger, type Logger } from '../logging/logger.js';
import { BookResolver } from './book-resolver.js';
import { ChapterGenerator } from './chapter-generator.js';
import { GenerationStateStore } from './generation-state.js';
import { chapterDirectoryPath } from './paths.js';

export interface FullBookOptions {
  bookId: string;
  from?: number;
  to?: number;
  providerName: string;
  force?: boolean;
  continueOnError?: boolean;
  signal?: AbortSignal;
}

export interface FullBookChapterResult {
  chapterNumber: number;
  chapterId: string;
  outcome: 'skipped' | 'resumed' | 'generated' | 'failed';
  error?: string;
}

export interface FullBookResult {
  bookId: string;
  title: string;
  chapterResults: FullBookChapterResult[];
  failed: FullBookChapterResult[];
}

export class FullBookGenerator {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly chapterGenerator: ChapterGenerator,
    private readonly generatedDirectory: string,
    private readonly logger: Logger = new ConsoleLogger(),
  ) {}

  public async generate(options: FullBookOptions): Promise<FullBookResult> {
    const firstChapter = await this.resolver.resolve(options.bookId, 1);
    const { from, to } = this.resolveRange(
      options.from,
      options.to,
      firstChapter.book.chapters.length,
    );
    const stateStore = new GenerationStateStore(
      path.join(this.generatedDirectory, options.bookId, 'generation-state.json'),
    );
    const chapterResults: FullBookChapterResult[] = [];

    for (let chapterNumber = from; chapterNumber <= to; chapterNumber += 1) {
      const chapter = firstChapter.book.chapters[chapterNumber - 1];
      if (!chapter) throw new AppError(`Chapter ${chapterNumber} could not be resolved.`);
      try {
        const result = await this.chapterGenerator.generate({
          bookId: options.bookId,
          chapterNumber,
          providerName: options.providerName,
          ...(options.force ? { force: true } : {}),
          ...(options.signal ? { signal: options.signal } : {}),
          previousChapters: await this.previousChapters(
            firstChapter.book.chapters,
            chapterNumber,
            stateStore,
            options.bookId,
          ),
        });
        const outcome = result.skipped ? 'skipped' : result.resumed ? 'resumed' : 'generated';
        chapterResults.push({ chapterNumber, chapterId: chapter.id, outcome });
        this.logger.info(`Chapter ${chapterNumber}: ${outcome}.`);
      } catch (error) {
        const failure: FullBookChapterResult = {
          chapterNumber,
          chapterId: chapter.id,
          outcome: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };
        chapterResults.push(failure);
        this.logger.error(`Chapter ${chapterNumber}: failed. ${failure.error}`);
        if (!options.continueOnError || options.signal?.aborted) break;
      }
    }

    return {
      bookId: options.bookId,
      title: firstChapter.book.book.title,
      chapterResults,
      failed: chapterResults.filter((result) => result.outcome === 'failed'),
    };
  }

  private resolveRange(
    from: number | undefined,
    to: number | undefined,
    total: number,
  ): { from: number; to: number } {
    const start = from ?? 1;
    const end = to ?? total;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < 1 ||
      start > total ||
      end > total
    ) {
      throw new AppError(`Chapter range ${start}-${end} is outside the book's 1-${total} range.`);
    }
    if (start > end)
      throw new AppError(`Chapter range start ${start} cannot be greater than end ${end}.`);
    return { from: start, to: end };
  }

  private async previousChapters(
    chapters: Array<{ id: string; title: string; targetWords: number }>,
    currentNumber: number,
    stateStore: GenerationStateStore,
    bookId: string,
  ): Promise<Array<{ number: number; title: string; summary?: string }>> {
    const result: Array<{ number: number; title: string; summary?: string }> = [];
    for (let number = 1; number < currentNumber; number += 1) {
      const chapter = chapters[number - 1];
      if (!chapter) continue;
      const state = await stateStore.loadChapter(bookId, number);
      if (state?.status !== 'published') continue;
      const summaryPath = path.join(
        chapterDirectoryPath(this.generatedDirectory, bookId, number, chapter.id),
        'summary.md',
      );
      let summary: string | undefined;
      try {
        summary = await readFile(summaryPath, 'utf8');
      } catch {
        summary = undefined;
      }
      result.push({ number, title: chapter.title, ...(summary ? { summary } : {}) });
    }
    return result;
  }
}
