import path from 'node:path';
import type { PublicationDefaults } from '../domain/publication.js';

export interface ConfigEnvironment {
  BOOKFORGE_BOOKS_DIR?: string;
  BOOKFORGE_PROMPTS_DIR?: string;
  BOOKFORGE_STYLE_GUIDE_PATH?: string;
  BOOKFORGE_GENERATED_DIR?: string;
  BOOKFORGE_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  BOOKFORGE_MODEL?: string;
  BOOKFORGE_TEMPERATURE?: string;
  BOOKFORGE_MAX_RETRIES?: string;
  BOOKFORGE_REQUEST_TIMEOUT_MS?: string;
  BOOKFORGE_LOG_LEVEL?: string;
  BOOKFORGE_DEBUG?: string;
  BOOKFORGE_PUBLICATION_AUTHOR?: string;
  BOOKFORGE_PUBLICATION_ORGANIZATION?: string;
  BOOKFORGE_PUBLICATION_VERSION?: string;
  BOOKFORGE_PUBLICATION_DATE?: string;
  BOOKFORGE_PUBLICATION_COPYRIGHT_NOTICE?: string;
  BOOKFORGE_PUBLICATION_LICENSE?: string;
  BOOKFORGE_PUBLICATION_TRADEMARKS?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Config {
  booksDirectory: string;
  promptsDirectory: string;
  styleGuidePath: string;
  generatedDirectory: string;
  defaultProvider: string;
  openAiApiKey: string | undefined;
  openAiModel: string | undefined;
  openAiTemperature: number;
  openAiMaxRetries: number;
  openAiRequestTimeoutMs: number;
  logLevel: LogLevel;
  debug: boolean;
  publication: PublicationDefaults;
}

function parseLogLevel(value: string | undefined): LogLevel {
  return value === 'debug' || value === 'warn' || value === 'error' ? value : 'info';
}

function parseBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(environment: ConfigEnvironment = {}): Config {
  const trademarks = environment.BOOKFORGE_PUBLICATION_TRADEMARKS?.split(';')
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    booksDirectory: path.resolve(environment.BOOKFORGE_BOOKS_DIR ?? 'books'),
    promptsDirectory: path.resolve(environment.BOOKFORGE_PROMPTS_DIR ?? 'prompts'),
    styleGuidePath: path.resolve(
      environment.BOOKFORGE_STYLE_GUIDE_PATH ?? 'docs/BOOK_STYLE_GUIDE.md',
    ),
    generatedDirectory: path.resolve(environment.BOOKFORGE_GENERATED_DIR ?? 'generated'),
    defaultProvider: environment.BOOKFORGE_PROVIDER ?? 'mock',
    openAiApiKey: environment.OPENAI_API_KEY,
    openAiModel: environment.BOOKFORGE_MODEL,
    openAiTemperature: parseNumber(environment.BOOKFORGE_TEMPERATURE, 0.2),
    openAiMaxRetries: Math.max(0, Math.floor(parseNumber(environment.BOOKFORGE_MAX_RETRIES, 3))),
    openAiRequestTimeoutMs: Math.max(
      1,
      Math.floor(parseNumber(environment.BOOKFORGE_REQUEST_TIMEOUT_MS, 120000)),
    ),
    logLevel: parseLogLevel(environment.BOOKFORGE_LOG_LEVEL),
    debug: parseBoolean(environment.BOOKFORGE_DEBUG),
    publication: {
      author: environment.BOOKFORGE_PUBLICATION_AUTHOR ?? 'DecisionForge, LLC',
      organization: environment.BOOKFORGE_PUBLICATION_ORGANIZATION ?? 'DecisionForge, LLC',
      version: environment.BOOKFORGE_PUBLICATION_VERSION ?? '1.0',
      date: environment.BOOKFORGE_PUBLICATION_DATE ?? new Date().toISOString().slice(0, 10),
      copyrightNotice:
        environment.BOOKFORGE_PUBLICATION_COPYRIGHT_NOTICE ??
        'Educational material only; verify live technical, legal, and operational decisions against authoritative sources.',
      license:
        environment.BOOKFORGE_PUBLICATION_LICENSE ??
        'All rights reserved unless separately stated.',
      trademarks: trademarks ?? ['DecisionForge'],
    },
  };
}
