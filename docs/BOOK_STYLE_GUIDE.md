# BookForge Book Style Guide

> Purpose: Define how BookForge-generated technical books should read, look, and teach.
>
> This guide applies to Writer, Reviewer, and Rewriter prompts. It describes the quality bar for published chapters, not the internal software architecture.

---

# 1. Editorial Goal

BookForge should produce technical books that feel:

- deliberate
- practical
- technically precise
- concise without being shallow
- suitable for experienced developers
- useful for both learning and interview preparation

The writing should not feel like an AI transcript, a blog post, a marketing article, or a loose collection of notes.

The target is a well-edited technical handbook.

---

# 2. Intended Reader

Unless a book specification overrides this, assume the reader:

- already understands basic programming
- wants practical explanations, not beginner filler
- values tradeoffs and real-world decisions
- may be preparing for senior-level interviews
- may be modernizing older skills
- wants examples that resemble production code

Do not over-explain basic syntax unless it directly supports a more advanced concept.

---

# 3. Voice and Tone

Use a voice that is:

- direct
- calm
- technically confident
- evidence-oriented
- practical
- respectful of the reader’s time

Prefer:

> Constructor injection makes required dependencies explicit and keeps the class easy to test without starting the Spring container.

Avoid:

> Constructor injection is an amazing and powerful technique that every modern developer should absolutely use.

Do not use motivational filler.

Avoid phrases such as:

- “Let’s dive in”
- “In today’s fast-paced world”
- “It is important to note”
- “As we all know”
- “This powerful feature”
- “Game-changing”
- “Revolutionary”
- “In conclusion”
- “At the end of the day”

Use plain technical prose.

---

# 4. Chapter Structure

Every normal chapter should contain these sections unless the chapter type clearly makes one inappropriate:

1. Why This Matters
2. Core Concepts
3. Worked Examples
4. Common Mistakes
5. Best Practices
6. Interview Questions
7. Exercises
8. Key Takeaways

The exact wording of headings may vary slightly, but the functions should remain.

## Why This Matters

Explain:

- why the topic matters in real software
- what problems it solves
- what mistakes happen without it
- where it appears in interviews or production systems

Keep this section short and concrete.

## Core Concepts

Explain the mental model before presenting advanced examples.

Definitions should be precise and immediately useful.

## Worked Examples

Examples should build understanding progressively.

Prefer one strong example with explanation over many shallow snippets.

## Common Mistakes

Show realistic mistakes, not contrived mistakes.

Explain why the mistake happens and how to recognize it.

## Best Practices

Explain when the practice applies and its tradeoffs.

Avoid universal claims unless they are genuinely universal.

## Interview Questions

Include concise model answers.

Strong answers should explain reasoning, not only definitions.

## Exercises

Exercises should reinforce decisions, debugging, design, or implementation.

Avoid trivia-only exercises.

## Key Takeaways

Use 4–8 concise points.

Do not repeat whole paragraphs from the chapter.

---

# 5. Heading Rules

Use Markdown headings consistently.

- `#` is reserved for the chapter title.
- `##` marks major chapter sections.
- `###` marks subsections.
- Avoid going deeper than `####` unless necessary.
- Do not skip heading levels.
- Keep headings specific.

Prefer:

```markdown
## Why Constructor Injection Improves Testability
```

Avoid:

```markdown
## More Details
```

Do not number every heading unless the book specification explicitly requires numbered sections.

---

# 6. Paragraph Style

Prefer paragraphs of 2–5 sentences.

Long paragraphs should be split when they contain more than one idea.

Do not convert all prose into bullets.

Use bullets when:

- listing criteria
- comparing options
- summarizing takeaways
- presenting steps
- identifying pitfalls

Use prose when:

- explaining reasoning
- describing tradeoffs
- connecting ideas
- teaching mental models

---

# 7. Technical Explanations

Every major concept should answer:

1. What is it?
2. Why does it exist?
3. How does it work?
4. When should it be used?
5. What are the tradeoffs?
6. What mistakes are common?

Do not stop at definition-level explanations.

Prefer:

> A virtual thread is still a `Thread` from the application’s perspective, but the JVM can park it without tying up an operating-system thread during many blocking operations. This makes thread-per-task code practical for large numbers of concurrent I/O-bound tasks.

Avoid:

> Virtual threads are lightweight threads.

The second statement is true but incomplete.

---

# 8. Claims and Accuracy

Do not fabricate:

- benchmarks
- release dates
- version support
- API behavior
- quotations
- citations
- production anecdotes
- company practices

When a claim depends on version or current framework behavior, qualify it.

Prefer:

> In current Spring Boot 4 applications, Jakarta namespaces replace the older `javax.*` packages.

Avoid:

> Spring always uses Jakarta.

Clearly label:

- preview features
- incubator features
- experimental APIs
- implementation-dependent behavior
- version-specific behavior

