# BookForge

BookForge is a local-first TypeScript CLI for working with generic technical-book
specifications. Milestone 1 provides the validated configuration, YAML and prompt
loaders, logging and error boundaries, a mock LLM provider, and book validation.

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

## Commands

Validate a book specification:

```bash
npm run dev -- validate books/modern-java/book.yaml
```

Run the compiled CLI:

```bash
npm start -- validate books/modern-java/book.yaml
```

Milestone 1 deliberately does not generate chapters, call external providers, or
export files. Those are later milestones.
