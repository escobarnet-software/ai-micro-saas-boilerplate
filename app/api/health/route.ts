import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TableCheck {
  table: string;
  ok: boolean;
  error?: string;
}

interface FunctionCheck {
  name: string;
  state: ProbeState;
  error?: string;
}

type ProbeState = "ok" | "missing" | "unknown";

/**
 * PostgREST answers PGRST202 / "Could not find the function" when an RPC is not
 * in the schema cache, and 42P01 when the table behind it is missing. Any other
 * error (permission denied, validation raised by the function itself) still
 * proves that the function exists. Network failures prove nothing.
 */
function probeState(
  code: string | undefined,
  message: string | undefined
): ProbeState {
  if (!message) return "ok";
  if (code === "PGRST202" || code === "42P01") return "missing";
  if (/could not find the function/i.test(message)) return "missing";
  if (/fetch|network|ECONNREFUSED|ENOTFOUND|timed? ?out|getaddrinfo/i.test(message)) {
    return "unknown";
  }
  return "ok";
}

interface EnvCheck {
  /** The variable is set to a non-empty value. */
  set: boolean;
  /** The value matches the format that provider issues. */
  valid: boolean;
}

/**
 * `set: true, valid: false` almost always means the placeholder from
 * `.env.example` was never replaced — the single most common setup mistake.
 */
function checkEnv(name: string, test: (value: string) => boolean): EnvCheck {
  const value = process.env[name]?.trim();
  if (!value) return { set: false, valid: false };
  return { set: true, valid: test(value) };
}

const isHttpUrl = (value: string) => /^https?:\/\//.test(value);
const isServiceRoleKey = (value: string) =>
  value.startsWith("sb_secret_") || (value.startsWith("eyJ") && value.length > 100);
const isOpenAiKey = (value: string) =>
  value.startsWith("sk-") && value.length > 20;
const isStripeSecretKey = (value: string) =>
  value.startsWith("sk_") && value.length > 20;
const isWebhookSecret = (value: string) =>
  value.startsWith("whsec_") && value.length > 20;
const isPriceId = (value: string) =>
  value.startsWith("price_") && value.length > 10;

