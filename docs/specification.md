
# BookForge V1.1 — Implementation Specification

> Status: Build Specification
> Scope: MVP only

# Executive Summary

BookForge is a local-first command line application that generates high-quality
technical books from a YAML specification.

The MVP has one purpose:

**Generate a professional Markdown book and ZIP archive from a book specification.**

Everything that does not directly contribute to that goal is postponed.

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
 └── Published

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

chapters:
  - id: introduction
    title: Modern Java in Context
    targetWords: 3500

  - id: oo
    title: Object-Oriented Design
    targetWords: 6000
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

Writer

↓

Reviewer

↓

Rewriter

↓

Published

No additional stages in V1.

---

# CLI

bookforge validate books/modern-java/book.yaml

bookforge generate modern-java --chapter 2

bookforge generate modern-java

bookforge assemble modern-java

bookforge export modern-java

bookforge clean modern-java

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
- Generate Modern Java volume

---

# Future (Not MVP)

- PDF
- EPUB
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
