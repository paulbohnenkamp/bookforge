# Editorial Guidelines v2

This document records the generic writing-system changes made after the
six-chapter editorial review. No generated chapters were regenerated as part of
this calibration pass.

## Writer prompt changes

- Added natural opening choices—failure, decision, reader question, or qualified
  misconception—to address the repeated “reject a simplistic definition”
  openings.
- Added guidance for varied paragraph rhythm, section shape, transitions, and
  endings. Required chapter functions remain, but identical rhetorical templates
  are discouraged.
- Changed word-count guidance from an acceptable-range target to a soft editorial
  budget: aim near 80–110%, treat 120% as a warning, and never add material to
  reach a quota.
- Required previous summaries to support continuity without reteaching earlier
  chapters.
- Required Java-version context before the first version-sensitive feature or API.
- Clarified that `standalone` means coherent enough to adapt without guessing,
  while illustrative snippets must state omitted imports, setup, and supporting
  types.
- Added a final audit for duplicate explanations, repeated APIs, contract
  mismatches, code-fence count, and exercise outcomes.

These changes address the report’s findings on overlong chapters, repetitive
openings and conclusions, mirrored subsection structure, delayed version caveats,
and overly complete-looking illustrative snippets.

## Reviewer prompt changes

- Added checks for stock openings/endings, repeated sentence structures, weak
  transitions, unnecessary recap, and chapter pacing.
- Required concrete locations or excerpts for repetition and prose-rhythm
  findings, in addition to exact code locations for technical defects.
- Required measured word count and code-block count with an explicit target/range
  judgment.
- Added semantic checks for version caveats, ordered names backed by unordered
  implementations, failure sequencing, callback lifetime, generic contracts, and
  exercise signatures.
- Required the Reviewer to distinguish blocking issues, editorial heuristics,
  and coarse or likely false-positive validator warnings.

These changes address the report’s findings that human reviewers saw API and
teaching defects missed by automated validation, and that existing word-count and
objective warnings were too coarse.

## Rewriter prompt changes

- Required prose-rhythm and transition variation while preserving the required
  chapter learning functions.
- Required removal of repeated explanations and redundant examples rather than
  adding length to answer review feedback.
- Required version caveats to move before the first dependent feature or API.
- Required honest snippet intent, including reclassifying incomplete standalone
  examples as illustrative.
- Required preservation of exact semantics for ordering, currency, failure
  behavior, callback lifetime, generic relationships, and versioned APIs.

These changes address the report’s blocking examples in `Money`, generic
registries, callbacks, ordered collections, and Java-version-dependent snippets,
as well as the repeated Best Practices and Common Mistakes material.

## Style-guide changes

- Added a concise “Pacing and Variation” section stating that the eight required
  sections are functions, not identical rhetorical molds.
- Added acceptable opening and ending patterns and a requirement for
  chapter-specific takeaways rather than stock conclusions.
- Added guidance to vary paragraph length and explanation shape.
- Strengthened snippet-intent definitions so illustrative, standalone, and
  compilable examples cannot be confused by their apparent completeness.
- Added the early version-context rule for Java features and APIs.
- Clarified the soft word-count budget and the prohibition on filler or
  near-equivalent examples.

These are limited additions to rules already present in the guide. They directly
address the recurring AI-like symmetry, delayed caveats, snippet ambiguity, and
length problems found in Chapters 1–6 without turning the style guide into a
rigid template.

## Files changed

- `prompts/writer.md`
- `prompts/reviewer.md`
- `prompts/rewriter.md`
- `docs/BOOK_STYLE_GUIDE.md`
- `docs/calibration/editorial-guidelines-v2.md`

Generated artifacts and application source were intentionally left unchanged.
