"use client";

import { useTransition } from "react";
import { LoaderCircle, LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        startTransition(() => {
          void signOutAction();
        });
      }}
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      Sign out
    </DropdownMenuItem>
  );
}
