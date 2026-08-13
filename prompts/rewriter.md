# Rewriter Prompt

Produce the final version of exactly one chapter by applying the reviewer’s
findings while preserving correct material and the chapter’s declared scope.
The chapter specification and style guide remain authoritative; use the review
as a defect list, not as permission to add unrelated material.

Before returning the chapter, verify that you have:

- addressed every critical and recommended issue that is supported by the
  draft and specification;
- covered every declared objective and topic;
- respected topics marked to avoid or defer;
- supplied realistic examples, meaningful tradeoffs, common mistakes, and
  contextual best practices; include model interview answers and 3–6 exercises
  only when enabled;
- kept the result within approximately 80–120% of the target word count
  without filler;
- preserved a logical learning flow and the required chapter sections;
- corrected inaccurate or incomplete code and terminology;
- used the chapter title exactly once as the top-level `#` heading.
- preserved any supplied canonical-example contract and made snippet intent clear;
- included Interview Questions only when `interview questions=true` and
  Exercises only when `exercises=true` in the supplied style context;
- addressed every critical issue and did not silently discard unresolved major
  findings.
- kept one authoritative API for every canonical type and made replacement or
  legacy examples explicit and separately named;
- checked every code fence for imports, supporting declarations, legal inheritance,
  method signatures, and the declared intent before returning the chapter.
- varied the opening, transitions, paragraph rhythm, and ending so the chapter
  does not sound like a repeated template; keep the required learning functions
  without forcing identical section shapes.
- when a book story contract is supplied, preserved one threaded narrative:
  use the specified story beat, recurring system, cast, constraints, and a
  concrete handoff to the next chapter rather than substituting an unrelated
  example.
- when a learning contract is supplied, kept the chapter focused on the
  reader's promised capability. For tutorials, converted generic exercises
  into inline guided actions with commands, expected observations, and a clear
  handoff to the next chapter.
- when verified workflow steps are supplied, used their commands, flags, paths,
  state names, and artifact names exactly rather than inventing alternatives.
- shortened repetitive explanations and removed examples that do not add a new
  decision, failure mode, or tradeoff. Do not increase length unless a supported
  technical correction genuinely requires it.
- when the supplied style is `concise executive`, kept one recurring example,
  limited Core Concepts to the few ideas needed by the audience, and removed
  implementation detail and secondary examples;
- moved Java-version and compatibility caveats before the first feature or API
  that depends on them.
- made every illustrative snippet explicit about omitted setup, imports, and
  supporting types; changed `standalone` to `illustrative` when the displayed
  material is not actually self-contained.
- preserved or restored exact contract semantics, including versioned APIs,
  ordering, currency, failure behavior, callback lifetime, and generic type
  relationships.

Return raw Markdown only. Do not wrap the chapter in an outer code fence, do
not include a preface or postscript, do not mention the review process, and do
not introduce unverifiable citations, fabricated benchmarks, or unrelated
scope.
