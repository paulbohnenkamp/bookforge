import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ChapterGenerator } from '../src/generator/chapter-generator.js';
import { BookResolver } from '../src/generator/book-resolver.js';
import { PromptLoader } from '../src/loaders/prompt-loader.js';
import { MockLlmProvider } from '../src/llm/mock-llm-provider.js';
import type { LlmProvider } from '../src/llm/llm-provider.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createWorkspace(): Promise<{ root: string; generator: ChapterGenerator }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bookforge-m2-'));
  temporaryDirectories.push(root);
  const booksDirectory = path.join(root, 'books');
  const generatedDirectory = path.join(root, 'generated');
  const bookDirectory = path.join(booksDirectory, 'sample');
  await mkdir(bookDirectory, { recursive: true });
  await writeFile(
    path.join(bookDirectory, 'book.yaml'),
    `book:
  id: sample
  title: Sample Book
  subtitle: A local test
  audience:
    - Engineers
style:
  tone: direct
  includeInterviewQuestions: true
  includeExercises: true
output:
  markdown: true
  zip: false
chapters:
  - id: first
    title: First Topic
    targetWords: 100
    objectives:
      - Explain the topic.
      - Compare approaches.
      - Apply the ideas.
    topics:
      - Topic fundamentals
`,
  );
  const generator = new ChapterGenerator(
    new BookResolver(booksDirectory),
    new PromptLoader(path.resolve('prompts')),
    path.resolve('docs/BOOK_STYLE_GUIDE.md'),
    generatedDirectory,
    new MockLlmProvider(),
  );
  return { root, generator };
}

class RecordingProvider implements LlmProvider {
  public readonly stages: string[] = [];
  private readonly delegate = new MockLlmProvider();

  public async complete(prompt: string): Promise<string> {
    const stage = prompt.split('\n').find((line) => line.startsWith('Stage:')) ?? '';
    this.stages.push(stage);
    return this.delegate.complete(prompt);
  }
}

class FailingReviewerProvider implements LlmProvider {
  public calls = 0;
  public failReviewer = true;
  private readonly delegate = new MockLlmProvider();

  public async complete(prompt: string): Promise<string> {
    this.calls += 1;
    if (prompt.includes('Stage: Reviewer') && this.failReviewer) {
      this.failReviewer = false;
      throw new Error('reviewer unavailable');
    }
    return this.delegate.complete(prompt);
  }
}

describe('ChapterGenerator', () => {
  it('runs Writer, Reviewer, and Rewriter sequentially and publishes artifacts', async () => {
    const workspace = await createWorkspace();
    const provider = new RecordingProvider();
    const generator = new ChapterGenerator(
      new BookResolver(path.join(workspace.root, 'books')),
      new PromptLoader(path.resolve('prompts')),
      path.resolve('docs/BOOK_STYLE_GUIDE.md'),
      path.join(workspace.root, 'generated'),
      provider,
    );

    await generator.generate({ bookId: 'sample', chapterNumber: 1, providerName: 'mock' });

    expect(provider.stages).toEqual(['Stage: Writer', 'Stage: Reviewer', 'Stage: Rewriter']);
    const chapterDirectory = path.join(workspace.root, 'generated/sample/chapters/01-first');
    await expect(readFile(path.join(chapterDirectory, 'draft.md'), 'utf8')).resolves.toContain(
      'mock-stage: writer',
    );
    await expect(readFile(path.join(chapterDirectory, 'review.md'), 'utf8')).resolves.toContain(
      'Writer draft received',
    );
    await expect(readFile(path.join(chapterDirectory, 'rewritten.md'), 'utf8')).resolves.toContain(
      'mock-stage: rewriter',
    );
    await expect(readFile(path.join(chapterDirectory, 'chapter.md'), 'utf8')).resolves.toContain(
      '## Key Takeaways',
    );
    const state = JSON.parse(
      await readFile(path.join(workspace.root, 'generated/sample/generation-state.json'), 'utf8'),
    ) as {
      status: string;
      completedStages: string[];
    };
    expect(state.status).toBe('needs_review');
    expect(state.completedStages).toEqual([
      'writer',
      'reviewer',
      'rewriter',
      'validator',
      'publisher',
    ]);
  });

  it('records a failed stage and resumes from the first incomplete stage', async () => {
    const workspace = await createWorkspace();
    const provider = new FailingReviewerProvider();
    const makeGenerator = () =>
      new ChapterGenerator(
        new BookResolver(path.join(workspace.root, 'books')),
        new PromptLoader(path.resolve('prompts')),
        path.resolve('docs/BOOK_STYLE_GUIDE.md'),
        path.join(workspace.root, 'generated'),
        provider,
      );

    await expect(
      makeGenerator().generate({ bookId: 'sample', chapterNumber: 1, providerName: 'mock' }),
    ).rejects.toThrow('failed during reviewer');
    const failedState = JSON.parse(
      await readFile(path.join(workspace.root, 'generated/sample/generation-state.json'), 'utf8'),
    ) as { status: string; failedStage: string; completedStages: string[] };
    expect(failedState.status).toBe('failed');
    expect(failedState.failedStage).toBe('reviewer');
    expect(failedState.completedStages).toEqual(['writer']);

    await makeGenerator().generate({ bookId: 'sample', chapterNumber: 1, providerName: 'mock' });
    expect(provider.calls).toBe(4);
    await expect(
      readFile(path.join(workspace.root, 'generated/sample/chapters/01-first/chapter.md'), 'utf8'),
    ).resolves.toContain('mock-stage: rewriter');
  });

  it('skips a published chapter and creates a backup for force regeneration', async () => {
    const workspace = await createWorkspace();
    const generator = new ChapterGenerator(
      new BookResolver(path.join(workspace.root, 'books')),
      new PromptLoader(path.resolve('prompts')),
      path.resolve('docs/BOOK_STYLE_GUIDE.md'),
      path.join(workspace.root, 'generated'),
      new MockLlmProvider(),
    );
    await generator.generate({ bookId: 'sample', chapterNumber: 1, providerName: 'mock' });
    const skipped = await generator.generate({
      bookId: 'sample',
      chapterNumber: 1,
      providerName: 'mock',
    });
    expect(skipped.skipped).toBe(true);

    await generator.generate({
      bookId: 'sample',
      chapterNumber: 1,
      providerName: 'mock',
      force: true,
    });
    const files = await readdir(path.join(workspace.root, 'generated/sample/chapters/01-first'));
    expect(files.some((file) => file.startsWith('chapter.backup-') && file.endsWith('.md'))).toBe(
      true,
    );
  });
});
