import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from 'openai';
import { AppError } from '../errors/app-error.js';
import type { Logger } from '../logging/logger.js';
import type { LlmCompletion, LlmProvider, LlmRequest, UsageMetadata } from './llm-provider.js';

export interface OpenAiProviderConfig {
  apiKey: string | undefined;
  model: string | undefined;
  temperature: number;
  maxRetries: number;
  requestTimeoutMs: number;
}

export interface OpenAiRequest {
  model: string;
  instructions?: string;
  input: string;
  temperature?: number;
}

export interface OpenAiRequestOptions {
  signal?: AbortSignal;
}

export interface OpenAiResponse {
  output_text?: unknown;
  model?: unknown;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
  } | null;
  _request_id?: unknown;
  error?: unknown;
  incomplete_details?: unknown;
}

export interface OpenAiResponsesClient {
  responses: {
    create(request: OpenAiRequest, options?: OpenAiRequestOptions): Promise<OpenAiResponse>;
  };
}

export interface OpenAiProviderDependencies {
  client?: OpenAiResponsesClient;
  logger?: Logger;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

interface ProviderFailure {
  category: string;
  retryable: boolean;
  status?: number;
  requestId?: string;
}

export class OpenAiProvider implements LlmProvider {
  private readonly client: OpenAiResponsesClient;
  private readonly logger: Logger;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;

  public constructor(
    private readonly config: OpenAiProviderConfig,
    dependencies: OpenAiProviderDependencies = {},
  ) {
    this.validateConfig(config);
    this.client =
      dependencies.client ??
      (new OpenAI({
        apiKey: config.apiKey,
        maxRetries: 0,
        timeout: config.requestTimeoutMs,
      }) as unknown as OpenAiResponsesClient);
    this.logger = dependencies.logger ?? this.noopLogger();
    this.sleep = dependencies.sleep ?? this.defaultSleep;
    this.random = dependencies.random ?? Math.random;
  }

  public async complete(prompt: string): Promise<string> {
    const completion = await this.completeWithMetadata({ prompt });
    return completion.text;
  }

