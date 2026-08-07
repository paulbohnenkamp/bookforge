# Chapters 16–18 Cross-Book Review

Generated after the OpenAI final-batch run on 2026-08-07. This is an editorial
assessment of Chapters 16–18 against Chapters 1–15. Automated validation is
evidence for review, not proof of technical correctness.

## Batch Status

| Chapter                                                   | Status       | Quality verdict    |             Machine metrics | Tokens |
| --------------------------------------------------------- | ------------ | ------------------ | --------------------------: | -----: |
| 16. Modernizing a Java 8 Codebase                         | needs_review | pass_with_warnings | 5,664 words; 13 code blocks | 67,251 |
| 17. Senior Java Interview Preparation                     | needs_review | pass_with_warnings | 4,495 words; 14 code blocks | 59,869 |
| 18. Exercises and Solutions: Design a Modern Java Service | needs_review | pass_with_warnings | 4,185 words; 18 code blocks | 74,783 |

All three chapters completed Writer → Reviewer → Rewriter → Quality Validation
and have `draft.md`, `review.md`, `rewritten.md`, `chapter.md`, `summary.md`,
`summary.json`, `quality-report.md`, and `quality-report.json`. No chapter was
approved automatically.

## Continuity and Progression

The final batch follows the book’s progression well. Chapter 16 turns the
language, runtime, API, testing, memory, and performance material into an
incremental modernization workflow. Chapter 17 then reuses those areas as
interview scenarios. Chapter 18 closes with a service-design exercise that
combines domain modeling, error handling, concurrency, testing, and performance
investigation.

The progression is satisfying in outline, but Chapter 17 and Chapter 18 both
revisit many earlier subjects. This is appropriate for deliberate synthesis,
provided the human edit keeps the recap subordinate to decisions and exercises.
Chapter 18’s `Annotated Solution` section is a useful closing addition and gives
the volume a practical ending rather than ending on interview advice.

## Repetition

Useful reinforcement includes:

- compatibility contracts from Chapters 1, 9, 14, and 16;
- cancellation, bounded concurrency, and virtual-thread limits from Chapters
  10–11, revisited as design constraints in Chapter 18;
- evidence-first performance reasoning from Chapters 12–13, reused in Chapters
  17–18.

Potentially unnecessary repetition includes repeated warnings against adopting
records, sealed types, streams, or virtual threads for their syntax alone. The
final chapters should keep one concise reminder and spend the remaining space on
the new modernization or exercise decision. Chapter 17 should also avoid
restating full definitions already taught in Chapters 2–15.

## Terminology

The batch uses the established vocabulary—contract, boundary, dependency,
invariant, cancellation, compatibility, evidence, and tradeoff—consistently.
The human reviewer should check that “target release,” “production baseline,”
and “deployment runtime” remain distinct in Chapter 16 and are not collapsed
into “Java version.” Chapter 18 should use “request,” “result,” “provider,” and
“cancellation” consistently across its intermediate and final APIs.

## Canonical Examples and Code

The book-level canonical order domain remains established by earlier chapters,
but Chapters 16–18 do not declare a chapter-level `canonicalExample`; their use
of modernization inventories, invoice/payment examples, and a profile
aggregation service is reasonable for their distinct purposes.

Human attention is required for code contracts:

- Chapter 16 labels a sealed hierarchy and a dependent pattern-switch example as
  standalone even though the declarations need separate files and the second
  fence depends on the first. The reviewer explicitly identified this; the
  examples should be marked illustrative or converted into a named multi-file
  compilable group.
- Chapter 17 has an incompatible duplicate `PaymentAccepted` declaration,
  reported by the consistency validator at lines 218 and 256. Its
  `PaymentOutcome` example is also not genuinely standalone because it contains
  multiple public top-level declarations without filenames.
- Chapter 18’s complete-service composition submits one task per customer before
  acquiring the semaphore. That bounds active provider calls but not queued work,
  so it conflicts with the chapter’s own bounded-admission objective. The
  chapter also shows an unreachable checked `InterruptedException` catch relative
  to its declared provider interface, and its request record should defensively
  copy the caller’s list.

