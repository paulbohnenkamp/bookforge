# Land Agent Learning Book Brief

Build the book specified by:

`books/land-agent-learning/book.yaml`

The book is a repository-driven tutorial based on the sibling repository:

`../land-agent-demo-learning`

Do not treat this as a generic AI survey. The reader should first understand
the existing lease-analysis agent, then build and understand a second
ownership-research workflow through the same architecture.

## Core teaching arc

Keep this flow visible throughout the book:

```text
LLM → agent → skill → MCP → structured data → retrieval/RAG
  → grounded answer → approval → audit/evals → Azure
```

For every layer, explain:

- what responsibility it owns
- which repository files implement it
- how a real land question passes through it
- what is shared with the other workflow
- what remains specialized
- what failure or trust problem the boundary prevents

## Narrative

Use one continuous story. Begin with a user asking the existing agent to
analyze a fictional lease. Follow that request through the local repository,
including the agent runtime, `analyze-lease` skill, MCP land server,
structured land records, document retrieval, grounded response, approval, and
audit/evaluation artifacts.

Then introduce a second business capability: ownership research. Use the
repository's `research-ownership` skill and build the second workflow through
the same sequence. Make the reuse explicit: the model provider, runtime, MCP
transport, deterministic stores, retrieval contracts, audit format, approval
policy, and evaluation approach should remain shared where the repository
supports that. The skill, instructions, selected tools, evidence requirements,
response shape, and evaluation scenarios may specialize.

End by mapping the transparent local implementation to Azure OpenAI, Azure AI
Search, and Blob Storage without pretending that the mapping alone is a
production deployment plan.

## Repository grounding requirements

Before writing each chapter, inspect the relevant files in the sibling
repository. Prefer these sources:

- `docs/LEARNING_GUIDE.md`
- `docs/CODE_WALKTHROUGH.md`
- `docs/SOURCE_MAP.md`
- `src/index.ts`
- `src/agent/agent.ts`
- `src/agent/system-prompt.md`
- `src/skills/analyze-lease/SKILL.md`
- `src/skills/research-ownership/SKILL.md`
- `src/mcp/land-server/server.ts`
- `src/mcp/land-server/store.ts`
- `src/retrieval/`
- `src/audit.ts`
- `src/azure/`

Verify commands, filenames, data names, tool names, and behavior against the
repository. Never invent a command, module, response field, Azure resource,
or execution result. If the repository is ambiguous or incomplete, say so in
the chapter and identify what the reader can actually verify.

## Editorial rules

- Write for a developer who can read TypeScript but is new to agents and RAG.
- Explain the current implementation before proposing changes.
- Use concrete commands and tell the reader what output or artifact to expect.
- Keep the lease and ownership examples fictional and educational; do not give
  legal conclusions.
- Explain deterministic facts before model interpretation.
- Make evidence, uncertainty, approval ownership, and auditability concrete.
- Use short, coherent code excerpts instead of dumping whole source files.
- Do not add interview-question sections or artificial exercise sections.
- Do not reset the story with unrelated toy examples.
- Avoid abstract vocabulary lists, marketing language, and repeated lifecycle
  explanations.
- Do not claim that prompts eliminate hallucinations or that retrieval proves
  truth.
- Do not claim code was run, compiled, deployed, or validated unless the agent
  actually performed that check.

## Production constraints

This is a new book. Do not rewrite or regenerate existing books such as
`biz-workflows` or `land-project`. Do not alter the sibling repository. Keep
generation sequential and preserve the normal BookForge approval and review
workflow. Use the book specification as the source of chapter order, story,
learning promise, workflow commands, and end matter.

At completion, verify that the assembled book has a coherent beginning,
middle, and end; that each chapter hands a question or consequence to the
next; and that the final book teaches the reader how to build the second
workflow rather than merely describing the first one.
