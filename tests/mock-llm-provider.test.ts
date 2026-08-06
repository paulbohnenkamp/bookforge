import { describe, expect, it } from 'vitest';
import { MockLlmProvider } from '../src/llm/mock-llm-provider.js';

describe('MockLlmProvider', () => {
  it('returns deterministic local output', async () => {
    await expect(new MockLlmProvider().complete('hello')).resolves.toBe(
      'Mock response for prompt (5 characters).',
    );
  });

  it('returns a complete rewritten chapter fixture', async () => {
    const prompt =
      'Stage: Rewriter\nChapter specification: {"id":"sample","title":"A Generic Topic"}\nReviewer response: feedback';
    const output = await new MockLlmProvider().complete(prompt);
    expect(output).toContain('# A Generic Topic');
    expect(output).toContain('## Key Takeaways');
  });
});
