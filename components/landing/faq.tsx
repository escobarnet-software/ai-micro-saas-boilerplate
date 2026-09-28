import { ChevronRight } from "lucide-react";

import { faqs } from "@/lib/site";

export function Faq() {
  return (
    <section id="faq" className="relative py-24 sm:py-28">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              FAQ
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
            <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground">
              Still curious? Every answer maps to real code in this repository.
            </p>
          </div>

          <div className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {faq.question}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
