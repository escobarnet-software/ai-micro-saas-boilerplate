import type { IconType } from "@/lib/site";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card/40 p-5",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border/80 bg-background/60 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}
