# Modern Java Chapters 1–3 Continuity Plan

## Purpose

This plan defines the editorial boundary for the first three real chapters of
the Modern Java volume. It is human calibration documentation for the trial;
the chapter specifications in `books/modern-java/book.yaml` remain the source of
truth for generation.

## Chapter responsibilities

### Chapter 1 — Modern Java in Context

Chapter 1 establishes why Java modernization requires a baseline decision rather
than a syntax checklist. It introduces the six-month release cadence, LTS
choices, the distinction between JDK, JVM, libraries, and tools, and a practical
upgrade approach from Java 8 through current releases.

It deliberately defers detailed object-oriented design, collections,
concurrency, and feature tutorials. It may name later topics as signposts, but
it should not teach their mechanics.

### Chapter 2 — Object-Oriented Design That Protects Change

Chapter 2 teaches design through encapsulation, abstraction, invariants,
responsibility, cohesion, coupling, polymorphism, composition, delegation,
interfaces, and abstract classes. Its purpose is to give the reader a model for
protecting change before the book introduces SOLID as a set of contextual
heuristics.

It deliberately defers a complete SOLID treatment, pattern catalogues, and
framework-specific architecture.

### Chapter 3 — SOLID Without Dogma

Chapter 3 interprets all five SOLID principles as practical design heuristics.
It should use realistic examples and explain misuse, over-application, costs,
and tradeoffs. It should refer back to Chapter 2's design vocabulary rather than
re-teaching the four OO pillars.

It deliberately defers collections, concurrency, JVM behavior, and framework
configuration.

## Shared terminology

Use these terms consistently: object, class, type, interface, abstraction,
dependency, responsibility, invariant, collaborator, subtype, contract, and
composition. “Dependency” means something a component relies on; “dependency
direction” describes which policy or detail knows about the other. Use
“subtype” for a type participating in a substitutability relationship, not as a
generic synonym for any implementation class.

## Canonical examples

Chapter 2 owns the `Order`, `OrderLine`, `Money`, and `Customer` order-processing
example. Its API and money policy must remain stable within that chapter. Chapter
3 may reuse the domain only when it makes a SOLID tradeoff clearer; if it changes
the example, it must label the change as a deliberate legacy, replacement, or
boundary example. Chapter 1 should avoid introducing a competing domain model.

Code fences should declare snippet intent. Illustrative snippets must explain
omitted setup; standalone and compilable examples must identify their
assumptions, and multi-file compilable examples must keep filenames and APIs
consistent.

## Expected transitions

Chapter 1 should close by giving the reader a reason to examine design decisions
as Java evolves. Chapter 2 should turn that motivation into a change-oriented
object model and explicitly identify which design questions remain for Chapter 3. Chapter 3 should open by reusing Chapter 2's vocabulary, then show how SOLID
helps answer those questions without turning principles into laws.

## Repetition risks

Reviewers should distinguish useful reinforcement from duplication, especially
for encapsulation, abstraction, inheritance, polymorphism, composition,
interfaces, dependency injection, immutability, records, and Java release
versions. A later chapter may recap a term in one or two sentences, but should
add a new decision, tradeoff, or application rather than repeat an earlier
definition.

## Trial questions

1. Does Chapter 1 provide enough release and modernization context without
   becoming a feature catalogue?
2. Does Chapter 2 establish a stable design vocabulary and canonical example?
3. Does Chapter 3 build on Chapter 2 while keeping SOLID contextual and useful?
4. Are summaries specific enough to support continuity without sending complete
   prior chapters to the provider?
5. Do examples, snippet intents, and terminology remain coherent across all
   three chapters?
6. Does partial assembly clearly distinguish an incomplete draft from a
   human-approved publication?
7. Are the PDF and ZIP outputs readable and limited to publication artifacts?
