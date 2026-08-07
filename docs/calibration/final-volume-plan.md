# Final Volume Plan: Chapters 13–18

## Planning Decision

Keep the six-chapter ending, but revise the objectives and budgets before
generation. Do not merge Chapters 13–16: their subjects have different reader
outcomes and dependencies. Do not merge Chapters 17 and 18: interview synthesis
and an integrated implementation/review exercise serve different purposes.

Generate in this order:

1. Performance Measurement Without Guesswork
2. Maintainable Java API Design
3. Testing Modern Java Systems
4. Modernizing a Java 8 Codebase
5. Senior Java Interview Preparation
6. Exercises and Solutions: Design a Modern Java Service

The revised planned total is approximately 91,000 words. This remains within the
original 90,000–110,000-word goal. The first twelve chapter targets sum to
approximately 62,000 words; revised Chapters 13–18 sum to 29,000 words. This is
a planning budget, not a quota. The first twelve generated chapters contain
approximately 66,224 whitespace-delimited words, so the remaining chapters
should be kept near their revised budgets rather than allowing the repeated
over-expansion seen in earlier batches.

## What the First Twelve Chapters Establish

### Progression

The volume has a coherent technical arc:

1. platform and release decisions;
2. object design and change boundaries;
3. SOLID heuristics;
4. collection contracts;
5. generic type contracts;
6. behavior values;
7. stream transformations;
8. absence and error contracts;
9. records, sealed types, and pattern matching;
10. shared-state concurrency;
11. virtual-thread economics and admission control;
12. memory resources, reachability, and evidence.

The strongest recurring vocabulary is contract, invariant, boundary, ownership,
capacity, compatibility, evidence, and tradeoff. Chapters 13–18 should use this
vocabulary without redefining it from first principles.

### Pacing and duplication

The first twelve chapters repeatedly use the same teaching unit: define a
concept, show a code fence, add a tradeoff paragraph, repeat the warning in
Common Mistakes, and repeat it again in Best Practices and an interview answer.

The remaining chapters should use fewer examples and make later sections
diagnostic or applied:

- performance must not reteach JVM memory, GC, or virtual-thread economics;
- API design must not reteach object responsibility, SOLID, records, or Optional basics;
- testing must not reteach all concurrency mechanics;
- modernization must not become another Java release catalogue;
- interview preparation must synthesize the book rather than repeat every chapter;
- the capstone must reference earlier decisions instead of reproducing their tutorials.

### Current review constraints

Chapters 1–9 are approved, but their calibration reports still record
technical issues that a publisher should keep in mind. Chapters 10–12 are
generated and remain needs_review. Their summaries are useful continuity inputs,
but their concurrency lifecycle, virtual-thread version, and JVM memory claims
must not be treated as authoritative until human review is complete.

The summaries are lightweight and mostly list concepts rather than exact local
types established by each chapter. Future generation should use them for
concepts, terminology, and deferred topics, while avoiding claims that a local
illustrative type is part of the book-wide canonical domain.

## Revised Chapter List

| No. | Chapter | Revised target | Unique purpose |
| ---: | --- | ---: | --- |
| 13 | Performance Measurement Without Guesswork | 5,000 | Turn a performance concern into a repeatable experiment and evidence-backed decision |
| 14 | Maintainable Java API Design | 5,000 | Design and evolve public Java contracts without accidental compatibility damage |
| 15 | Testing Modern Java Systems | 5,000 | Build a risk-aligned, deterministic test portfolio that protects behavior and feedback speed |
| 16 | Modernizing a Java 8 Codebase | 5,000 | Sequence a real Java 8 modernization with compatibility probes, rollout, and rollback |
| 17 | Senior Java Interview Preparation | 4,000 | Synthesize the book's ideas into clear senior-level answers under constraints |
| 18 | Exercises and Solutions: Design a Modern Java Service | 5,000 | Apply the book as one coherent service design, implementation, test, and review exercise |

## Revised Chapter Objectives

### Chapter 13 — Performance Measurement Without Guesswork

Purpose: teach performance investigation as experimental engineering. Start from
a user or service-level problem and end with a decision supported by repeatable
evidence.

Objectives:

- Define a performance question with a measurable workload, SLO, and target.
- Separate latency, throughput, allocation, utilization, concurrency, and
  scalability, including percentile behavior.
- Design repeatable measurements that account for warmup, variance, and
  environmental controls.
- Choose a measurement method from a hypothesis: service telemetry, load test,
  JMH, JFR, allocation profiling, lock analysis, or a downstream signal.
- Establish baseline, acceptance, regression, and rollback criteria.
- Communicate uncertainty, confounding variables, and what the evidence cannot
  prove.

Remove the broad treatment of heap, GC, and virtual-thread economics; those are
already covered in Chapters 11–12. Do not turn JMH, profilers, or JFR into
tool-specific tutorials. Use them only to answer a measurement question.

