import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ZipArchive } from 'archiver';
import { marked } from 'marked';
import { AppError } from '../errors/app-error.js';
import { BookResolver } from '../generator/book-resolver.js';
import { GenerationStateStore } from '../generator/generation-state.js';
import { chapterDirectoryPath } from '../generator/paths.js';
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

export interface EpubRenderRequest {
  bookId: string;
  outputPath: string;
  includeNeedsReview?: boolean;
  from?: number;
  to?: number;
}

export interface EpubChapter {
  number: number;
  id: string;
  title: string;
  xhtmlPath: string;
}

export interface EpubRenderResult {
  outputPath: string;
  chapters: EpubChapter[];
}

interface EpubFile {
  path?: string;
  entry: string;
  store?: boolean;
  content?: string;
}

export class EpubRenderer {
  public constructor(
    private readonly resolver: BookResolver,
    private readonly generatedDirectory: string,
    private readonly templateRoot = process.cwd(),
    private readonly publication: PublicationDefaults = defaultPublication(),
  ) {}

  public async render(request: EpubRenderRequest): Promise<EpubRenderResult> {
    const resolved = await this.resolver.resolve(request.bookId, 1);
    const total = resolved.book.chapters.length;
    const from = request.from ?? 1;
    const to = request.to ?? total;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > total || from > to)
      throw new AppError(`Chapter range ${from}-${to} is outside the book's 1-${total} range.`);
    const states = await new GenerationStateStore(
      path.join(this.generatedDirectory, request.bookId, 'generation-state.json'),
    ).loadBook(request.bookId);
    const chapters: EpubChapter[] = [];
    const contents: Array<{ chapter: EpubChapter; markdown: string }> = [];
    for (let number = from; number <= to; number += 1) {
      const chapter = resolved.book.chapters[number - 1];
      const state = states.chapters[String(number)];
      const source = chapter
        ? path.join(
            chapterDirectoryPath(this.generatedDirectory, request.bookId, number, chapter.id),
            'chapter.md',
          )
        : '';
      const eligible =
        state?.status === 'approved' ||
        (request.includeNeedsReview === true && state?.status === 'needs_review');
      if (!chapter || !eligible || !(await this.exists(source)))
        throw new AppError(
          `Cannot export EPUB: chapter ${number} is missing or not human-approved.`,
        );
      const chapterHash = createHash('sha256')
        .update(await readFile(source))
        .digest('hex');
      const summaryPath = path.join(path.dirname(source), 'summary.md');
      const summaryHash = (await this.exists(summaryPath))
        ? createHash('sha256')
            .update(await readFile(summaryPath))
            .digest('hex')
        : '';
      if (
        state.status === 'approved' &&
        (!state.approval ||
          state.approval.chapterHash !== chapterHash ||
          state.approval.summaryHash !== summaryHash)
      )
        throw new AppError(
          `Cannot export EPUB: approved chapter ${number} has changed since approval.`,
        );
      const item = {
        number,
        id: chapter.id,
        title: chapter.title,
        xhtmlPath: `chapter-${number}.xhtml`,
      };
      chapters.push(item);
      contents.push({ chapter: item, markdown: await readFile(source, 'utf8') });
    }

