import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { BookAssembler } from '../src/generator/book-assembler.js';
import { BookCleaner } from '../src/generator/book-cleaner.js';
import { BookResolver } from '../src/generator/book-resolver.js';
import { ChapterGenerator } from '../src/generator/chapter-generator.js';
import { FullBookGenerator } from '../src/generator/full-book-generator.js';
import { BookStatusReporter } from '../src/generator/book-status.js';
import { PromptLoader } from '../src/loaders/prompt-loader.js';
import { MockLlmProvider } from '../src/llm/mock-llm-provider.js';
import type { LlmProvider } from '../src/llm/llm-provider.js';
import { ZipExporter } from '../src/generator/zip-exporter.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

class SilentLogger {
  public debug(): void {}
  public info(): void {}
  public warn(): void {}
  public error(): void {}
}

class FailingChapterProvider implements LlmProvider {
  public constructor(private readonly chapterTitle: string) {}
  public failed = false;
  private readonly delegate = new MockLlmProvider();

  public async complete(prompt: string): Promise<string> {
    if (
      !this.failed &&
      prompt.includes(`Chapter specification: {"id":"chapter-2","title":"${this.chapterTitle}"`)
    ) {
      this.failed = true;
      throw new Error('intentional chapter failure');
    }
    return this.delegate.complete(prompt);
  }
}

class RecordingProvider implements LlmProvider {
  public readonly prompts: string[] = [];
  private readonly delegate = new MockLlmProvider();

  public async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    return this.delegate.complete(prompt);
  }
}

async function createWorkspace(): Promise<{
  root: string;
  resolver: BookResolver;
  generatedDirectory: string;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bookforge-m4-'));
  temporaryDirectories.push(root);
  const booksDirectory = path.join(root, 'books');
  const generatedDirectory = path.join(root, 'generated');
  await mkdir(path.join(booksDirectory, 'sample'), { recursive: true });
  await writeFile(
    path.join(booksDirectory, 'sample', 'book.yaml'),
    `book:\n  id: sample\n  title: Sample Book\n  subtitle: A local test\n  audience:\n    - Engineers\nstyle:\n  tone: direct\n  includeInterviewQuestions: true\n  includeExercises: true\noutput:\n  markdown: true\n  zip: true\nchapters:\n  - id: chapter-1\n    title: First Topic\n    targetWords: 100\n  - id: chapter-2\n    title: Second Topic\n    targetWords: 100\n  - id: chapter-3\n    title: Third Topic\n    targetWords: 100\n`,
  );
  return { root, resolver: new BookResolver(booksDirectory), generatedDirectory };
}

function createGenerator(
  workspace: Awaited<ReturnType<typeof createWorkspace>>,
  provider: LlmProvider,
): ChapterGenerator {
  return new ChapterGenerator(
    workspace.resolver,
    new PromptLoader(path.resolve('prompts')),
    path.resolve('docs/BOOK_STYLE_GUIDE.md'),
    workspace.generatedDirectory,
    provider,
    undefined,
    undefined,
    new SilentLogger(),
  );
}

function createFullGenerator(
  workspace: Awaited<ReturnType<typeof createWorkspace>>,
  provider: LlmProvider,
): FullBookGenerator {
  return new FullBookGenerator(
    workspace.resolver,
    createGenerator(workspace, provider),
    workspace.generatedDirectory,
    new SilentLogger(),
  );
}