Do not present an unverified code example as tested or compiled.

---

# 9. Code Examples

Code should be:

- readable
- focused
- plausible
- internally consistent
- named clearly
- free of irrelevant boilerplate
- complete enough to understand

Use language identifiers on every code fence.

```java
public record Money(
    BigDecimal amount,
    Currency currency
) {
}
```

Do not use untagged fences.

## Code Scope

A snippet may omit surrounding setup, but the text must say so.

Example:

> The following method assumes the repository dependency has already been injected.

Do not use unexplained ellipses inside code.

Avoid:

```java
public void process() {
    ...
}
```

Prefer a comment that explains the omission:

```java
public void process() {
    // Validate and persist the order.
}
```

## Example Naming

Use descriptive names:

- `OrderService`
- `PaymentResult`
- `ProductRepository`

Avoid:

- `Foo`
- `Bar`
- `Thing`
- `Test1`

Use consistent domain names within a chapter.

## Production Quality

Examples should demonstrate good practices where relevant:

- constructor injection
- immutable state
- validation
- explicit error handling
- clear boundaries
- useful names
- reasonable types

Do not clutter beginner examples with every production concern at once.

## Code Comments

Comments should explain why, not narrate obvious syntax.

Avoid:

```java
// Increment count
count++;
```

Prefer:

```java
// Retry only transient failures; validation failures are not recoverable.
```

---

# 10. Comparisons and Tradeoffs

When comparing approaches, use a table or clear prose.

Example:

| Approach | Strength | Tradeoff |
|---|---|---|
| Constructor injection | Explicit required dependencies | Constructor can become large |
| Field injection | Less visible boilerplate | Hidden dependencies and harder testing |

Do not declare a winner without context.

Prefer:

> Use a record for immutable data carriers. Use a regular class when lifecycle, inheritance, framework requirements, or mutable behavior make a record a poor fit.

Avoid:

> Records are always better than classes.

---

# 11. Common Mistakes Sections

A strong mistake section includes:

- the flawed approach
- why developers choose it
- why it fails
- a better alternative
- exceptions where it may still be acceptable

Example structure:

```markdown
### Storing Derived State

A component stores both `quantity` and `totalPrice`, even though the total can be calculated from `quantity` and `unitPrice`.

This creates two sources of truth. If one update path forgets to update `totalPrice`, the UI becomes inconsistent.

Prefer calculating:

```tsx
const totalPrice = quantity * unitPrice;
```
```

Avoid vague warnings such as:

> Be careful with state.

---

# 12. Best Practices Sections

Best-practice guidance must include context.

Use wording such as:

- “Prefer … when …”
- “Use … unless …”
- “This is appropriate for …”
- “The tradeoff is …”

Avoid rigid language such as:

- “Always”
- “Never”

unless the rule is genuinely strict, such as:

> Never commit production secrets to source control.

---

# 13. Interview Questions

Interview questions should test understanding, not memorization.

Each question should include:

- the question
- a concise model answer
- what a strong senior answer should demonstrate, when useful

Example:

### Why is constructor injection preferred over field injection?

Constructor injection makes required dependencies explicit, allows fields to remain final, and supports unit testing without reflection or a running container.

A strong senior answer should also mention that dependency injection style affects object validity and architectural clarity, not just test convenience.

Avoid trivia such as:

> What year was Java 8 released?

unless the book explicitly covers certification-style history.

---

# 14. Exercises

Exercises should vary in type:

- explain a design choice
- identify a bug
- refactor code
- implement a small feature
- compare approaches
- diagnose performance
- write a test
- review an API

Include expected outcomes.

Do not make every exercise “write a complete application.”

A good chapter usually includes 3–6 exercises.

---

# 15. Key Takeaways

Use concise bullets.

Example:

- Encapsulation protects invariants; it is more than private fields.
- Composition usually creates more flexible designs than deep inheritance.
- A subtype must preserve the behavioral contract of its parent.
- Interfaces define replaceable capabilities; abstract classes share state or partial implementation.

Avoid empty summaries such as:

- Encapsulation is important.
- SOLID is useful.
- Use best practices.

---

# 16. Handling Versions and Historical Context

Explain older approaches only when readers are likely to encounter them.

Use this pattern:

1. Briefly describe the older approach.
2. Explain why it existed.
3. Show the current approach.
4. Explain migration concerns.

Do not devote large sections to obsolete APIs unless the book is explicitly about migration.

Example:

> Older Spring Security applications often extended `WebSecurityConfigurerAdapter`. Modern applications declare a `SecurityFilterChain` bean instead.

---

# 17. Avoiding AI-Like Writing

Avoid these patterns:

## Repetitive Introductions

Do not begin every section with:

> In this section, we will explore...

Start with the idea itself.

## Repetitive Conclusions

Do not end every section with:

> By understanding this, you can write better code.

