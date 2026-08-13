import type { Book, Chapter } from '../domain/book.js';
import { AppError } from '../errors/app-error.js';

export interface PromptResources {
  styleGuide: string;
  writerPrompt: string;
  reviewerPrompt: string;
  rewriterPrompt: string;
  bookPrompt?: string;
}

export interface WriterPromptContext {
  bookTitle: string;
  bookSubtitle: string | undefined;
  audience: string[];
  tone: string;
  includeInterviewQuestions: boolean;
  includeExercises: boolean;
  chapter: Chapter;
  allChapters: Array<{ number: number; id: string; title: string }>;
  previousChapters: Array<{ number: number; title: string; summary?: string }>;
  styleGuide: string;
  prompt: string;
  story: Book['story'];
  learning: Book['learning'];
  bookPrompt?: string;
}

export interface ReviewerPromptContext {
  chapter: Chapter;
  audience: string[];
  includeInterviewQuestions: boolean;
  includeExercises: boolean;
  allChapters: Array<{ number: number; id: string; title: string }>;
  previousChapters: Array<{ number: number; title: string; summary?: string }>;
  styleGuide: string;
  prompt: string;
  writerDraft: string;
  story: Book['story'];
  learning: Book['learning'];
  bookPrompt?: string;
}

export interface RewriterPromptContext {
  chapter: Chapter;
  audience: string[];
  includeInterviewQuestions: boolean;
  includeExercises: boolean;
  previousChapters: Array<{ number: number; title: string; summary?: string }>;
  styleGuide: string;
  prompt: string;
  writerDraft: string;
  reviewerResponse: string;
  story: Book['story'];
  learning: Book['learning'];
  bookPrompt?: string;
}

export class PromptContextBuilder {
  public buildWriterContext(
    book: Book,
    chapter: Chapter,
    resources: PromptResources,
    previousChapters: Array<{ number: number; title: string; summary?: string }> = [],
  ): WriterPromptContext {
    this.requireResources(resources, ['styleGuide', 'writerPrompt']);
    return {
      bookTitle: book.book.title,
      bookSubtitle: book.book.subtitle,
      audience: book.book.audience ?? [],
      tone: book.style.tone,
      includeInterviewQuestions: book.style.includeInterviewQuestions,
      includeExercises: book.style.includeExercises,
      chapter,
      allChapters: book.chapters.map((item, index) => ({
        number: index + 1,
        id: item.id,
        title: item.title,
      })),
      previousChapters,
      styleGuide: resources.styleGuide,
      prompt: resources.writerPrompt,
      story: book.story,
      learning: book.learning,
      ...(resources.bookPrompt ? { bookPrompt: resources.bookPrompt } : {}),
    };
  }

  public buildReviewerContext(
    book: Book,
    chapter: Chapter,
    resources: PromptResources,
    writerDraft: string,
    previousChapters?: Array<{ number: number; title: string; summary?: string }>,
  ): ReviewerPromptContext;
  public buildReviewerContext(
    chapter: Chapter,
    resources: PromptResources,
    writerDraft: string,
  ): ReviewerPromptContext;
  public buildReviewerContext(
    first: Book | Chapter,
    second: Chapter | PromptResources,
    third: PromptResources | string,
    fourth?: string | Array<{ number: number; title: string; summary?: string }>,
    fifth: Array<{ number: number; title: string; summary?: string }> = [],
  ): ReviewerPromptContext {
    const isBook = 'book' in first;
    const book = isBook ? first : undefined;
    const chapter = (isBook ? second : first) as Chapter;
    const resources = (isBook ? third : second) as PromptResources;
    const writerDraft = (isBook ? fourth : third) as string;
    const previousChapters = isBook ? fifth : [];
    this.requireResources(resources, ['styleGuide', 'reviewerPrompt']);
    this.requireText(writerDraft, 'Writer draft');
    return {
      chapter,
      audience: book?.book.audience ?? [],
      includeInterviewQuestions: book?.style.includeInterviewQuestions ?? true,
      includeExercises: book?.style.includeExercises ?? true,
      allChapters: book?.chapters.map((item, index) => ({
        number: index + 1,
        id: item.id,
        title: item.title,
      })) ?? [{ number: 1, id: chapter.id, title: chapter.title }],
      previousChapters,
      styleGuide: resources.styleGuide,
      prompt: resources.reviewerPrompt,
      writerDraft,
      story: book?.story,
      learning: book?.learning,
      ...(resources.bookPrompt ? { bookPrompt: resources.bookPrompt } : {}),
    };
  }

