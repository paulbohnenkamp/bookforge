import path from 'node:path';
import { TextFileLoader } from './text-file-loader.js';

export class PromptLoader {
  public constructor(
    private readonly promptsDirectory: string,
    private readonly fileLoader: TextFileLoader = new TextFileLoader(),
  ) {}

  public async load(name: string): Promise<string> {
    const filePath = path.join(this.promptsDirectory, `${name}.md`);
    return this.fileLoader.load(filePath, `prompt '${name}'`);
  }

  public async loadFile(filePath: string, description: string): Promise<string> {
    return this.fileLoader.load(filePath, description);
  }
}
