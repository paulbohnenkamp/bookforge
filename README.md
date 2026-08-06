# BookForge

BookForge is a local-first TypeScript CLI for generating generic technical books.
The pipeline is sequential and provider-independent:

```text
Generate → Review → Rewrite → Quality validation → Needs human review
→ Human approval → Assemble → PDF or ZIP export
```

Automated validation is not human approval. Generated technical content remains a
draft until a person explicitly approves it.

## Setup

Requires Node.js 22+ and npm.

```bash
npm install
npx playwright install chromium
npm run build
```

BookForge does not load `.env` automatically. Export values in the shell, or use:

```bash
cp .env.example .env
set -a; source .env; set +a
```

Never commit `OPENAI_API_KEY`.

## Mock workflow

```bash
npm run dev -- validate books/modern-java/book.yaml
npm run dev -- generate modern-java --chapter 2 --provider mock
npm run dev -- quality modern-java --chapter 2
npm run dev -- approve modern-java --chapter 2 --by "Paul"
npm run dev -- status modern-java
npm run dev -- assemble modern-java
npm run dev -- export modern-java --format pdf
npm run dev -- export modern-java --format zip
```

Mock mode is deterministic and never calls an external API. Use `--include-needs-review`
on assembly or export for a draft that has not been approved. `--force` regenerates
and preserves the prior chapter as a timestamped backup. Reruns resume at the first
incomplete stage.

## OpenAI workflow

```bash
export OPENAI_API_KEY='your-api-key'
export BOOKFORGE_MODEL='your-model-id'
export BOOKFORGE_TEMPERATURE=0.2
export BOOKFORGE_MAX_RETRIES=3
export BOOKFORGE_REQUEST_TIMEOUT_MS=120000
npm run dev -- generate modern-java --chapter 2 --provider openai
```

The provider records optional model, request ID, and token usage metadata. Retries
are bounded to likely transient failures. Do not commit secrets, and manually verify
technical claims and code before approval.

## Quality and snippets

```bash
npm run dev -- quality modern-java --chapter 2
npm run dev -- quality modern-java --all --strict --json
npm run dev -- reject modern-java --chapter 2 --reason "Needs a technical edit" --by "Paul"
npm run dev -- review-status modern-java
```

Chapters may define a `canonicalExample` in YAML. Code fences may declare
`intent=illustrative`, `intent=standalone`, or `intent=compilable`, with
`example=... file=...` metadata for multi-file examples. Missing intent is reported
as an inferred illustrative snippet. Quality reports are written to each chapter as
`quality-report.json` and `quality-report.md`; summaries are `summary.json` and
`summary.md`.

Optional validators use local tools only: Java uses `javac --release 21`, TypeScript
uses strict `tsc`, and Python uses syntax-only `py_compile`. BookForge never executes
generated application code and never downloads compilers.

## Assembly and exports

Default assembly requires every included chapter to be human-approved:

```bash
npm run dev -- assemble modern-java
npm run dev -- assemble modern-java --include-needs-review --allow-incomplete
```

Generated output includes:

```text
generated/modern-java/
├── README.md
├── TABLE_OF_CONTENTS.md
├── approval-status.md
├── combined.md
├── generation-state.json
├── chapters/<number>-<id>/
│   ├── draft.md
│   ├── review.md
│   ├── rewritten.md
│   ├── chapter.md
│   ├── summary.md
│   ├── summary.json
│   ├── quality-report.md
│   └── quality-report.json
└── exports/
    ├── modern-java-and-object-oriented-design.pdf
    └── Modern-Java-and-Object-Oriented-Design.zip
```

The PDF is rendered from assembled Markdown using Playwright Chromium, with CSS
page breaks, code/table styling, page numbers, and draft notices. If Chromium is not
installed, export fails clearly and leaves no partial PDF. The ZIP contains only
publication Markdown by default; internal workfiles and state are excluded.

Cleaning requires an explicit target and protects manually modified chapter content:

```bash
npm run dev -- clean modern-java --chapter 2 --dry-run
npm run dev -- clean modern-java --chapter 2 --force
npm run dev -- clean modern-java --all --force
```

The engine remains generic: book-specific behavior belongs in YAML and editable
prompt files, not in TypeScript.
