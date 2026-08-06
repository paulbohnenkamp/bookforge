import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { AppError } from '../errors/app-error.js';
import { parseBook, type Book } from '../domain/book.js';

export class BookLoader {
  public async load(filePath: string): Promise<Book> {
    try {
      const source = await readFile(filePath, 'utf8');
      return parseBook(yaml.load(source));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Could not load book specification: ${filePath}`,
        'Check that the file exists and matches the documented YAML structure.',
        { cause: error },
      );
    }
  }
}