These are substantive human-review items, not reasons to modify the generic
generation engine.

## Objectives and Summaries

Chapter 16 covers inventory, release selection, build and dependency risk,
incremental feature adoption, compatibility, rollout, rollback, and measuring
modernization value. The summary captures those concepts and deferred topics,
but the reviewer identified useful omissions: `jdeps`/`jdeprscan`, reflective
risks in `jlink` images, removed JDK components, multi-release JARs, and a more
concrete persisted-data rollback example.

Chapter 17 covers senior reasoning, design, language features, concurrency, JVM
diagnosis, performance, testing, and modernization. Its summary is accurate,
but the human edit should add or clarify a compact symptom-to-evidence diagnostic
path, a deterministic test design, structured concurrency as version-qualified
context, and source/binary compatibility examples.

Chapter 18 covers a coherent service exercise and annotated solution. Its summary
captures the intended synthesis. The human edit should make the performance
objective demonstrably measurable or explicitly frame it as a measurement plan,
define executor ownership, defensively copy request input, and make deadline and
cancellation semantics precise.

The automated objective-coverage warnings for all three chapters are heuristic.
They should be checked against the YAML objectives rather than accepted as proof
of missing content.

## Interview Questions and Exercises

Chapter 16 has strong decision-oriented interview questions and exercises about
upgrade planning. Chapter 17’s interview section is appropriately senior and
avoids trivia, but should be shortened if it repeats full chapter explanations.
Chapter 18’s exercises have meaningful expected outcomes and its solution section
provides a good capstone; the reviewer should verify that each expected outcome
can be assessed without relying on a hidden framework.

## Quality-Validator Findings

The validator reported no blocking errors. It correctly identified the duplicate
`PaymentAccepted` declaration in Chapter 17. It also reported inferred snippet
intent and heuristic objective-coverage warnings. Those warnings are useful
review prompts but are not correctness findings.

The validator missed or did not prove several human-visible issues:

- mislabeled Java examples that are not actually standalone;
- the unbounded task-submission behavior in Chapter 18;
- the mismatch between the interruption catch and the provider contract;
- deadline semantics for already-completed futures;
- executor ownership and defensive-copying design;
- the depth of modernization tooling and JVM diagnostic workflows.

These gaps are expected from the current heuristic validator and should not be
“fixed” by weakening its existing checks.

## Draft Assembly and Exports

The current assembled Markdown contains all 18 chapters in configured order and
includes a clear `Draft — Needs Human Review` notice. The table of contents,
chapter separators, heading hierarchy, approval-status metadata, and front/back
matter are present.

The PDF was regenerated successfully after installing the existing Playwright
Chromium dependency. It is a 465-page A4 PDF with a title page, TOC, page
numbers, chapter page breaks, code/table rendering, and a visible draft notice.
Text extraction confirms the final chapter is present. A spot inspection found
no obvious clipping, blank-page, or final-page failure. Detailed visual review
of long code blocks and tables remains a human publication check.

The ZIP contains the clean publication package: README, TABLE_OF_CONTENTS,
combined Markdown, and 18 chapter Markdown files. It excludes drafts, reviews,
rewritten intermediates, state, logs, backups, and temporary files.

## Recommended Human-Review Order

1. Chapter 18: resolve bounded admission, interruption, cancellation/deadline,
   executor ownership, and request immutability before treating the capstone as
   an executable design.
2. Chapter 16: correct snippet intent and deepen upgrade-tooling and rollback
   caveats.
3. Chapter 17: remove the duplicate `PaymentAccepted` API, correct the
   standalone example metadata, and check diagnostic and compatibility coverage.
4. Read Chapters 16–18 together against the approved summaries for Chapters
   1–15, then perform the final PDF and ZIP review.

## Recommendation

The first edition is fully generated, but Chapters 16–18 should remain in
`needs_review`. Do not treat the complete draft or `pass_with_warnings` verdicts
as publication approval. Proceed to explicit human technical review and repair
of the code-contract findings before approving these chapters or exporting a
publication-ready package.
