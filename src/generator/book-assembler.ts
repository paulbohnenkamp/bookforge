import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { AtomicFileWriter } from './atomic-file-writer.js';
import { BookResolver } from './book-resolver.js';
import type { Book } from '../domain/book.js';
import { GenerationStateStore, type GenerationState } from './generation-state.js';
import { chapterDirectoryPath, chapterDirectoryName } from './paths.js';
import type { PublicationDefaults } from '../domain/publication.js';

function defaultPublication(): PublicationDefaults {
  return {
    author: 'DecisionForge, LLC',
    organization: 'DecisionForge, LLC',
    version: '1.0',
    date: new Date().toISOString().slice(0, 10),
    copyrightNotice:
      'Educational material only; verify live technical, legal, and operational decisions against authoritative sources.',
    license: 'All rights reserved unless separately stated.',
    trademarks: ['DecisionForge'],
  };
}

export interface AssemblyOptions {
  bookId: string;
  allowIncomplete?: boolean;
  includeNeedsReview?: boolean;
  from?: number;
  to?: number;
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
    private readonly publication?: PublicationDefaults,
  ) {}
  public async assemble(options: AssemblyOptions): Promise<AssemblyResult> {
    const resolved = await this.resolver.resolve(options.bookId, 1);
    const bookDirectory = path.join(this.generatedDirectory, options.bookId);
    const stateStore = new GenerationStateStore(path.join(bookDirectory, 'generation-state.json'));
    const bookState = await stateStore.loadBook(options.bookId);
    const range = this.resolveRange(options.from, options.to, resolved.book.chapters.length);
    const included: Array<{
      number: number;
      id: string;
      title: string;
      content: string;
      state: GenerationState;
    }> = [];
    const missing: number[] = [];
    for (let number = range.from; number <= range.to; number += 1) {
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
    const completeBook =
      missing.length === 0 && range.from === 1 && range.to === resolved.book.chapters.length;
    const toc = this.renderTableOfContents(
      included,
      completeBook ? resolved.book.endMatter : undefined,
    );
    const combined = this.renderCombined(
      resolved.book,
      toc,
      included,
      missing.length > 0 || range.from !== 1 || range.to !== resolved.book.chapters.length,
      Boolean(options.includeNeedsReview),
    );
    const readme = this.renderReadme(
      resolved.book,
      included.map((item) => item.state),
      missing.length === 0 && range.from === 1 && range.to === resolved.book.chapters.length,
      included.some((item) => item.state.status === 'needs_review'),
      range,
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
    endMatter: Book['endMatter'] | undefined,
  ): string {
    const chapterLines = chapters
      .map(
        (chapter) =>
          `${chapter.number}. [${chapter.title}](#chapter-${chapterDirectoryName(chapter.number, chapter.id)})`,
      )
      .join('\n');
    const endMatterLines = endMatter
      ? [
          endMatter.glossary?.length ? '- [Glossary](#glossary)' : '',
          endMatter.indexTerms?.length ? '- [Index](#index)' : '',
          endMatter.references?.length
            ? '- [Bibliography / Reference List](#bibliography--reference-list)'
            : '',
          endMatter.appendix?.length ? '- [Appendix](#appendix)' : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';
    return `# Table of Contents\n\n${chapterLines}${endMatterLines ? `\n\n## End Matter\n\n${endMatterLines}` : ''}\n`;
  }
  private renderCombined(
    book: Book,
    toc: string,
    chapters: Array<{ number: number; id: string; title: string; content: string }>,
    incomplete: boolean,
    needsReview: boolean,
  ): string {
    const notice = incomplete
      ? '\n> **Incomplete draft:** not all configured chapters are included.\n'
      : needsReview
        ? '\n> **Draft — Needs Human Review:** one or more included chapters have not been human-approved.\n'
        : '';
    const chapterContent = chapters
      .map(
        (chapter) =>
          `\n\n---\n\n<a id="chapter-${chapterDirectoryName(chapter.number, chapter.id)}"></a>\n\n${this.demoteHeadings(chapter.content.trim())}`,
      )
      .join('');
    const endMatter = incomplete ? '' : this.renderEndMatter(book, chapters);
    const embeddedToc = toc.trim().replace(/^# /, '## ');
    return `${this.renderFrontMatter(book)}\n\n${notice}\n${embeddedToc}${chapterContent}${endMatter}\n`;
  }

  private renderFrontMatter(book: Book): string {
    const frontMatter = book.frontMatter;
    const publication = this.publication ?? defaultPublication();
    const author = frontMatter?.author ?? book.book.author ?? publication.author;
    const lines = [
      `# ${book.book.title}`,
      book.book.subtitle ?? '',
      `Author: ${author}`,
      `Organization: ${frontMatter?.organization ?? publication.organization}`,
      `Version: ${frontMatter?.version ?? publication.version}`,
      `Date: ${frontMatter?.date ?? publication.date}`,
      '',
      `## Copyright & Legal\n\n${frontMatter?.copyright?.notice ?? publication.copyrightNotice}`,
      `\n\nLicense: ${frontMatter?.copyright?.license ?? publication.license}`,
      `\n\nTrademarks: ${(frontMatter?.copyright?.trademarks ?? publication.trademarks).join('; ')}`,
      '',
      '## About This Manual',
      `\n\n### Intended Audience\n\n${frontMatter?.about?.audience ?? (book.book.audience?.join('; ') || 'Readers who want to understand and use this material.')}`,
      frontMatter?.about?.background
        ? `\n\n### Background Assumed\n\n${frontMatter.about.background}`
        : '',
      frontMatter?.about?.conventions?.length
        ? `\n\n### Conventions\n\n${frontMatter.about.conventions.map((item) => `- **${item.label}**: ${item.meaning}`).join('\n')}`
        : '\n\n### Conventions\n\n- **Bold** identifies important terms or warnings.\n- `Monospace` identifies commands, code, paths, and literal values.',
    ];
    return `${lines.filter((line, index) => line !== '' || index === 0).join('\n')}\n`;
  }

  private renderEndMatter(
    book: Book,
    chapters: Array<{ number: number; content: string }>,
  ): string {
    const endMatter = book.endMatter;
    if (!endMatter) return '';
    const sections: string[] = [];
    if (endMatter.glossary?.length)
      sections.push(
        `\n\n---\n\n<a id="glossary"></a>\n\n## Glossary\n\n${endMatter.glossary.map((entry) => `### ${entry.term}\n\n${entry.definition}`).join('\n\n')}`,
      );
    if (endMatter.indexTerms?.length) {
      const lines = endMatter.indexTerms.map((term) => {
        const pattern = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'i');
        const numbers = chapters
          .filter((chapter) => pattern.test(chapter.content))
          .map((chapter) => chapter.number);
        return `- **${term}**: ${numbers.length ? numbers.join(', ') : '—'}`;
      });
      sections.push(`\n\n---\n\n<a id="index"></a>\n\n## Index\n\n${lines.join('\n')}`);
    }
    if (endMatter.references?.length)
      sections.push(
        `\n\n---\n\n<a id="bibliography--reference-list"></a>\n\n## Bibliography / Reference List\n\n${endMatter.references.map((reference) => `- ${reference.author ? `${reference.author}. ` : ''}${reference.url ? `[${reference.title}](${reference.url})` : reference.title}${reference.note ? ` — ${reference.note}` : ''}`).join('\n')}`,
      );
    if (endMatter.appendix?.length)
      sections.push(
        `\n\n---\n\n<a id="appendix"></a>\n\n## Appendix\n\n${endMatter.appendix.map((entry) => `### ${entry.title}\n\n${entry.content}`).join('\n\n')}`,
      );
    return sections.join('');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }
  private demoteHeadings(content: string): string {
    return content.replace(/^(#{1,5})\s+/gm, (_match, hashes: string) => `${hashes}# `);
  }
  private renderReadme(
    book: Book,
    states: GenerationState[],
    complete: boolean,
    needsReview: boolean,
    range: { from: number; to: number },
  ): string {
    const providers = [...new Set(states.map((state) => state.provider))].join(', ') || 'unknown';
    const models =
      [
        ...new Set(
          states.flatMap((state) =>
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
    const scope =
      range.from === 1 && range.to === book.chapters.length
        ? ''
        : `Included chapter range: ${range.from}–${range.to} of ${book.chapters.length}.\n`;
    return `# ${book.book.title}\n\n${book.book.subtitle ? `${book.book.subtitle}\n\n` : ''}Generated: ${new Date().toISOString()}\nStatus: ${status}\n${scope}Providers: ${providers}\nModels: ${models}\n\n> Automated generation and validation do not establish technical authority. Human technical review is required.\n\nRead individual chapters under \`chapters/\`, or read \`combined.md\` for the assembled book.\n`;
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
