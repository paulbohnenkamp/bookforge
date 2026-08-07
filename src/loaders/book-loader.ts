import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { parseBook, type Book } from '../domain/book.js';

export class BookLoader {
  public async load(filePath: string): Promise<Book> {
    try {
      const source = await readFile(filePath, 'utf8');
      return parseBook(yaml.load(source));
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof yaml.YAMLException) {
        const line = error.mark ? error.mark.line + 1 : undefined;
        const column = error.mark ? error.mark.column + 1 : undefined;
        const location = line === undefined ? '' : ` at line ${line}, column ${column}`;
        throw new AppError(
          `Invalid YAML in book specification: ${filePath}${location}. ${error.reason}`,
          'Fix the YAML syntax near the reported line and run validate again.',
          { cause: error },
        );
      }
      if (error instanceof ZodError) {
        const details = error.issues
          .map((issue) => `- ${formatPath(issue.path)}: ${issue.message}`)
          .join('\n');
        throw new AppError(
          `Book specification validation failed: ${filePath}\n${details}`,
          'Add or correct the reported fields, then run validate again.',
          { cause: error },
        );
      }
      if (isNodeError(error) && error.code === 'ENOENT') {
        throw new AppError(
          `Book specification not found: ${filePath}`,
          'Create the file at this path or pass the correct book.yaml path.',
          { cause: error },
        );
      }
      throw new AppError(
        `Could not read book specification: ${filePath}`,
        'Check the file permissions and ensure the path points to a readable book.yaml file.',
        { cause: error },
      );
    }
  }
}

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') return `${result}[${segment}]`;
    const name = String(segment);
    return result.length === 0 ? name : `${result}.${name}`;
  }, '');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && typeof error.code === 'string';
}
