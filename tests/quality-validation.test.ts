import { describe, expect, it } from 'vitest';
import { parseBook } from '../src/domain/book.js';
import { QualityValidator } from '../src/quality/quality-validator.js';

const book = parseBook({
  book: { id: 'sample', title: 'Sample', audience: ['Engineers'] },
  style: { tone: 'direct', includeInterviewQuestions: true, includeExercises: true },
  output: { markdown: true, zip: true },
  chapters: [
    {
      id: 'chapter',
      title: 'Quality Chapter',
      targetWords: 20,
      objectives: ['Explain quality', 'Identify risks', 'Review examples'],
      topics: ['quality'],
      canonicalExample: { name: 'payment', description: 'Payment example', entities: ['Payment'] },
    },
  ],
});
const chapter = book.chapters[0];
if (!chapter) throw new Error('Test chapter is missing.');

describe('QualityValidator', () => {
  it('parses snippet intent and reports missing intent as information', async () => {
    const markdown = `# Quality Chapter\n\n## Why This Matters\nWhy.\n\n## Core Concepts\nConcept.\n\n## Worked Examples\n\n\`\`\`ts intent=standalone example=payment file=payment.ts\nconst payment = 1;\n\`\`\`\n\n## Common Mistakes\nMistake.\n\n## Best Practices\nPractice.\n\n## Interview Questions\n### What is quality?\nA model answer explains the tradeoff.\n\n## Exercises\n### Exercise One\nExpected outcome.\n\n## Key Takeaways\n- Quality is contextual.\n`;
    const report = await new QualityValidator([]).validate(book, chapter, 1, 'sample', markdown);
    expect(report.metrics.codeBlockCount).toBe(1);
    expect(report.markdownFindings.some((finding) => finding.code === 'FENCE_LANGUAGE')).toBe(
      false,
    );
    expect(report.verdict).not.toBe('fail');
  });

  it('detects unclosed fences and duplicate example filenames', async () => {
    const markdown =
      '# Quality Chapter\n\n## Why This Matters\nX\n\n## Core Concepts\nX\n\n## Worked Examples\n```java intent=compilable example=payment file=A.java\nclass A {}\n```\n```java intent=compilable example=payment file=A.java\nclass B {}\n```\n```java\nclass C {}\n\n## Common Mistakes\nX\n\n## Best Practices\nX\n\n## Interview Questions\n### What is quality?\nAnswer.\n\n## Exercises\nX\n\n## Key Takeaways\n- X\n';
    const report = await new QualityValidator([]).validate(book, chapter, 1, 'sample', markdown);
    expect(report.markdownFindings.some((finding) => finding.code === 'UNCLOSED_FENCE')).toBe(true);
    expect(
      report.consistencyFindings.some((finding) => finding.code === 'CONFLICTING_FILENAME'),
    ).toBe(true);
  });

  it('does not count Markdown-looking lines inside code fences as headings', async () => {
    const markdown = `# Quality Chapter\n\n## Why This Matters\nWhy.\n\n## Core Concepts\nConcept.\n\n## Worked Examples\n\n\`\`\`yaml intent=illustrative\nspring:\n  config: # application-local.yaml\n    activate:\n      on-profile: local\n\`\`\`\n\n## Common Mistakes\nMistake.\n\n## Best Practices\nPractice.\n\n## Interview Questions\n### What is quality?\nA model answer explains the tradeoff.\n\n## Exercises\n### Exercise One\nExpected outcome.\n\n## Key Takeaways\n- Quality is contextual.\n`;
    const report = await new QualityValidator([]).validate(book, chapter, 1, 'sample', markdown);
    expect(report.markdownFindings.some((finding) => finding.code === 'CHAPTER_TITLE')).toBe(false);
  });
});
