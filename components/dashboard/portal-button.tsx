"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";

export function PortalButton() {
  const [pending, setPending] = useState(false);

  async function openPortal() {
    setPending(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await response.json()) as ApiResponse<{ url: string }>;

      if (!body.ok) {
        toast.error("Billing portal unavailable", {
          description: body.error.message,
        });
        return;
      }

      window.location.href = body.data.url;
    } catch (error) {
      toast.error("Could not reach Stripe", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={openPortal}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ExternalLink className="size-4" />
      )}
      Manage subscription
    </Button>
  );
}
