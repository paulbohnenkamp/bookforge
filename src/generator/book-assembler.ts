import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { BookResolver } from './book-resolver.js';
import type { Book } from '../domain/book.js';
import { GenerationStateStore, type GenerationState } from './generation-state.js';
import { chapterDirectoryPath, chapterDirectoryName } from './paths.js';

export interface AssemblyOptions {
  bookId: string;
  allowIncomplete?: boolean;
  includeNeedsReview?: boolean;
}
export interface AssemblyResult {
  bookId: string;
  publishedChapters: number[];
  missingChapters: number[];
  readmePath: string;
  tableOfContentsPath: string;
  combinedPath: string;
  approvalStatusPath: string;
}

export class BookAssembler {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
    private readonly writer = new AtomicFileWriter(),
  ) {}
  public async assemble(options: AssemblyOptions): Promise<AssemblyResult> {
    const resolved = await this.resolver.resolve(options.bookId, 1);
    const bookDirectory = path.join(this.generatedDirectory, options.bookId);
    const stateStore = new GenerationStateStore(path.join(bookDirectory, 'generation-state.json'));
    const bookState = await stateStore.loadBook(options.bookId);
    const included: Array<{
      number: number;
      id: string;
      title: string;
      content: string;
      state: GenerationState;
    }> = [];
    const missing: number[] = [];
    for (let number = 1; number <= resolved.book.chapters.length; number += 1) {
      const chapter = resolved.book.chapters[number - 1];
      if (!chapter) continue;
      const state = bookState.chapters[String(number)];
      const chapterPath = path.join(
        chapterDirectoryPath(this.generatedDirectory, options.bookId, number, chapter.id),
        'chapter.md',
      );
      if (state?.status === 'approved' && state.approval && (await this.exists(chapterPath))) {
        const summaryPath = path.join(path.dirname(chapterPath), 'summary.md');
        const chapterHash = createHash('sha256')
          .update(await readFile(chapterPath, 'utf8'))
          .digest('hex');
        const summaryHash = (await this.exists(summaryPath))
          ? createHash('sha256')
              .update(await readFile(summaryPath, 'utf8'))
              .digest('hex')
          : '';
        if (
          chapterHash !== state.approval.chapterHash ||
          summaryHash !== state.approval.summaryHash
        ) {
          state.status = 'needs_review';
          delete state.approval;
          await stateStore.save(state);
        }
      }
      const eligible =
        state &&
        (state.status === 'approved' ||
          (options.includeNeedsReview && state.status === 'needs_review'));
      if (eligible && (await this.exists(chapterPath)))
        included.push({
          number,
          id: chapter.id,
          title: chapter.title,
          content: await readFile(chapterPath, 'utf8'),
          state,
        });
      else missing.push(number);
    }
    if (missing.length > 0 && !options.allowIncomplete)
      throw new AppError(
        `Cannot assemble book '${options.bookId}': chapters ${missing.join(', ')} are missing or not human-approved.`,
        'Approve chapters or use --include-needs-review and/or --allow-incomplete.',
      );
    const toc = this.renderTableOfContents(included);
    const combined = this.renderCombined(
      resolved.book,
      toc,
      included,
      missing.length > 0,
      Boolean(options.includeNeedsReview),
    );
    const readme = this.renderReadme(
      resolved.book,
      bookState.chapters,
      missing.length === 0,
      included.some((item) => item.state.status === 'needs_review'),
    );
    const approval = this.renderApprovalStatus(included);
    const tableOfContentsPath = path.join(bookDirectory, 'TABLE_OF_CONTENTS.md'),
      combinedPath = path.join(bookDirectory, 'combined.md'),
      readmePath = path.join(bookDirectory, 'README.md'),
      approvalStatusPath = path.join(bookDirectory, 'approval-status.md');
    await this.writer.write(tableOfContentsPath, toc);
    await this.writer.write(combinedPath, combined);
    await this.writer.write(readmePath, readme);
    await this.writer.write(approvalStatusPath, approval);
    return {
      bookId: options.bookId,
      publishedChapters: included.map((item) => item.number),
      missingChapters: missing,
      readmePath,
      tableOfContentsPath,
      combinedPath,
      approvalStatusPath,
    };
  }
  private renderTableOfContents(
    chapters: Array<{ number: number; id: string; title: string }>,
  ): string {
    return `# Table of Contents\n\n${chapters.map((chapter) => `${chapter.number}. [${chapter.title}](chapters/${chapterDirectoryName(chapter.number, chapter.id)}.md)`).join('\n')}\n`;
  }
  private renderCombined(
    book: Book,
    toc: string,
    chapters: Array<{ number: number; title: string; content: string }>,
    incomplete: boolean,
    needsReview: boolean,
  ): string {
    const notice = incomplete
      ? '\n> **Incomplete draft:** configured chapters are missing.\n'
      : needsReview
        ? '\n> **Draft — Needs Human Review:** one or more included chapters have not been human-approved.\n'
        : '';
    const chapterContent = chapters
      .map((chapter) => `\n\n---\n\n${this.demoteHeadings(chapter.content.trim())}`)
      .join('');
    const embeddedToc = toc.trim().replace(/^# /, '## ');
    return `# ${book.book.title}\n\n${book.book.subtitle ? `${book.book.subtitle}\n\n` : ''}${book.book.audience?.length ? `Audience: ${book.book.audience.join(', ')}\n\n` : ''}${notice}\n${embeddedToc}${chapterContent}\n`;
  }
  private demoteHeadings(content: string): string {
    return content.replace(/^(#{1,5})\s+/gm, (_match, hashes: string) => `${hashes}# `);
  }
  private renderReadme(
    book: Book,
    states: Record<string, GenerationState>,
    complete: boolean,
    needsReview: boolean,
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
    const status = complete
      ? needsReview
        ? 'complete but needs human review'
        : 'complete and human-approved'
      : 'incomplete';
    return `# ${book.book.title}\n\n${book.book.subtitle ? `${book.book.subtitle}\n\n` : ''}Generated: ${new Date().toISOString()}\nStatus: ${status}\nProviders: ${providers}\nModels: ${models}\n\n> Automated generation and validation do not establish technical authority. Human technical review is required.\n\nRead individual chapters under \`chapters/\`, or read \`combined.md\` for the assembled book.\n`;
  }
  private renderApprovalStatus(
    chapters: Array<{ number: number; title: string; state: GenerationState }>,
  ): string {
    return `# Approval Status\n\n| Chapter | Quality | Human status | Approval | Approver | Hash |\n|---|---|---|---|---|---|\n${chapters.map((item) => `| ${item.number}. ${item.title} | ${item.state.qualityVerdict ?? 'unknown'} | ${item.state.status} | ${item.state.approval?.approvedAt ?? '—'} | ${item.state.approval?.approver ?? '—'} | ${(item.state.approval?.chapterHash ?? item.state.publishedChecksum ?? '—').slice(0, 12)} |`).join('\n')}\n`;
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
