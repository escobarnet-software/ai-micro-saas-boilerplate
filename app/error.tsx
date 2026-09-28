"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, LogOut, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

/**
 * Error boundary for every route below the root layout, including the
 * dashboard. It exists so a server-side failure (a missing table, a missing
 * environment variable, an unreachable database) surfaces as a readable screen
 * instead of an endless redirect between `/dashboard` and `/login`.
 *
 * In production Next.js hides server error messages, so the copy stays
 * actionable without leaking internals; the digest is enough to find the log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  async function handleSignOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // The session may already be gone; the hard navigation below is enough.
    }
    // Full navigation: it drops every cached RSC payload and stale cookie.
    window.location.assign(ROUTES.home);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade opacity-30"
      />

      <div className="w-full max-w-xl space-y-6 rounded-xl border border-border/80 bg-card/60 p-8 shadow-glow backdrop-blur-xl">
        <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            This page could not be loaded
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The server failed while rendering your workspace. Nothing was lost —
            fixing the cause below and retrying is usually enough.
          </p>
        </div>

        <ul className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          <li>
            The schema is applied: run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              supabase/setup.sql
            </code>{" "}
            in the Supabase SQL editor (idempotent, safe to run again).
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              .env.local
            </code>{" "}
            has the Supabase URL, anon key and (for the Stripe webhook) the
            service role key.
          </li>
          <li>
            Your account has a row in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              public.profiles
            </code>
            : the app creates it on the first dashboard visit through{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              bootstrap_profile()
            </code>
            .
          </li>
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground/80">
          The terminal running <span className="font-mono">npm run dev</span> logs
          the full stack trace and an <span className="font-mono">[auth] …</span>{" "}
          line with the database error.
        </p>

        {process.env.NODE_ENV !== "production" && error.message ? (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-[11px] leading-relaxed text-destructive">
            {error.message}
          </pre>
        ) : null}

        <p className="text-sm leading-relaxed text-muted-foreground">
          Full diagnosis:{" "}
          <Link
            href="/api/health"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            /api/health
          </Link>{" "}
          — it lists exactly which table, function or environment variable is
          missing.
        </p>

        {error.digest ? (
          <p className="font-mono text-[11px] text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" className="glow-primary" onClick={reset}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={ROUTES.home}>
              <Home className="size-4" />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
