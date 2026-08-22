"use client";

import { useTransition } from "react";
import { signOutAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => startTransition(() => signOutAction())}
    >
      {isPending ? "Выходим…" : "Выйти"}
    </Button>
  );
}