State the concrete takeaway instead.

## Excessive Symmetry

Not every concept needs exactly three bullets or five subsections.

## Empty Emphasis

Avoid:

- clearly
- obviously
- simply
- easily
- powerful
- robust
- seamless

unless the word adds real meaning.

## Artificial Transitions

Avoid:

> Now that we have covered X, let us move on to Y.

Use a natural conceptual connection.

## Generic Advice

Avoid:

> Follow best practices and test thoroughly.

Replace it with actionable guidance.

---

# 18. Review Standards

The Reviewer should check:

## Technical Accuracy

- Are definitions correct?
- Are version-specific claims qualified?
- Are code examples plausible?
- Are preview features labeled?
- Are security and performance claims responsible?

## Completeness

- Does the chapter meet its stated objectives?
- Are important tradeoffs missing?
- Does it explain why, not only what?
- Are common mistakes realistic?

## Structure

- Are required sections present?
- Are headings clear?
- Is the flow logical?
- Are examples placed near the concepts they explain?

## Style

- Is the prose direct?
- Is there filler?
- Is the chapter overly repetitive?
- Are bullets overused?
- Does the chapter sound like a technical book rather than a chat response?

## Interview Value

- Do questions test understanding?
- Are model answers concise and correct?
- Are senior-level considerations included?

The Reviewer should identify specific issues and locations.

The Reviewer should not rewrite the entire chapter.

---

# 19. Rewrite Standards

The Rewriter must:

- address every major review finding
- preserve correct material
- improve weak transitions
- remove filler
- correct code and terminology
- keep the chapter internally consistent
- preserve the required structure
- avoid making unrelated expansions

The Rewriter should not:

- ignore review findings
- introduce new unsupported claims
- inflate word count unnecessarily
- change the chapter’s scope
- add citations it cannot verify

---

# 20. Formatting Rules

Use:

- UTF-8
- standard Markdown
- fenced code blocks
- tables only when they improve comparison
- backticks for identifiers, filenames, commands, and API names
- bold sparingly for emphasis
- italics sparingly for terms

Avoid:

- decorative emojis
- excessive blockquotes
- callout syntax that depends on a specific renderer
- raw HTML unless required
- Mermaid diagrams unless a book specification explicitly enables them

---

# 21. Links and References

Prefer official sources in reference sections.

Examples:

- language specifications
- official framework documentation
- standards documents
- primary research papers

Do not scatter unverifiable links throughout generated chapters.

Do not fabricate URLs.

When BookForge does not have browsing or source retrieval enabled, generated text should avoid pretending to cite current documentation.

---

# 22. Accessibility

Use:

- descriptive headings
- meaningful link text
- descriptive image alt text when images are present
- tables with clear headers
- code examples that do not rely only on color distinctions

Avoid:

> Click here

Prefer:

> Read the Spring Security reference documentation.

---

# 23. Chapter Length

Target word counts are guidance, not quotas.

A chapter may be shorter when:

- the subject is narrow
- additional text would be repetitive
- examples explain the topic efficiently

A chapter may be longer when:

- foundational context is necessary
- tradeoffs require careful treatment
- the chapter contains substantial worked examples

Do not add filler to hit a number.

A reasonable default range is 80%–120% of the target word count.

---

# 24. Quality Checklist

Before publication, every chapter should satisfy:

- [ ] The chapter title matches the book specification.
- [ ] The chapter objectives are covered.
- [ ] “Why This Matters” is concrete.
- [ ] Core concepts are explained accurately.
- [ ] Examples are readable and relevant.
- [ ] Code fences include language tags.
- [ ] No unexplained placeholders remain.
- [ ] Tradeoffs are discussed.
- [ ] Common mistakes are realistic.
- [ ] Best practices are contextual.
- [ ] Interview questions include model answers.
- [ ] Exercises reinforce understanding.
- [ ] Key takeaways are concise.
- [ ] No fabricated facts, citations, or benchmarks appear.
- [ ] Preview or experimental features are labeled.
- [ ] The prose avoids filler and AI-like repetition.
- [ ] The chapter is within a reasonable length range.

---

# 25. Default Chapter Skeleton

```markdown
# Chapter Title

## Why This Matters

## Core Concepts

### Concept One

### Concept Two

## Worked Examples

### Example One

## Common Mistakes

### Mistake One

## Best Practices

## Interview Questions

### Question One

**Model answer:** ...

## Exercises

### Exercise One

## Key Takeaways

- ...
```

This skeleton is a default, not a rigid prison. Chapters may add sections when the subject requires them, but they should preserve the core learning rhythm.

---

# 26. Final Standard

A published BookForge chapter should leave the reader able to:

- explain the concept accurately
- recognize when it applies
- identify common mistakes
- compare realistic alternatives
- discuss the topic in an interview
- apply the concept in code

If a chapter only defines terminology, it is not finished.
