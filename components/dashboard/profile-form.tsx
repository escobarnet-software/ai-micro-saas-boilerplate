"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CircleCheckBig, CircleAlert, LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

const initialState: ProfileActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="glow-primary">
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      Save changes
    </Button>
  );
}

interface ProfileFormProps {
  fullName: string;
  email: string;
}

export function ProfileForm({ fullName, email }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          placeholder="Ada Lovelace"
          className="h-11 max-w-md bg-background/60"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        {state.fieldErrors?.fullName ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.fullName[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          value={email}
          readOnly
          disabled
          className="h-11 max-w-md bg-background/60"
        />
        <p className="text-xs text-muted-foreground">
          Email addresses are managed by Supabase Auth.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.status !== "idle" && state.message ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              state.status === "success"
                ? "text-[hsl(152_69%_50%)]"
                : "text-destructive"
            )}
          >
            {state.status === "success" ? (
              <CircleCheckBig className="size-3.5" />
            ) : (
              <CircleAlert className="size-3.5" />
            )}
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
