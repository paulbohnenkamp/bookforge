#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/config.js';
import { errorMessage, AppError } from '../errors/app-error.js';
import { BookLoader } from '../loaders/book-loader.js';
import { ConsoleLogger } from '../logging/logger.js';
import { BookResolver } from '../generator/book-resolver.js';
import { ChapterGenerator } from '../generator/chapter-generator.js';
import { MockLlmProvider } from '../llm/mock-llm-provider.js';
import { PromptLoader } from '../loaders/prompt-loader.js';

interface GenerateCommandOptions {
  chapter: string;
  provider: string;
  force: boolean;
  verbose: boolean;
}

export function createCli(): Command {
  const program = new Command();
  program
    .name('bookforge')
    .description('Validate and generate books from YAML specifications.')
    .version('0.1.0');

  program
    .command('validate')
    .description('Validate a book YAML specification')
    .argument('<path>', 'path to book.yaml')
    .action(async (filePath: string) => {
      const config = loadConfig(process.env);
      const logger = new ConsoleLogger(config.logLevel);
      const book = await new BookLoader().load(filePath);
      logger.info(`Valid book: ${book.book.id} (${book.chapters.length} chapters)`);
    });

  program
    .command('generate')
    .description('Generate one chapter through the local Writer, Reviewer, and Rewriter workflow')
    .argument('<bookId>', 'book identifier')
    .requiredOption('--chapter <number>', 'one-based chapter number')
    .option('--provider <provider>', 'LLM provider (only mock is available)', 'mock')
    .option('--force', 'regenerate all stages and back up an existing published chapter')
    .option('--verbose', 'enable debug logging')
    .action(async (bookId: string, options: GenerateCommandOptions) => {
      const chapterNumber = Number(options.chapter);
      if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
        throw new AppError(
          'Chapter must be a positive integer.',
          'Use a command such as --chapter 1.',
        );
      }
      const config = loadConfig(process.env);
      const logger = new ConsoleLogger(options.verbose ? 'debug' : config.logLevel);
      const generator = new ChapterGenerator(
        new BookResolver(config.booksDirectory),
        new PromptLoader(config.promptsDirectory),
        config.styleGuidePath,
        config.generatedDirectory,
        new MockLlmProvider(),
        undefined,
        undefined,
        logger,
      );
      await generator.generate({
        bookId,
        chapterNumber,
        providerName: options.provider,
        force: options.force,
      });
    });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createCli()
    .parseAsync()
    .catch((error: unknown) => {
      const appError = error instanceof AppError ? error : new AppError(errorMessage(error));
      console.error(`Error: ${appError.message}`);
      if (appError.suggestion) console.error(`Fix: ${appError.suggestion}`);
      if (loadConfig(process.env).debug && appError.cause instanceof Error)
        console.error(appError.cause.stack);
      process.exitCode = 1;
    });
}
