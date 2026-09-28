"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/shared/brand-icons";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

export function OAuthButtons({ next }: { next: string }) {
  const [pending, setPending] = useState(false);

  async function signInWithGitHub() {
    setPending(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}${ROUTES.authCallback}?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });

      if (error) {
        toast.error("Could not start GitHub sign in", {
          description: error.message,
        });
        setPending(false);
      }
    } catch (error) {
      toast.error("Configuration error", {
        description:
          error instanceof Error
            ? error.message
            : "Check your Supabase environment variables.",
      });
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-border/80" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={signInWithGitHub}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <GitHubIcon className="size-4" />
        )}
        GitHub
      </Button>
    </div>
  );
}