    const temporaryDirectory = path.join(path.dirname(request.outputPath), `.epub-${Date.now()}`);
    const packageDirectory = path.join(temporaryDirectory, 'OEBPS');
    await mkdir(path.join(packageDirectory, 'images'), { recursive: true });
    try {
      const cssPath = path.join(this.templateRoot, 'templates', 'epub', 'book.css');
      const cover = await this.coverFile(
        resolved.specificationPath,
        resolved.book.book.cover,
        packageDirectory,
      );
      const endMatter = this.endMatterDocument(resolved.book, chapters, contents);
      const frontMatter = this.frontMatterDocuments(resolved.book);
      const files: EpubFile[] = [
        {
          path: await this.writeFile(temporaryDirectory, 'mimetype', 'application/epub+zip'),
          entry: 'mimetype',
          store: true,
        },
        {
          path: await this.writeFile(
            temporaryDirectory,
            'META-INF/container.xml',
            this.containerXml(),
          ),
          entry: 'META-INF/container.xml',
        },
        {
          path: await this.writeFile(
            packageDirectory,
            'stylesheet.css',
            await readFile(cssPath, 'utf8'),
          ),
          entry: 'OEBPS/stylesheet.css',
        },
        {
          path: await this.writeFile(
            packageDirectory,
            'nav.xhtml',
            this.navXhtml(resolved.book, chapters, Boolean(endMatter), frontMatter.links),
          ),
          entry: 'OEBPS/nav.xhtml',
        },
        {
          path: await this.writeFile(
            packageDirectory,
            'toc.xhtml',
            this.tocXhtml(resolved.book, chapters, Boolean(endMatter), frontMatter.links),
          ),
          entry: 'OEBPS/toc.xhtml',
        },
        ...frontMatter.files,
        {
          path: await this.writeFile(
            packageDirectory,
            'title.xhtml',
            this.titleXhtml(resolved.book, cover?.entry),
          ),
          entry: 'OEBPS/title.xhtml',
        },
      ];
      for (const item of contents)
        files.push({
          path: await this.writeFile(
            packageDirectory,
            item.chapter.xhtmlPath,
            this.chapterXhtml(item.markdown),
          ),
          entry: `OEBPS/${item.chapter.xhtmlPath}`,
        });
      if (endMatter)
        files.push({
          path: await this.writeFile(packageDirectory, 'end-matter.xhtml', endMatter),
          entry: 'OEBPS/end-matter.xhtml',
        });
      if (cover) files.push(cover.file);
      files.push({
        path: await this.writeFile(
          packageDirectory,
          'content.opf',
          this.opf(resolved.book, chapters, cover?.entry, Boolean(endMatter), frontMatter.entries),
        ),
        entry: 'OEBPS/content.opf',
      });
      await mkdir(path.dirname(request.outputPath), { recursive: true });
      const temporaryOutput = `${request.outputPath}.tmp`;
      await this.writeArchive(temporaryOutput, files);
      await rename(temporaryOutput, request.outputPath);
      return { outputPath: request.outputPath, chapters };
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
      await rm(`${request.outputPath}.tmp`, { force: true });
    }
  }

  private async writeFile(
    root: string,
    relative: string,
    content: string | Buffer,
  ): Promise<string> {
    const filePath = path.join(root, relative);
    await mkdir(path.dirname(filePath), { recursive: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, content);
    return filePath;
  }
  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  private escape(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
    );
  }
  private containerXml(): string {
    return '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  }
  private titleXhtml(
    book: Awaited<ReturnType<BookResolver['resolve']>>['book'],
    coverEntry?: string,
  ): string {
    return this.xhtml(
      'title',
      `<main class="title-page">${coverEntry ? `<img class="cover" src="${coverEntry}" alt="Cover"/>` : ''}<h1>${this.escape(book.book.title)}</h1>${book.book.subtitle ? `<p class="subtitle">${this.escape(book.book.subtitle)}</p>` : ''}<p>${this.escape(book.frontMatter?.author ?? book.book.author ?? this.publication.author)}</p><p>${this.escape(book.frontMatter?.organization ?? this.publication.organization)}</p><p>Version ${this.escape(book.frontMatter?.version ?? this.publication.version)}</p><p>${this.escape(book.frontMatter?.date ?? this.publication.date)}</p></main>`,
    );
  }
  private frontMatterDocuments(book: Awaited<ReturnType<BookResolver['resolve']>>['book']): {
    files: EpubFile[];
    entries: string[];
    links: string[];
  } {
    const frontMatter = book.frontMatter;
    const files: EpubFile[] = [];
    const entries: string[] = [];
    const links: string[] = [];
    const add = (name: string, title: string, body: string): void => {
      const entry = `OEBPS/${name}`;
      entries.push(
        `<item id="${name.replace('.xhtml', '')}" href="${name}" media-type="application/xhtml+xml"/>`,
      );
      files.push({
        entry,
        content: this.xhtml(title, `<main><h1>${this.escape(title)}</h1>${body}</main>`),
      });
      links.push(`<li><a href="${name}">${this.escape(title)}</a></li>`);
    };
    add(
      'copyright.xhtml',
      'Copyright & Legal',
      `<p>${this.escape(frontMatter?.copyright?.notice ?? this.publication.copyrightNotice)}</p><p>License: ${this.escape(frontMatter?.copyright?.license ?? this.publication.license)}</p><p>Trademarks: ${this.escape((frontMatter?.copyright?.trademarks ?? this.publication.trademarks).join('; '))}</p>`,
    );
    if (frontMatter?.about || book.book.audience?.length)
      add(
        'about.xhtml',
        'About This Manual',
        `<h2>Intended Audience</h2><p>${this.escape(frontMatter?.about?.audience ?? book.book.audience?.join('; ') ?? '')}</p>${frontMatter?.about?.background ? `<h2>Background Assumed</h2><p>${this.escape(frontMatter.about.background)}</p>` : ''}<h2>Conventions</h2><ul>${(
          frontMatter?.about?.conventions ?? [
            { label: 'Bold', meaning: 'Important terms or warnings.' },
            { label: 'Monospace', meaning: 'Commands, code, paths, and literal values.' },
          ]
        )
          .map(
            (item) =>
              `<li><strong>${this.escape(item.label)}</strong>: ${this.escape(item.meaning)}</li>`,
          )
          .join('')}</ul>`,
      );
    return { files, entries, links };
  }
  private navXhtml(
    book: Awaited<ReturnType<BookResolver['resolve']>>['book'],
    chapters: EpubChapter[],
    hasEndMatter: boolean,
    frontMatterLinks: string[] = [],
  ): string {
    return this.xhtml(
      'toc',
      `<nav epub:type="toc" id="toc"><ol><li><a href="title.xhtml">${this.escape(book.book.title)}</a></li>${frontMatterLinks.join('')}${chapters.map((c) => `<li><a href="${c.xhtmlPath}">${this.escape(c.title)}</a></li>`).join('')}${hasEndMatter ? '<li><a href="end-matter.xhtml">End Matter</a></li>' : ''}</ol></nav>`,
    );
  }
  private tocXhtml(
    book: Awaited<ReturnType<BookResolver['resolve']>>['book'],
    chapters: EpubChapter[],
    hasEndMatter: boolean,
    frontMatterLinks: string[] = [],
  ): string {
    return this.xhtml(
      'Table of Contents',
      `<main class="toc-page"><h1>Table of Contents</h1>${this.navXhtml(book, chapters, hasEndMatter, frontMatterLinks).match(/<nav[\s\S]*<\/nav>/)?.[0] ?? ''}</main>`,
    );
  }
  private chapterXhtml(markdown: string): string {
    const html = String(marked.parse(markdown))
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>');
    return this.xhtml('chapter', `<main>${html}</main>`);
  }
  private xhtml(title: string, body: string): string {
    return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><title>${this.escape(title)}</title><link rel="stylesheet" type="text/css" href="stylesheet.css"/></head><body>${body}</body></html>`;
  }
  private endMatterDocument(
    book: Awaited<ReturnType<BookResolver['resolve']>>['book'],
    chapters: EpubChapter[],
    contents: Array<{ chapter: EpubChapter; markdown: string }>,
  ): string | undefined {
    const endMatter = book.endMatter;
    if (!endMatter) return undefined;
    const sections: string[] = [];
    if (endMatter.glossary?.length)
      sections.push(
        `<section id="glossary"><h1>Glossary</h1>${endMatter.glossary.map((entry) => `<h2>${this.escape(entry.term)}</h2><p>${this.escape(entry.definition)}</p>`).join('')}</section>`,
      );
    if (endMatter.indexTerms?.length) {
      const entries = endMatter.indexTerms
        .map((term) => {
          const matches = chapters.filter((_chapter, index) =>
            new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'i').test(
              contents[index]?.markdown ?? '',
            ),
          );
          return `<li><strong>${this.escape(term)}</strong>: ${matches.length ? matches.map((chapter) => `<a href="${chapter.xhtmlPath}">${chapter.number}</a>`).join(', ') : '—'}</li>`;
        })
        .join('');
      sections.push(`<section id="index"><h1>Index</h1><ul>${entries}</ul></section>`);
    }
    if (endMatter.references?.length)
      sections.push(
        `<section id="references"><h1>Bibliography / Reference List</h1><ol>${endMatter.references.map((reference) => `<li>${reference.author ? `${this.escape(reference.author)}. ` : ''}${reference.url ? `<a href="${this.escape(reference.url)}">${this.escape(reference.title)}</a>` : this.escape(reference.title)}${reference.note ? ` — ${this.escape(reference.note)}` : ''}</li>`).join('')}</ol></section>`,
      );
    if (endMatter.appendix?.length)
      sections.push(
        `<section id="appendix"><h1>Appendix</h1>${endMatter.appendix.map((entry) => `<section><h2>${this.escape(entry.title)}</h2>${String(marked.parse(entry.content))}</section>`).join('')}</section>`,
      );
    return sections.length
      ? this.xhtml('End Matter', `<main>${sections.join('')}</main>`)
      : undefined;
  }
  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  private opf(
    book: Awaited<ReturnType<BookResolver['resolve']>>['book'],
    chapters: EpubChapter[],
    coverEntry?: string,
    hasEndMatter = false,
    frontMatterEntries: string[] = [],
  ): string {
    const id = createHash('sha256').update(`${book.book.id}:${book.book.title}`).digest('hex');
    const coverManifest = coverEntry
      ? `<item id="cover-image" href="${coverEntry}" media-type="image/${path.extname(coverEntry).slice(1)}" properties="cover-image"/>`
      : '';
    const coverMeta = coverEntry ? '<meta name="cover" content="cover-image"/>' : '';
    const frontSpine = frontMatterEntries
      .map((entry) => `<itemref idref="${entry.match(/id="([^"]+)/)?.[1] ?? ''}"/>`)
      .join('');
    return `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${id}</dc:identifier><dc:title>${this.escape(book.book.title)}</dc:title>${book.book.subtitle ? `<dc:description>${this.escape(book.book.subtitle)}</dc:description>` : ''}<dc:creator>${this.escape(book.frontMatter?.author ?? book.book.author ?? 'BookForge')}</dc:creator><dc:language>${this.escape(book.book.language)}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>${coverMeta}</metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/><item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/><item id="css" href="stylesheet.css" media-type="text/css"/>${frontMatterEntries.join('')}${chapters.map((c) => `<item id="chapter-${c.number}" href="${c.xhtmlPath}" media-type="application/xhtml+xml"/>`).join('')}${hasEndMatter ? '<item id="end-matter" href="end-matter.xhtml" media-type="application/xhtml+xml"/>' : ''}${coverManifest}</manifest><spine><itemref idref="title"/>${frontSpine}<itemref idref="toc"/>${chapters.map((c) => `<itemref idref="chapter-${c.number}"/>`).join('')}${hasEndMatter ? '<itemref idref="end-matter"/>' : ''}</spine></package>`;
  }
  private async coverFile(
    specificationPath: string,
    cover: string | undefined,
    packageDirectory: string,
  ): Promise<{ file: EpubFile; entry: string } | undefined> {
    if (!cover) return undefined;
    const source = path.resolve(path.dirname(specificationPath), cover);
    if (!(await this.exists(source))) return undefined;
    const extension = path.extname(source).toLowerCase();
    const media =
      extension === '.png'
        ? 'png'
        : extension === '.jpg' || extension === '.jpeg'
          ? 'jpeg'
          : undefined;
    if (!media) return undefined;
    const entry = `images/cover${extension === '.jpeg' ? '.jpg' : extension}`;
    const destination = await this.writeFile(packageDirectory, entry, await readFile(source));
    return { entry, file: { path: destination, entry: `OEBPS/${entry}` } };
  }
  private async writeArchive(outputPath: string, files: EpubFile[]): Promise<void> {
    const storedFiles = new Map(
      await Promise.all(
        files
          .filter((file) => file.store)
          .map(async (file) => {
            if (!file.path)
              throw new AppError(`Stored EPUB entry is missing a source path: ${file.entry}`);
            return [file.path, await readFile(file.path)] as const;
          }),
      ),
    );
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const fail = (e: Error) => reject(e);
      output.on('close', resolve);
      output.on('error', fail);
      archive.on('error', fail);
      archive.pipe(output);
      for (const file of files) {
        if (file.content !== undefined) {
          archive.append(file.content, { name: file.entry });
          continue;
        }
        if (file.store)
          archive.append(
            file.path ? (storedFiles.get(file.path) ?? Buffer.alloc(0)) : Buffer.alloc(0),
            {
              name: file.entry,
              store: true,
            },
          );
        else if (file.path) archive.file(file.path, { name: file.entry });
      }
      void archive.finalize().catch(fail);
    });
  }
}

export function defaultEpubCss(root: string): string {
  return path.join(root, 'templates', 'epub', 'book.css');
}
