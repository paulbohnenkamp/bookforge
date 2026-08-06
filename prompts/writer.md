# Writer Prompt

Write exactly one complete technical-book chapter from the supplied book
specification. The chapter specification is authoritative for the title,
target word count, objectives, topics, and topics to avoid or defer. The style
guide is authoritative for voice, structure, formatting, accuracy, and the
quality bar.

Before writing, turn every declared objective into content the reader can use.
Cover the declared topics with explanations, tradeoffs, and relevant examples.
Do not expand into topics marked to avoid or defer. Use previous chapter
summaries only for lightweight continuity: state what the reader can carry
forward, then add the new decision or skill. Do not reteach prior chapters.

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

Treat the supplied target word count as a planning budget and a soft upper
limit, not a quota. Aim for roughly 80–110% when the subject supports it, and
stop when the objectives are covered with sufficient examples and tradeoffs.
Do not add a second explanation, example, or best-practice subsection merely to
increase length. Use the 120% boundary as an editorial warning, not a target.
Include 3–6 useful exercises when exercises are enabled.

Vary the chapter’s rhetoric naturally. Choose an opening that fits the subject:
a concrete failure, a consequential design decision, a reader question, or a
careful correction of a common oversimplification. Do not make every chapter
open by rejecting a dictionary definition. Close with 4–8 chapter-specific
takeaways or a concise decision checklist; do not replay the Best Practices
section. Use transitions that connect ideas, not stock announcements such as
“now that we have covered” or “the important distinction is.” Vary paragraph
length and use a mix of prose, lists, tables, and examples only when each adds
teaching value. Do not force every subsection into the same definition,
example, tradeoff, and warning shape.

Use the chapter title exactly once as the top-level `#` heading. Use `##` for
major sections and `###` for subsections. Use language identifiers on every
code fence and make snippets internally consistent and understandable. If the
chapter uses a Java feature newer than Java 8, state its minimum release and
compatibility implication before the first example that depends on it. Put the
same version context in the fence metadata or immediately adjacent prose when
the example is version-sensitive. When a
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

For an illustrative fence, say what setup, imports, or supporting types are
omitted and do not make it appear to be a complete file. Use
`intent=standalone` only when the displayed imports, declarations, and stated
assumptions make the example coherent enough to adapt without guessing. Reserve
`intent=compilable` for examples with filenames, supporting declarations, and
compatible APIs across the example group. Never call an example standalone just
because its central method is short.

Before returning, perform an editorial audit: compare the chapter against the
previous summaries for unnecessary repetition; count the code fences and major
sections; remove duplicate explanations; verify that method names match their
contracts; and confirm that every exercise has a clear expected outcome. Prefer
one authoritative example over several near-equivalent snippets.

Return raw Markdown only. Do not wrap the chapter in an outer code fence. Do
not add a preface, postscript, generation commentary, citations you cannot
verify, fabricated benchmarks, or claims that the supplied context does not
support. Do not claim that examples were compiled or tested.
