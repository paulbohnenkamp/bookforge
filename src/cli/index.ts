#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/config.js';
import { errorMessage, AppError } from '../errors/app-error.js';
import { BookLoader } from '../loaders/book-loader.js';
import { ConsoleLogger } from '../logging/logger.js';
import { BookResolver } from '../generator/book-resolver.js';
import { ChapterGenerator } from '../generator/chapter-generator.js';
import { PromptLoader } from '../loaders/prompt-loader.js';
import { createProvider } from '../llm/provider-factory.js';
import { FullBookGenerator } from '../generator/full-book-generator.js';
import { BookStatusReporter } from '../generator/book-status.js';
import { BookAssembler } from '../generator/book-assembler.js';
import { ZipExporter } from '../generator/zip-exporter.js';
import { BookCleaner } from '../generator/book-cleaner.js';

interface GenerateCommandOptions {
  chapter?: string;
  from?: string;
  to?: string;
  provider?: string;
  force: boolean;
  verbose: boolean;
  continueOnError: boolean;
}

interface StatusCommandOptions {
  json: boolean;
}

interface AssembleCommandOptions {
  allowIncomplete: boolean;
}

interface CleanCommandOptions {
  chapter?: string;
  all: boolean;
  force: boolean;
  dryRun: boolean;
}

function parsePositiveNumber(value: string | undefined, option: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${option} must be a positive integer.`);
  }
  return parsed;
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
    .description('Generate one chapter or a sequential range through the chapter workflow')
    .argument('<bookId>', 'book identifier')
    .option('--chapter <number>', 'one-based chapter number')
    .option('--from <number>', 'first one-based chapter number in a range')
    .option('--to <number>', 'last one-based chapter number in a range')
    .option('--provider <provider>', 'LLM provider: mock or openai')
    .option('--force', 'regenerate all stages and back up an existing published chapter')
    .option('--verbose', 'enable debug logging')
    .option('--continue-on-error', 'continue to later chapters after a chapter failure')
    .action(async (bookId: string, options: GenerateCommandOptions) => {
      const chapterNumber = parsePositiveNumber(options.chapter, '--chapter');
      const from = parsePositiveNumber(options.from, '--from');
      const to = parsePositiveNumber(options.to, '--to');
      if (chapterNumber !== undefined && (from !== undefined || to !== undefined)) {
        throw new AppError('--chapter cannot be combined with --from or --to.');
      }
      const config = loadConfig(process.env);
      const logger = new ConsoleLogger(options.verbose ? 'debug' : config.logLevel);
      const providerName = options.provider ?? config.defaultProvider;
      const provider = createProvider(providerName, config, logger);
      const controller = new AbortController();
      const onSigint = (): void => {
        logger.warn('Interrupt received. Preserving completed artifacts and stopping generation.');
        controller.abort();
      };
      process.once('SIGINT', onSigint);
      const generator = new ChapterGenerator(
        new BookResolver(config.booksDirectory),
        new PromptLoader(config.promptsDirectory),
        config.styleGuidePath,
        config.generatedDirectory,
        provider,
        undefined,
        undefined,
        logger,
      );
      try {
        if (chapterNumber !== undefined) {
          await generator.generate({
            bookId,
            chapterNumber,
            providerName,
            force: options.force,
            signal: controller.signal,
          });
        } else {
          const result = await new FullBookGenerator(
            new BookResolver(config.booksDirectory),
            generator,
            config.generatedDirectory,
            logger,
          ).generate({
            bookId,
            providerName,
            ...(from === undefined ? {} : { from }),
            ...(to === undefined ? {} : { to }),
            ...(options.force ? { force: true } : {}),
            ...(options.continueOnError ? { continueOnError: true } : {}),
            signal: controller.signal,
          });
          if (result.failed.length > 0) {
            throw new AppError(
              `Full-book generation finished with ${result.failed.length} failed chapter(s).`,
              'Review generation-state.json and rerun to resume.',
            );
          }
        }
      } finally {
        process.removeListener('SIGINT', onSigint);
      }
    });

  program
    .command('status')
    .description('Show generation status for every chapter in a book')
    .argument('<bookId>', 'book identifier')
    .option('--json', 'print machine-readable JSON')
    .action(async (bookId: string, options: StatusCommandOptions) => {
      const config = loadConfig(process.env);
      const status = await new BookStatusReporter(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).getStatus(bookId);
      if (options.json) console.log(JSON.stringify(status, null, 2));
      else
        console.log(
          new BookStatusReporter(
            new BookResolver(config.booksDirectory),
            config.generatedDirectory,
          ).render(status),
        );
    });

  program
    .command('assemble')
    .description('Assemble published chapters into Markdown publication files')
    .argument('<bookId>', 'book identifier')
    .option('--allow-incomplete', 'assemble only published chapters and mark output incomplete')
    .action(async (bookId: string, options: AssembleCommandOptions) => {
      const config = loadConfig(process.env);
      const result = await new BookAssembler(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).assemble({ bookId, allowIncomplete: options.allowIncomplete });
      console.log(
        `Assembled ${result.publishedChapters.length} chapter(s): ${result.combinedPath}`,
      );
    });

  program
    .command('export')
    .description('Export the complete assembled book as a ZIP archive')
    .argument('<bookId>', 'book identifier')
    .action(async (bookId: string) => {
      const config = loadConfig(process.env);
      const resolved = await new BookResolver(config.booksDirectory).resolve(bookId, 1);
      await new BookAssembler(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).assemble({ bookId });
      const result = await new ZipExporter(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).export({ bookId, title: resolved.book.book.title });
      console.log(`Exported ${result.entries.length} entries: ${result.archivePath}`);
    });

  program
    .command('clean')
    .description('Safely remove generated artifacts for an explicit chapter or book')
    .argument('<bookId>', 'book identifier')
    .option('--chapter <number>', 'one-based chapter number')
    .option('--all', 'remove all generated artifacts for this book')
    .option('--force', 'allow removal of manually modified published chapters')
    .option('--dry-run', 'show paths without removing them')
    .action(async (bookId: string, options: CleanCommandOptions) => {
      const config = loadConfig(process.env);
      const chapterNumber = parsePositiveNumber(options.chapter, '--chapter');
      const result = await new BookCleaner(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).clean({
        bookId,
        ...(chapterNumber === undefined ? {} : { chapterNumber }),
        ...(options.all ? { all: true } : {}),
        ...(options.force ? { force: true } : {}),
        ...(options.dryRun ? { dryRun: true } : {}),
      });
      for (const removed of result.removed)
        console.log(`${result.dryRun ? 'Would remove' : 'Removed'}: ${removed}`);
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
