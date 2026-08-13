import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BookLoader } from '../src/loaders/book-loader.js';

describe('BookLoader', () => {
  it('loads the sample book specification', async () => {
    const book = await new BookLoader().load('books/modern-java/book.yaml');
    expect(book.book.id).toBe('modern-java');
    expect(book.chapters).toHaveLength(18);
    expect(book.chapters[0]?.objectives).toHaveLength(4);
  });

  it('rejects an invalid specification', async () => {
    await expect(new BookLoader().load('does-not-exist.yaml')).rejects.toThrow(
      'Book specification not found',
    );
  });

  it('reports YAML syntax location', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-yaml-'));
    const filePath = path.join(directory, 'book.yaml');
    await writeFile(filePath, 'book:\n  id: broken\n  title: Bad: title\n');

    await expect(new BookLoader().load(filePath)).rejects.toThrow('line 3, column 13');
    await rm(directory, { recursive: true, force: true });
  });

  it('reports schema paths and reasons', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-schema-'));
    const filePath = path.join(directory, 'book.yaml');
    await writeFile(
      filePath,
      `book:\n  id: sample\n  title: Sample\nstyle:\n  tone: practical\noutput:\n  markdown: true\nchapters:\n  - id: first\n    title: First\n    targetWords: 100\n    objectives:\n      - One\n      - Two\n    topics:\n      - Basics\n`,
    );

    await expect(new BookLoader().load(filePath)).rejects.toThrow(
      'chapters[0].objectives: Too small',
    );
    await rm(directory, { recursive: true, force: true });
  });

  it('normalizes configuration accidentally nested under book metadata', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-nested-spec-'));
    const filePath = path.join(directory, 'book.yaml');
    await writeFile(
      filePath,
      `book:
  id: nested
  title: Nested
  style:
    tone: practical
  output:
    markdown: true
  chapters:
    - id: first
      title: First
      targetWords: 100
      objectives:
        - One
        - Two
        - Three
      topics:
        - Basics
`,
    );

    const book = await new BookLoader().load(filePath);
    expect(book.book.id).toBe('nested');
    expect(book.chapters[0]?.title).toBe('First');
    await rm(directory, { recursive: true, force: true });
  });
});
