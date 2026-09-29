import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for every `/dashboard/*` navigation. Without a loading boundary the
 * shell stays frozen on the previous page while the server renders, which is
 * what made the dashboard feel broken; this keeps the shell (and its CSS)
 * mounted and shows progress immediately.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Loading your workspace…
      </p>
    </div>
  );
}
