import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type SnippetIntent = 'illustrative' | 'standalone' | 'compilable';
export interface CodeValidationRequest {
  language: string;
  intent: SnippetIntent;
  exampleId?: string;
  files: Array<{ filename?: string; content: string }>;
}
export interface CodeValidationFinding {
  severity: 'error' | 'warning' | 'information';
  code: string;
  message: string;
  file?: string;
  line?: number;
}
export interface CodeValidationResult {
  validator: string;
  executed: boolean;
  success?: boolean;
  findings: CodeValidationFinding[];
}
export interface CodeValidator {
  supports(language: string): boolean;
  validate(request: CodeValidationRequest): Promise<CodeValidationResult>;
}

const run = promisify(execFile);

export class JavaValidator implements CodeValidator {
  public supports(language: string): boolean {
    return language.toLowerCase() === 'java';
  }
  public async validate(request: CodeValidationRequest): Promise<CodeValidationResult> {
    if (request.intent !== 'compilable')
      return this.skipped('Java validation applies to compilable snippets.');
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-java-'));
    try {
      for (const [index, file] of request.files.entries())
        await writeFile(
          path.join(directory, file.filename ?? `Example${index}.java`),
          file.content,
        );
      const release = process.env.BOOKFORGE_JAVA_RELEASE ?? '21';
      try {
        await run('javac', [
          '--release',
          release,
          ...request.files.map((file, index) =>
            path.join(directory, file.filename ?? `Example${index}.java`),
          ),
        ]);
        return {
          validator: `javac --release ${release}`,
          executed: true,
          success: true,
          findings: [],
        };
      } catch (error) {
        return {
          validator: `javac --release ${release}`,
          executed: true,
          success: false,
          findings: [
            {
              severity: 'error',
              code: 'JAVA_COMPILE_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    } catch (error) {
      return this.unavailable(error instanceof Error ? error.message : String(error));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  private skipped(message: string): CodeValidationResult {
    return {
      validator: 'javac',
      executed: false,
      findings: [{ severity: 'information', code: 'VALIDATOR_SKIPPED', message }],
    };
  }
  private unavailable(message: string): CodeValidationResult {
    return {
      validator: 'javac',
      executed: false,
      findings: [{ severity: 'information', code: 'VALIDATOR_UNAVAILABLE', message }],
    };
  }
}

export class PythonValidator implements CodeValidator {
  public supports(language: string): boolean {
    return language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
  }
  public async validate(request: CodeValidationRequest): Promise<CodeValidationResult> {
    if (request.intent !== 'compilable')
      return {
        validator: 'python compileall',
        executed: false,
        findings: [
          {
            severity: 'information',
            code: 'VALIDATOR_SKIPPED',
            message: 'Python validation applies to compilable snippets.',
          },
        ],
      };
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-python-'));
    try {
      const file = request.files[0];
      if (!file) throw new Error('No Python source file was supplied.');
      const filename = file.filename ?? 'example.py';
      const target = path.join(directory, filename);
      await writeFile(target, file.content);
      try {
        await run(process.env.BOOKFORGE_PYTHON ?? 'python3', ['-m', 'py_compile', target]);
        return { validator: 'python py_compile', executed: true, success: true, findings: [] };
      } catch (error) {
        return {
          validator: 'python py_compile',
          executed: true,
          success: false,
          findings: [
            {
              severity: 'error',
              code: 'PYTHON_SYNTAX_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    } catch (error) {
      return {
        validator: 'python py_compile',
        executed: false,
        findings: [
          {
            severity: 'information',
            code: 'VALIDATOR_UNAVAILABLE',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

export class TypeScriptValidator implements CodeValidator {
  public supports(language: string): boolean {
    return ['typescript', 'ts', 'tsx'].includes(language.toLowerCase());
  }
  public async validate(request: CodeValidationRequest): Promise<CodeValidationResult> {
    if (request.intent !== 'compilable')
      return {
        validator: 'tsc',
        executed: false,
        findings: [
          {
            severity: 'information',
            code: 'VALIDATOR_SKIPPED',
            message: 'TypeScript validation applies to compilable snippets.',
          },
        ],
      };
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bookforge-ts-'));
    try {
      for (const [index, file] of request.files.entries())
        await writeFile(
          path.join(
            directory,
            file.filename ??
              `example${index}.${request.language.toLowerCase() === 'tsx' ? 'tsx' : 'ts'}`,
          ),
          file.content,
        );
      const files = request.files.map((file, index) =>
        path.join(directory, file.filename ?? `example${index}.ts`),
      );
      try {
        await run('tsc', ['--strict', '--noEmit', '--skipLibCheck', ...files]);
        return { validator: 'tsc --strict --noEmit', executed: true, success: true, findings: [] };
      } catch (error) {
        return {
          validator: 'tsc --strict --noEmit',
          executed: true,
          success: false,
          findings: [
            {
              severity: 'error',
              code: 'TYPESCRIPT_COMPILE_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    } catch (error) {
      return {
        validator: 'tsc',
        executed: false,
        findings: [
          {
            severity: 'information',
            code: 'VALIDATOR_UNAVAILABLE',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
