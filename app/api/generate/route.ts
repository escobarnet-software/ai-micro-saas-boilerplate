import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { generateCompletion, AIProviderError } from "@/lib/ai/provider";
import { getAiConfig, MissingEnvError } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { CREDIT_COST_PER_GENERATION } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  HTTP_STATUS_BY_ERROR_CODE,
  apiFailure,
  apiSuccess,
  type ApiFailure,
} from "@/types/api";
import { generateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(body: ApiFailure) {
  return NextResponse.json(body, {
    status: HTTP_STATUS_BY_ERROR_CODE[body.error.code],
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(
      apiFailure("UNAUTHORIZED", "Sign in to generate content.")
    );
  }

  const limited = rateLimit(`generate:${user.id}`, 10, 60_000);
  if (!limited.success) {
    return fail(
      apiFailure(
        "RATE_LIMITED",
        "Too many generations. Wait a moment and try again."
      )
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(apiFailure("INVALID_INPUT", "Request body must be JSON."));
  }

  const parsed = generateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(
      apiFailure(
        "INVALID_INPUT",
        "The prompt is invalid.",
        parsed.error.flatten().fieldErrors
      )
    );
  }

  const { prompt, temperature } = parsed.data;

  // 0. Fail fast when the provider has no key: never touch the balance.
  let aiModel = "unknown";
  try {
    aiModel = getAiConfig().model;
  } catch (error) {
    if (error instanceof MissingEnvError) {
      return fail(apiFailure("CONFIGURATION_ERROR", error.message));
    }
    throw error;
  }

  // The id is generated up front so the reservation, the history row and the
  // refund all share the same `generation:<id>` reference (see fail_generation).
  const generationId = randomUUID();

  // 1. Reserve the credits atomically before calling the provider. Reserving
  //    first is what stops parallel requests from overdrawing the account; the
  //    reservation is returned by fail_generation() when the call fails.
  const { data: balance, error: chargeError } = await supabase.rpc(
    "consume_credits",
    {
      p_amount: CREDIT_COST_PER_GENERATION,
      p_description: prompt.slice(0, 120),
      p_metadata: {
        reference: `generation:${generationId}`,
        source: "api/generate",
      },
    }
  );

  if (chargeError) {
    // The schema is not applied yet: consume_credits() does not exist.
    if (
      chargeError.code === "PGRST202" ||
      /could not find the function/i.test(chargeError.message)
    ) {
      return fail(
        apiFailure(
          "CONFIGURATION_ERROR",
          "The database schema is incomplete: run supabase/setup.sql so that consume_credits() and fail_generation() exist."
        )
      );
    }

    if (chargeError.message.includes("insufficient_credits")) {
      return fail(
        apiFailure(
          "INSUFFICIENT_CREDITS",
          "You are out of credits. Upgrade your plan to keep generating."
        )
      );
    }

    return fail(
      apiFailure(
        "INTERNAL_ERROR",
        "Could not reserve credits for this request."
      )
    );
  }

  const credits = typeof balance === "number" ? balance : 0;

  // 2. Generate. Any failure records the attempt and refunds the reservation.
  try {
    const result = await generateCompletion({ prompt, temperature });

    const { error: historyError } = await supabase
      .from("generations")
      .insert({
        id: generationId,
        user_id: user.id,
        prompt,
        output: result.content,
        model: result.model,
        tokens_used: result.tokensUsed,
        credits_used: CREDIT_COST_PER_GENERATION,
        status: "succeeded",
      });

    if (historyError) {
      // The user already has the content; only the history row is missing.
      console.error(
        `[generate] could not store generation ${generationId}: ${historyError.message}`
      );
    }

    return NextResponse.json(
      apiSuccess({
        content: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
        creditsCharged: CREDIT_COST_PER_GENERATION,
        credits,
      })
    );
  } catch (error) {
    const isConfigError = error instanceof MissingEnvError;
    const message = isConfigError
      ? error.message
      : error instanceof AIProviderError
        ? error.message
        : "The generation failed unexpectedly.";

    await recordFailure({ generationId, prompt, model: aiModel, message });

    return isConfigError
      ? fail(apiFailure("CONFIGURATION_ERROR", message))
      : fail(apiFailure("PROVIDER_ERROR", message));
  }
}

/**
 * Records the failed attempt and refunds the reserved credit in one database
 * call, so the ledger can never keep a charge for a failure.
 *
 * `fail_generation()` uses the caller's own session — no service-role key
 * required — and is idempotent: the refund carries a `refund:<generation id>`
 * reference, which the unique index rejects on a second attempt.
 */
async function recordFailure(params: {
  generationId: string;
  prompt: string;
  model: string;
  message: string;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("fail_generation", {
    p_generation_id: params.generationId,
    p_prompt: params.prompt,
    p_model: params.model,
    p_error: params.message,
  });

  if (!error) {
    console.warn(
      `[generate] recorded the failure and refunded generation ${params.generationId}`
    );
    return;
  }

  // Database without migration 0006: fall back to the service role. Unlike the
  // previous version, every error here is inspected and reported: a swallowed
  // refund is exactly the bug this fixes.
  console.error(
    `[generate] fail_generation() failed for ${params.generationId}: ${error.message}. Trying the service role.`
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error(
      `[generate] CREDIT NOT REFUNDED for generation ${params.generationId}: no session.`
    );
    return;
  }

  const history = await supabase.from("generations").insert({
    id: params.generationId,
    user_id: user.id,
    prompt: params.prompt,
    model: params.model,
    credits_used: 0,
    status: "failed",
    error: params.message,
  });

  if (history.error) {
    console.error(
      `[generate] could not store the failed generation ${params.generationId}: ${history.error.message}`
    );
  }

  try {
    const admin = createAdminClient();
    const { error: refundError } = await admin.rpc("refund_credits", {
      p_user_id: user.id,
      p_amount: CREDIT_COST_PER_GENERATION,
      p_description: `Refund: generation ${params.generationId}`,
    });

    if (refundError) {
      console.error(
        `[generate] CREDIT NOT REFUNDED for generation ${params.generationId}: ${refundError.message}`
      );
      return;
    }

    console.warn(
      `[generate] refunded generation ${params.generationId} through the service role`
    );
  } catch (refundError) {
    console.error(
      `[generate] CREDIT NOT REFUNDED for generation ${params.generationId}: ${
        refundError instanceof Error ? refundError.message : String(refundError)
      }`
    );
  }
}
