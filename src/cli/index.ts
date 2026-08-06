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
import { HumanReviewService } from '../generator/human-review.js';
import { QualityValidator } from '../quality/quality-validator.js';
import { GenerationStateStore } from '../generator/generation-state.js';
import { chapterDirectoryPath, filesystemSlug } from '../generator/paths.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AtomicFileWriter } from '../generator/atomic-file-writer.js';
import { PlaywrightPdfRenderer, defaultPdfCss } from '../export/pdf-renderer.js';

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
  verbose: boolean;
}

interface AssembleCommandOptions {
  allowIncomplete: boolean;
  includeNeedsReview: boolean;
}

interface ExportCommandOptions {
  format: 'zip' | 'pdf' | 'all';
  includeNeedsReview: boolean;
}
interface ReviewCommandOptions {
  chapter: string;
  by?: string;
  notes?: string;
  reason?: string;
}
interface QualityCommandOptions {
  chapter?: string;
  all: boolean;
  strict: boolean;
  json: boolean;
  verbose: boolean;
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
    .option('--force', 'regenerate all stages and back up existing chapter content')
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
    .option('--verbose', 'show quality and approval details')
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
    .command('review-status')
    .description('Show human review status for a book')
    .argument('<bookId>')
    .action(async (bookId: string) => {
      const config = loadConfig(process.env);
      const reporter = new BookStatusReporter(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      );
      console.log(reporter.render(await reporter.getStatus(bookId)));
    });

  program
    .command('approve')
    .description('Approve a chapter after human review')
    .argument('<bookId>')
    .requiredOption('--chapter <number>')
    .option('--by <name>')
    .option('--notes <text>')
    .action(async (bookId: string, options: ReviewCommandOptions) => {
      const config = loadConfig(process.env);
      await new HumanReviewService(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).approve(
        bookId,
        parsePositiveNumber(options.chapter, '--chapter') ?? 0,
        options.by,
        options.notes,
      );
      console.log(`Approved chapter ${options.chapter}.`);
    });
  program
    .command('reject')
    .description('Reject a chapter after human review')
    .argument('<bookId>')
    .requiredOption('--chapter <number>')
    .requiredOption('--reason <text>')
    .option('--by <name>')
    .option('--notes <text>')
    .action(async (bookId: string, options: ReviewCommandOptions) => {
      const config = loadConfig(process.env);
      await new HumanReviewService(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).reject(
        bookId,
        parsePositiveNumber(options.chapter, '--chapter') ?? 0,
        options.reason ?? '',
        options.by,
        options.notes,
      );
      console.log(`Rejected chapter ${options.chapter}.`);
    });

