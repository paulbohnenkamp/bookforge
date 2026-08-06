import type { Config } from '../config/config.js';
import { AppError } from '../errors/app-error.js';
import { ConsoleLogger, type Logger } from '../logging/logger.js';
import type { LlmProvider } from './llm-provider.js';
import { MockLlmProvider } from './mock-llm-provider.js';
import { OpenAiProvider } from './openai-provider.js';

export function createProvider(
  name: string,
  config: Config,
  logger: Logger = new ConsoleLogger(),
): LlmProvider {
  if (name === 'mock') return new MockLlmProvider();
  if (name === 'openai') {
    return new OpenAiProvider(
      {
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        temperature: config.openAiTemperature,
        maxRetries: config.openAiMaxRetries,
        requestTimeoutMs: config.openAiRequestTimeoutMs,
      },
      { logger },
    );
  }
  throw new AppError(
    `Unsupported provider: ${name}`,
    'Choose --provider mock or --provider openai.',
  );
}
