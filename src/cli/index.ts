#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/config.js';
import { errorMessage, AppError } from '../errors/app-error.js';
import { BookLoader } from '../loaders/book-loader.js';
import { ConsoleLogger } from '../logging/logger.js';

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
    .description('Generate chapters (available in a later milestone)')
    .argument('<bookId>', 'book identifier')
    .action(() => {
      throw new AppError(
        'Chapter generation is not part of Milestone 1.',
        'Use validate to check a book specification.',
      );
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
