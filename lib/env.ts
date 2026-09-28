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

export function getOpenAIConfig(): {
  apiKey: string;
  model: string;
  maxTokens: number;
} {
  return {
    apiKey: read("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    maxTokens: Number.parseInt(process.env.OPENAI_MAX_TOKENS ?? "1024", 10),
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
