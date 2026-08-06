import { describe, expect, it } from 'vitest';
import { MockLlmProvider } from '../src/llm/mock-llm-provider.js';

describe('MockLlmProvider', () => {
  it('returns deterministic local output', async () => {
    await expect(new MockLlmProvider().complete('hello')).resolves.toBe(
      'Mock response for prompt (5 characters).',
    );
  });
});
