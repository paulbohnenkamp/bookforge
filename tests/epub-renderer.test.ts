import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { EpubRenderer } from '../src/export/epub-renderer.js';
import { BookResolver } from '../src/generator/book-resolver.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('EpubRenderer', () => {
  it('creates a reflowable EPUB from approved chapter Markdown in book order', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'bookforge-epub-'));
    temporaryDirectories.push(root);
    const books = path.join(root, 'books');
    const generated = path.join(root, 'generated');
    const bookDirectory = path.join(books, 'sample');
    await mkdir(bookDirectory, { recursive: true });
    await writeFile(
      path.join(bookDirectory, 'book.yaml'),
      `book:\n  id: sample\n  title: Sample EPUB\n  subtitle: A responsive test\n  author: Test Author\nstyle:\n  tone: practical\noutput:\n  markdown: true\n  epub: true\nchapters:\n  - id: first\n    title: First Chapter\n    targetWords: 100\n    objectives: [One, Two, Three]\n    topics: [Basics]\n  - id: second\n    title: Second Chapter\n    targetWords: 100\n    objectives: [One, Two, Three]\n    topics: [Details]\n`,
    );
    const states: Record<string, unknown> = {};
    for (const [number, id, title] of [
      ['1', 'first', 'First Chapter'],
      ['2', 'second', 'Second Chapter'],
    ]) {
      const directory = path.join(generated, 'sample', 'chapters', `0${number}-${id}`);
      await mkdir(directory, { recursive: true });
      const markdown =
        `# ${title}\n\nA paragraph with *emphasis*.\n\n- One\n- Two\n\n> **Note:** Read this carefully.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n` +
        '```ts\nconst value = 1;\n```\n';
      await writeFile(path.join(directory, 'chapter.md'), markdown);
      states[number] = { status: 'needs_review' };
    }
    await writeFile(
      path.join(generated, 'sample', 'generation-state.json'),
      JSON.stringify({ bookId: 'sample', chapters: states }),
    );

    const outputPath = path.join(root, 'sample.epub');
    const result = await new EpubRenderer(new BookResolver(books), generated, process.cwd()).render(
      { bookId: 'sample', outputPath, includeNeedsReview: true },
    );
    expect(result.chapters.map((chapter) => chapter.title)).toEqual([
      'First Chapter',
      'Second Chapter',
    ]);
    const listing = (await execFileAsync('unzip', ['-Z1', outputPath])).stdout.trim().split('\n');
    expect(listing[0]).toBe('mimetype');
    expect(listing).toContain('OEBPS/nav.xhtml');
    expect(listing).toContain('OEBPS/toc.xhtml');
    expect(listing).toContain('OEBPS/chapter-1.xhtml');
    expect(listing).toContain('OEBPS/chapter-2.xhtml');
    const chapter = (await execFileAsync('unzip', ['-p', outputPath, 'OEBPS/chapter-1.xhtml']))
      .stdout;
    expect(chapter).toContain('table-wrap');
    expect(chapter).toContain('<em>emphasis</em>');
    const opf = (await execFileAsync('unzip', ['-p', outputPath, 'OEBPS/content.opf'])).stdout;
    expect(opf).toContain('<itemref idref="toc"/>');
    expect(await readFile(outputPath)).not.toHaveLength(0);
  });
});
