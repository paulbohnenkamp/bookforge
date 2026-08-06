import type { Book, Chapter } from '../domain/book.js';
import { AppError } from '../errors/app-error.js';

export interface PromptResources {
  styleGuide: string;
  writerPrompt: string;
  reviewerPrompt: string;
  rewriterPrompt: string;
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
  styleGuide: string;
  prompt: string;
}

export interface ReviewerPromptContext {
  chapter: Chapter;
  styleGuide: string;
  prompt: string;
  writerDraft: string;
}

export interface RewriterPromptContext {
  chapter: Chapter;
  styleGuide: string;
  prompt: string;
  writerDraft: string;
  reviewerResponse: string;
}

export class PromptContextBuilder {
  public buildWriterContext(
    book: Book,
    chapter: Chapter,
    resources: PromptResources,
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
      styleGuide: resources.styleGuide,
      prompt: resources.writerPrompt,
    };
  }

  public buildReviewerContext(
    chapter: Chapter,
    resources: PromptResources,
    writerDraft: string,
  ): ReviewerPromptContext {
    this.requireResources(resources, ['styleGuide', 'reviewerPrompt']);
    this.requireText(writerDraft, 'Writer draft');
    return {
      chapter,
      styleGuide: resources.styleGuide,
      prompt: resources.reviewerPrompt,
      writerDraft,
    };
  }

  public buildRewriterContext(
    chapter: Chapter,
    resources: PromptResources,
    writerDraft: string,
    reviewerResponse: string,
  ): RewriterPromptContext {
    this.requireResources(resources, ['styleGuide', 'rewriterPrompt']);
    this.requireText(writerDraft, 'Writer draft');
    this.requireText(reviewerResponse, 'Reviewer response');
    return {
      chapter,
      styleGuide: resources.styleGuide,
      prompt: resources.rewriterPrompt,
      writerDraft,
      reviewerResponse,
    };
  }

  public renderWriter(context: WriterPromptContext): string {
    return [
      'Stage: Writer',
      `Book title: ${context.bookTitle}`,
      `Book subtitle: ${context.bookSubtitle ?? '(none)'}`,
      `Audience: ${context.audience.join(', ') || '(unspecified)'}`,
      `Style: tone=${context.tone}; interview questions=${context.includeInterviewQuestions}; exercises=${context.includeExercises}`,
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `All chapter titles: ${JSON.stringify(context.allChapters)}`,
      `Style guide:\n${context.styleGuide}`,
      `Writer prompt:\n${context.prompt}`,
    ].join('\n\n');
  }

  public renderReviewer(context: ReviewerPromptContext): string {
    return [
      'Stage: Reviewer',
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `Style guide:\n${context.styleGuide}`,
      `Reviewer prompt:\n${context.prompt}`,
      `Writer draft:\n${context.writerDraft}`,
    ].join('\n\n');
  }

  public renderRewriter(context: RewriterPromptContext): string {
    return [
      'Stage: Rewriter',
      `Chapter specification: ${JSON.stringify(context.chapter)}`,
      `Style guide:\n${context.styleGuide}`,
      `Rewriter prompt:\n${context.prompt}`,
      `Writer draft:\n${context.writerDraft}`,
      `Reviewer response:\n${context.reviewerResponse}`,
    ].join('\n\n');
  }

  private requireResources(resources: PromptResources, names: Array<keyof PromptResources>): void {
    for (const name of names) this.requireText(resources[name], name);
  }

  private requireText(value: string, description: string): void {
    if (value.trim().length === 0)
      throw new AppError(`${description} is required before invoking the provider.`);
  }
}
