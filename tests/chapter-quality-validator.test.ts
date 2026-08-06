import { describe, expect, it } from 'vitest';
import { ChapterQualityValidator } from '../src/generator/chapter-quality-validator.js';

const validator = new ChapterQualityValidator();
const sections = [
  'Why This Matters',
  'Core Concepts',
  'Worked Examples',
  'Common Mistakes',
  'Best Practices',
  'Interview Questions',
  'Exercises',
  'Key Takeaways',
];
const validChapter = `# Sample Chapter\n\n${sections.map((section) => `## ${section}\n\n${'Useful chapter content '.repeat(30)}`).join('\n\n')}`;

describe('ChapterQualityValidator', () => {
  it('accepts a structurally complete chapter at the minimum target length', () => {
    expect(() =>
      validator.validate(validChapter, { title: 'Sample Chapter', targetWords: 250 }),
    ).not.toThrow();
  });

  it('rejects an outer Markdown fence', () => {
    expect(() =>
      validator.validate(`\`\`\`markdown\n${validChapter}\n\`\`\``, {
        title: 'Sample Chapter',
        targetWords: 250,
      }),
    ).toThrow('outer Markdown code fence');
  });

  it('rejects missing sections and an incorrect title', () => {
    expect(() =>
      validator.validate('# Other Title\n\n## Why This Matters', {
        title: 'Sample Chapter',
        targetWords: 1,
      }),
    ).toThrow('top-level heading');
    expect(() =>
      validator.validate('# Sample Chapter\n\n## Why This Matters', {
        title: 'Sample Chapter',
        targetWords: 1,
      }),
    ).toThrow('missing required sections');
  });

  it('rejects chapters below 80 percent of the target', () => {
    expect(() =>
      validator.validate(
        '# Sample Chapter\n\n' + sections.map((section) => `## ${section}`).join('\n'),
        {
          title: 'Sample Chapter',
          targetWords: 1000,
        },
      ),
    ).toThrow('too short');
  });
});
