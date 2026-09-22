# BookForge

BookForge is a local-first TypeScript CLI for generating technical content with
review, quality validation, explicit human approval, and PDF or ZIP export.

## What it demonstrates

- A sequential workflow from generation through review, rewrite, and assembly.
- Deterministic mock execution for reproducible development and tests.
- Quality reports, approval state, draft protection, and resumable reruns.
- Provider-independent book specifications with Markdown and YAML artifacts.

## AI interaction flow

1. A book specification defines the subject, structure, and generation rules.
2. BookForge generates a chapter using the mock provider or an LLM provider.
3. Review and rewrite stages produce a draft ready for quality validation.
4. A human approves the content before BookForge assembles and exports it.

This demonstrates provider isolation, sequential AI-assisted workflows,
deterministic testing, quality gates, and human approval before publication.

## Technology used

- **TypeScript / Node.js 22+** — implement the sequential CLI workflow.
- **Commander** — exposes generation, review, validation, and export commands.
- **Zod / YAML** — validate book specifications and workflow inputs.
- **OpenAI provider** — supplies optional LLM-assisted generation.
- **Mock provider** — supports deterministic local runs without an API call.
- **Vitest / Playwright** — verify workflow behavior and rendered outputs.
- **PDF / EPUB / ZIP tooling** — assemble and export approved content.

## Quick start

```bash
npm install
npm run build
npm run dev -- validate books/bookforge-tutorial/book.yaml
npm run dev -- generate bookforge-tutorial --chapter 1 --provider mock
npm run dev -- quality bookforge-tutorial --chapter 1
npm run dev -- approve bookforge-tutorial --chapter 1 --by "Your Name"
npm run dev -- assemble bookforge-tutorial
npm run dev -- export bookforge-tutorial --format pdf
```

Mock mode never calls an external API. OpenAI mode requires `OPENAI_API_KEY` and
manual review of generated technical claims before approval.

## Further reading

- [Development workflow](docs/development.md)
- [Book specification](docs/specification.md)
- [Book style guide](docs/BOOK_STYLE_GUIDE.md)
- [Available book specifications](books/README.md)
