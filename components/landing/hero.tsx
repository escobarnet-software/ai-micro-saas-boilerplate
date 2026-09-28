import Link from "next/link";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/site";

const proofPoints = ["Auth + RLS included", "Credit ledger", "Stripe webhooks"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-grid mask-fade opacity-60" />
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        <div className="absolute right-[12%] top-24 size-72 rounded-full bg-[hsl(188_94%_55%/0.18)] blur-[100px]" />
      </div>

      <div className="container flex flex-col items-center text-center">
        <Badge
          variant="outline"
          className="animate-fade-in gap-2 rounded-full border-border/80 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
        >
          <Sparkles className="size-3.5 text-primary" />
          Next.js 14 · Supabase · Stripe · OpenAI
        </Badge>

        <h1 className="mt-6 max-w-4xl animate-fade-up text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Ship your AI SaaS{" "}
          <span className="text-gradient">this weekend</span>
        </h1>

        <p className="mt-6 max-w-2xl animate-fade-up text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          {siteConfig.description}
        </p>

        <div className="mt-9 flex w-full animate-fade-up flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 w-full px-7 text-sm glow-primary sm:w-auto"
          >
            <Link href="/signup">
              Start building free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full border-border/80 px-7 text-sm sm:w-auto"
          >
            <Link href="#pricing">See pricing</Link>
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {proofPoints.map((point) => (
            <li key={point} className="inline-flex items-center gap-2">
              <Check className="size-3.5 text-primary" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-16 w-full max-w-5xl animate-fade-up">
          <div className="ring-gradient relative rounded-2xl border border-border/80 bg-card/60 p-2 shadow-glow-lg backdrop-blur-xl">
            <div className="rounded-xl border border-border/70 bg-background/80">
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-[hsl(45_93%_58%)]" />
                <span className="size-2.5 rounded-full bg-[hsl(152_69%_45%)]" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                  app.nebula.ai/dashboard
                </span>
              </div>
              <div className="grid gap-4 p-5 text-left sm:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">AI Generator</p>
                    <Badge
                      variant="secondary"
                      className="rounded-md font-mono text-[10px]"
                    >
                      1 credit / run
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    Write a launch tweet for an AI resume reviewer…
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-3 py-2 text-xs font-medium text-white">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Generating…
                  </div>
                  <div className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <WandSparkles className="size-3.5" />
                      Output
                    </span>
                    <div className="h-2 w-11/12 rounded-full bg-muted-foreground/25" />
                    <div className="h-2 w-9/12 rounded-full bg-muted-foreground/20" />
                    <div className="h-2 w-10/12 rounded-full bg-muted-foreground/15" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Credits left
                    </p>
                    <p className="mt-1 font-mono text-3xl font-semibold">
                      1,984
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-4/5 rounded-full bg-brand-gradient" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Generations
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold">128</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Plan
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold">
                        Starter
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