  public buildRewriterContext(
    book: Book,
    chapter: Chapter,
    resources: PromptResources,
    writerDraft: string,
    reviewerResponse: string,
    previousChapters: Array<{ number: number; title: string; summary?: string }> = [],
  ): RewriterPromptContext {
    this.requireResources(resources, ['styleGuide', 'rewriterPrompt']);
    this.requireText(writerDraft, 'Writer draft');
    this.requireText(reviewerResponse, 'Reviewer response');
    return {
      chapter,
      audience: book.book.audience ?? [],
      includeInterviewQuestions: book.style.includeInterviewQuestions,
      includeExercises: book.style.includeExercises,
      previousChapters,
      styleGuide: resources.styleGuide,
      prompt: resources.rewriterPrompt,
      writerDraft,
      reviewerResponse,
      story: book.story,
      learning: book.learning,
      ...(resources.bookPrompt ? { bookPrompt: resources.bookPrompt } : {}),
    };
  }

  public renderWriter(context: WriterPromptContext): string {
    return [
      'Stage: Writer',
      'Generation intent: write the actual chapter content described by this specification. Do not write about BookForge, YAML, the generation workflow, or the act of creating this book unless the chapter specification explicitly makes that its subject.',
      `Book title: ${context.bookTitle}`,
      `Book subtitle: ${context.bookSubtitle ?? '(none)'}`,
      `Audience: ${context.audience.join(', ') || '(unspecified)'}`,
      `Style: tone=${context.tone}; interview questions=${context.includeInterviewQuestions}; exercises=${context.includeExercises}`,
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `Book story contract: ${JSON.stringify(context.story ?? null)}`,
      `Learning contract: ${JSON.stringify(context.learning ?? null)}`,
      ...(context.bookPrompt ? [`Book-specific production brief:\n${context.bookPrompt}`] : []),
      `Canonical example guidance: ${JSON.stringify(context.chapter.canonicalExample ?? null)}`,
      `All chapter titles: ${JSON.stringify(context.allChapters)}`,
      `Previously published chapter summaries: ${JSON.stringify(context.previousChapters)}`,
      `Style guide:\n${context.styleGuide}`,
      `Writer prompt:\n${context.prompt}`,
    ].join('\n\n');
  }

  public renderReviewer(context: ReviewerPromptContext): string {
    return [
      'Stage: Reviewer',
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `Book story contract: ${JSON.stringify(context.story ?? null)}`,
      `Learning contract: ${JSON.stringify(context.learning ?? null)}`,
      ...(context.bookPrompt ? [`Book-specific production brief:\n${context.bookPrompt}`] : []),
      `Audience: ${context.audience.join(', ') || '(unspecified)'}`,
      `Style: interview questions=${context.includeInterviewQuestions}; exercises=${context.includeExercises}`,
      `All chapter titles: ${JSON.stringify(context.allChapters)}`,
      `Previous chapter summaries: ${JSON.stringify(context.previousChapters)}`,
      `Book story contract: ${JSON.stringify(context.story ?? null)}`,
      `Learning contract: ${JSON.stringify(context.learning ?? null)}`,
      `Canonical example guidance: ${JSON.stringify(context.chapter.canonicalExample ?? null)}`,
      ...(context.bookPrompt ? [`Book-specific production brief:\n${context.bookPrompt}`] : []),
      `Style guide:\n${context.styleGuide}`,
      `Reviewer prompt:\n${context.prompt}`,
      `Writer draft:\n${context.writerDraft}`,
    ].join('\n\n');
  }

  public renderRewriter(context: RewriterPromptContext): string {
    return [
      'Stage: Rewriter',
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `Audience: ${context.audience.join(', ') || '(unspecified)'}`,
      `Style: interview questions=${context.includeInterviewQuestions}; exercises=${context.includeExercises}`,
      `Previous chapter summaries: ${JSON.stringify(context.previousChapters)}`,
      `Canonical example guidance: ${JSON.stringify(context.chapter.canonicalExample ?? null)}`,
      `Style guide:\n${context.styleGuide}`,
      `Rewriter prompt:\n${context.prompt}`,
      `Writer draft:\n${context.writerDraft}`,
      `Reviewer response:\n${context.reviewerResponse}`,
    ].join('\n\n');
  }

  private requireResources(
    resources: PromptResources,
    names: Array<'styleGuide' | 'writerPrompt' | 'reviewerPrompt' | 'rewriterPrompt'>,
  ): void {
    for (const name of names) this.requireText(resources[name], name);
  }

  private requireText(value: string, description: string): void {
    if (value.trim().length === 0)
      throw new AppError(`${description} is required before invoking the provider.`);
  }
}
