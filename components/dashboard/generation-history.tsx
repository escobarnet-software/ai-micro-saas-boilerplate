"use client";

import { useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, Trash, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteGenerationAction } from "@/lib/actions/generations";
import { formatDate } from "@/lib/utils";
import type { Generation } from "@/types/supabase";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard is unavailable in this browser.");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1.5 text-xs"
      aria-label={label}
      onClick={copy}
    >
      {copied ? (
        <Check className="size-3.5 text-[hsl(152_69%_50%)]" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteGenerationAction(id);
      if (result.ok) {
        toast.success("Generation deleted");
      } else {
        toast.error(result.message ?? "Something went wrong");
      }
    });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label="Delete generation"
      disabled={pending}
      onClick={remove}
    >
      {pending ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <Trash className="size-3.5" />
      )}
    </Button>
  );
}

export function GenerationHistory({
  generations,
}: {
  generations: Generation[];
}) {
  if (generations.length === 0) {
    return (
      <EmptyState
        icon={WandSparkles}
        title="No history yet"
        description="Your generated content will be stored here so you can reuse it later."
      />
    );
  }

  return (
    <div className="space-y-3">
      {generations.map((generation) => (
        <article
          key={generation.id}
          className="rounded-xl border border-border/80 bg-background/40 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Prompt
              </p>
              <p className="line-clamp-2 text-sm">{generation.prompt}</p>
            </div>
            <Badge
              variant={
                generation.status === "succeeded" ? "secondary" : "destructive"
              }
              className="shrink-0 rounded-md text-[10px]"
            >
              {generation.status}
            </Badge>
          </div>

          {generation.output ? (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border/80 bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground">
              {generation.output}
            </pre>
          ) : (
            <p className="mt-3 text-xs text-destructive">
              {generation.error ?? "This run did not produce output."}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] text-muted-foreground">
              {generation.model} · {generation.tokens_used} tokens ·{" "}
              {formatDate(generation.created_at)}
            </p>
            <div className="flex items-center gap-1">
              {generation.output ? (
                <CopyButton
                  value={generation.output}
                  label="Copy generated output"
                />
              ) : null}
              <DeleteButton id={generation.id} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
