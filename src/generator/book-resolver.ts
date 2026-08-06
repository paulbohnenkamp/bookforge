import path from 'node:path';
import { AppError } from '../errors/app-error.js';
import { type Book, type Chapter } from '../domain/book.js';
import { BookLoader } from '../loaders/book-loader.js';

export interface ResolvedChapter {
  book: Book;
  chapter: Chapter;
  bookId: string;
  chapterNumber: number;
  specificationPath: string;
}

export class BookResolver {
  public constructor(
    private readonly booksDirectory: string,
    private readonly bookLoader: BookLoader = new BookLoader(),
  ) {}

  public async resolve(bookId: string, chapterNumber: number): Promise<ResolvedChapter> {
    if (!/^[-a-zA-Z0-9_]+$/.test(bookId)) {
      throw new AppError(
        `Invalid book ID: ${bookId}`,
        'Use the directory name under the books directory.',
      );
    }

    const specificationPath = path.join(this.booksDirectory, bookId, 'book.yaml');
    let book: Book;
    try {
      book = await this.bookLoader.load(specificationPath);
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(
          `Book '${bookId}' does not exist or is invalid.`,
          `Check ${specificationPath} and its YAML contents.`,
          { cause: error },
        );
      }
      throw error;
    }

    if (
      !Number.isInteger(chapterNumber) ||
      chapterNumber < 1 ||
      chapterNumber > book.chapters.length
    ) {
      throw new AppError(
        `Chapter ${chapterNumber} does not exist in book '${bookId}'.`,
        `Choose a chapter number from 1 to ${book.chapters.length}.`,
      );
    }

    const chapter = book.chapters[chapterNumber - 1];
    if (!chapter) throw new AppError(`Chapter ${chapterNumber} could not be resolved.`);

    return { book, chapter, bookId, chapterNumber, specificationPath };
  }
}
