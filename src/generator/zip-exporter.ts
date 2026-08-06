import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ZipArchive } from 'archiver';
import { AppError } from '../errors/app-error.js';
import { BookResolver } from './book-resolver.js';
import { GenerationStateStore } from './generation-state.js';
import { chapterDirectoryPath, filesystemSlug } from './paths.js';

export interface ZipExportOptions {
  bookId: string;
  title: string;
  includeNeedsReview?: boolean;
  from?: number;
  to?: number;
}

export interface ZipExportResult {
  archivePath: string;
  entries: string[];
}

export class ZipExporter {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
  ) {}

  public async export(options: ZipExportOptions): Promise<ZipExportResult> {
    const resolved = await this.resolver.resolve(options.bookId, 1);
    const bookDirectory = path.join(this.generatedDirectory, options.bookId);
    const stateStore = new GenerationStateStore(path.join(bookDirectory, 'generation-state.json'));
    const states = await stateStore.loadBook(options.bookId);
    const range = this.resolveRange(options.from, options.to, resolved.book.chapters.length);
    const sourceFiles = [
      { path: path.join(bookDirectory, 'README.md'), entry: 'README.md' },
      { path: path.join(bookDirectory, 'TABLE_OF_CONTENTS.md'), entry: 'TABLE_OF_CONTENTS.md' },
      { path: path.join(bookDirectory, 'combined.md'), entry: 'combined.md' },
    ];
    const entries = sourceFiles.map((file) => file.entry);
    for (const file of sourceFiles) await this.requireFile(file.path, file.entry);

    for (let number = range.from; number <= range.to; number += 1) {
      const chapter = resolved.book.chapters[number - 1];
      if (!chapter) continue;
      const state = states.chapters[String(number)];
      const eligible =
        state?.status === 'approved' ||
        (options.includeNeedsReview && state?.status === 'needs_review');
      if (!eligible) {
        throw new AppError(
          `Cannot export book '${options.bookId}': chapter ${number} is not human-approved.`,
          'Approve every chapter or use --include-needs-review for a draft package.',
        );
      }
      const sourcePath = path.join(
        chapterDirectoryPath(this.generatedDirectory, options.bookId, number, chapter.id),
        'chapter.md',
      );
      const entry = `chapters/${String(number).padStart(2, '0')}-${filesystemSlug(chapter.id)}.md`;
      await this.requireFile(sourcePath, entry);
      sourceFiles.push({ path: sourcePath, entry });
      entries.push(entry);
    }

    const exportsDirectory = path.join(bookDirectory, 'exports');
    const archivePath = path.join(exportsDirectory, `${filesystemSlug(options.title)}.zip`);
    const temporaryPath = path.join(exportsDirectory, `.${randomUUID()}.zip.tmp`);
    await mkdir(exportsDirectory, { recursive: true });
    try {
      await this.writeArchive(temporaryPath, sourceFiles);
      await rename(temporaryPath, archivePath);
      const archiveStat = await stat(archivePath);
      if (archiveStat.size < 4)
        throw new AppError(`ZIP archive is empty or invalid: ${archivePath}`);
      return { archivePath, entries };
    } catch (error) {
      await rm(temporaryPath, { force: true });
      if (error instanceof AppError) throw error;
      throw new AppError(`Could not create ZIP archive: ${archivePath}`, undefined, {
        cause: error,
      });
    }
  }

  private async writeArchive(
    archivePath: string,
    files: Array<{ path: string; entry: string }>,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(archivePath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const fail = (error: Error): void => reject(error);
      output.on('close', resolve);
      output.on('error', fail);
      archive.on('error', fail);
      archive.pipe(output);
      for (const file of files) archive.file(file.path, { name: file.entry });
      void archive.finalize().catch(fail);
    });
  }

  private async requireFile(filePath: string, entry: string): Promise<void> {
    try {
      await access(filePath);
      const content = await readFile(filePath);
      if (content.length === 0) throw new Error('empty file');
    } catch (error) {
      throw new AppError(`Required publication file is missing or empty: ${entry}`, undefined, {
        cause: error,
      });
    }
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
    )
      throw new AppError(`Chapter range ${start}-${end} is outside the book's 1-${total} range.`);
    if (start > end)
      throw new AppError(`Chapter range start ${start} cannot be greater than end ${end}.`);
    return { from: start, to: end };
  }
}
