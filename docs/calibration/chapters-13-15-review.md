# Chapters 13–15 Editorial Review

This review covers the regenerated Chapters 13–15 and compares them with the
approved Chapters 1–12. Chapters 1–12 were not regenerated. The three new
chapters completed the Writer → Reviewer → Rewriter → Quality Validation
pipeline and remain needs_review; no automatic approval was performed.

## Batch Summary

| Chapter                                       | Status       | Quality            | Metrics                     | Main findings                         |
| --------------------------------------------- | ------------ | ------------------ | --------------------------- | ------------------------------------- |
| 13. Performance Measurement Without Guesswork | needs_review | pass_with_warnings | 5,923 words; 6 code blocks  | 1 warning; 4 inferred-intent findings |
| 14. Maintainable Java API Design              | needs_review | pass_with_warnings | 6,354 words; 27 code blocks | 3 warnings                            |
| 15. Testing Modern Java Systems               | needs_review | pass_with_warnings | 5,174 words; 13 code blocks | 2 warnings; 1 inferred-intent finding |

The engine's word counts differ from the Reviewer's broader whitespace-delimited
counts. Chapter 13 is reported by the Reviewer at approximately 6,700 words,
Chapter 14 at approximately 6,700 words, and Chapter 15 at approximately 7,000
words. All three therefore need an editorial length pass even where the engine
does not issue a word-count warning.

## Continuity with Chapters 1–12

### Chapter 13

Chapter 13 is a natural continuation of Chapters 10–12. It takes the concurrency,
virtual-thread, memory, allocation, retention, and diagnostic vocabulary from
those chapters and turns it into an experimental workflow.

The workload model and measurement hierarchy are strong. The chapter generally
avoids reteaching GC and virtual-thread mechanics, but it repeatedly restates
the same evidence-boundary principle in Core Concepts, Worked Examples, Common
Mistakes, and Best Practices. Retain one authoritative experiment workflow and
make later sections apply it to distinct failure modes.

The chapter also prepares Chapter 14 well: public API behavior can include
latency, resource, cancellation, and retry contracts. That relationship should
be stated briefly rather than becoming another performance tutorial.

### Chapter 14

Chapter 14 follows the book's design arc from object responsibility and SOLID to
public contracts that must survive change. Its strongest continuity is the
distinction between internal implementation freedom and externally observable
behavior.

It appropriately reuses Money, OrderSearch, OrderPage, and payment examples,
but the repeated Money representation needs explicit Java-version framing. A
Java 16 record and a Java 8-compatible class must not appear to be one silently
changing type.

The chapter overlaps with Chapters 2, 3, 8, and 9 around invariants, errors,
immutability, records, and sealed types. That overlap is justified only when
the focus is caller-facing compatibility. The chapter should repeatedly ask
“What does a caller or external implementer observe?” rather than restating the
underlying design tutorial.

### Chapter 15

Chapter 15 continues Chapter 14's public-contract concerns into executable
evidence and connects to Chapter 10's concurrency testing and Chapter 13's
measurement boundaries. Its risk-oriented framing is strong and appropriate for
a senior audience.

The order-processing examples create useful continuity with Chapter 2, but the
event-publication dependency is inconsistent: one scenario says the service
publishes an event while the shown OrderService has no EventPublisher. The
chapter must either make publication part of the explicit contract or remove it
from the scenario.

The chapter should also distinguish testing a public contract from re-teaching
the implementation behind that contract. Its best material is the controlled
clock, test doubles, deterministic concurrency, and legacy-suite migration.

## Repetition

### Within the batch

- Chapter 13 repeats “scope the evidence to the workload and boundary” in
  Start With a Performance Question, Use a Measurement Hierarchy, Form a
  Hypothesis From a Profile, Compare a Candidate Change Without Overclaiming,
  and Communicate Results With Scope and Limitations.
- Chapter 14 repeats narrow-boundary guidance in Public and Internal Boundaries,
  Designing a Stable Search API, Design the Smallest Complete Boundary, and
  Exposing Implementation Types Accidentally.
- Chapter 15 repeats risk-aligned testing in Test Scope Should Follow Risk,
  Build a Layered Feedback Strategy, Best Practices, and the first key
  takeaways.
- All three chapters use the familiar definition → example → warning →
  best-practice structure. This is a heuristic pacing concern, not a structural
  failure.

### Across Chapters 1–12

The recurring book vocabulary—contract, invariant, boundary, ownership, evidence,
capacity, and tradeoff—is consistent and valuable. The main duplication risks
are:

- Chapter 13 versus Chapter 12: evidence gathering, memory/GC signals, JFR, and
  retention. Chapter 13 must own experimental method; Chapter 12 owns memory
  diagnosis.
- Chapter 14 versus Chapters 2–3: responsibilities, invariants, composition,
  dependency direction, and SOLID. Chapter 14 must own public API evolution.
- Chapter 14 versus Chapters 8–9: Optional, errors, records, sealed types, and
  immutability. Chapter 14 should discuss their compatibility consequences, not
  reteach their mechanics.
- Chapter 15 versus Chapter 10: deterministic concurrency and cancellation.
  Chapter 15 should show what the test proves and how cleanup works, not teach
  the Java Memory Model again.
- Chapter 15 versus Chapter 13: performance tests and measurements. Chapter 15
  should explain test risk and reproducibility; Chapter 13 should explain
  performance experiment design.

## Terminology Consistency

Terminology is largely consistent:

- contract, invariant, boundary, compatibility, evidence, and tradeoff retain
  their established meanings;
- Chapter 13 correctly separates latency, throughput, allocation, utilization,
  and scalability;
- Chapter 14 correctly separates source, binary, and behavioral compatibility,
  but must distinguish compatibility for existing clients from compatibility for
  external implementers;
