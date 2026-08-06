import {
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  RateLimitError,
} from 'openai';
import { describe, expect, it } from 'vitest';
import {
  OpenAiProvider,
  type OpenAiResponse,
  type OpenAiResponsesClient,
} from '../src/llm/openai-provider.js';
import type { Logger } from '../src/logging/logger.js';

const apiKey = 'secret-test-key';

class FakeResponsesClient implements OpenAiResponsesClient {
  public readonly requests: Array<{
    model: string;
    input: string;
    instructions?: string;
    temperature?: number;
  }> = [];
  private readonly results: Array<OpenAiResponse | Error>;

  public constructor(...results: Array<OpenAiResponse | Error>) {
    this.results = [...results];
  }

  public responses = {
    create: async (request: {
      model: string;
      input: string;
      instructions?: string;
      temperature?: number;
    }): Promise<OpenAiResponse> => {
      this.requests.push(request);
      const result = this.results.shift();
      if (result instanceof Error) throw result;
      if (!result) throw new Error('No fake response configured');
      return result;
    },
  };
}

class MemoryLogger implements Logger {
  public messages: string[] = [];
  public debug(message: string): void {
    this.messages.push(message);
  }
  public info(message: string): void {
    this.messages.push(message);
  }
  public warn(message: string): void {
    this.messages.push(message);
  }
  public error(message: string): void {
    this.messages.push(message);
  }
}

function response(text: string, requestId = 'req_test'): OpenAiResponse {
  return {
    output_text: text,
    model: 'test-model',
    _request_id: requestId,
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
  };
}

function provider(
  client: OpenAiResponsesClient,
  overrides: Partial<{ maxRetries: number; requestTimeoutMs: number }> = {},
  logger: Logger = new MemoryLogger(),
): OpenAiProvider {
  return new OpenAiProvider(
    {
      apiKey,
      model: 'test-model',
      temperature: 0.2,
      maxRetries: overrides.maxRetries ?? 3,
      requestTimeoutMs: overrides.requestTimeoutMs ?? 1000,
    },
    { client, logger, sleep: async () => undefined, random: () => 0 },
  );
}

function providerForModel(client: OpenAiResponsesClient, model: string): OpenAiProvider {
  return new OpenAiProvider(
    {
      apiKey,
      model,
      temperature: 0.2,
      maxRetries: 0,
      requestTimeoutMs: 1000,
    },
    { client, sleep: async () => undefined, random: () => 0 },
  );
}

describe('OpenAiProvider', () => {
  it.each(['Writer', 'Reviewer', 'Rewriter'])('returns usable %s output', async (stage) => {
    const client = new FakeResponsesClient(response(`# ${stage} output`));
    const result = await provider(client).completeWithMetadata({
      prompt: `${stage} context`,
      systemInstruction: `${stage} system instruction`,
    });
    expect(result.text).toContain(stage);
    expect(client.requests[0]).toMatchObject({
      model: 'test-model',
      input: `${stage} context`,
      instructions: `${stage} system instruction`,
    });
  });

  it('omits temperature for reasoning models and retains it for sampling models', async () => {
    const reasoningClient = new FakeResponsesClient(response('reasoning output'));
    await providerForModel(reasoningClient, 'gpt-5.6-luna').complete('prompt');
    expect(reasoningClient.requests[0]).not.toHaveProperty('temperature');

    const samplingClient = new FakeResponsesClient(response('sampling output'));
    await providerForModel(samplingClient, 'gpt-4o-mini').complete('prompt');
    expect(samplingClient.requests[0]).toHaveProperty('temperature', 0.2);
  });

  it('rejects empty and malformed responses', async () => {
    await expect(
      provider(new FakeResponsesClient(response('   '))).complete('prompt'),
    ).rejects.toThrow('empty response');
    await expect(
      provider(new FakeResponsesClient({ output_text: { value: 'not text' } })).complete('prompt'),
    ).rejects.toThrow('malformed response');
    await expect(
      provider(
        new FakeResponsesClient({
          output_text: 'partial',
          incomplete_details: { reason: 'timeout' },
        }),
      ).complete('prompt'),
    ).rejects.toThrow('incomplete response');
  });

  it('requires the API key and model', () => {
    expect(
      () =>
        new OpenAiProvider({
          apiKey: undefined,
          model: 'test-model',
          temperature: 0.2,
          maxRetries: 0,
          requestTimeoutMs: 1000,
        }),
    ).toThrow('OPENAI_API_KEY');
    expect(
      () =>
        new OpenAiProvider({
          apiKey,
          model: undefined,
          temperature: 0.2,
          maxRetries: 0,
          requestTimeoutMs: 1000,
        }),
    ).toThrow('BOOKFORGE_MODEL');
  });

  it('retries rate limits and transient server errors', async () => {
    const rateClient = new FakeResponsesClient(
      new RateLimitError(429, {}, 'rate limit', new Headers()),
      response('after rate limit'),
    );
    await expect(provider(rateClient).complete('prompt')).resolves.toBe('after rate limit');
    expect(rateClient.requests).toHaveLength(2);

    const serverClient = new FakeResponsesClient(
      new InternalServerError(500, {}, 'server failure', new Headers()),
      response('after server failure'),
    );
    await expect(provider(serverClient).complete('prompt')).resolves.toBe('after server failure');
    expect(serverClient.requests).toHaveLength(2);
  });

  it('does not retry invalid request configuration', async () => {
    const client = new FakeResponsesClient(
      new BadRequestError(400, {}, 'bad request', new Headers()),
    );
    await expect(provider(client).complete('prompt')).rejects.toThrow('request configuration');
    expect(client.requests).toHaveLength(1);
  });

  it('maps authentication and timeout failures without exposing the API key', async () => {
    const logger = new MemoryLogger();
    const authClient = new FakeResponsesClient(
      new AuthenticationError(401, { message: apiKey }, 'authentication failed', new Headers()),
    );
    try {
      await provider(authClient, { maxRetries: 3 }, logger).complete('prompt');
      throw new Error('Expected authentication failure');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      expect(error instanceof Error ? error.message : String(error)).toContain(
        'authentication failed',
      );
      expect(error instanceof Error ? error.message : String(error)).not.toContain(apiKey);
    }
    const timeoutClient = new FakeResponsesClient(new APIConnectionTimeoutError());
    await expect(provider(timeoutClient, { maxRetries: 0 }).complete('prompt')).rejects.toThrow(
      'timed out',
    );
    expect(logger.messages.join('\n')).not.toContain(apiKey);
  });

  it('captures model, request ID, and token usage', async () => {
    const result = await provider(
      new FakeResponsesClient(response('usable output', 'req_usage')),
    ).completeWithMetadata({
      prompt: 'prompt',
    });
    expect(result.usage).toEqual({
      model: 'test-model',
      requestId: 'req_usage',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });
});
