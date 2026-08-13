import { createHash } from 'node:crypto';
import type { Book, Chapter } from '../domain/book.js';
import {
  JavaValidator,
  PythonValidator,
  TypeScriptValidator,
  type CodeValidator,
  type CodeValidationResult,
  type SnippetIntent,
} from './code-validator.js';

export interface QualityFinding {
  severity: 'error' | 'warning' | 'information';
  code: string;
  message: string;
  line?: number;
}
export interface QualityReport {
  bookId: string;
  chapterNumber: number;
  chapterId: string;
  chapterHash: string;
  generatedAt: string;
  verdict: 'pass' | 'pass_with_warnings' | 'fail';
  summary: { errors: number; warnings: number; information: number };
  markdownFindings: QualityFinding[];
  consistencyFindings: QualityFinding[];
  codeValidation: CodeValidationResult[];
  unresolvedReviewFindings: QualityFinding[];
  metrics: {
    wordCount: number;
    codeBlockCount: number;
    interviewQuestionCount: number;
    exerciseCount: number;
  };
}

interface CodeBlock {
  language: string;
  intent: SnippetIntent;
  exampleId?: string;
  filename?: string;
  content: string;
  line: number;
}

export class QualityValidator {
  public constructor(
    private readonly validators: CodeValidator[] = [
      new JavaValidator(),
      new TypeScriptValidator(),
      new PythonValidator(),
    ],
  ) {}
  public async validate(
    book: Book,
    chapter: Chapter,
    chapterNumber: number,
    bookId: string,
    markdown: string,
    review = '',
  ): Promise<QualityReport> {
    const markdownFindings: QualityFinding[] = [];
    const consistencyFindings: QualityFinding[] = [];
    const lines = markdown.split(/\r?\n/);
    const fencedLineIndexes = this.fencedLineIndexes(lines);
    const headings = lines
      .map((line, index) => ({ line, index: index + 1 }))
      .filter((item) => !fencedLineIndexes.has(item.index - 1))
      .filter((item) => /^#{1,6}\s+/.test(item.line));
    const h1 = headings.filter((item) => /^#\s+/.test(item.line));
    if (h1.length !== 1 || h1[0]?.line.replace(/^#\s+/, '').trim() !== chapter.title)
      markdownFindings.push({
        severity: 'error',
        code: 'CHAPTER_TITLE',
        message: `Expected exactly one # heading matching '${chapter.title}'.`,
      });
    let previous = 0;
    for (const heading of headings) {
      const level = heading.line.match(/^#+/)?.[0].length ?? 0;
      if (level > previous + 1 && previous > 0)
        markdownFindings.push({
          severity: 'warning',
          code: 'HEADING_SKIP',
          message: `Heading level ${level} skips a level at line ${heading.index}.`,
          line: heading.index,
        });
      previous = level;
    }
    const fences = this.parseCodeBlocks(lines, markdownFindings);
    const requiredSections = [
      'Why This Matters',
      'Core Concepts',
      'Worked Examples',
      'Common Mistakes',
      'Best Practices',
      'Key Takeaways',
    ];
    if (book.style.includeInterviewQuestions) requiredSections.splice(5, 0, 'Interview Questions');
    if (book.style.includeExercises)
      requiredSections.splice(book.style.includeInterviewQuestions ? 6 : 5, 0, 'Exercises');
    for (const section of requiredSections)
      if (!new RegExp(`^##\\s+.*${section}`, 'im').test(markdown))
        markdownFindings.push({
          severity: 'error',
          code: 'MISSING_SECTION',
          message: `Required section is missing: ${section}.`,
        });
    if (/\b(?:TODO|FIXME|INSERT|TBD)\b|\.\.\./.test(markdown))
      markdownFindings.push({
        severity: 'warning',
        code: 'PLACEHOLDER_TEXT',
        message: 'Possible placeholder text remains.',
      });
    if (/^#{1,6}\s+(.+)\n\s*\1\s*$/m.test(markdown))
      markdownFindings.push({
        severity: 'warning',
        code: 'EMPTY_SECTION',
        message: 'A heading appears to have no meaningful content.',
      });
    if (/\n{4,}/.test(markdown))
      markdownFindings.push({
        severity: 'warning',
        code: 'EXCESSIVE_BLANK_LINES',
        message: 'More than two consecutive blank lines were found.',
      });
    if (
      (chapter.objectives ?? []).some(
        (objective) =>
          !markdown
            .toLowerCase()
            .includes(objective.toLowerCase().split(' ').slice(0, 3).join(' ')),
      )
    )
      markdownFindings.push({
        severity: 'warning',
        code: 'OBJECTIVE_COVERAGE',
        message: 'One or more chapter objectives were not clearly found; review manually.',
      });
    if (book.style.includeInterviewQuestions && !/^### .*\?/m.test(markdown))
      markdownFindings.push({
        severity: 'error',
        code: 'INTERVIEW_ANSWERS',
        message: 'Interview questions must include model answers.',
      });
    if (book.style.includeExercises && !/##\s+Exercises/i.test(markdown))
      markdownFindings.push({
        severity: 'error',
        code: 'EXERCISES',
        message: 'Exercises are required by the book style.',
      });
    const words = markdown.split(/\s+/).filter(Boolean).length;
    const min = Math.floor(chapter.targetWords * 0.8),
      max = Math.ceil(chapter.targetWords * 1.2);
    if (words < min || words > max)
      markdownFindings.push({
        severity: 'warning',
        code: 'WORD_COUNT',
        message: `Word count ${words} is outside the guidance range ${min}-${max}.`,
      });
    this.checkConsistency(fences, chapter, consistencyFindings);
    const codeValidation: CodeValidationResult[] = [];
    for (const group of this.groupBlocks(fences)) {
      const validator = this.validators.find((item) => item.supports(group[0]?.language ?? ''));
      if (validator)
        codeValidation.push(
          await validator.validate({
            language: group[0]?.language ?? '',
            intent: group[0]?.intent ?? 'illustrative',
            ...(group[0]?.exampleId ? { exampleId: group[0].exampleId } : {}),
            files: group.map((item) => ({
              ...(item.filename ? { filename: item.filename } : {}),
              content: item.content,
            })),
          }),
        );
      else
        codeValidation.push({
          validator: 'none',
          executed: false,
          findings: [
            {
              severity: 'information',
              code: 'VALIDATOR_UNAVAILABLE',
              message: `No validator is configured for ${group[0]?.language ?? 'unknown'}.`,
            },
          ],
        });
    }
    const unresolvedReviewFindings = review.trim()
      ? [
          {
            severity: 'information' as const,
            code: 'REVIEW_REQUIRES_HUMAN_JUDGMENT',
            message: 'Review response is preserved for human follow-up.',
          },
        ]
      : [];
    const all = [
      ...markdownFindings,
      ...consistencyFindings,
      ...codeValidation.flatMap((item) => item.findings),
      ...unresolvedReviewFindings,
    ];
    const errors = all.filter((item) => item.severity === 'error').length,
      warnings = all.filter((item) => item.severity === 'warning').length,
      information = all.filter((item) => item.severity === 'information').length;
    return {
      bookId,
      chapterNumber,
      chapterId: chapter.id,
      chapterHash: createHash('sha256').update(markdown).digest('hex'),
      generatedAt: new Date().toISOString(),
      verdict: errors ? 'fail' : warnings ? 'pass_with_warnings' : 'pass',
      summary: { errors, warnings, information },
      markdownFindings,
      consistencyFindings,
      codeValidation,
      unresolvedReviewFindings,
      metrics: {
        wordCount: words,
        codeBlockCount: fences.length,
        interviewQuestionCount: (markdown.match(/^### .*\?/gm) ?? []).length,
        exerciseCount: (markdown.match(/^### Exercise /gim) ?? []).length,
      },
    };
  }
  public renderMarkdown(report: QualityReport): string {
    const lines = [
      `# Quality Report`,
      ``,
      `Verdict: **${report.verdict}**`,
      ``,
      `Errors: ${report.summary.errors}; warnings: ${report.summary.warnings}; information: ${report.summary.information}`,
      ``,
      `Metrics: ${report.metrics.wordCount} words, ${report.metrics.codeBlockCount} code blocks.`,
      ``,
      `## Findings`,
    ];
    for (const finding of [
      ...report.markdownFindings,
      ...report.consistencyFindings,
      ...report.unresolvedReviewFindings,
    ])
      lines.push(`- **${finding.severity}** \`${finding.code}\`: ${finding.message}`);
    lines.push('', '## Code validation');
    for (const result of report.codeValidation)
      lines.push(
        `- ${result.validator}: ${result.executed ? (result.success ? 'success' : 'failed') : 'not executed'}`,
      );
    lines.push(
      '',
      '> Heuristic findings support editorial review; they do not prove technical correctness.',
    );
    return `${lines.join('\n')}\n`;
  }
  private parseCodeBlocks(lines: string[], findings: QualityFinding[]): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let open: { language: string; metadata: string; content: string[]; line: number } | undefined;
    lines.forEach((line, index) => {
      const match = line.match(/^```(.*)$/);
      if (match && !open) {
        const parts = match[1]?.trim().split(/\s+/) ?? [];
        const language = parts.shift() ?? '';
        if (!language)
          findings.push({
            severity: 'error',
            code: 'FENCE_LANGUAGE',
            message: `Code fence at line ${index + 1} has no language identifier.`,
            line: index + 1,
          });
        open = {
          language: language || 'unknown',
          metadata: parts.join(' '),
          content: [],
          line: index + 1,
        };
      } else if (match && open) {
        const metadata = Object.fromEntries(
          open.metadata
            .split(/\s+/)
            .filter((item) => item.includes('='))
            .map((item) => {
              const [key, ...value] = item.split('=');
              return [key, value.join('=').replace(/^"|"$/g, '')];
            }),
        );
        if (!metadata.intent)
          findings.push({
            severity: 'information',
            code: 'INFERRED_SNIPPET_INTENT',
            message: `Snippet at line ${open.line} has no intent; treating it as illustrative.`,
            line: open.line,
          });
        blocks.push({
          language: open.language,
          intent: (metadata.intent as SnippetIntent | undefined) ?? 'illustrative',
          ...(metadata.example ? { exampleId: metadata.example } : {}),
          ...(metadata.file ? { filename: metadata.file } : {}),
          content: open.content.join('\n'),
          line: open.line,
        });
        open = undefined;
      } else if (open) open.content.push(line);
    });
    if (open)
      findings.push({
        severity: 'error',
        code: 'UNCLOSED_FENCE',
        message: `Code fence at line ${open.line} is not closed.`,
        line: open.line,
      });
    return blocks;
  }
  private fencedLineIndexes(lines: string[]): Set<number> {
    const indexes = new Set<number>();
    let inside = false;
    lines.forEach((line, index) => {
      if (/^```/.test(line)) {
        indexes.add(index);
        inside = !inside;
      } else if (inside) indexes.add(index);
    });
    return indexes;
  }
  private groupBlocks(blocks: CodeBlock[]): CodeBlock[][] {
    const groups: CodeBlock[][] = [];
    for (const block of blocks.filter((item) => item.intent === 'compilable')) {
      const existing = block.exampleId
        ? groups.find((group) => group[0]?.exampleId === block.exampleId)
        : undefined;
      if (existing) existing.push(block);
      else groups.push([block]);
    }
    return groups;
  }
  private checkConsistency(
    blocks: CodeBlock[],
    chapter: Chapter,
    findings: QualityFinding[],
  ): void {
    const exampleFiles = new Map<string, Map<string, string>>();
    const declarations = new Map<string, { signature: string; line: number }>();
    const finalTypes = new Set<string>();
    for (const block of blocks) {
      if (block.exampleId && block.filename) {
        const files = exampleFiles.get(block.exampleId) ?? new Map<string, string>();
        const priorContent = files.get(block.filename);
        if (priorContent && priorContent !== block.content)
          findings.push({
            severity: 'warning',
            code: 'CONFLICTING_FILENAME',
            message: `Example '${block.exampleId}' declares '${block.filename}' with conflicting content.`,
            line: block.line,
          });
        files.set(block.filename, block.content);
        exampleFiles.set(block.exampleId, files);
      }
      for (const match of block.content.matchAll(
        /\b(?:public\s+)?(?:(final)\s+)?(class|record|interface|enum)\s+(\w+)([^{]*)\{/g,
      )) {
        const name = match[3] ?? '';
        const signature = `${match[2]} ${name} ${(match[4] ?? '').replace(/\s+/g, ' ').trim()}`;
        const prior = declarations.get(name);
        if (prior && prior.signature !== signature)
          findings.push({
            severity: 'warning',
            code: 'DUPLICATE_TYPE_DEFINITION',
            message: `Type '${name}' is declared with incompatible signatures at lines ${prior.line} and ${block.line}.`,
            line: block.line,
          });
        else if (!prior) declarations.set(name, { signature, line: block.line });
        if (match[1]) finalTypes.add(name);
      }
      for (const match of block.content.matchAll(/\bextends\s+(\w+)/g)) {
        const parent = match[1];
        if (parent && finalTypes.has(parent))
          findings.push({
            severity: 'warning',
            code: 'ILLEGAL_INHERITANCE',
            message: `Snippet extends final type '${parent}'.`,
            line: block.line,
          });
      }
    }
    for (const entity of chapter.canonicalExample?.entities ?? [])
      if (!new RegExp(`\\b${entity}\\b`).test(blocks.map((item) => item.content).join('\n')))
        findings.push({
          severity: 'warning',
          code: 'CANONICAL_ENTITY_MISSING',
          message: `Canonical entity '${entity}' was not found in code examples.`,
        });
  }
}
