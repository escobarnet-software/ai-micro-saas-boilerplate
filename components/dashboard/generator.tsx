"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  LoaderCircle,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CREDIT_COST_PER_GENERATION, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

interface GeneratePayload {
  content: string;
  model: string;
  tokensUsed: number;
  creditsCharged: number;
  credits: number;
}

const EXAMPLE_PROMPTS = [
  "Write a launch tweet thread for an AI resume reviewer.",
  "Draft a cold email to indie hackers about our API.",
  "Summarise this product idea into 5 bullet points for investors.",
];

export function Generator({ credits }: { credits: number }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [output, setOutput] = useState<GeneratePayload | null>(null);
  const [copied, setCopied] = useState(false);

  const outOfCredits = credits < CREDIT_COST_PER_GENERATION;
  const canSubmit = prompt.trim().length >= 3 && !pending && !outOfCredits;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        // Slightly above the server's AI_TIMEOUT_MS (45s) so the request always
        // resolves: without it the button could wait forever on a hung call.
        signal: AbortSignal.timeout(60_000),
      });

      const body = (await response.json()) as ApiResponse<GeneratePayload>;

      if (!body.ok) {
        if (body.error.code === "INSUFFICIENT_CREDITS") {
          toast.error("Out of credits", {
            description: body.error.message,
            action: {
              label: "Upgrade",
              onClick: () => router.push(ROUTES.billing),
            },
          });
        } else {
          toast.error("Generation failed", { description: body.error.message });
        }
        return;
      }

      setOutput(body.data);
      toast.success("Generation complete", {
        description: `${body.data.creditsCharged} credit charged · ${body.data.credits} left`,
      });
      router.refresh();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";

      toast.error(timedOut ? "Generation timed out" : "Network error", {
        description: timedOut
          ? "The provider took longer than 60s. Your credit is refunded automatically — check /api/health."
          : error instanceof Error
            ? error.message
            : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard is unavailable in this browser.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
      <Card className="bg-card/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <WandSparkles className="size-4 text-primary" />
            Prompt
          </CardTitle>
          <Badge variant="secondary" className="rounded-md font-mono text-[10px]">
            {CREDIT_COST_PER_GENERATION} credit / run
          </Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe what you want to generate…"
              maxLength={4000}
              rows={8}
              className="resize-y bg-background/60 text-sm"
            />

            <div className="flex flex-wrap items-center gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full border border-border/80 bg-background/40 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example.slice(0, 34)}…
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "font-mono text-[11px]",
                  prompt.length > 3800
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {prompt.length}/4000
              </span>

              <Button type="submit" disabled={!canSubmit} className="glow-primary">
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {pending ? "Generating…" : "Generate"}
              </Button>
            </div>

            {outOfCredits ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                You are out of credits.{" "}
                <Link href={ROUTES.billing} className="underline">
                  Upgrade your plan
                </Link>{" "}
                to keep generating.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
      <Card className="bg-card/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Output</CardTitle>
          {output ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={copyOutput}
            >
              {copied ? (
                <Check className="size-3.5 text-[hsl(152_69%_50%)]" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {pending && !output ? (
            <div className="space-y-3">
              {[92, 78, 85, 60].map((width) => (
                <div
                  key={width}
                  className="h-3 animate-pulse rounded-full bg-muted-foreground/20"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          ) : output ? (
            <div className="space-y-4">
              <pre className="max-h-[26rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border/80 bg-background/60 p-4 text-sm leading-relaxed">
                {output.content}
              </pre>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-muted-foreground">
                <span>{output.model}</span>
                <span>{output.tokensUsed} tokens</span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="size-3 text-primary" />
                  {output.credits} credits left
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 bg-background/30 px-6 py-16 text-center">
              <span className="inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/60 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">Your output appears here</p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  One credit is charged per run and refunded automatically if the
                  provider fails.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