/**
 * GET /api/health — setup diagnostics for the dashboard.
 *
 * Booleans and format flags only: no keys, no emails, no rows. It also works as
 * a self-heal, because probing `bootstrap_profile()` creates your profile row
 * when it is missing.
 */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: checkEnv("NEXT_PUBLIC_SUPABASE_URL", isHttpUrl),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: checkEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      () => true
    ),
    SUPABASE_SERVICE_ROLE_KEY: checkEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      isServiceRoleKey
    ),
    OPENAI_API_KEY: checkEnv("OPENAI_API_KEY", isOpenAiKey),
    OPENAI_MODEL: checkEnv("OPENAI_MODEL", () => true),
    STRIPE_SECRET_KEY: checkEnv("STRIPE_SECRET_KEY", isStripeSecretKey),
    STRIPE_WEBHOOK_SECRET: checkEnv("STRIPE_WEBHOOK_SECRET", isWebhookSecret),
    STRIPE_PRICE_ID_STARTER: checkEnv("STRIPE_PRICE_ID_STARTER", isPriceId),
    STRIPE_PRICE_ID_PRO: checkEnv("STRIPE_PRICE_ID_PRO", isPriceId),
    NEXT_PUBLIC_SITE_URL: checkEnv("NEXT_PUBLIC_SITE_URL", isHttpUrl),
  };

  const hints: string[] = [];

  if (!hasSupabaseEnv()) {
    hints.push(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local, then restart the server."
    );

    return NextResponse.json(
      apiSuccess({
        healthy: false,
        env,
        tables: [] as TableCheck[],
        functions: [] as FunctionCheck[],
        auth: { signedIn: false, profileVisible: false },
        hints,
      })
    );
  }

  const supabase = createClient();

  const [profilesProbe, transactionsProbe, generationsProbe] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("credit_transactions")
        .select("id", { count: "exact", head: true }),
      supabase.from("generations").select("id", { count: "exact", head: true }),
    ]);

  const tables: TableCheck[] = [
    { table: "profiles", ok: !profilesProbe.error, error: profilesProbe.error?.message },
    {
      table: "credit_transactions",
      ok: !transactionsProbe.error,
      error: transactionsProbe.error?.message,
    },
    { table: "generations", ok: !generationsProbe.error, error: generationsProbe.error?.message },
  ];

  // `p_amount: 0` is rejected before anything is charged, so this probe is free.
  const [bootstrapProbe, consumeProbe] = await Promise.all([
    supabase.rpc("bootstrap_profile", {}),
    supabase.rpc("consume_credits", { p_amount: 0, p_description: "health check" }),
  ]);

  const functions: FunctionCheck[] = [
    {
      name: "bootstrap_profile",
      state: probeState(bootstrapProbe.error?.code, bootstrapProbe.error?.message),
      error: bootstrapProbe.error?.message,
    },
    {
      name: "consume_credits",
      state: probeState(consumeProbe.error?.code, consumeProbe.error?.message),
      error: consumeProbe.error?.message,
    },
  ];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileVisible = false;
  let plan: string | null = null;
  let credits: number | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("plan, credits")
      .eq("id", user.id)
      .maybeSingle();

    profileVisible = Boolean(data);
    plan = data?.plan ?? null;
    credits = data?.credits ?? null;
  }

  const tablesOk = tables.every((table) => table.ok);
  const missingFunction = (name: string) =>
    functions.find((entry) => entry.name === name)?.state === "missing";

  if (!tablesOk) {
    hints.push(
      "The public schema is missing or unreachable: paste supabase/setup.sql into the Supabase SQL editor and run it (it is idempotent)."
    );
  }
  if (tablesOk && missingFunction("bootstrap_profile")) {
    hints.push(
      "Run supabase/setup.sql: bootstrap_profile() is missing, so the dashboard cannot create a missing profile row. The script is idempotent and also installs the RLS policies, the signup trigger and the backfill."
    );
  }
  if (tablesOk && missingFunction("consume_credits")) {
    hints.push(
      "Run supabase/setup.sql: consume_credits() is missing, so /api/generate cannot debit credits. Migrations 0002–0005 were never applied to this project."
    );
  }
  if (tablesOk && !user) {
    hints.push(
      "No session: sign in first to have your profile row checked (tables are verified without it)."
    );
  }
  if (user && !profileVisible) {
    hints.push(
      "Signed in but no visible profile row: the RLS policies are missing. Re-run supabase/setup.sql."
    );
  }
  if (user && profileVisible) {
    hints.push(
      `Profile OK (plan ${plan ?? "?"}, ${credits ?? "?"} credits). The dashboard can render.`
    );
  }
  const describeEnv = (name: keyof typeof env, consequence: string) => {
    const entry = env[name];
    if (!entry.set) {
      hints.push(`${name} is unset: ${consequence}`);
    } else if (!entry.valid) {
      hints.push(
        `${name} still holds the placeholder from .env.example: ${consequence}`
      );
    }
  };

  describeEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "the Stripe webhook cannot sync plans or grant credits (the dashboard and /api/generate work without it)."
  );
  describeEnv("OPENAI_API_KEY", "/api/generate returns a configuration error.");
  describeEnv("STRIPE_SECRET_KEY", "checkout and the billing portal will fail.");
  describeEnv("STRIPE_WEBHOOK_SECRET", "the webhook signature check will fail.");
  describeEnv(
    "STRIPE_PRICE_ID_STARTER",
    "the Starter plan cannot start a checkout session."
  );
  describeEnv(
    "STRIPE_PRICE_ID_PRO",
    "the Pro plan cannot start a checkout session."
  );

  return NextResponse.json(
    apiSuccess({
      healthy:
        tablesOk &&
        !missingFunction("bootstrap_profile") &&
        !missingFunction("consume_credits") &&
        (!user || profileVisible),
      env,
      tables,
      functions,
      auth: { signedIn: Boolean(user), profileVisible, plan, credits },
      hints,
    })
  );
}
