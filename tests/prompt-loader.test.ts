import { describe, expect, it } from 'vitest';
import { PromptLoader } from '../src/loaders/prompt-loader.js';

describe('PromptLoader', () => {
  it('loads an editable prompt', async () => {
    const prompt = await new PromptLoader('prompts').load('writer');
    expect(prompt).toContain('Writer Prompt');
  });
});
