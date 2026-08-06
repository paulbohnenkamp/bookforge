# Modern Java Chapter 2 Calibration Report

## 1. Pilot configuration

- Book: `modern-java`
- Chapter: 2, Object-Oriented Design That Protects Change
- Provider: OpenAI Responses API
- Model: `gpt-5.6-luna`
- Temperature: omitted by the provider for this model family
- Generation attempts: one completed pilot generation, preceded by one interrupted Writer request that was resumed without regeneration
- Approval: not performed

The API key is not recorded in this report. `BOOKFORGE_REASONING_EFFORT` was not
configured and was not added to the request because the current provider does not
support that setting.

## 2. Generated artifact paths

```text
generated/modern-java/chapters/02-object-oriented-design/
├── draft.md
├── review.md
├── rewritten.md
├── chapter.md
├── summary.md
├── summary.json
├── quality-report.md
└── quality-report.json
```

The assembled draft PDF is produced at:

```text
generated/modern-java/exports/modern-java-and-object-oriented-design.pdf
```

## 3. What worked well

The chapter has a strong change-oriented thesis rather than a noun-to-class
introduction. It explains invariants, encapsulation, abstraction, polymorphism,
composition, delegation, interfaces, dependency direction, testing seams, and
transaction semantics. The final rewritten output has a coherent `Order` domain,
useful interview questions, six meaningful exercises, and appropriate caution around
inheritance and interfaces.

The Reviewer gave specific findings with concrete corrections. The Rewriter resolved
many of the draft's most serious issues: it consolidated the canonical model,
replaced the illegal `ReadOnlyOrder extends final Order` example with capability
interfaces, added transaction/failure discussion, qualified Java-version usage, and
made the weak legacy example explicit.

## 4. Technical problems

The first Writer draft contained incompatible redefinitions of `Money`, `Order`, and
`OrderLine`; an inheritance example that could not compile; an unresolved `Status`
reference; and a procedural example that called methods not present on the displayed
canonical API. The Reviewer identified these accurately, but only after generation.

The rewritten chapter is materially better, but its many illustrative snippets still
need a human technical pass. Most are not compilable examples and rely on canonical
types defined elsewhere. `Money`'s scale policy is now explained, but it remains a
domain choice that should be checked against the intended book audience.

## 5. Readability problems

The final chapter is 7,883 words against a 6,000-word target and the style-guide
range of 4,800–7,200. The content is useful, but repeated explanations of
constructor injection, composition, interfaces, and invariants create a heavy middle
section. The chapter is code-heavy with 38 fences. The strongest improvement would be
to keep one authoritative canonical model and use smaller diffs for later changes.

The prose is generally direct and book-like. Bullets are used appropriately, headings
are meaningful, and interview answers avoid trivia. Some sections still repeat the
same recommendation in slightly different words.

## 6. Example-consistency problems

The draft's canonical types changed names, constructors, and field types between
snippets. It also mixed incomplete support types with examples that looked executable.
The final output fixed the most visible conflicts, but the chapter should explicitly
label omitted imports and supporting declarations when a reader cannot paste a fence
into a single file.

## 7. Reviewer weaknesses

The Reviewer was strong at identifying technical inconsistencies and scope risks. It
did not provide line numbers or exact code-fence locations consistently, and its word
count assessment was initially heuristic. The quality report did not import the
Reviewer’s concrete findings; it only recorded that human judgment was required.

## 8. Rewriter weaknesses

The Rewriter improved the chapter substantially, but it retained a large number of
illustrative fences and did not make all omitted context mechanically verifiable. It
also retained enough repetition to exceed the target range. This is an editorial
optimization issue, not a pipeline failure.

## 9. Quality-validator false positives

The `OBJECTIVE_COVERAGE` warning is a coarse text heuristic. A concept can be covered
accurately without containing the first three words of the YAML objective verbatim.
It should remain a warning for human review, not a blocking error. The word-count
warning is appropriate and actionable.

## 10. Quality-validator missed issues

The validator reported no code consistency findings because every fence was marked
`intent=illustrative` and no example IDs or filenames were provided. It did not detect
duplicate canonical declarations, unresolved identifiers, illegal inheritance, or
contradictory method signatures. It also did not evaluate repetition, tradeoff depth,
transaction semantics, or whether a reviewer finding was actually resolved.

## 11. PDF readability observations

The Playwright PDF rendered successfully from assembled Markdown with a title, draft
notice, heading hierarchy, code styling, tables, and page numbers. The short mock
book PDF was readable. The real pilot's code-heavy layout should receive a human
visual check for long code lines, page splits inside code blocks, and excessive
chapter whitespace after the final draft assembly.

## 12. Recommended generic improvements

1. Require one authoritative canonical API and explicitly named legacy/replacement
   examples in Writer and Rewriter instructions.
2. Require every illustrative snippet to explain omitted setup and every standalone
   or compilable snippet to declare its assumptions.
3. Require Reviewer findings to cite exact headings and code locations and state an
   actual word count.
4. Add heuristic detection for duplicate type declarations and inheritance from a
   final type.
5. Generate summaries with purpose, concepts, terminology, assumptions, deferred
   topics, and continuity risks instead of a generic paragraph.
6. Keep repetition and word-count findings as warnings requiring editorial judgment.

## 13. Chapter-specific content improvements

The canonical order-processing example should retain one stable `Money`, `OrderLine`,
`Order`, and `Customer` API. The human reviewer should verify the money scale policy,
transaction ordering, discount bounds and stacking semantics, Java 8 alternatives,
and whether the chapter introduces too much material that belongs in SOLID or later
chapters.

## 14. First-generation decision

**Needs revision.** The chapter is strong enough to justify one targeted regeneration,
but it should not be approved until the example API, code intent, word count, and
technical claims receive human review.

## 15. Second-generation comparison

The second generation used the same configured model and completed all three real
stages. Its usage was:

| Stage    | Input tokens | Output tokens | Total tokens |
| -------- | -----------: | ------------: | -----------: |
| Writer   |        5,051 |        10,620 |       15,671 |
| Reviewer |       15,177 |         5,050 |       20,227 |
| Rewriter |       17,717 |        10,106 |       27,823 |
| Total    |       37,945 |        25,776 |       63,721 |

The chapter decreased from 7,883 to 6,169 words and from 38 to 26 code blocks. The
summary now records purpose, concepts, terminology, assumptions, deferred topics,
and continuity risks. The final Reviewer found a real `Money` rounding defect,
unsafe payment/persistence sequencing, imprecise invariant terminology, and several
missing or underdeveloped examples. These are useful human-review findings and were
not suppressed.

The first version of the new filename heuristic incorrectly flagged the different
files in a legitimate multi-file example group. That was corrected so the validator
now reports conflicting content only when the same example ID and filename are
reused incompatibly. The final quality report is now:

```text
pass_with_warnings — 0 errors, 1 warning
```

The remaining warning is heuristic objective-coverage uncertainty. It is not a
blocking failure, but it should be reviewed alongside the Reviewer findings.

The draft assembly and PDF were regenerated after calibration. The PDF opens as a
valid A4 PDF and renders the complete 18-chapter draft. A duplicate draft notice was
found in the PDF (one from assembled Markdown and one from the renderer); the
renderer was corrected to avoid injecting a second notice. The PDF remains a draft
because no chapter has been approved.

## 16. Remaining concerns and decision

**Needs human revision before approval.** The second output is materially better in
structure, length, canonical continuity, and summary quality, but another generation
would not be the right next step. The remaining issues require a technical editor to
choose the monetary rounding policy, repair or clearly scope payment transaction
semantics, and decide which illustrative examples should become compilable.
