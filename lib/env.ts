export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing environment variable "${name}". Copy .env.example to .env.local and fill in your keys.`
    );
    this.name = "MissingEnvError";
  }
}

function read(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new MissingEnvError(name);
  }
  return trimmed;
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: read("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: read(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  };
}

export function getSupabaseServiceRoleKey(): string {
  return read(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export type AiProviderId = "groq" | "gemini" | "openai";

interface AiProviderDefaults {
  label: string;
  /** Environment variable that holds the API key. */
  keyEnv: string;
  /** Prefix every key from this provider starts with, for sanity checks. */
  keyPrefix: string;
  baseUrl: string;
  model: string;
  docsUrl: string;
}

/**
 * Adding a provider is one entry here plus one branch in `lib/ai/provider.ts`.
 * Groq is the default because its free tier needs no credit card.
 */
export const AI_PROVIDERS: Record<AiProviderId, AiProviderDefaults> = {
  groq: {
    label: "Groq",
    keyEnv: "GROQ_API_KEY",
    keyPrefix: "gsk_",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b",
    docsUrl: "https://console.groq.com/keys",
  },
  gemini: {
    label: "Google Gemini",
    keyEnv: "GEMINI_API_KEY",
    keyPrefix: "AIza",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.8-flash",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  openai: {
    label: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
    keyPrefix: "sk-",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    docsUrl: "https://platform.openai.com/api-keys",
  },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[];

export const DEFAULT_AI_PROVIDER: AiProviderId = "groq";

export function isAiProviderId(value: string): value is AiProviderId {
  return Object.prototype.hasOwnProperty.call(AI_PROVIDERS, value);
}

/** `AI_PROVIDER`, falling back to Groq when unset or unknown. */
export function getAiProviderId(): AiProviderId {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  return raw && isAiProviderId(raw) ? raw : DEFAULT_AI_PROVIDER;
}

export interface AiConfig {
  provider: AiProviderId;
  label: string;
  apiKeyEnv: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
  timeoutMs: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Throws `MissingEnvError` when the selected provider has no key. */
export function getAiConfig(): AiConfig {
  const provider = getAiProviderId();
  const defaults = AI_PROVIDERS[provider];

  return {
    provider,
    label: defaults.label,
    apiKeyEnv: defaults.keyEnv,
    apiKey: read(defaults.keyEnv, process.env[defaults.keyEnv]),
    model: process.env.AI_MODEL?.trim() || defaults.model,
    maxTokens: positiveInt(process.env.AI_MAX_TOKENS, 1024),
    baseUrl: process.env.AI_BASE_URL?.trim() || defaults.baseUrl,
    timeoutMs: positiveInt(process.env.AI_TIMEOUT_MS, 45_000),
  };
}

/** Non-throwing view of the AI configuration, for diagnostics. */
export function describeAiConfig(): {
  provider: AiProviderId;
  label: string;
  keyEnv: string;
  keyPrefix: string;
  keySet: boolean;
  baseUrl: string;
  model: string;
  docsUrl: string;
} {
  const provider = getAiProviderId();
  const defaults = AI_PROVIDERS[provider];

  return {
    provider,
    label: defaults.label,
    keyEnv: defaults.keyEnv,
    keyPrefix: defaults.keyPrefix,
    keySet: Boolean(process.env[defaults.keyEnv]?.trim()),
    baseUrl: process.env.AI_BASE_URL?.trim() || defaults.baseUrl,
    model: process.env.AI_MODEL?.trim() || defaults.model,
    docsUrl: defaults.docsUrl,
  };
}

export function getStripeConfig(): {
  secretKey: string;
  webhookSecret: string;
  priceIds: Record<"starter" | "pro", string>;
} {
  return {
    secretKey: read("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
    webhookSecret: read(
      "STRIPE_WEBHOOK_SECRET",
      process.env.STRIPE_WEBHOOK_SECRET
    ),
    priceIds: {
      starter: read("STRIPE_PRICE_ID_STARTER", process.env.STRIPE_PRICE_ID_STARTER),
      pro: read("STRIPE_PRICE_ID_PRO", process.env.STRIPE_PRICE_ID_PRO),
    },
  };
}

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return configured.replace(/\/$/, "") || "http://localhost:3000";
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
