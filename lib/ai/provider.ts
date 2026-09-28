import { getAiConfig, type AiConfig } from "@/lib/env";

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
  /** HTTP status from the provider, when there was a response at all. */
  readonly status?: number;
  readonly provider: string;

  constructor(
    message: string,
    options: { provider: string; status?: number; cause?: unknown }
  ) {
    super(message, { cause: options.cause });
    this.name = "AIProviderError";
    this.status = options.status;
    this.provider = options.provider;
  }
}

interface OpenAiCompatibleResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { total_tokens?: number };
}

interface GeminiResponse {
  modelVersion?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { totalTokenCount?: number };
}

/**
 * Single place where the app talks to an LLM.
 *
 * Plain `fetch` instead of a vendor SDK, so every provider shares one code path
 * for timeouts and error messages. Switch with `AI_PROVIDER=groq|gemini|openai`.
 */
export async function generateCompletion({
  prompt,
  temperature = 0.7,
  system = SYSTEM_PROMPT,
}: GenerateOptions): Promise<GenerationResult> {
  const config = getAiConfig();
  const options = { prompt, temperature, system };

  if (config.provider === "gemini") {
    return generateWithGemini(config, options);
  }

  return generateWithOpenAiCompatible(config, options);
}

/**
 * Groq and OpenAI speak the same Chat Completions dialect, so they share this
 * implementation; only the base URL and the key differ.
 */
async function generateWithOpenAiCompatible(
  config: AiConfig,
  { prompt, temperature, system }: Required<GenerateOptions>
): Promise<GenerationResult> {
  const data = await requestJson<OpenAiCompatibleResponse>({
    provider: config.label,
    url: `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: {
      model: config.model,
      temperature,
      max_completion_tokens: config.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    timeoutMs: config.timeoutMs,
  });

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AIProviderError(
      `The ${config.label} model returned an empty response.`,
      { provider: config.label }
    );
  }

  return {
    content,
    model: data.model || config.model,
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

async function generateWithGemini(
  config: AiConfig,
  { prompt, temperature, system }: Required<GenerateOptions>
): Promise<GenerationResult> {
  const data = await requestJson<GeminiResponse>({
    provider: config.label,
    url: `${config.baseUrl.replace(/\/$/, "")}/models/${config.model}:generateContent`,
    headers: { "x-goog-api-key": config.apiKey },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: config.maxTokens },
    },
    timeoutMs: config.timeoutMs,
  });

  const content = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    const blocked =
      data.promptFeedback?.blockReason ?? data.candidates?.[0]?.finishReason;

    throw new AIProviderError(
      blocked
        ? `The ${config.label} model refused to answer (${blocked}).`
        : `The ${config.label} model returned an empty response.`,
      { provider: config.label }
    );
  }

  return {
    content,
    model: data.modelVersion || config.model,
    tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
  };
}

interface JsonRequestOptions {
  provider: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
}

/**
 * One POST helper for every provider: JSON in, JSON out, hard timeout, and a
 * human-readable error for each failure mode. No retries on purpose — the caller
 * refunds the credits and the user can simply try again.
 */
async function requestJson<T>({
  provider,
  url,
  headers,
  body,
  timeoutMs,
}: JsonRequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError(
        `The ${provider} request timed out after ${Math.round(timeoutMs / 1000)}s.`,
        { provider, cause: error }
      );
    }

    throw new AIProviderError(
      `Could not reach ${provider}. Check your connection and AI_BASE_URL.`,
      { provider, cause: error }
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new AIProviderError(
      describeHttpError(provider, response.status, raw),
      { provider, status: response.status }
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new AIProviderError(
      `${provider} returned a malformed JSON response (${response.status}).`,
      { provider, status: response.status, cause: error }
    );
  }
}

function describeHttpError(
  provider: string,
  status: number,
  raw: string
): string {
  const detail = extractErrorMessage(raw);

  switch (status) {
    case 401:
    case 403:
      return `The ${provider} API key was rejected (${status}). ${
        detail ?? "Check that the key is valid, active and copied in full."
      }`;
    case 402:
      return `The ${provider} account has no credit left (402). ${
        detail ?? "Add billing, or switch AI_PROVIDER to groq."
      }`;
    case 404:
      return `The ${provider} model was not found (404). ${
        detail ?? "Check AI_MODEL against the provider's model list."
      }`;
    case 429:
      // OpenAI reports "no balance" as 429 with insufficient_quota, so do not
      // call every 429 a rate limit.
      if (/insufficient_quota|exceeded your current quota|billing/i.test(raw)) {
        return `The ${provider} account is out of credit (quota exceeded). ${
          detail ?? "Add billing, or switch AI_PROVIDER to groq — its free tier needs no card."
        }`;
      }

      return `The ${provider} provider is rate limiting requests (429). ${
        detail ?? "Wait a few seconds and try again."
      }`;
    case 503:
      return `The ${provider} provider is temporarily unavailable (503). ${
        detail ?? "Retry in a moment."
      }`;
    default:
      return `The ${provider} provider rejected the request (${status}). ${
        detail ?? ""
      }`.trim();
  }
}

/** Providers nest their message differently; keep whichever one exists. */
function extractErrorMessage(raw: string): string | null {
  const fallback = raw.trim();

  try {
    const parsed = JSON.parse(raw) as {
      error?: string | { message?: string };
      message?: string;
    };

    if (typeof parsed.error === "string") {
      return parsed.error.slice(0, 300);
    }

    const message = parsed.error?.message ?? parsed.message;
    if (message) return message.slice(0, 300);
  } catch {
    // Not JSON: fall through to the raw body.
  }

  return fallback ? fallback.slice(0, 300) : null;
}
