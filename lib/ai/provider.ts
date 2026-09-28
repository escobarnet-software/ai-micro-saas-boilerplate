import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
} from "openai";

import { getOpenAIConfig } from "@/lib/env";

export const SYSTEM_PROMPT =
  "You are the generation engine of an AI micro-SaaS. Answer with clean, " +
  "production-ready copy. Use markdown when it improves clarity and never " +
  "mention that you are an AI model.";

export interface GenerateOptions {
  prompt: string;
  temperature?: number;
  system?: string;
}

export interface GenerationResult {
  content: string;
  model: string;
  tokensUsed: number;
}

export class AIProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIProviderError";
  }
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const { apiKey } = getOpenAIConfig();
  cachedClient = new OpenAI({
    apiKey,
    timeout: 45_000,
    maxRetries: 2,
  });

  return cachedClient;
}

/**
 * Single place where the app talks to the LLM. Swap the provider here.
 */
export async function generateCompletion({
  prompt,
  temperature = 0.7,
  system = SYSTEM_PROMPT,
}: GenerateOptions): Promise<GenerationResult> {
  const { model, maxTokens } = getOpenAIConfig();

  try {
    const completion = await getClient().chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new AIProviderError("The model returned an empty response.");
    }

    return {
      content,
      model: completion.model || model,
      tokensUsed: completion.usage?.total_tokens ?? 0,
    };
  } catch (error) {
    if (error instanceof AIProviderError) throw error;

    if (error instanceof APIConnectionTimeoutError) {
      return reportTimeout(error);
    }

    if (error instanceof RateLimitError) {
      throw new AIProviderError(
        "The model provider is rate limiting requests. Try again shortly.",
        { cause: error }
      );
    }

    if (error instanceof APIError) {
      throw new AIProviderError(
        `The model provider rejected the request (${error.status ?? "unknown"}).`,
        { cause: error }
      );
    }

    throw new AIProviderError("Could not reach the model provider.", {
      cause: error,
    });
  }
}

function reportTimeout(error: APIConnectionTimeoutError): never {
  throw new AIProviderError("The model provider timed out.", { cause: error });
}
