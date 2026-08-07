# Chapters 10–12 Editorial Review

This review covers the regenerated Chapters 10–12 and compares them with the
approved summaries from Chapters 1–9. Chapters 1–9 were not regenerated. All
three new chapters completed the Writer → Reviewer → Rewriter → Quality
Validation pipeline and remain \`needs_review\`; no automatic approval was
performed.

## Batch Summary

| Chapter | Status | Quality verdict | Metrics | Validation |
| --- | --- | --- | --- | --- |
| 10. Concurrency Foundations and Safe Shared State | needs_review | pass_with_warnings | 5,158 words; 23 code blocks | 3 Java examples compiled with \`javac --release 21\`; 1 warning |
| 11. Virtual Threads and Thread-Per-Task Design | needs_review | pass_with_warnings | 5,232 words; 20 code blocks | no executable validator result; 2 warnings |
| 12. JVM Memory and Garbage Collection | needs_review | pass_with_warnings | 6,318 words; 13 code blocks | no executable validator result; 1 warning and 8 informational findings |

The chapter metrics are the engine's Markdown counts. The chapter Reviewers use
a broader count that includes prose, headings, bullets, and code identifiers.
That difference should be considered when applying the book's soft word budget.

## Continuity

### Chapter 10

Chapter 10 continues the book's contract-first vocabulary from Chapters 1–9:
visibility, atomicity, ordering, ownership, invariants, boundaries, and
tradeoffs. It provides a natural transition from Chapter 9's explicit data
models to the problem of safely sharing mutable state.

The progression is sound. Chapter 10 does not reteach collections or lambdas,
but applies them to concurrent behavior. Its distinction among visibility,
atomicity, ordering, and ownership gives the reader a useful new frame rather
than merely repeating the earlier design chapters.

The main continuity risk is conceptual overlap with later Chapter 11. Cancellation,
executor capacity, interruption, and task lifecycle appear in both chapters.
Chapter 10 should establish the general correctness and lifecycle model; Chapter
11 should focus on how virtual threads change scheduling economics without
repeating all concurrency foundations.

### Chapter 11

Chapter 11 builds directly on Chapter 10's task boundaries, cancellation,
resource ownership, and executor limits. Its strongest continuity point is the
distinction between cheap task representation and scarce downstream capacity.
That distinction prepares the reader for later performance and API chapters.

The chapter must keep its version context precise. Pinning behavior is not static
across Java releases: guidance that was important for Java 21–23 needs explicit
qualification after JDK 24. The chapter should also avoid implying that
virtual-thread adoption removes the need for admission control, cancellation,
or resource limits.

### Chapter 12

Chapter 12 extends the earlier operational language of evidence, boundaries, and
tradeoffs into process memory and garbage collection. It is a useful bridge from
concurrency and virtual-thread resource pressure to Chapter 13's performance
measurement.

The allocation-rate/live-set/retained-set model is particularly effective and
helps prevent the common mistake of calling every high-allocation workload a
leak. The continuity risk is length: at 6,318 engine-counted words, it is above
the chapter's 5,500-word target and the Reviewer estimates roughly 7,200 words
using a broader count.

## Repetition

### Within the batch

- Chapter 10 repeats visibility versus atomicity under **“Visibility and
  volatile,” “Atomicity and invariants,” “A tempting alternative is to make both
  fields volatile,”** and **“Treating volatile as a universal thread-safety
  solution.”**
- Chapter 10 repeats cancellation semantics under **“Cancellation,
  interruption, and timeout,” “Assuming timeout means work stopped,”** and the
  best-practice and interview sections.
- Chapter 11 repeats the distinction between I/O-bound and CPU-bound work,
  explicit admission control, and measurement in **“Why This Matters,”
  “Thread-Per-Task Is Different,” “Choose Workloads by Waiting Behavior,”** and
  **“Measuring Before and After.”**
- Chapter 12 repeats the leak-versus-allocation distinction and evidence-first
  tuning in **“Allocation rate, live set, and retained set,” “Separating
  allocation pressure from retention,” “Confusing high allocation with a
  leak,”** and **“Use evidence in escalating stages.”**

These are mostly useful reinforcements, but the repeated definition → warning →
alternative pattern is visible across the batch. Human editing should preserve
one authoritative explanation and make later sections diagnostic or applied.

### Across prior chapters

The recurring concepts—contracts, invariants, boundaries, explicit limits, and
measurement—are appropriate book-level reinforcement. Chapters 10–12 do not
introduce a new canonical domain model, which avoids contradicting Chapter 2's
order-processing contract. However, the examples introduce several local types
and operational scenarios. The prose should make clear when a type is a
chapter-local illustrative model rather than part of the Chapter 2 domain.

## Terminology

Terminology is generally consistent with Chapters 1–9:

- \`contract\`, \`invariant\`, \`ownership\`, \`boundary\`, \`capacity\`, and
  \`tradeoff\` retain consistent engineering meanings.
- Chapter 10 correctly distinguishes visibility, atomicity, ordering, and
  cancellation, but should define data races in terms of a happens-before
  relationship rather than only a named synchronization mechanism.
- Chapter 11 correctly separates thread scheduling from capacity limiting. Keep
  “thread-per-task” distinct from “thread-per-request,” since an application
  task may be nested inside a framework-managed request.
- Chapter 12 uses allocation rate, live set, retained set, reachability, and
  retention productively. It should distinguish JVM pause time from end-to-end
  request latency and qualify terms such as “mixed collections,” “degenerated
  cycles,” and “compressed class space.”
- “Immutable” must continue to mean more than a final reference. Chapter 12's
  discussion of retained state should reinforce the shallow/deep distinction
  established in Chapters 8 and 9.

## Canonical Examples

No canonical example is configured for Chapters 10–12. Their local examples are
therefore allowed to differ from Chapter 2's order-processing model.

The local examples are generally coherent, but two boundaries need human review:

- Chapter 10's externally supplied \`AccountLedger\` lock example conflicts with
  the chapter's own recommendation to encapsulate synchronization. It should be
  clearly labeled as a deliberately simplified deadlock pattern or replaced
  with a coordinator using private, consistently ordered locks.
- Chapters 11 and 12 use local types such as \`Response\`, \`Report\`,
  \`PricingClient\`, \`Job\`, \`RetryCoordinator\`, and \`Configuration\`. Their
  illustrative intent is acceptable, but nearby prose should identify omitted
  imports, supporting types, and lifecycle assumptions.

## Tradeoff Discussions

The batch is strongest when it explains that no mechanism removes the underlying
constraint:

- Chapter 10 compares \`synchronized\`, locks, atomics, concurrent collections,
  executors, and message passing against specific invariants.
- Chapter 11 distinguishes virtual-thread representation from downstream
  database, connection-pool, rate-limit, and CPU capacity.
- Chapter 12 distinguishes heap, native, direct, metaspace, stack, and
  container memory rather than recommending a universal heap setting.

Improvements needed:

- Chapter 10 should make starvation and contention more diagnostic, and explain
  bounded queues and rejection policies rather than relying on
  \`newFixedThreadPool\` defaults.
- Chapter 11 should explain that \`ExecutorService.close()\` can wait for
  non-cooperative tasks, complete the semaphore permit-release path, and
  qualify monitor pinning for Java 21–23 versus JDK 24+.
- Chapter 12 should provide a small, version-qualified evidence workflow using
  categories of JDK tools, clarify direct-buffer cleanup and
  \`MaxDirectMemorySize\`, and distinguish pause time from service latency.

## Interview Questions and Exercises

The interview sections are appropriate for the senior audience and focus on
reasoning rather than trivia.

- Chapter 10's questions cover visibility, happens-before, mechanism choice,
  cancellation, concurrent collections, deadlock, interruption, and testing.
  Exercise 5 needs correction: a barrier before a read-modify-write does not
  guarantee that the two operations overlap. The exercise needs an explicit
  interleaving seam or a two-phase barrier.
- Chapter 11's questions test virtual-thread economics, pinning, resource
  limits, cancellation, and migration. Add or strengthen a question about
  JDK-version-specific pinning behavior and executor shutdown deadlines.
- Chapter 12's questions are useful for distinguishing memory categories,
  retention, collectors, direct memory, and latency. Exercises should include
  a concrete evidence-selection workflow and explain operational risks of heap
  dumps or native-memory diagnostics.

## Summary Quality

The summaries for Chapters 10–12 correctly capture purpose, concepts, deferred
topics, and continuity risks. They are concise enough for subsequent context
injection and do not send complete prior chapters.

They are generic in the same way as earlier summaries: the
\`Terminology and Examples\` section says no canonical example is configured,
and the assumptions are only the style/specification contract. For future
continuity, the summaries would be more useful if they recorded the chapter's
most important established operational terms and local example types, especially
for concurrency ownership, virtual-thread admission control, and memory
diagnostic categories. This is a documentation/editorial improvement, not a
generation blocker.

## Quality-Validator Findings

### Reported findings

- Chapter 10: one heuristic \`OBJECTIVE_COVERAGE\` warning; three Java
  compilable examples succeeded with \`javac --release 21\`.
- Chapter 11: \`PLACEHOLDER_TEXT\` and \`OBJECTIVE_COVERAGE\` warnings, plus
  one inferred snippet-intent information finding.
- Chapter 12: \`OBJECTIVE_COVERAGE\` warning and seven inferred
  snippet-intent information findings.

The reports contain no blocking errors. The warnings are prompts for human
review, not approval evidence.

### Missed issues

The validator did not detect:

- nondeterministic concurrency-test design;
- incomplete executor shutdown and task-lifecycle behavior;
- permit leaks on submission failure;
- Java-release-specific virtual-thread pinning semantics;
- misleading or incomplete direct-memory ownership guidance;
- insufficient JDK evidence-tool instructions;
- inaccurate JMM shorthand and monitor wording;
- excessive length and repeated explanations;
- unclear omitted imports/supporting types in illustrative snippets.

These are expected limitations of structural validation. A passing report does
not establish concurrency correctness or production operational accuracy.

### Likely ambiguous warnings

The placeholder warning in Chapter 11 needs inspection because placeholder
language may describe an intentionally abbreviated illustrative task rather than
an unresolved final code body. The objective-coverage warnings are useful
heuristics; the Reviewer found broad coverage in all three chapters. The
inferred-intent findings in Chapter 12 are valid reminders to label code fences,
but they are not technical failures when the surrounding prose clearly marks
the examples as illustrative.

## Recommendations for the Human Reviewer

Review in this order:

1. **Chapter 11:** verify Java 21–23 versus JDK 24+ pinning claims, executor
   close/wait behavior, timed semaphore release, submission rejection cleanup,
   and omitted context in examples.
2. **Chapter 10:** verify the happens-before wording, safe-publication claims,
   deadlock example framing, lifecycle shutdown, and deterministic test design.
3. **Chapter 12:** verify direct-memory semantics, collector defaults by release,
   virtual-thread memory wording, \`-Xlog\` version context, and whether the
   chapter should be shortened before approval.

All three chapters should remain \`needs_review\` until these concrete technical
issues are resolved. The highest editorial priority is to reduce Chapter 12's
length without removing its useful diagnostic model.

## Recommendation on Chapters 13–15

Do not proceed directly to Chapters 13–15 without a focused human/editorial
pass on this batch. The prompts and style guide do not require changes based on
these findings, but Chapters 10–12 contain enough concrete correctness and
operational-lifecycle issues that reviewing them first will reduce the risk of
propagating incorrect concurrency and JVM guidance into Chapters 13–15.

