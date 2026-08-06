import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { BookResolver } from './book-resolver.js';
import type { Book } from '../domain/book.js';
import { GenerationStateStore, type GenerationState } from './generation-state.js';
import { chapterDirectoryPath, chapterDirectoryName } from './paths.js';

export interface AssemblyOptions {
  bookId: string;
  allowIncomplete?: boolean;
}

export interface AssemblyResult {
  bookId: string;
  publishedChapters: number[];
  missingChapters: number[];
  readmePath: string;
  tableOfContentsPath: string;
  combinedPath: string;
}

export class BookAssembler {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
    private readonly writer: AtomicFileWriter = new AtomicFileWriter(),
  ) {}

  public async assemble(options: AssemblyOptions): Promise<AssemblyResult> {
    const resolved = await this.resolver.resolve(options.bookId, 1);
    const bookDirectory = path.join(this.generatedDirectory, options.bookId);
    const stateStore = new GenerationStateStore(path.join(bookDirectory, 'generation-state.json'));
    const bookState = await stateStore.loadBook(options.bookId);
    const published: Array<{ number: number; id: string; title: string; content: string }> = [];
    const missing: number[] = [];

    for (let number = 1; number <= resolved.book.chapters.length; number += 1) {
      const chapter = resolved.book.chapters[number - 1];
      if (!chapter) continue;
      const state = bookState.chapters[String(number)];
      const chapterPath = path.join(
        chapterDirectoryPath(this.generatedDirectory, options.bookId, number, chapter.id),
        'chapter.md',
      );
      if (state?.status === 'published' && (await this.exists(chapterPath))) {
        published.push({
          number,
          id: chapter.id,
          title: chapter.title,
          content: await readFile(chapterPath, 'utf8'),
        });
      } else {
        missing.push(number);
      }
    }

    if (missing.length > 0 && !options.allowIncomplete) {
      throw new AppError(
        `Cannot assemble book '${options.bookId}': missing published chapters ${missing.join(', ')}.`,
        'Generate the missing chapters or use --allow-incomplete.',
      );
    }

    const tableOfContents = this.renderTableOfContents(published);
    const combined = this.renderCombined(
      resolved.book,
      tableOfContents,
      published,
      missing.length > 0,
    );
    const readme = this.renderReadme(resolved.book, bookState.chapters, missing.length === 0);
    const tableOfContentsPath = path.join(bookDirectory, 'TABLE_OF_CONTENTS.md');
    const combinedPath = path.join(bookDirectory, 'combined.md');
    const readmePath = path.join(bookDirectory, 'README.md');
    await this.writer.write(tableOfContentsPath, tableOfContents);
    await this.writer.write(combinedPath, combined);
    await this.writer.write(readmePath, readme);
    return {
      bookId: options.bookId,
      publishedChapters: published.map((chapter) => chapter.number),
      missingChapters: missing,
      readmePath,
      tableOfContentsPath,
      combinedPath,
    };
  }

  private renderTableOfContents(
    chapters: Array<{ number: number; id: string; title: string }>,
  ): string {
    const lines = chapters.map(
      (chapter) =>
        `${chapter.number}. [${chapter.title}](chapters/${chapterDirectoryName(chapter.number, chapter.id)}.md)`,
    );
    return `# Table of Contents\n\n${lines.join('\n')}\n`;
  }

  private renderCombined(
    book: Book,
    tableOfContents: string,
    chapters: Array<{ number: number; id: string; title: string; content: string }>,
    incomplete: boolean,
  ): string {
    const metadata = [
      `# ${book.book.title}`,
      book.book.subtitle ? `\n${book.book.subtitle}` : '',
      book.book.audience?.length ? `\nAudience: ${book.book.audience.join(', ')}` : '',
      incomplete
        ? '\n> **Incomplete publication:** some configured chapters are not yet published.'
        : '',
      `\n${tableOfContents.trim()}`,
    ].join('');
    const chapterContent = chapters
      .map((chapter) => `\n\n---\n\n${chapter.content.trim()}`)
      .join('');
    return `${metadata}${chapterContent}\n`;
  }

  private renderReadme(
    book: Book,
    states: Record<string, GenerationState>,
    complete: boolean,
  ): string {
    const providers =
      [...new Set(Object.values(states).map((state) => state.provider))].join(', ') || 'unknown';
    const models =
      [
        ...new Set(
          Object.values(states).flatMap((state) =>
            Object.values(state.usage ?? {}).flatMap((usage) =>
              usage?.model ? [usage.model] : [],
            ),
          ),
        ),
      ].join(', ') || 'not recorded';
    return `# ${book.book.title}\n\n${book.book.subtitle ? `${book.book.subtitle}\n\n` : ''}Generated: ${new Date().toISOString()}\nCompletion status: ${complete ? 'complete' : 'incomplete'}\nProviders: ${providers}\nModels: ${models}\n\n> Human review is required. Generated technical content is not authoritative solely because it passed the generation pipeline.\n\nRead individual chapters under \`chapters/\`, or read \`combined.md\` for the assembled book.\n`;
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
