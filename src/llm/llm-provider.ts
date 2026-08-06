export interface UsageMetadata {
  model?: string;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface LlmRequest {
  prompt: string;
  systemInstruction?: string;
  signal?: AbortSignal;
}

export interface LlmCompletion {
  text: string;
  usage?: UsageMetadata;
}

export interface LlmProvider {
  complete(prompt: string): Promise<string>;
  completeWithMetadata?(request: LlmRequest): Promise<LlmCompletion>;
}