  public async completeWithMetadata(request: LlmRequest): Promise<LlmCompletion> {
    if (request.prompt.trim().length === 0) {
      throw new AppError('OpenAI request prompt must not be empty.');
    }

    const body: OpenAiRequest = {
      model: this.config.model as string,
      input: request.prompt,
      ...(request.systemInstruction ? { instructions: request.systemInstruction } : {}),
      temperature: this.config.temperature,
    };

    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = request.signal
          ? await this.client.responses.create(body, { signal: request.signal })
          : await this.client.responses.create(body);
        return this.parseResponse(response);
      } catch (error) {
        if (error instanceof AppError) throw error;
        const failure = this.describeFailure(error);
        this.logger.debug(this.diagnosticMessage(failure, attempt + 1));
        if (failure.retryable && attempt < this.config.maxRetries) {
          await this.sleep(this.backoffMilliseconds(attempt));
          continue;
        }
        throw this.toApplicationError(failure, attempt + 1, error);
      }
    }
  }

  private parseResponse(response: OpenAiResponse): LlmCompletion {
    if (!response || typeof response !== 'object' || typeof response.output_text !== 'string') {
      throw new AppError('OpenAI returned a malformed response without usable text.');
    }
    if (response.error || response.incomplete_details) {
      throw new AppError('OpenAI returned an incomplete response without usable final text.');
    }
    if (response.output_text.trim().length === 0) {
      throw new AppError('OpenAI returned an empty response.');
    }

    const usage = this.usageMetadata(response);
    return {
      text: response.output_text,
      ...(usage ? { usage } : {}),
    };
  }

  private usageMetadata(response: OpenAiResponse): UsageMetadata | undefined {
    const inputTokens = this.numberValue(response.usage?.input_tokens);
    const outputTokens = this.numberValue(response.usage?.output_tokens);
    const totalTokens = this.numberValue(response.usage?.total_tokens);
    const model = typeof response.model === 'string' ? response.model : undefined;
    const requestId = typeof response._request_id === 'string' ? response._request_id : undefined;
    if (
      !model &&
      !requestId &&
      inputTokens === undefined &&
      outputTokens === undefined &&
      totalTokens === undefined
    ) {
      return undefined;
    }
    return {
      ...(model ? { model } : {}),
      ...(requestId ? { requestId } : {}),
      ...(inputTokens === undefined ? {} : { inputTokens }),
      ...(outputTokens === undefined ? {} : { outputTokens }),
      ...(totalTokens === undefined ? {} : { totalTokens }),
    };
  }

  private describeFailure(error: unknown): ProviderFailure {
    if (error instanceof AuthenticationError) return this.failure('authentication', false, error);
    if (error instanceof APIUserAbortError) return { category: 'interrupted', retryable: false };
    if (error instanceof PermissionDeniedError) return this.failure('authorization', false, error);
    if (error instanceof NotFoundError) return this.failure('model unavailable', false, error);
    if (error instanceof RateLimitError) return this.failure('rate limit', true, error);
    if (error instanceof APIConnectionTimeoutError) return this.failure('timeout', true, error);
    if (error instanceof APIConnectionError) return this.failure('connection', true, error);
    if (error instanceof InternalServerError) return this.failure('transient server', true, error);
    if (error instanceof APIError) {
      const retryable =
        error.status === 408 ||
        error.status === 409 ||
        error.status === 429 ||
        (error.status ?? 0) >= 500;
      return this.failure(
        retryable ? 'transient provider' : 'request configuration',
        retryable,
        error,
      );
    }
    return { category: 'unknown provider', retryable: false };
  }

  private failure(category: string, retryable: boolean, error: APIError): ProviderFailure {
    return {
      category,
      retryable,
      ...(typeof error.status === 'number' ? { status: error.status } : {}),
      ...(error.requestID ? { requestId: error.requestID } : {}),
    };
  }

  private toApplicationError(failure: ProviderFailure, attempts: number, cause: unknown): AppError {
    const requestId = failure.requestId ? ` Request ID: ${failure.requestId}.` : '';
    const suffix = failure.retryable ? ` Retried ${Math.max(0, attempts - 1)} time(s).` : '';
    const messages: Record<string, string> = {
      authentication: 'OpenAI authentication failed. Check OPENAI_API_KEY.',
      authorization: 'OpenAI authorization failed for this project or model.',
      'model unavailable': 'The configured OpenAI model was not found or is unavailable.',
      'rate limit': 'OpenAI rate limit exceeded.',
      timeout: `OpenAI request timed out after ${this.config.requestTimeoutMs}ms.`,
      connection: 'OpenAI connection failed temporarily.',
      'transient server': 'OpenAI reported a temporary server failure.',
      'transient provider': 'OpenAI reported a temporary provider failure.',
      'request configuration': 'OpenAI rejected the request configuration.',
      interrupted: 'OpenAI request was interrupted.',
      'unknown provider': 'OpenAI request failed unexpectedly.',
    };
    const message = `${messages[failure.category] ?? messages['unknown provider']}${requestId}${suffix}`;
    return new AppError(message, 'Check the OpenAI configuration and retry the command.', {
      cause,
    });
  }

  private diagnosticMessage(failure: ProviderFailure, attempt: number): string {
    const status = failure.status === undefined ? '' : ` status=${failure.status}`;
    const requestId = failure.requestId ? ` requestId=${failure.requestId}` : '';
    return `OpenAI ${failure.category} failure; attempt=${attempt}${status}${requestId}`;
  }

  private backoffMilliseconds(attempt: number): number {
    const base = Math.min(1000 * 2 ** attempt, 10000);
    return Math.round(base * (0.5 + this.random()));
  }

  private numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private validateConfig(config: OpenAiProviderConfig): void {
    if (!config.apiKey?.trim())
      throw new AppError('OPENAI_API_KEY is required for the OpenAI provider.');
    if (!config.model?.trim())
      throw new AppError('BOOKFORGE_MODEL is required for the OpenAI provider.');
    if (!Number.isFinite(config.temperature) || config.temperature < 0 || config.temperature > 2) {
      throw new AppError('BOOKFORGE_TEMPERATURE must be a number between 0 and 2.');
    }
    if (!Number.isInteger(config.maxRetries) || config.maxRetries < 0) {
      throw new AppError('BOOKFORGE_MAX_RETRIES must be a non-negative integer.');
    }
    if (!Number.isInteger(config.requestTimeoutMs) || config.requestTimeoutMs < 1) {
      throw new AppError('BOOKFORGE_REQUEST_TIMEOUT_MS must be a positive integer.');
    }
  }

  private readonly defaultSleep = async (milliseconds: number): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  };

  private noopLogger(): Logger {
    return {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }
}
