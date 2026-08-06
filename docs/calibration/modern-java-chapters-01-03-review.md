# Modern Java Chapters 1–3 Continuity Review

## Trial scope and inputs

This review covers the real OpenAI outputs for chapters 1 and 3 and the preserved
real OpenAI output for chapter 2. The configured model was not changed. Chapter 1
and chapter 3 were regenerated once because their existing artifacts were
deterministic mock outputs; each prior chapter was preserved as a timestamped
backup. Chapter 2 was not regenerated.

All three chapters remain `needs_review`. No approval command was run.

## Topic progression

Chapter 1 gives a useful platform and migration frame: release cadence, LTS
support, runtime boundaries, compatibility contracts, dependency readiness, and
rollout evidence. It does not deeply teach OO, SOLID, collections, or
concurrency. Its closing migration advice gives a reasonable reason to move
toward design decisions.

Chapter 2 turns change risk into an object-design vocabulary. It establishes
invariants, responsibility, cohesion, coupling, composition, interfaces,
delegation, and dependency direction through the order-processing example. It
explicitly defers a full SOLID treatment, which makes it a sound conceptual
bridge to chapter 3.

Chapter 3 builds on change amplification, interfaces, composition, contracts,
and dependency direction. It covers all five SOLID principles and their costs
without re-teaching the four OO pillars at length. The progression is coherent,
although the opening recap of OO vocabulary could be shortened and pointed more
explicitly to chapter 2.

## Repetition findings

Useful reinforcement occurs when chapter 3 reuses “change amplification,”
behavioral contracts, composition, and meaningful interfaces to explain a SOLID
decision. Chapter 1’s use of “encapsulation” is mostly about JDK boundaries and
does not materially duplicate chapter 2’s object-design explanation.

The main unnecessary repetition is within chapters 2 and 3 rather than between
them. Chapter 2 repeats constructor injection, composition, interfaces, and
invariant ownership across core concepts, best practices, and interview answers.
Chapter 3 repeats the cost of premature abstraction, one-interface-per-class
warnings, and conditional-versus-strategy decisions across core concepts,
common mistakes, and best practices. The next editorial pass should consolidate
these, not remove the strongest examples.

The terms `records` and `immutability` occur in chapter 1 as modernization
signposts and in chapter 2 as design examples. This is useful continuity, but
chapter 1 should avoid implying that records are required for modernization.

## Terminology

The sequence consistently uses `responsibility`, `dependency`, `contract`,
`collaborator`, `subtype`, and `composition`. Chapter 2 uses `interface` as a
meaningful capability boundary; chapter 3 preserves that meaning while
introducing client-shaped interfaces for ISP. “Dependency injection” is kept
distinct from dependency inversion in both chapters 2 and 3.

One editorial risk is that chapter 1 uses “encapsulation” for stronger JDK
module/access boundaries while chapter 2 uses it for protecting object
invariants. Both are valid, but chapter 1 should call the distinction out once
so readers do not infer that module encapsulation and object encapsulation are
the same mechanism.

## Canonical examples and code progression

Chapter 2’s canonical order-processing API remains internally coherent enough for
its stated illustrative intent and is summarized for later continuity. Chapter
3 uses a checkout/tax/invoice domain instead of silently redefining `Order`,
`Money`, or `OrderLine`; this is a reasonable deliberate example change. It
states assumptions around `Order`, `Money`, and `CheckoutSummary` rather than
pretending the snippets are complete files.

The cross-chapter risk is not name drift but example scale: chapter 2 establishes
a detailed order aggregate, while chapter 3 introduces a second, broader
checkout model with `TaxPolicy`, `InvoiceRenderer`, and `InvoiceSender`. The
transition should explain that the second model is a focused SOLID teaching
example, not a competing canonical API for the book.

The automated reports found no consistency errors and no language validators ran:
all code fences are illustrative. Human review must still check the chapter 2
money policy and the chapter 3 tax/shipping currency assumptions, Java-version
APIs, and placeholder implementations.

## Writing consistency and readability

All three chapters use the required heading rhythm, direct prose, tagged code
fences, interview questions with model answers, exercises, and key takeaways.
Chapter 1 is 4,722 words against a 4,500 target. Chapter 2 is 6,169 against
6,000. Chapter 3 is 6,257 against 5,000 and is the clearest outlier. Chapter 3
should be shortened before approval, mainly by merging repeated abstraction
guidance; chapter 2 also benefits from a smaller best-practices synthesis.

## Summary-context effectiveness

Chapter summaries contain the configured purpose, concepts, terminology,
assumptions, deferred topics, and continuity risks. Chapter 3 received summaries
for chapters 1 and 2 rather than complete chapter content. This was enough to
retain the book’s change-oriented vocabulary and avoid an obvious redefinition of
the chapter 2 canonical API. The summaries do not yet record specific transition
sentences or known repetition risks discovered by a human reviewer, so those
remain editorial inputs rather than automatic continuity controls.

## Blocking and nonblocking issues

No automated blocking errors were reported. The following nonblocking findings
need human technical review:

- Chapter 1 incorrectly describes `Files.readString(Path)` as using the platform
  default charset; the example should use an API that actually has that behavior,
  or explain that this overload specifies UTF-8.
- Chapter 1 is somewhat too chronological and should qualify Java 25 claims by
  distribution/support policy.
- Chapter 2 needs close review of `Money` rounding/scale policy, payment versus
  persistence failure semantics, and repeated illustrative APIs.
- Chapter 3 needs close review of `Map.copyOf`, `Money.multiply` signatures,
  currency assumptions, and intentionally partial collection examples.
- Chapter 3’s 6,257-word output exceeds the configured 4,000–6,000 guidance
  range.
- All code is illustrative; no Java compiler was executed for these chapters.

## Recommended human-review order

1. Review chapter 1’s release and compatibility claims, especially the charset
   correction and Java 25 qualification.
2. Review chapter 2’s canonical model and transaction semantics; it is the
   foundation for the design vocabulary used by chapter 3.
3. Review chapter 3’s Java API details, currency assumptions, and whether its
   focused checkout model is sufficiently separated from chapter 2.
4. Read the three chapters consecutively in the assembled draft and decide
   whether the repetition is useful reinforcement or should be edited.

## Decision

**Revise selected chapters before approval.** The three-chapter sequence is
coherent enough to validate the generation workflow and summary-based continuity,
but it is not ready for approval because of concrete technical corrections and
editorial compression still required in chapters 1–3.
