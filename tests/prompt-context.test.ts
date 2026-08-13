import { describe, expect, it } from 'vitest';
import { parseBook, type Chapter } from '../src/domain/book.js';
import { PromptContextBuilder, type PromptResources } from '../src/generator/prompt-context.js';

const book = parseBook({
  book: { id: 'sample', title: 'Sample Book', subtitle: 'A subtitle', audience: ['Engineers'] },
  style: { tone: 'direct', includeInterviewQuestions: true, includeExercises: false },
  output: { markdown: true, zip: false },
  chapters: [
    {
      id: 'first',
      title: 'First Topic',
      targetWords: 100,
      objectives: ['Explain the topic', 'Compare approaches', 'Apply the ideas'],
      topics: ['Topic fundamentals'],
    },
    {
      id: 'second',
      title: 'Second Topic',
      targetWords: 200,
      objectives: ['Explain the topic', 'Compare approaches', 'Apply the ideas'],
      topics: ['Topic fundamentals'],
    },
  ],
});
const chapter: Chapter =
  book.chapters[0] ??
  (() => {
    throw new Error('Test book has no chapters');
  })();
const resources: PromptResources = {
  styleGuide: 'STYLE GUIDE',
  writerPrompt: 'WRITER PROMPT',
  reviewerPrompt: 'REVIEWER PROMPT',
  rewriterPrompt: 'REWRITER PROMPT',
};

describe('PromptContextBuilder', () => {
  it('includes the writer context required by the workflow', () => {
    const builder = new PromptContextBuilder();
    const context = builder.buildWriterContext(book, chapter, resources);
    const rendered = builder.renderWriter(context);
    expect(context.allChapters).toEqual([
      { number: 1, id: 'first', title: 'First Topic' },
      { number: 2, id: 'second', title: 'Second Topic' },
    ]);
    expect(rendered).toContain('Sample Book');
    expect(rendered).toContain('STYLE GUIDE');
    expect(rendered).toContain('WRITER PROMPT');
    expect(rendered).toContain('Second Topic');
    expect(rendered).toContain('write the actual chapter content described by this specification');
    expect(rendered).toContain('Do not write about BookForge');
  });

  it('rejects an empty prior-stage response', () => {
    expect(() => new PromptContextBuilder().buildReviewerContext(chapter, resources, '  ')).toThrow(
      'Writer draft is required',
    );
  });
});