### Chapter 14 — Maintainable Java API Design

Purpose: teach public API design as contract design over time.

Objectives:

- Define public contracts for inputs, outputs, null/absence behavior, errors,
  ordering, idempotency, timeouts, and side effects.
- Choose representations, generic types, records/classes, builders, factories,
  and parameter objects by caller cost and compatibility consequences.
- Explain source, binary, and behavioral compatibility with concrete evolution
  scenarios.
- Use deprecation, adapters, compatibility layers, and migration documentation
  deliberately.
- Make operational behavior part of the contract where callers depend on
  latency, retryability, cancellation, or resource limits.
- Review APIs for usability, testability, error classification, and stability.

Remove the broad objective of designing around responsibilities and invariants;
Chapters 2, 3, 8, and 9 already establish that material. This chapter is about
public contract evolution, not a second object-design or SOLID tutorial.

### Chapter 15 — Testing Modern Java Systems

Purpose: teach a test portfolio around risk, feedback speed, and diagnosis rather
than line coverage or indiscriminate mocking.

Objectives:

- Map risks to unit, component, integration, contract, and system tests.
- Control time, randomness, I/O, external systems, and concurrency without
  relying on sleeps or wall-clock luck.
- Test public contracts including absence, error classification, ordering,
  idempotency, cancellation, and cleanup.
- Choose fakes, stubs, mocks, simulators, component tests, and contract tests
  without hiding integration defects.
- Use mutation testing, coverage, flaky-test evidence, and failure diagnosis as
  signals rather than guarantees.
- Define a legacy-suite improvement sequence that preserves useful feedback.
- Produce at least one executable test or concrete risk-to-test matrix.

Do not reteach Java concurrency mechanics, API-design theory, or the full
performance methodology. Keep one coherent system boundary rather than a
framework-specific testing cookbook.

### Chapter 16 — Modernizing a Java 8 Codebase

Purpose: provide an end-to-end modernization playbook that combines earlier
chapters without re-teaching their syntax.

Objectives:

- Inventory source, dependencies, build plugins, runtime images, reflection,
  agents, observability, deployment, and operational constraints.
- Select a target baseline using support horizon, dependency readiness, toolchain
  support, and workload evidence.
- Sequence runtime/toolchain, library, language, concurrency, and design changes
  so failures remain diagnosable.
- Use compatibility probes, release-target compilation, representative tests,
  canaries, and observability to separate source, binary, runtime, and behavior
  failures.
- Define ownership, success metrics, rollback checkpoints, and a stopping rule.
- Handle blocked dependencies or encapsulation failures without defaulting to a
  big-bang rewrite.

Do not become a release catalogue or feature tutorial. Use one migration case and
references to earlier chapters.

### Chapter 17 — Senior Java Interview Preparation

Purpose: provide deliberate practice for communicating technical judgment. This
chapter synthesizes the volume rather than re-explaining concepts.

Objectives:

- Use a repeatable answer structure: clarify the goal, state assumptions,
  identify constraints, propose a baseline, name tradeoffs, and explain validation.
- Diagnose realistic design, concurrency, JVM, performance, testing, and
  modernization scenarios aloud.
- Handle follow-up questions, changed assumptions, incomplete information, and
  uncertainty without evasion.
- Compare shallow terminology answers with senior answers grounded in contracts,
  failure modes, evidence, and rollout.
- Practice communicating tradeoffs concisely and identifying what must be
  verified before committing to a choice.
- Apply a self-review rubric for correctness, scope, evidence, tradeoffs, and clarity.

Remove the broad objective of explaining modern Java decisions; earlier chapters
already teach those decisions. Avoid another survey or trivia bank. Use short
case prompts and answer frameworks with links to earlier chapters.

### Chapter 18 — Exercises and Solutions: Design a Modern Java Service

Purpose: close the book with one coherent, framework-neutral service exercise
that integrates prior decisions.

Objectives:

- Translate requirements into invariants, API contracts, failure modes, resource
  limits, and operational constraints.
- Refactor an intentionally constrained initial design in small, reviewable steps.
- Integrate domain modeling, collections, errors, task ownership, cancellation,
  testing, and performance hypotheses without creating a full application.
- Identify what compilation and tests can validate and what still requires
  human/system review.
- Compare multiple acceptable solutions and explain their tradeoffs.
- Produce an annotated solution and final technical design-review checklist.

Do not make this a second tour of records, errors, virtual threads, or testing.
Do not present one implementation as universally correct or invent benchmark
results. Keep one internally consistent domain model and explicit snippet
intent.

## Dependencies Between Remaining Chapters

Chapters 1–12 provide the foundation.

- Chapter 13 depends especially on Chapters 10–12 for concurrency, virtual
  thread, memory, and diagnostic context. It teaches experimental method.
