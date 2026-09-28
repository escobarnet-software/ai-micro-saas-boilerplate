import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="relative pb-28">
      <div className="container">
        <div className="ring-gradient relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 px-8 py-14 text-center sm:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <Terminal className="size-3.5 text-primary" />
              npm run dev
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your AI micro-SaaS is one clone away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
              Create an account, plug in your keys and start charging for
              generations today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full px-7 text-sm glow-primary sm:w-auto"
              >
                <Link href="/signup">
                  Create free account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 w-full px-7 text-sm sm:w-auto"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
