# BookForge V1.1 — Implementation Specification

> Status: Build Specification
> Scope: MVP only

# Executive Summary

BookForge is a local-first command line application that generates high-quality
technical books from a YAML specification.

The MVP has one purpose:

**Generate a professional Markdown book and ZIP archive from a book specification.**

Everything that does not directly contribute to that goal is postponed.

## Generation intent

The input specification is the contract for the book's subject matter. When a
caller supplies an existing specification path, BookForge must validate and
generate the chapters described by that file. It must not substitute a new
book specification, change the requested book ID, or generate a meta-book about
BookForge's YAML, prompts, or pipeline. Documentation about the engine is a
separate output and is not part of normal book generation.

---

# Success Criteria

A developer should be able to run:

    bookforge generate modern-java

and receive

    generated/
        modern-java/
            01-introduction.md
            ...
            combined.md
            Modern-Java.zip

without modifying source code.

---

# Design Principles

1. Keep the engine generic.
2. Keep prompts editable.
3. Prefer simple code over clever code.
4. One responsibility per module.
5. Sequential generation.
6. Human review is expected.
7. Never overwrite approved work without permission.

---

# Architecture

Book
├── Metadata
├── Style
├── Chapters
└── Output

Chapter
├── Draft
├── Review
├── Rewrite
├── Automated validation
└── Human review: needs_review → approved or rejected

The engine understands Books and Chapters.
It knows nothing about Java, Spring, React, or any specific technology.

---

# Repository Layout

book-forge/
docs/
specification.md
books/
modern-java/
book.yaml
prompts/
writer.md
reviewer.md
rewriter.md
generated/
src/
cli/
generator/
llm/
exporter/
util/
tests/

---

# Book Specification

Example:

```yaml
book:
  id: modern-java
  title: Modern Java and Object-Oriented Design
  subtitle: Practical Java 8–25
  audience:
    - Senior Java developers
    - Interview candidates

style:
  tone: practical
  includeInterviewQuestions: true
  includeExercises: true

output:
  markdown: true
  zip: true

learning:
  promise: What the reader will be able to use or build by the end.
  prerequisites:
    - Knowledge the reader must already have.
  byTheEnd:
    - Concrete capability one.
    - Concrete capability two.
    - Concrete capability three.
  deferred:
    - Important topics intentionally left for a later book.

story:
  title: The recurring project or system
  premise: The situation the reader follows through the book.
  cast:
    - The people whose decisions recur in the examples.
  constraints:
    - The practical constraint that keeps the story coherent.

endMatter:
  glossary:
    - term: Boundary
      definition: A concise definition for the reader's reference.
  indexTerms:
    - Boundary
  references:
    - title: A verified source or book used in the book
      author: Author or organization
      url: https://example.com/source
      note: Why the source is included.
  appendix:
    - title: Optional supporting material
      content: Markdown content for the appendix.

chapters:
  - id: introduction
    title: Modern Java in Context
    targetWords: 3500
    objectives:
      - Explain the central mental model for the chapter.
      - Compare relevant design or implementation tradeoffs.
      - Apply the ideas to a realistic engineering problem.
    topics:
      - Core terminology
      - Practical decisions

  - id: oo
    title: Object-Oriented Design
    targetWords: 6000
    objectives:
      - Explain the chapter's core concepts precisely.
      - Evaluate the concepts in production-oriented examples.
      - Identify tradeoffs and common failure modes.
    topics:
      - Core concepts
      - Worked examples
      - Common mistakes

Each chapter specification must include a stable `id`, a title, a positive
`targetWords` value, 3–7 concrete `objectives`, and at least one `topics` entry.
`topicsToAvoid`, `canonicalExample`, and `storyBeat` are optional. The optional
book-level `story` keeps examples threaded across chapters. The optional
`learning` contract defines the reader promise, prerequisites, end-state
capabilities, and deliberate exclusions. The optional
`endMatter` renders a glossary, generated index, bibliography/reference list,
and appendix after the chapters during complete-book assembly. The engine uses
these fields to keep a book's scope and terminology in the editable prompt
context; it does not contain technology-specific chapter logic.
```

---

# Chapter Quality Standard

Every chapter MUST contain:

1. Why this matters
2. Core concepts
3. Worked examples
4. Common mistakes
5. Best practices
6. Interview questions
7. Exercises
8. Key takeaways

---

# Prompt Files

writer.md
-----------

Responsible for creating a complete chapter.

Requirements

- explain WHY
- use production-quality code
- no filler
- no fake citations
- concise technical writing

reviewer.md
------------

Returns only:

- strengths
- weaknesses
- missing topics
- incorrect statements
- suggested improvements

Never rewrites the chapter.

rewriter.md
------------

Produces the final version using reviewer feedback.

---

# Pipeline

Writer → Reviewer → Rewriter → Quality validation → needs_review → Human approval

Only explicitly approved chapters may be assembled by default. Rejected chapters
remain available for regeneration or manual correction. Quality reports are written
as JSON and Markdown, and automated validation never implies technical authority.

---

# CLI

bookforge validate books/modern-java/book.yaml

bookforge generate modern-java --chapter 2

bookforge generate modern-java

bookforge assemble modern-java

bookforge assemble modern-java --from 1 --to 3 --include-needs-review --allow-incomplete

bookforge export modern-java

bookforge export modern-java --format pdf --from 1 --to 3 --include-needs-review

bookforge export modern-java --format zip --from 1 --to 3 --include-needs-review

bookforge clean modern-java

bookforge approve modern-java --chapter 2

bookforge approve modern-java --from 1 --to 3

---

# Coding Standards

- TypeScript strict mode
- No any
- Constructor injection
- Pure functions where practical
- Small modules
- Named exports
- Unit tests for public behavior

---

# Error Handling

Failures should:

- explain what happened
- explain how to fix it
- never hide stack traces in debug mode
- never expose secrets

---

# Generated Output

generated/

    modern-java/

        01-introduction.md

        02-oo.md

        ...

        combined.md

        Modern-Java.zip

---

# Milestones

M1

- Project skeleton
- CLI
- YAML loader
- Mock LLM

M2

- Writer
- Reviewer
- Rewriter

M3

- OpenAI provider

M4

- ZIP export
- Resume
- Combined markdown

M5

- Markdown and code quality reports
- Optional Java, TypeScript, and Python syntax validation
- Explicit human approval and rejection
- Approval-aware assembly and ZIP export
- CLI PDF export through an isolated Playwright renderer
- CLI responsive EPUB 3 export from approved Markdown

M5

- Generate Modern Java volume

---

# Future (Not MVP)

- Web UI
- Background jobs
- Multiple providers
- Team collaboration

---

# Acceptance Checklist

[ ] npm install succeeds
[ ] lint passes
[ ] typecheck passes
[ ] tests pass
[ ] sample book validates
[ ] sample book generates
[ ] ZIP exports
[ ] prompts editable
[ ] engine works for any book.yaml

---

# Codex Kickoff

Implement Milestone 1 only.

Do not add React, Next.js, Spring Boot, Docker, databases,
or unnecessary abstractions.

Build a clean CLI foundation first.