- Chapter 15 uses risk, seam, double, component, contract, and diagnostic value
  appropriately, but component-test boundaries need a concrete definition;
- immutable, unmodifiable, snapshot, and live view should remain distinct,
  especially in Chapter 14's OrderPage example;
- version claims for JFR, records, sealed types, and testing examples need local
  release qualification for Java 8 modernization readers.

No new book-wide canonical example is introduced. Chapter 15's order examples
are compatible with Chapter 2 only when their omitted event and payment
contracts are made explicit.

## Objective Coverage

### Chapter 13

The chapter covers workload modeling, measurement dimensions, warmup, variance,
JMH, profiling, JFR, observability, regression, and evidence limits. The quality
validator's objective-coverage warning is heuristic; the Reviewer found broad
coverage. The remaining gap is not topic presence but practical decision depth:
regression outcomes, scalability curves, profiling wait time, and long-run
behavior need more concrete treatment.

### Chapter 14

The chapter broadly covers all YAML objectives and is stronger than the
objective warning suggests. The important gaps are generic public API contracts,
deprecation metadata and migration guidance, operational contracts, and the
difference between client and implementer compatibility.

### Chapter 15

The chapter covers all declared testing objectives and provides strong treatment
of risk, doubles, time, randomness, I/O, concurrency, performance constraints,
legacy suites, mutation, and coverage. The missing depth is concrete evidence:
a complete concurrency test, a property-based example, a component-test boundary,
a contract-test lifecycle, and explicit resource/test isolation.

## Examples and Code Quality

### Chapter 13

The examples are mostly illustrative and coherently scoped. Human review should
clarify omitted JMH imports and types, JFR version/distribution behavior, and
the distinction between CPU sampling, wall-clock latency, and blocked time.
The JMH result-consumption explanation and Scope.Benchmark concurrency caveat
need tightening.

### Chapter 14

Two examples require blocking attention:

1. EvolvingPaymentGateway adds an abstract method and is presented too broadly as
   compatible. Existing clients and existing external implementers have
   different compatibility risks; the example must distinguish them.
2. The RefundDecision fence is labeled standalone but declares multiple public
   types without filenames or complete supporting types. It must be illustrative
   or converted into a properly tagged multi-file compilable example.

The repeated Money type also requires explicit Java 8 versus Java 16 framing.
OrderPage protects list structure, not necessarily deep immutability of its
elements.

### Chapter 15

The event-publication inconsistency and incomplete concurrency test are the most
important example issues. MutableTestClock.withZone may not share mutable time
state as a normal Clock view would. BlockingStockRepository should be explicitly
labeled as an intentionally unsafe test double. The chapter should state the
equality assumptions for PaymentResult and show complete executor cleanup in the
concurrency test.

## Interview Questions and Exercises

The three interview sections are senior-oriented and avoid trivia.

- Chapter 13 tests workload modeling, measurement boundaries, JMH, profiling,
  causation, and evidence limits. Add a compact scenario requiring pass/fail/
  inconclusive reasoning across multiple metrics.
- Chapter 14 tests API evolution, compatibility, representation, errors, and
  caller contracts. Preserve the questions but ensure answers distinguish
  clients, implementers, records, sealed types, and operational behavior.
- Chapter 15 tests risk mapping, test doubles, deterministic behavior, coverage,
  mutation, and legacy suites. Add or complete a concurrency test exercise and
  include a property-based or contract-test artifact with expected outcomes.

Exercises generally have clear expected outcomes, but several ask for prose
without requiring an observable artifact. Prefer a test, API review table,
experiment brief, compatibility matrix, or migration checkpoint.

## Summary Quality

The summaries are concise and suitable for continuity injection. They correctly
capture each chapter's purpose, concepts, deferred topics, and continuity risks.

They remain generic in the same way as earlier summaries: Terminology and
Examples says no canonical example is configured, and assumptions only repeat
the style/specification contract. For future chapters, summaries should record
the local API names, test boundaries, performance terms, and compatibility
assumptions that later chapters may rely on.

## Quality-Validator Findings

### Reported

- Chapter 13: 1 warning for heuristic objective coverage and 4 inferred-intent
  information findings.
- Chapter 14: placeholder, objective-coverage, and word-count warnings.
- Chapter 15: placeholder and objective-coverage warnings plus 1 inferred-intent
  information finding.
- No blocking automated errors were reported.

### Missed

The validator did not detect:

- excessive repetition and overlength in Chapter 13;
- JFR/JMH version and semantics caveats;
- incompatible interface evolution in Chapter 14;
- the mislabeled standalone sealed-type snippet;
- repeated Money representation ambiguity;
- the event-publication inconsistency in Chapter 15;
- the incomplete concurrency test;
- MutableTestClock.withZone semantics;
- missing concrete property/component/contract test examples.

These are expected semantic/editorial gaps. Passing validation means eligible for
human review, not technically verified.

### Ambiguous warnings

Placeholder warnings may refer to intentionally partial illustrative examples
whose omissions are explained. Objective-coverage warnings are coarse and should
not override the Reviewer's broader assessment. Inferred-intent findings are
useful reminders but do not necessarily indicate a defect when surrounding prose
identifies the example as illustrative.

## Special Human Attention

Review in this order:

1. Chapter 14: compatibility semantics, RefundDecision snippet intent, Money
   version continuity, and overlength.
2. Chapter 15: event-publication contract, complete deterministic concurrency
   test, clock semantics, and test isolation.
3. Chapter 13: word-count reduction, JFR/JMH precision, regression decisions,
   scalability, and measurement boundaries.

All three chapters should remain needs_review until these items are resolved or
explicitly accepted by a human reviewer.