- Chapter 14 depends on Chapters 2, 3, 8, and 9 for responsibility, abstraction,
  errors, records, and sealed outcomes. It should precede Chapter 15 so tests can
  target explicit public contracts.
- Chapter 15 depends on Chapters 10–12 for deterministic concurrency,
  cancellation, cleanup, and diagnostic boundaries. It should precede Chapter 16
  so modernization checkpoints include test confidence.
- Chapter 16 depends on Chapters 1–15 but should use summaries and links rather
  than complete prior chapters. Its migration case becomes the primary context
  for Chapter 17.
- Chapter 17 depends on the complete technical arc and should be generated after
  Chapter 16 so interview cases include modernization and operational tradeoffs.
- Chapter 18 depends on all prior summaries, especially Chapters 13–17, and
  should be generated last so its exercise integrates the final terminology,
  testing approach, measurement method, and review rubric.

## Continuity Risks

- Chapters 10–12 are not human-approved. Their summaries can guide continuity,
  but unresolved technical claims must not become unquestioned facts.
- Only Chapter 2 has a configured canonical example. Later examples must be
  marked as chapter-local and must not silently extend the order-processing API.
- Chapter 12 is already long. Chapter 13 must not absorb additional memory or
  garbage-collection instruction.
- Chapters 10 and 11 both discuss cancellation, executors, limits, and lifecycle.
  Chapter 13 should use those only as measurement subjects.
- Chapters 8, 9, 14, and 18 can all discuss errors or result types. Chapter 14
  owns public compatibility; Chapter 18 owns integrated choice.
- Chapters 13 and 16 can both discuss measurement. Chapter 13 owns experimental
  method; Chapter 16 uses metrics as rollout gates.
- Chapters 14 and 15 can both discuss testability. Chapter 14 defines a testable
  public contract; Chapter 15 owns the test portfolio and evidence.
- Chapters 17 and 18 can both include review checklists. Chapter 17's is a
  communication/self-assessment rubric; Chapter 18's is a technical design
  review of the capstone.
- Current summaries are concise but generic. Later summaries should capture
  terminology, local example types, assumptions, and deferred topics more
  specifically.

## Repetition Controls

Each remaining chapter should have an explicit do-not-reteach boundary in its
eventual chapter specification or continuity context:

- Chapter 13: no memory model or virtual-thread tutorial.
- Chapter 14: no object/SOLID tutorial or Optional/records tutorial.
- Chapter 15: no concurrency mechanics or API-design theory.
- Chapter 16: no Java release catalogue or feature tutorial.
- Chapter 17: no replay of every earlier interview question.
- Chapter 18: no six-chapter summary; require integrated decisions and artifacts.

Prompts and application logic remain unchanged for this planning task.

## Recommended Generation Order and Review Gates

### 13 — Performance Measurement

Check overlap with Chapter 12 and reject fabricated benchmark claims. Require a
hypothesis and an evidence-to-decision chain.

### 14 — Maintainable API Design

Check duplication of object/SOLID material and verify stable, version-qualified
public contracts.

### 15 — Testing

Check risk alignment, deterministic examples, test-double limitations, and
observable exercise outcomes.

### 16 — Modernization

Check for a sequenced migration case with compatibility probes, rollback, and a
stopping rule rather than a release survey.

### 17 — Interview Preparation

Check synthesis and answer quality rather than topic-count coverage.

### 18 — Exercises and Solutions

Check internal consistency, observable expected outcomes, alternative solutions,
and appropriate capstone scope.

Each chapter must complete quality validation and independent human review. Do
not approve automatically.

## Expected Total Word Count

| Portion | Target |
| --- | ---: |
| Chapters 1–12 existing plan | 62,000 |
| Chapter 13 revised | 5,000 |
| Chapter 14 revised | 5,000 |
| Chapter 15 revised | 5,000 |
| Chapter 16 revised | 5,000 |
| Chapter 17 revised | 4,000 |
| Chapter 18 revised | 5,000 |
| Projected volume target | 91,000 |

A reasonable production range is approximately 80%–110% of the target, or about
72,800–100,100 words, with 120% as an editorial warning boundary. Because the
first twelve chapters already show count inflation and dense code, enforce a
soft per-chapter stop rule and remove duplicate examples rather than adding
material to reach target counts.

## Final Recommendation

**Keep the existing six-chapter plan with revised objectives and budgets.**

Do not merge chapters: each remaining chapter has a distinct reader outcome. Do
not split chapters: the current topics are already substantial, and splitting
would increase repetition and book length.

Before generating Chapter 13, update only the remaining chapter specifications in
books/modern-java/book.yaml to reflect this plan. Do not change prompts or
application logic for this planning step. Generate Chapters 13–15 as the next
batch only after the human/editorial concerns from Chapters 10–12 are resolved
or explicitly accepted.

