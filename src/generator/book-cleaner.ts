import path from 'node:path';
import { createHash } from 'node:crypto';
import { access, readFile, rm } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';
import { BookResolver } from './book-resolver.js';
import { GenerationStateStore, type GenerationState } from './generation-state.js';
import { chapterDirectoryPath } from './paths.js';

export interface CleanOptions {
  bookId: string;
  chapterNumber?: number;
  all?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export interface CleanResult {
  removed: string[];
  dryRun: boolean;
}

export class BookCleaner {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
  ) {}

  public async clean(options: CleanOptions): Promise<CleanResult> {
    if ((options.chapterNumber === undefined) === (options.all !== true)) {
      throw new AppError(
        'Clean requires exactly one explicit target: --chapter <number> or --all.',
      );
    }
    const resolved = await this.resolver.resolve(options.bookId, options.chapterNumber ?? 1);
    const bookDirectory = path.join(this.generatedDirectory, options.bookId);
    const stateStore = new GenerationStateStore(path.join(bookDirectory, 'generation-state.json'));
    const bookState = await stateStore.loadBook(options.bookId);

    if (options.all) {
      const states = Object.values(bookState.chapters);
      if (!options.force) {
        for (const state of states) await this.assertSafePublishedChapter(state);
      }
      const removed = [bookDirectory];
      if (!options.dryRun) await rm(bookDirectory, { recursive: true, force: true });
      return { removed, dryRun: options.dryRun === true };
    }

    const chapterNumber = options.chapterNumber as number;
    const chapter = resolved.book.chapters[chapterNumber - 1];
    if (!chapter) throw new AppError(`Chapter ${chapterNumber} could not be resolved.`);
    const state = bookState.chapters[String(chapterNumber)];
    if (state && !options.force) await this.assertSafePublishedChapter(state);
    const chapterDirectory = chapterDirectoryPath(
      this.generatedDirectory,
      options.bookId,
      chapterNumber,
      chapter.id,
    );
    const removed = [
      chapterDirectory,
      path.join(bookDirectory, 'README.md'),
      path.join(bookDirectory, 'TABLE_OF_CONTENTS.md'),
      path.join(bookDirectory, 'combined.md'),
      path.join(bookDirectory, 'exports'),
    ];
    if (!options.dryRun) {
      await rm(chapterDirectory, { recursive: true, force: true });
      await stateStore.removeChapter(options.bookId, chapterNumber);
      for (const filePath of removed.slice(1)) await rm(filePath, { recursive: true, force: true });
    }
    return { removed, dryRun: options.dryRun === true };
  }

  private async assertSafePublishedChapter(state: GenerationState): Promise<void> {
    if (state.status !== 'published') return;
    const chapterPath = path.join(this.generatedDirectory, state.artifactPaths.chapter);
    if (!(await this.exists(chapterPath))) return;
    if (!state.publishedChecksum) {
      throw new AppError(
        `Refusing to remove published chapter ${state.chapterNumber}: no original checksum is available.`,
        'Use --force to explicitly remove it.',
      );
    }
    const current = await readFile(chapterPath, 'utf8');
    const checksum = createHash('sha256').update(current).digest('hex');
    if (checksum !== state.publishedChecksum) {
      throw new AppError(
        `Refusing to remove published chapter ${state.chapterNumber}: it appears to have been manually modified.`,
        'Use --force to explicitly remove it.',
      );
    }
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
