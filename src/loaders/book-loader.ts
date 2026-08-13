import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { parseBook, type Book } from '../domain/book.js';

export class BookLoader {
  public async load(filePath: string): Promise<Book> {
    try {
      const source = await readFile(filePath, 'utf8');
      return parseBook(normalizeBookDocument(yaml.load(source)));
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

/**
 * Accept the early local-spec shape that accidentally nested the configuration
 * under `book`. New specifications should keep these keys at the document
 * root, but normalizing here lets existing private books be generated without
 * silently changing their content.
 */
function normalizeBookDocument(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.book)) return value;
  const nested = value.book;
  const movableKeys = ['style', 'output', 'chapters', 'story', 'endMatter'] as const;
  const hasNestedConfiguration = movableKeys.some((key) => key in nested);
  if (!hasNestedConfiguration) return value;

  const {
    style: nestedStyle,
    output: nestedOutput,
    chapters: nestedChapters,
    story: nestedStory,
    endMatter: nestedEndMatter,
    ...bookMetadata
  } = nested;
  const nestedValues: Record<(typeof movableKeys)[number], unknown> = {
    style: nestedStyle,
    output: nestedOutput,
    chapters: nestedChapters,
    story: nestedStory,
    endMatter: nestedEndMatter,
  };
  const normalized: Record<string, unknown> = { ...value, book: bookMetadata };
  for (const key of movableKeys) {
    if (!(key in normalized) && nestedValues[key] !== undefined)
      normalized[key] = nestedValues[key];
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
