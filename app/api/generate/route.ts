import { NextResponse, type NextRequest } from "next/server";

import { generateCompletion, AIProviderError } from "@/lib/ai/provider";
import { MissingEnvError } from "@/lib/env";
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

  // 1. Debit credits atomically before hitting the provider.
  const { data: balance, error: chargeError } = await supabase.rpc(
    "consume_credits",
    {
      p_amount: CREDIT_COST_PER_GENERATION,
      p_description: prompt.slice(0, 120),
    }
  );

  if (chargeError) {
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

  // 2. Generate, refunding the credits when the provider fails.
  try {
    const result = await generateCompletion({ prompt, temperature });

    await supabase.from("generations").insert({
      user_id: user.id,
      prompt,
      output: result.content,
      model: result.model,
      tokens_used: result.tokensUsed,
      credits_used: CREDIT_COST_PER_GENERATION,
      status: "succeeded",
    });

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
    if (error instanceof MissingEnvError) {
      await refund(user.id, "Configuration error");
      return fail(
        apiFailure("CONFIGURATION_ERROR", "The OpenAI key is not configured.")
      );
    }

    const message =
      error instanceof AIProviderError
        ? error.message
        : "The generation failed unexpectedly.";

    await supabase.from("generations").insert({
      user_id: user.id,
      prompt,
      model: "unknown",
      credits_used: 0,
      status: "failed",
      error: message,
    });

    await refund(user.id, `Refund: ${message}`);

    return fail(apiFailure("PROVIDER_ERROR", message));
  }
}

async function refund(userId: string, description: string) {
  try {
    const admin = createAdminClient();
    await admin.rpc("refund_credits", {
      p_user_id: userId,
      p_amount: CREDIT_COST_PER_GENERATION,
      p_description: description,
    });
  } catch {
    // The ledger entry is best effort: never mask the original error.
  }
}
