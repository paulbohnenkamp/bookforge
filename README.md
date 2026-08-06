# BookForge

BookForge is a local-first TypeScript CLI for working with generic technical-book
specifications. Milestone 3 provides a complete single-chapter workflow using
either the deterministic local mock provider or the official OpenAI JavaScript
SDK.

## Requirements

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` as a starting point. BookForge does not load `.env`
automatically; export the variables in the shell before running the CLI. For Bash
or Zsh:

```bash
set -a
source .env
set +a
```

Never commit a file containing `OPENAI_API_KEY`.

## Mock generation pipeline

The generator resolves a book ID, loads the book and editable prompts, then runs
three sequential stages:

```text
Writer -> Reviewer -> Rewriter -> Published Chapter
```

Mock mode never calls an external API. Its deterministic fixtures include stage
markers and prior-stage context so the local workflow is easy to inspect.

OpenAI mode sends only the stage system instruction and the stage-specific prompt
context to the Responses API. Configure it with:

```bash
export OPENAI_API_KEY='your-api-key'
export BOOKFORGE_MODEL='your-model-id'
export BOOKFORGE_TEMPERATURE=0.2
export BOOKFORGE_MAX_RETRIES=3
export BOOKFORGE_REQUEST_TIMEOUT_MS=120000
```

`OPENAI_API_KEY` and `BOOKFORGE_MODEL` are required for OpenAI mode. The default
provider is `mock`; `BOOKFORGE_PROVIDER` may change that default, while an explicit
`--provider` flag takes precedence.

Generate chapter 1:

```bash
npm run dev -- generate modern-java --chapter 1 --provider mock
```

Generate chapter 1 with OpenAI:

```bash
npm run dev -- generate modern-java --chapter 1 --provider openai
```

Validate a book specification:

```bash
npm run dev -- validate books/modern-java/book.yaml
```

Generated files are written under:

```text
generated/modern-java/
├── chapters/01-introduction/
│   ├── draft.md
│   ├── review.md
│   ├── rewritten.md
│   └── chapter.md
└── generation-state.json
```

The state file records the current status, completed stages, provider, timestamps,
artifact paths, and optional per-stage and total token usage. OpenAI request IDs,
model names, and token counts are recorded when returned by the SDK; dollar cost is
not calculated. Rerunning either provider reuses completed stage artifacts and
continues from the first incomplete stage. A published chapter is skipped. Use
`--force` to regenerate every stage; an existing published chapter is first saved
as `chapter.backup-<timestamp>.md`. Failed OpenAI stages remain recorded as failed
and do not publish a chapter.

Use `--verbose` for safe provider diagnostics, including retry attempts, HTTP
status, and request IDs. Retryable OpenAI rate-limit, timeout, connection, and
temporary server failures use bounded exponential backoff with jitter. Invalid
credentials and invalid request configuration are not retried.

Generated technical content still requires human verification. Full-book
generation, additional providers, review editing, combined Markdown, and export
formats are intentionally deferred.

Run the compiled CLI:

```bash
npm start -- validate books/modern-java/book.yaml
```
