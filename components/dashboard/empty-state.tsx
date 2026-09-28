import type { IconType } from "@/lib/site";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: IconType;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-card/20 px-6 py-14 text-center",
        className
      )}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/60 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
