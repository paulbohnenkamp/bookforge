import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';

export class PromptLoader {
  public constructor(private readonly promptsDirectory: string) {}

  public async load(name: string): Promise<string> {
    const filePath = path.join(this.promptsDirectory, `${name}.md`);
    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      throw new AppError(`Could not load prompt: ${name}`, `Add the prompt file at ${filePath}.`, {
        cause: error,
      });
    }
  }
}
