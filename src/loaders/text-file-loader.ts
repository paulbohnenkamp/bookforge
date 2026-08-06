import { readFile } from 'node:fs/promises';
import { AppError } from '../errors/app-error.js';

export class TextFileLoader {
  public async load(filePath: string, description: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf8');
      if (content.trim().length === 0) {
        throw new AppError(`Required ${description} is empty: ${filePath}`);
      }
      return content;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Could not load ${description}: ${filePath}`,
        `Check that the required file exists and contains text.`,
        { cause: error },
      );
    }
  }
}
