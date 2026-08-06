import path from 'node:path';

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
  };
}