describe('full-book workflow', () => {
  it('generates chapters sequentially, writes summaries, and skips published chapters', async () => {
    const workspace = await createWorkspace();
    const provider = new RecordingProvider();
    const generator = createFullGenerator(workspace, provider);

    const first = await generator.generate({ bookId: 'sample', providerName: 'mock' });
    expect(first.chapterResults.map((result) => result.chapterNumber)).toEqual([1, 2, 3]);
    expect(first.chapterResults.map((result) => result.outcome)).toEqual([
      'generated',
      'generated',
      'generated',
    ]);
    expect(provider.prompts.find((prompt) => prompt.includes('Stage: Writer'))).toContain(
      'First Topic',
    );
    expect(provider.prompts.filter((prompt) => prompt.includes('Stage: Writer'))[1]).toContain(
      'First Topic',
    );
    await expect(
      readFile(
        path.join(workspace.generatedDirectory, 'sample/chapters/02-chapter-2/summary.md'),
        'utf8',
      ),
    ).resolves.toContain('Second Topic');

    const second = await generator.generate({ bookId: 'sample', providerName: 'mock' });
    expect(second.chapterResults.map((result) => result.outcome)).toEqual([
      'skipped',
      'skipped',
      'skipped',
    ]);
  });

  it('stops on failure by default and resumes the failed chapter', async () => {
    const workspace = await createWorkspace();
    const provider = new FailingChapterProvider('Second Topic');
    const generator = createFullGenerator(workspace, provider);

    const failed = await generator.generate({ bookId: 'sample', providerName: 'mock' });
    expect(failed.chapterResults.map((result) => result.outcome)).toEqual(['generated', 'failed']);
    const resumed = await generator.generate({ bookId: 'sample', providerName: 'mock' });
    expect(resumed.chapterResults.map((result) => result.outcome)).toEqual([
      'skipped',
      'generated',
      'generated',
    ]);
  });

  it('continues after a failed chapter and validates ranges', async () => {
    const workspace = await createWorkspace();
    const generator = createFullGenerator(workspace, new FailingChapterProvider('Second Topic'));
    const result = await generator.generate({
      bookId: 'sample',
      providerName: 'mock',
      continueOnError: true,
    });
    expect(result.chapterResults.map((item) => item.outcome)).toEqual([
      'generated',
      'failed',
      'generated',
    ]);
    await expect(
      generator.generate({ bookId: 'sample', providerName: 'mock', from: 3, to: 2 }),
    ).rejects.toThrow('cannot be greater');
    await expect(
      generator.generate({ bookId: 'sample', providerName: 'mock', from: 0 }),
    ).rejects.toThrow('outside');
  });

  it('assembles a complete book, reports status, and exports only publication files', async () => {
    const workspace = await createWorkspace();
    await createFullGenerator(workspace, new MockLlmProvider()).generate({
      bookId: 'sample',
      providerName: 'mock',
    });
    const assembler = new BookAssembler(workspace.resolver, workspace.generatedDirectory);
    const assembled = await assembler.assemble({ bookId: 'sample' });
    const combined = await readFile(assembled.combinedPath, 'utf8');
    const toc = await readFile(assembled.tableOfContentsPath, 'utf8');
    expect(combined).toContain('# Sample Book');
    expect(combined.indexOf('First Topic')).toBeLessThan(combined.indexOf('Second Topic'));
    expect(toc).toContain('1. [First Topic](chapters/01-chapter-1.md)');
    expect(toc).toContain('3. [Third Topic](chapters/03-chapter-3.md)');

    const status = await new BookStatusReporter(
      workspace.resolver,
      workspace.generatedDirectory,
    ).getStatus('sample');
    expect(status.publishedChapters).toBe(3);
    expect(
      new BookStatusReporter(workspace.resolver, workspace.generatedDirectory).render(status),
    ).toContain('3/3 published');

    const exported = await new ZipExporter(workspace.resolver, workspace.generatedDirectory).export(
      {
        bookId: 'sample',
        title: 'Sample Book',
      },
    );
    const zipListing = (await execFileAsync('unzip', ['-Z1', exported.archivePath])).stdout
      .trim()
      .split('\n');
    expect(zipListing.sort()).toEqual([
      'README.md',
      'TABLE_OF_CONTENTS.md',
      'chapters/01-chapter-1.md',
      'chapters/02-chapter-2.md',
      'chapters/03-chapter-3.md',
      'combined.md',
    ]);
  });

  it('rejects incomplete assembly and protects manually edited chapters during cleaning', async () => {
    const workspace = await createWorkspace();
    const generator = createFullGenerator(workspace, new MockLlmProvider());
    await generator.generate({ bookId: 'sample', providerName: 'mock', from: 1, to: 2 });
    const assembler = new BookAssembler(workspace.resolver, workspace.generatedDirectory);
    await expect(assembler.assemble({ bookId: 'sample' })).rejects.toThrow(
      'missing published chapters 3',
    );
    const incomplete = await assembler.assemble({ bookId: 'sample', allowIncomplete: true });
    expect(await readFile(incomplete.combinedPath, 'utf8')).toContain('Incomplete publication');

    const chapterPath = path.join(
      workspace.generatedDirectory,
      'sample/chapters/01-chapter-1/chapter.md',
    );
    await writeFile(chapterPath, `${await readFile(chapterPath, 'utf8')}\nEdited manually.\n`);
    const cleaner = new BookCleaner(workspace.resolver, workspace.generatedDirectory);
    await expect(cleaner.clean({ bookId: 'sample', chapterNumber: 1 })).rejects.toThrow(
      'manually modified',
    );
    const dryRun = await cleaner.clean({
      bookId: 'sample',
      chapterNumber: 1,
      force: true,
      dryRun: true,
    });
    expect(dryRun.removed[0]).toContain('01-chapter-1');
    await expect(readFile(chapterPath, 'utf8')).resolves.toContain('Edited manually');
    await expect(
      cleaner.clean({ bookId: 'sample', chapterNumber: 1, force: true }),
    ).resolves.toBeTruthy();
    await expect(readFile(chapterPath, 'utf8')).rejects.toThrow();
    await expect(cleaner.clean({ bookId: 'sample' })).rejects.toThrow(
      'exactly one explicit target',
    );
  });
});
