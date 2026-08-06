# BookForge

BookForge is a local-first TypeScript CLI for working with generic technical-book
specifications. Milestone 2 provides a complete single-chapter workflow using the
deterministic local mock provider.

## Requirements

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` when you want to customize default directories or
logging. The CLI also accepts paths directly for validation.

## Mock generation pipeline

The generator resolves a book ID, loads the book and editable prompts, then runs
three sequential stages:

```text
Writer -> Reviewer -> Rewriter -> Published Chapter
```

Mock mode never calls an external API. Its deterministic fixtures include stage
markers and prior-stage context so the local workflow is easy to inspect.

Generate chapter 1:

```bash
npm run dev -- generate modern-java --chapter 1 --provider mock
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
and artifact paths. Rerunning the command reuses completed stage artifacts and
continues from the first incomplete stage. A published chapter is skipped. Use
`--force` to regenerate every stage; an existing published chapter is first saved
as `chapter.backup-<timestamp>.md`.

Use `--verbose` for debug logging. Only `--provider mock` is available in this
milestone. Full-book generation, external providers, review editing, combined
Markdown, and export formats are intentionally deferred.

Run the compiled CLI:

```bash
npm start -- validate books/modern-java/book.yaml
```
