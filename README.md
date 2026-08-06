# BookForge

BookForge is a local-first TypeScript CLI for working with generic technical-book
specifications. It supports sequential chapter generation, full-book assembly,
status reporting, and publication ZIP export.

## Requirements and setup

- Node.js 22 or newer
- npm

```bash
npm install
npm run build
```

BookForge does not load `.env` automatically. Copy `.env.example` if useful, then
export its values in the shell. For Bash or Zsh:

```bash
cp .env.example .env
set -a
source .env
set +a
```

Never commit a file containing `OPENAI_API_KEY`.

## Complete mock workflow

```bash
npm run dev -- validate books/modern-java/book.yaml
npm run dev -- generate modern-java --provider mock
npm run dev -- status modern-java
npm run dev -- assemble modern-java
npm run dev -- export modern-java
```

Mock mode never calls an external API. Each selected chapter runs sequentially:

```text
Writer -> Reviewer -> Rewriter -> Published Chapter -> Summary
```

To generate one chapter, use `--chapter 1`. Use one-based ranges with `--from 3`,
`--to 5`, or both. Published chapters are skipped on rerun, and incomplete
chapters resume from their first incomplete stage. `--force` regenerates selected
chapters and backs up an existing published chapter as
`chapter.backup-<timestamp>.md`. `--continue-on-error` records a failed chapter
and continues to later chapters, while the command still exits unsuccessfully.

## OpenAI generation

Configure the official OpenAI provider by exporting:

```bash
export OPENAI_API_KEY='your-api-key'
export BOOKFORGE_MODEL='your-model-id'
export BOOKFORGE_TEMPERATURE=0.2
export BOOKFORGE_MAX_RETRIES=3
export BOOKFORGE_REQUEST_TIMEOUT_MS=120000
```

Then run the real equivalent:

```bash
npm run dev -- generate modern-java --provider openai
```

`OPENAI_API_KEY` and `BOOKFORGE_MODEL` are required for OpenAI mode. The default
provider is `mock`; `BOOKFORGE_PROVIDER` may change that default, while an
explicit `--provider` flag takes precedence. Retries are bounded and limited to
likely transient failures. Completed artifacts remain available after failures
and timeouts. Optional request IDs, model names, and token counts are recorded
in generation state; BookForge does not calculate dollar cost.

Do not log or commit secrets. Generated technical content still requires human
verification and is not authoritative merely because it passed the pipeline.

## Generated output

```text
generated/modern-java/
├── README.md
├── TABLE_OF_CONTENTS.md
├── combined.md
├── generation-state.json
├── chapters/
│   ├── 01-introduction/
│   │   ├── draft.md
│   │   ├── review.md
│   │   ├── rewritten.md
│   │   ├── chapter.md
│   │   └── summary.md
│   └── ...
└── exports/
    └── Modern-Java-and-Object-Oriented-Design.zip
```

`status modern-java` reports every configured chapter, publication counts,
failures, latest generation time, and known token usage. `assemble modern-java`
requires every chapter to be published; `--allow-incomplete` assembles only
published chapters and marks the result incomplete.

The ZIP contains only the publication package:

```text
README.md
TABLE_OF_CONTENTS.md
combined.md
chapters/01-introduction.md
chapters/02-oo.md
...
```

Drafts, reviews, rewritten intermediates, state, logs, backups, temporary files,
secrets, and source files are excluded.

## Cleaning

Cleaning always requires an explicit target:

```bash
npm run dev -- clean modern-java --chapter 2 --dry-run
npm run dev -- clean modern-java --chapter 2
npm run dev -- clean modern-java --all --force
```

Without `--force`, manually modified published chapters are protected. `--dry-run`
prints the exact paths that would be removed without deleting them. An ambiguous
clean command cannot remove the entire generated book.

## Validation and compiled CLI

```bash
npm run dev -- validate books/modern-java/book.yaml
npm start -- status modern-java
```

The engine remains generic: book-specific behavior belongs in YAML and editable
prompt files, not in TypeScript.
