import type { LlmProvider } from './llm-provider.js';

export class MockLlmProvider implements LlmProvider {
  public async complete(prompt: string): Promise<string> {
    const stage = this.valueAfter(prompt, 'Stage:');
    const title = this.chapterTitle(prompt);
    if (stage === 'Writer') return this.writerFixture(title);
    if (stage === 'Reviewer') {
      return `# Mock Review\n\n- Strengths: the draft was received by the reviewer.\n- Weaknesses: the mock workflow cannot assess factual accuracy.\n- Missing topics: confirm the chapter's tradeoffs and examples.\n- Incorrect statements: none identified by the deterministic provider.\n- Suggested improvements: preserve the required structure.\n\nWriter draft received: ${this.markerInSection(prompt, 'Writer draft:')} (${this.sectionLength(prompt, 'Writer draft:')} characters).`;
    }
    if (stage === 'Rewriter')
      return this.rewrittenFixture(
        title,
        this.sectionLength(prompt, 'Reviewer response:'),
        this.markerInSection(prompt, 'Reviewer response:'),
      );
    return `Mock response for prompt (${prompt.length} characters).`;
  }

  private writerFixture(title: string): string {
    return `# ${title}\n\n<!-- mock-stage: writer -->\n\n## Why This Matters\n\nThis chapter establishes a practical foundation for making decisions about the topic.\n\n## Core Concepts\n\nThe central concept is best understood by connecting its purpose, mechanics, and tradeoffs.\n\n## Worked Examples\n\nA focused example shows how the concept can be applied in a realistic technical setting.\n\n## Common Mistakes\n\nCommon mistakes come from applying a rule without checking the surrounding constraints.\n\n## Best Practices\n\nPrefer the approach that makes assumptions explicit and keeps future changes local.\n\n## Interview Questions\n\n### What tradeoff should an engineer explain?\n\nA strong answer connects the implementation choice to its operating constraints.\n\n## Exercises\n\n### Exercise One\n\nIdentify one decision in this topic and explain its alternative and tradeoff.\n\n## Key Takeaways\n\n- Connect the technique to the problem it solves.\n- Make tradeoffs explicit.\n- Validate examples against the intended constraints.`;
  }

  private rewrittenFixture(title: string, reviewLength: number, reviewMarker: string): string {
    return `# ${title}\n\n<!-- mock-stage: rewriter -->\n<!-- reviewer-response-received: ${reviewLength} characters -->\n<!-- reviewer-response-marker: ${reviewMarker} -->\n\n## Why This Matters\n\nA clear understanding of this topic helps engineers choose designs that remain understandable as requirements change.\n\n## Core Concepts\n\nStart with the problem, then describe the mechanism and the constraints that shape a suitable solution. A useful explanation distinguishes the default choice from cases where an alternative is justified.\n\n## Worked Examples\n\nUse one small, coherent example to show the decision from input through outcome. Keep incidental setup out of the example so the important behavior remains visible.\n\n## Common Mistakes\n\nA frequent mistake is treating a familiar technique as a universal rule. Check the assumptions, identify the failure mode, and document the exception when the context calls for it.\n\n## Best Practices\n\nPrefer explicit boundaries, focused examples, and terminology that matches the surrounding system. The tradeoff is a little more up-front explanation in exchange for easier review and maintenance.\n\n## Interview Questions\n\n### How should an engineer explain this topic?\n\nA strong answer defines the idea, explains why it exists, describes when it applies, and compares a realistic alternative.\n\n## Exercises\n\n### Compare two approaches\n\nChoose two approaches to the topic, state the constraints for each, and explain which tradeoff drives your choice.\n\n## Key Takeaways\n\n- Explain purpose, mechanics, and tradeoffs together.\n- Keep examples focused and internally consistent.\n- Treat best practices as context-dependent guidance.\n- Use review feedback to improve clarity without changing scope.`;
  }

  private chapterTitle(prompt: string): string {
    const match = /Chapter specification: \{"id":"[^"]+","title":"([^"]+)"/.exec(prompt);
    return match?.[1] ?? 'Generated Chapter';
  }

  private valueAfter(prompt: string, marker: string): string {
    const line = prompt.split('\n').find((item) => item.startsWith(marker));
    return line?.slice(marker.length).trim() ?? '';
  }

  private sectionLength(prompt: string, marker: string): number {
    const start = prompt.indexOf(marker);
    return start < 0 ? 0 : prompt.length - start - marker.length;
  }

  private markerInSection(prompt: string, marker: string): string {
    const section = prompt.slice(prompt.indexOf(marker) + marker.length);
    const match = /<!-- mock-stage: ([^ ]+) -->/.exec(section);
    return match?.[1] ?? 'content';
  }
}
