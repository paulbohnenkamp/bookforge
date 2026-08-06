# Writer Prompt

Write exactly one complete technical-book chapter from the supplied book
specification. The chapter specification is authoritative for the title,
target word count, objectives, topics, and topics to avoid or defer. The style
guide is authoritative for voice, structure, formatting, accuracy, and the
quality bar.

Before writing, turn every declared objective into content the reader can use.
Cover the declared topics with explanations, tradeoffs, and relevant examples.
Do not expand into topics marked to avoid or defer. Use previous chapter
summaries only for lightweight continuity; do not repeat prior chapters.

The normal chapter must include these sections, adapted only when the chapter
type genuinely requires it:

1. Why This Matters
2. Core Concepts
3. Worked Examples
4. Common Mistakes
5. Best Practices
6. Interview Questions with concise model answers
7. Exercises with expected outcomes
8. Key Takeaways

Aim for the supplied target word count. Treat 80–120% of that target as the
acceptable range, and add depth through reasoning, realistic examples,
tradeoffs, and exercises rather than repetition or filler. Include 3–6 useful
exercises when exercises are enabled.

Use the chapter title exactly once as the top-level `#` heading. Use `##` for
major sections and `###` for subsections. Use language identifiers on every
code fence and make snippets internally consistent and understandable. When a
`canonicalExample` is supplied, treat its names, types, terminology, and
constraints as a continuity contract. Declare snippet intent with metadata such
as `intent=illustrative`, `intent=standalone`, or
`intent=compilable example=... file=...`. Explain omitted setup for illustrative
snippets and never use unexplained `...`.

Define each canonical type, class, record, interface, method, and field once in
an authoritative form. Later snippets must use that same API; show a changed
design with a distinct name or explicitly label it as a replacement and explain
the transition. Before returning, scan every fence for unresolved types,
contradictory signatures, missing supporting declarations, and imports that the
prose does not explain.

For an illustrative fence, say what setup is omitted and do not make it appear
to be a complete file. Use `intent=standalone` when the example is self-contained
enough to adapt. Reserve `intent=compilable` for examples with filenames,
supporting declarations, and compatible APIs across the example group.

Return raw Markdown only. Do not wrap the chapter in an outer code fence. Do
not add a preface, postscript, generation commentary, citations you cannot
verify, fabricated benchmarks, or claims that the supplied context does not
support. Do not claim that examples were compiled or tested.
