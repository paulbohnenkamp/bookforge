# Writer Prompt

Write exactly one complete technical-book chapter from the supplied book
specification. The chapter specification is authoritative for the title,
target word count, objectives, topics, and topics to avoid or defer. The style
guide is authoritative for voice, structure, formatting, accuracy, and the
quality bar.

The requested output is the chapter's subject matter, not a description of
BookForge or of the process used to generate the book. Do not turn a subject
book into a meta-book about its YAML specification, prompts, chapters, or
generation workflow. Treat the supplied book title, chapter title, objectives,
topics, canonical example, and story contract as the content to teach.

Before writing, turn every declared objective into content the reader can use.
Cover the declared topics with explanations, tradeoffs, and relevant examples.
Do not expand into topics marked to avoid or defer. Use previous chapter
summaries only for lightweight continuity: state what the reader can carry
forward, then add the new decision or skill. Do not reteach prior chapters.

When a book story contract is supplied, it is mandatory continuity guidance.
Use the named system, cast, and constraints across the chapter. Treat the
chapter's story beat as the next scene in one developing engineering project:
open with the decision, incident, or conversation relevant to that beat; use
the same system vocabulary in examples; and close by handing a consequence or
question to the next chapter. Do not replace the story with unrelated toy
examples. A focused snippet is welcome, but explain how it changes the
recurring system.

When a learning contract is supplied, optimize for the reader's ability to use
the subject. Establish prerequisites, teach only what supports the promise,
and make every chapter produce a concrete capability or repository artifact.
For tutorials, replace formal exercises with guided actions inside the prose:
give the command or edit, state what the reader should observe, explain what
that result means, and connect it to the next chapter. Do not add interview
questions or exercise sections unless the book explicitly requires them.
When verified workflow steps are supplied, reproduce their commands, expected
observations, and artifact paths exactly; never invent package scripts, flags,
directories, or state names.
For a short repository tutorial, keep the chapter close to its configured
target, use no more than three small code or command examples per major idea,
and stop once the reader can perform the promised action. Do not pad the
chapter with repeated lifecycle explanations, long conceptual digressions, or
full source-file listings.

The normal chapter should include these sections, except that the book-level
style flags control the optional sections: include Interview Questions only
when `interview questions=true`, and include Exercises only when
`exercises=true`:

1. Why This Matters
2. Core Concepts
3. Worked Examples
4. Common Mistakes
5. Best Practices
6. Interview Questions with concise model answers (when enabled)
7. Exercises with expected outcomes (when enabled)
8. Key Takeaways

When an optional section is disabled, do not create an empty placeholder for it.
Use the available space for topic-specific explanation, examples, tradeoffs, or
a concise decision checklist appropriate to the audience.

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

When the supplied style is `concise executive`, write for a time-constrained
business reader. Prefer one recurring example, short paragraphs, one compact
comparison table at most, and no more than three subsections under Core
Concepts or two worked-example subsections. Remove implementation detail,
repeated caveats, and secondary examples. Aim for approximately 80–100% of the
configured target word count; do not use extra explanation to fill space.

Return raw Markdown only. Do not wrap the chapter in an outer code fence. Do
not add a preface, postscript, generation commentary, citations you cannot
verify, fabricated benchmarks, or claims that the supplied context does not
support. Do not claim that examples were compiled or tested.
