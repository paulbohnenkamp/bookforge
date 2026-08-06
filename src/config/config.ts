import path from 'node:path';

export interface ConfigEnvironment {
  BOOKFORGE_BOOKS_DIR?: string;
  BOOKFORGE_PROMPTS_DIR?: string;
  BOOKFORGE_STYLE_GUIDE_PATH?: string;
  BOOKFORGE_GENERATED_DIR?: string;
  BOOKFORGE_LOG_LEVEL?: string;
  BOOKFORGE_DEBUG?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Config {
  booksDirectory: string;
  promptsDirectory: string;
  styleGuidePath: string;
  generatedDirectory: string;
  logLevel: LogLevel;
  debug: boolean;
}

function parseLogLevel(value: string | undefined): LogLevel {
  return value === 'debug' || value === 'warn' || value === 'error' ? value : 'info';
}

function parseBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

export function loadConfig(environment: ConfigEnvironment = {}): Config {
  return {
    booksDirectory: path.resolve(environment.BOOKFORGE_BOOKS_DIR ?? 'books'),
    promptsDirectory: path.resolve(environment.BOOKFORGE_PROMPTS_DIR ?? 'prompts'),
    styleGuidePath: path.resolve(
      environment.BOOKFORGE_STYLE_GUIDE_PATH ?? 'docs/BOOK_STYLE_GUIDE.md',
    ),
    generatedDirectory: path.resolve(environment.BOOKFORGE_GENERATED_DIR ?? 'generated'),
    logLevel: parseLogLevel(environment.BOOKFORGE_LOG_LEVEL),
    debug: parseBoolean(environment.BOOKFORGE_DEBUG),
  };
}
