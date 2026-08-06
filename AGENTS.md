# Contribution guidance

BookForge is a generic book engine. Keep technology-specific behavior in YAML
book specifications and editable prompt files, not in TypeScript modules.

- Use strict TypeScript, ESM, named exports, and constructor injection.
- Keep modules small and test public behavior.
- Validate untrusted YAML with Zod before using it.
- Do not add chapter generation, external LLM integration, export formats, or web
  application code until the relevant milestone is requested.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`
  before handing off changes.
