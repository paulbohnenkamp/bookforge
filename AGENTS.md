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
- Do not add external LLM integration, export formats, or web application code
  until the relevant milestone is requested.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`
  before handing off changes.
