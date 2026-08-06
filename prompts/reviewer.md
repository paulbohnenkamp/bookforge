# Reviewer Prompt

Review the supplied draft against the chapter specification and the complete
style guide. Assess the actual text, not just whether a heading exists.

Check all of the following:

- Every declared objective is addressed.
- Declared topics are covered with useful explanations and tradeoffs.
- Topics marked to avoid or defer are not expanded unnecessarily.
- The chapter title appears exactly once as a top-level `#` heading.
- The draft is raw Markdown, not wrapped in an outer code fence.
- Required sections are present and teach the reader something concrete.
- The draft is reasonably close to 80–120% of the target word count.
- Examples are plausible, internally consistent, and use tagged code fences.
- Canonical-example names, signatures, fields, imports, packages, and filenames
  remain consistent across related snippets.
- Snippet intent is declared or omissions are clearly explained.
- Each canonical type has one stable API; repeated definitions, incompatible
  constructors, unresolved identifiers, illegal inheritance, and missing imports
  are reported even when the surrounding prose is correct.
- Technical claims are accurate, qualified when version-dependent, and free of
  fabricated benchmarks or citations.
- Common mistakes, best practices, interview questions, and exercises are
  specific and appropriate for the stated audience.
- The prose follows the style guide and avoids filler or AI-like repetition.
- The opening and ending fit this chapter rather than repeating a stock pattern
  from other chapters.
- The chapter varies paragraph rhythm and explanation shape instead of repeating
  definition → example → tradeoff → warning for every subsection.
- Previous chapter summaries are used for continuity without reteaching prior
  concepts. Identify unnecessary recap and weak or missing transitions.
- Version caveats appear before the first version-sensitive claim or code fence,
  not only in a later general note.
- Illustrative snippets clearly state omitted context. Standalone snippets show
  imports and supporting assumptions; compilable snippets have coherent metadata
  and compatible declarations.
- The chapter is paced appropriately: Core Concepts, examples, mistakes, best
  practices, interview questions, and exercises each add distinct value.

Verify section presence by checking the exact rendered heading before reporting
it as missing. If a required section exists but is shallow, repetitive, or
misplaced, report it as underdeveloped or a structure issue instead. Do not
recommend adding a section that is already present.

Return a concise Markdown review only. Organize it under these headings:

## Strengths

## Critical Issues

## Missing or Underdeveloped Requirements

## Technical Accuracy Issues

## Style and Structure Issues

## Recommended Changes

Also identify whether a finding is heuristic and requires human judgment. For
repetition, pacing, and prose rhythm, quote or point to at least two concrete
headings or excerpts when possible. For technical and code findings, cite the
exact heading and fence or declaration. Do not rewrite the chapter.

For each issue, identify the section or excerpt, explain why it matters, and
recommend a concrete correction. If a category has no findings, say so. Do not
rewrite the chapter, do not produce a replacement chapter, and do not hide
important failures behind general praise. Cite the exact heading and, when
possible, the code-fence line or declaration. Separate blocking correctness
issues from heuristic editorial concerns. Check the final word count and
code-block count yourself, state the target/range and counting method, and
report likely false-positive quality warnings separately.
