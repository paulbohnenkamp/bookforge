import path from 'node:path';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { BookResolver } from './book-resolver.js';
import { GenerationStateStore } from './generation-state.js';
import { chapterDirectoryPath } from './paths.js';

export class HumanReviewService {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
    private readonly writer = new AtomicFileWriter(),
  ) {}
  public async approveRange(
    bookId: string,
    from: number,
    to: number,
    approver?: string,
    notes?: string,
  ): Promise<void> {
    const resolved = await this.resolver.resolve(bookId, 1);
    if (from < 1 || to > resolved.book.chapters.length)
      throw new AppError(
        `Chapter range ${from}-${to} is outside the book's 1-${resolved.book.chapters.length} range.`,
      );
    if (from > to)
      throw new AppError(`Chapter range start ${from} cannot be greater than end ${to}.`);
    for (let chapterNumber = from; chapterNumber <= to; chapterNumber += 1)
      await this.approve(bookId, chapterNumber, approver, notes);
  }
  public async approve(
    bookId: string,
    chapterNumber: number,
    approver?: string,
    notes?: string,
  ): Promise<void> {
    const resolved = await this.resolver.resolve(bookId, chapterNumber);
    const directory = chapterDirectoryPath(
      this.generatedDirectory,
      bookId,
      chapterNumber,
      resolved.chapter.id,
    );
    const store = new GenerationStateStore(
      path.join(this.generatedDirectory, bookId, 'generation-state.json'),
    );
    const state = await store.loadChapter(bookId, chapterNumber);
    if (!state || state.status !== 'needs_review')
      throw new AppError(
        `Chapter ${chapterNumber} cannot be approved until automated validation completes.`,
      );
    const chapter = await this.require(directory, 'chapter.md');
    const summary = await this.require(directory, 'summary.md');
    const report = await this.require(directory, 'quality-report.json');
    const parsed = JSON.parse(report) as { chapterHash?: string; summary?: { errors?: number } };
    const chapterHash = createHash('sha256').update(chapter).digest('hex'),
      summaryHash = createHash('sha256').update(summary).digest('hex');
    if (parsed.chapterHash !== chapterHash || (parsed.summary?.errors ?? 0) > 0)
      throw new AppError(
        'Cannot approve a stale or failed quality report.',
        'Run the quality command again before approval.',
      );
    state.status = 'approved';
    state.approval = {
      approvedAt: new Date().toISOString(),
      chapterHash,
      summaryHash,
      ...(approver ? { approver } : {}),
      ...(notes ? { notes } : {}),
    };
    delete state.rejection;
    await store.save(state);
  }
  public async reject(
    bookId: string,
    chapterNumber: number,
    reason: string,
    by?: string,
    notes?: string,
  ): Promise<void> {
    if (!reason.trim()) throw new AppError('A rejection reason is required.');
    const resolved = await this.resolver.resolve(bookId, chapterNumber);
    const store = new GenerationStateStore(
      path.join(this.generatedDirectory, bookId, 'generation-state.json'),
    );
    const state = await store.loadChapter(bookId, chapterNumber);
    if (!state) throw new AppError(`No generated state exists for chapter ${chapterNumber}.`);
    state.status = 'rejected';
    state.rejection = {
      rejectedAt: new Date().toISOString(),
      reason,
      ...(by ? { by } : {}),
      ...(notes ? { notes } : {}),
    };
    delete state.approval;
    await store.save(state);
    void resolved;
  }
  private async require(directory: string, filename: string): Promise<string> {
    const target = path.join(directory, filename);
    try {
      await access(target);
      const content = await readFile(target, 'utf8');
      if (!content.trim()) throw new Error('empty');
      return content;
    } catch (error) {
      throw new AppError(`Required review artifact is missing: ${filename}`, undefined, {
        cause: error,
      });
    }
  }
}
