# BookForge

BookForge is a local-first TypeScript CLI for generating generic technical books.
The pipeline is sequential and provider-independent:

```text
Generate → Review → Rewrite → Quality validation → Needs human review
→ Human approval → Assemble → PDF, EPUB, or ZIP export
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
npm run dev -- validate books/bookforge-tutorial/book.yaml
npm run dev -- generate bookforge-tutorial --chapter 1 --provider mock
npm run dev -- quality bookforge-tutorial --chapter 1
npm run dev -- approve bookforge-tutorial --chapter 1 --by "Paul"
npm run dev -- status bookforge-tutorial
npm run dev -- assemble bookforge-tutorial
npm run dev -- export bookforge-tutorial --format pdf
npm run dev -- export bookforge-tutorial --format epub
npm run dev -- export bookforge-tutorial --format zip
npm run dev -- export bookforge-tutorial --format all
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
npm run dev -- generate bookforge-tutorial --chapter 1 --provider openai
```

The provider records optional model, request ID, and token usage metadata. Retries
are bounded to likely transient failures. Do not commit secrets, and manually verify
technical claims and code before approval.

## Quality and snippets

```bash
npm run dev -- quality bookforge-tutorial --chapter 1
npm run dev -- quality bookforge-tutorial --all --strict --json
npm run dev -- reject bookforge-tutorial --chapter 1 --reason "Needs a technical edit" --by "Paul"
npm run dev -- review-status bookforge-tutorial
```

Approve a reviewed range sequentially. Each chapter still requires its own fresh
quality report and approval hash checks:

```bash
npm run dev -- approve bookforge-tutorial --from 1 --to 5 --by "Paul"
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

Front matter and end matter are deterministic outputs of `book.yaml`; they do
not invoke the Writer, Reviewer, or Rewriter. After changing either section,
reassemble and export the book:

```bash
npm run dev -- assemble land-agent-learning
npm run dev -- export land-agent-learning --format all
```

Assembly refreshes the front matter, table of contents, and end matter in the
assembled publication. Chapter Markdown and generation state are not changed;
the normal approval rules still apply.

Default assembly requires every included chapter to be human-approved:

```bash
npm run dev -- assemble bookforge-tutorial
npm run dev -- assemble bookforge-tutorial --include-needs-review --allow-incomplete
```

For a partial draft, scope assembly and export explicitly. The selected range is
one-based and remains marked incomplete:

```bash
npm run dev -- assemble bookforge-tutorial --from 1 --to 3 --include-needs-review --allow-incomplete
npm run dev -- export bookforge-tutorial --format pdf --from 1 --to 3 --include-needs-review
npm run dev -- export bookforge-tutorial --format zip --from 1 --to 3 --include-needs-review
npm run dev -- export bookforge-tutorial --format epub --from 1 --to 3 --include-needs-review
```

Scoped table-of-contents links target stable anchors in `combined.md`. Older
generated chapters outside the selected range are not included in the partial
publication package.

Generated output includes:

```text
generated/bookforge-tutorial/
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
    ├── bookforge-tutorial.pdf
    ├── bookforge-tutorial.epub
    └── BookForge-Tutorial.zip
```

The PDF is rendered from assembled Markdown using Playwright Chromium, with CSS
page breaks, code/table styling, page numbers, and draft notices. If Chromium is not
installed, export fails clearly and leaves no partial PDF. The ZIP contains only
publication Markdown by default; internal workfiles and state are excluded. EPUB
is a reflowable EPUB 3 package built directly from approved chapter Markdown,
with responsive typography, tables, code blocks, navigation, and optional cover
metadata.

Cleaning requires an explicit target and protects manually modified chapter content:

```bash
npm run dev -- clean bookforge-tutorial --chapter 1 --dry-run
npm run dev -- clean bookforge-tutorial --chapter 1 --force
npm run dev -- clean bookforge-tutorial --all --force
```

The engine remains generic: book-specific behavior belongs in YAML and editable
prompt files, not in TypeScript.

## License

BookForge is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Creating another book

Create one directory and specification per book:

```text
books/<book-id>/book.yaml
```

The book ID must contain only letters, numbers, hyphens, or underscores. Use this
minimal specification as a starting point:

```yaml
book:
  id: distributed-systems
  title: Distributed Systems in Practice
  subtitle: A Decision-Oriented Guide
  audience:
    - Senior software engineers

style:
  tone: practical
  includeInterviewQuestions: true
  includeExercises: true

output:
  markdown: true
  zip: true

chapters:
  - id: foundations
    title: Foundations and Failure Models
    targetWords: 4500
    objectives:
      - Explain the central mental models.
      - Compare the relevant design tradeoffs.
      - Apply the ideas to a realistic system.
    topics:
      - Core terminology
      - Failure modes
      - Decision criteria
    topicsToAvoid:
      - Vendor-specific implementation details
```

Every chapter needs a stable `id`, title, positive target word count, 3–7
objectives, and at least one topic. `topicsToAvoid` and `canonicalExample` are
optional. The engine supplies the same editable `prompts/*.md` and
`docs/BOOK_STYLE_GUIDE.md` to every book, so put book-specific scope, terminology,
examples, and version constraints in `book.yaml`. If different books need
different writing rules, that is not currently configurable per book; keep the
shared prompts technology-neutral or plan a focused configuration change first.

Validate before generating:

```bash
npm run dev -- validate books/<book-id>/book.yaml
npm run dev -- generate <book-id> --chapter 1 --provider mock
npm run dev -- quality <book-id> --chapter 1
```

Use a mock pilot before any paid generation. After human review, approve chapters
and assemble or export using the same commands shown above, replacing
`bookforge-tutorial` with the new book ID. Each book gets independent state and output
under `generated/<book-id>/`.

### Generating an existing book specification

If a request points to an existing specification such as
`@books/ai-monitor-agents/book.yaml`, generate that specification's actual
chapter content. Do not create a second specification or turn the subject into
a book about BookForge. Validate the exact path first, then use its directory
name as the book ID:

```bash
npm run dev -- validate books/ai-monitor-agents/book.yaml
npm run dev -- generate ai-monitor-agents --provider mock
npm run dev -- quality ai-monitor-agents --all
npm run dev -- assemble ai-monitor-agents --include-needs-review --allow-incomplete
```

The `generate` command is content generation. Creating or editing
`books/<book-id>/book.yaml` is a separate task and should happen only when the
user asks for a new or revised specification. Generated chapters remain drafts
until human approval.

## Private book specifications

The public repository intentionally includes only `books/bookforge-tutorial/`.
Most directories under `books/` are ignored so production book plans can remain
local and private. This ignore rule does not remove specifications that were
committed in earlier Git history; removing those requires a separate history
rewrite and coordination with repository users.