  program
    .command('quality')
    .description('Validate generated chapter quality')
    .argument('<bookId>')
    .option('--chapter <number>')
    .option('--all')
    .option('--strict')
    .option('--json')
    .option('--verbose')
    .action(async (bookId: string, options: QualityCommandOptions) => {
      const config = loadConfig(process.env);
      const resolver = new BookResolver(config.booksDirectory);
      const resolved = await resolver.resolve(bookId, 1);
      const numbers = options.all
        ? resolved.book.chapters.map((_chapter, index) => index + 1)
        : [parsePositiveNumber(options.chapter, '--chapter') ?? 0];
      if (!options.all && !options.chapter)
        throw new AppError('quality requires --chapter or --all.');
      const store = new GenerationStateStore(
        path.join(config.generatedDirectory, bookId, 'generation-state.json'),
      );
      const validator = new QualityValidator();
      const reports = [];
      for (const number of numbers) {
        const chapter = resolved.book.chapters[number - 1];
        if (!chapter) throw new AppError(`Chapter ${number} does not exist.`);
        const directory = chapterDirectoryPath(
          config.generatedDirectory,
          bookId,
          number,
          chapter.id,
        );
        const finalPath = path.join(directory, 'chapter.md');
        const rewrittenPath = path.join(directory, 'rewritten.md');
        let markdown: string;
        try {
          markdown = await readFile(finalPath, 'utf8');
        } catch {
          markdown = await readFile(rewrittenPath, 'utf8');
        }
        const report = await validator.validate(
          resolved.book,
          chapter,
          number,
          bookId,
          markdown,
          await readFile(path.join(directory, 'review.md'), 'utf8').catch(() => ''),
        );
        if (options.strict && report.summary.warnings > 0) report.verdict = 'fail';
        const writer = new AtomicFileWriter();
        await writer.write(
          path.join(directory, 'quality-report.json'),
          `${JSON.stringify(report, null, 2)}\n`,
        );
        await writer.write(
          path.join(directory, 'quality-report.md'),
          validator.renderMarkdown(report),
        );
        const state = await store.loadChapter(bookId, number);
        if (state) {
          if (state.approval && state.approval.chapterHash !== report.chapterHash) {
            state.status = 'needs_review';
            delete state.approval;
          }
          state.qualityVerdict = report.verdict;
          if (report.verdict === 'fail') state.status = 'failed';
          else if (state.status === 'failed' || state.status === 'rejected')
            state.status = 'needs_review';
          await store.save(state);
        }
        reports.push(report);
      }
      if (options.json) console.log(JSON.stringify(reports, null, 2));
      else
        console.log(
          reports
            .map(
              (report) =>
                `Chapter ${report.chapterNumber}: ${report.verdict} (${report.summary.errors} errors, ${report.summary.warnings} warnings)`,
            )
            .join('\n'),
        );
      if (reports.some((report) => report.verdict === 'fail'))
        throw new AppError('Quality validation failed for one or more chapters.');
    });

  program
    .command('assemble')
    .description('Assemble published chapters into Markdown publication files')
    .argument('<bookId>', 'book identifier')
    .option('--allow-incomplete', 'assemble with missing chapters and mark output incomplete')
    .option('--include-needs-review', 'include generated chapters that lack human approval')
    .action(async (bookId: string, options: AssembleCommandOptions) => {
      const config = loadConfig(process.env);
      const result = await new BookAssembler(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).assemble({
        bookId,
        allowIncomplete: options.allowIncomplete,
        includeNeedsReview: options.includeNeedsReview,
      });
      console.log(
        `Assembled ${result.publishedChapters.length} chapter(s): ${result.combinedPath}`,
      );
    });

  program
    .command('export')
    .description('Export the assembled book as PDF, ZIP, or both')
    .argument('<bookId>', 'book identifier')
    .option('--format <format>', 'pdf, zip, or all', 'zip')
    .option('--include-needs-review', 'export a draft that has not been human-approved')
    .action(async (bookId: string, options: ExportCommandOptions) => {
      const config = loadConfig(process.env);
      const resolved = await new BookResolver(config.booksDirectory).resolve(bookId, 1);
      const includeNeedsReview = options.includeNeedsReview === true;
      await new BookAssembler(
        new BookResolver(config.booksDirectory),
        config.generatedDirectory,
      ).assemble({
        bookId,
        includeNeedsReview,
        ...(includeNeedsReview ? { allowIncomplete: true } : {}),
      });
      if (options.format !== 'pdf' && options.format !== 'zip' && options.format !== 'all')
        throw new AppError('--format must be pdf, zip, or all.');
      if (options.format === 'zip' || options.format === 'all') {
        const result = await new ZipExporter(
          new BookResolver(config.booksDirectory),
          config.generatedDirectory,
        ).export({ bookId, title: resolved.book.book.title, includeNeedsReview });
        console.log(`Exported ${result.entries.length} entries: ${result.archivePath}`);
      }
      if (options.format === 'pdf' || options.format === 'all') {
        const outputPath = path.join(
          config.generatedDirectory,
          bookId,
          'exports',
          `${filesystemSlug(resolved.book.book.title).toLowerCase()}.pdf`,
        );
        await new PlaywrightPdfRenderer().render({
          markdownPath: path.join(config.generatedDirectory, bookId, 'combined.md'),
          outputPath,
          title: resolved.book.book.title,
          draft: includeNeedsReview,
          cssPath: defaultPdfCss(process.cwd()),
        });
        console.log(`Exported PDF: ${outputPath}`);
      }
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
