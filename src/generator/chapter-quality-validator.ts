import { AppError } from '../errors/app-error.js';

const requiredSections = [
  'Why This Matters',
  'Core Concepts',
  'Worked Examples',
  'Common Mistakes',
  'Best Practices',
  'Interview Questions',
  'Exercises',
  'Key Takeaways',
];

export interface ChapterQualityRequirements {
  title: string;
  targetWords: number;
}

export class ChapterQualityValidator {
  public validate(markdown: string, requirements: ChapterQualityRequirements): void {
    const content = markdown.trim();
    if (content.length === 0) throw new AppError('Rewritten chapter is empty.');
    if (/^```(?:markdown|md)?\s*$/i.test(content.split('\n')[0] ?? '')) {
      throw new AppError(
        'Rewritten chapter is wrapped in an outer Markdown code fence.',
        'Return raw Markdown without a surrounding ```markdown fence.',
      );
    }

    const topLevelHeadings = [...content.matchAll(/^# (.+)$/gm)].map((match) => match[1]?.trim());
    if (topLevelHeadings.length !== 1 || topLevelHeadings[0] !== requirements.title) {
      throw new AppError(
        `Rewritten chapter must contain exactly one top-level heading matching '${requirements.title}'.`,
      );
    }

    const missingSections = requiredSections.filter(
      (section) => !new RegExp(`^## ${this.escapeRegExp(section)}\\s*$`, 'm').test(content),
    );
    if (missingSections.length > 0) {
      throw new AppError(
        `Rewritten chapter is missing required sections: ${missingSections.join(', ')}.`,
      );
    }

    const wordCount = content.split(/\s+/u).filter(Boolean).length;
    const minimumWordCount = Math.ceil(requirements.targetWords * 0.8);
    if (wordCount < minimumWordCount) {
      throw new AppError(
        `Rewritten chapter is too short: ${wordCount} words; expected at least ${minimumWordCount}.`,
        'Regenerate the chapter with enough depth to meet the configured target.',
      );
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
