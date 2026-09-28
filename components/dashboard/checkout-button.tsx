"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";
import type { PaidPlanId } from "@/lib/plans";

interface CheckoutButtonProps {
  plan: PaidPlanId;
  label: string;
  featured?: boolean;
}

export function CheckoutButton({ plan, label, featured }: CheckoutButtonProps) {
  const [pending, setPending] = useState(false);

  async function startCheckout() {
    setPending(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const body = (await response.json()) as ApiResponse<{ url: string }>;

      if (!body.ok) {
        toast.error("Checkout unavailable", {
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
      variant={featured ? "default" : "outline"}
      className={featured ? "w-full glow-primary" : "w-full"}
      disabled={pending}
      onClick={startCheckout}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {label}
    </Button>
  );
}
