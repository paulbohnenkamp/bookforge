import type { LlmProvider } from './llm-provider.js';

export class MockLlmProvider implements LlmProvider {
  public async complete(prompt: string): Promise<string> {
    return `Mock response for prompt (${prompt.length} characters).`;
  }
}
