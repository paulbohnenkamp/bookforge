# Contribution guidance

BookForge is a generic book engine. Keep technology-specific behavior in YAML
book specifications and editable prompt files, not in TypeScript modules.

- Use strict TypeScript, ESM, named exports, and constructor injection.
- Keep modules small and test public behavior.
- Validate untrusted YAML with Zod before using it.
- Keep the single-chapter generator sequential: write each completed artifact and
  state transition before starting the next stage.
- Keep generated artifacts behind atomic file writes and preserve published work
  before force regeneration.
- Keep full-book generation sequential and separate from chapter generation,
  assembly, ZIP export, and cleaning. Never send complete prior chapters as
  continuity context by default.
- Keep publication ZIPs limited to assembled Markdown and published chapter
  copies. Require explicit clean targets and protect manually edited published
  chapters unless `--force` is supplied.
- Keep all OpenAI SDK imports, request construction, response parsing, and SDK
  error translation inside the OpenAI provider module. Never log or persist API
  keys.
- Automated validation is not human approval. Preserve chapter hashes and approval
  protection; content changes invalidate approval.
- Do not claim code compiled unless a validator actually executed successfully, and
  never execute generated programs during validation.
- Keep PDF generation CLI-only, with renderer dependencies isolated from generation.
- Do not add providers, EPUB formats, databases, workers, or web application code.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`
  before handing off changes.
