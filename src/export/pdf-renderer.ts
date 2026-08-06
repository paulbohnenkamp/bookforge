import path from 'node:path';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { marked } from 'marked';
import { chromium, type Browser } from 'playwright';
import { AppError } from '../errors/app-error.js';
import { AtomicFileWriter } from '../generator/atomic-file-writer.js';

export interface PdfRenderRequest {
  markdownPath: string;
  outputPath: string;
  title: string;
  draft: boolean;
  cssPath: string;
}
export interface PdfRenderer {
  render(request: PdfRenderRequest): Promise<void>;
}

export class PlaywrightPdfRenderer implements PdfRenderer {
  public constructor(private readonly writer = new AtomicFileWriter()) {}
  public async render(request: PdfRenderRequest): Promise<void> {
    const markdown = await readFile(request.markdownPath, 'utf8');
    const css = await readFile(request.cssPath, 'utf8');
    const body = await marked.parse(markdown);
    const notice =
      request.draft && !markdown.includes('Draft — Needs Human Review')
        ? '<div class="draft-notice">Draft — Needs Human Review</div>'
        : '';
    let browser: Browser | undefined;
    const temporaryPath = `${request.outputPath}.tmp`;
    try {
      await mkdir(path.dirname(request.outputPath), { recursive: true });
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(request.title)}</title><style>${css}</style></head><body>${notice}${body}</body></html>`,
        { waitUntil: 'load' },
      );
      await page.pdf({
        path: temporaryPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<span class="page-number">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>',
        margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
      });
      await rename(temporaryPath, request.outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(
        'PDF generation requires a working Playwright Chromium installation.',
        'Run npx playwright install chromium, then retry.',
        { cause: new Error(message) },
      );
    } finally {
      await browser?.close();
      await rm(temporaryPath, { force: true });
    }
  }
  private escape(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
        character,
    );
  }
}

export function defaultPdfCss(root: string): string {
  return path.join(root, 'templates', 'pdf', 'book.css');
}
