# Development workflow

BookForge keeps generation, quality validation, approval, assembly, and export
as separate CLI stages. Automated validation is not human approval; generated
content remains a draft until a person explicitly approves it.

## Local setup

```bash
npm install
npm run build
npm run format:check
npm run lint
npm run typecheck
npm test
```

BookForge does not load `.env` automatically. Export values in the shell or use:

```bash
cp .env.example .env
set -a; source .env; set +a
```

Never commit `OPENAI_API_KEY`.

## Workflow commands

```bash
npm run dev -- generate bookforge-tutorial --chapter 1 --provider mock
npm run dev -- quality bookforge-tutorial --chapter 1
npm run dev -- reject bookforge-tutorial --chapter 1 --reason "Needs a technical edit" --by "Your Name"
npm run dev -- approve bookforge-tutorial --chapter 1 --by "Your Name"
npm run dev -- status bookforge-tutorial
npm run dev -- assemble bookforge-tutorial
npm run dev -- export bookforge-tutorial --format pdf
npm run dev -- export bookforge-tutorial --format zip
```

Reruns resume at the first incomplete stage. `--force` regenerates while
preserving the previous chapter as a timestamped backup.
