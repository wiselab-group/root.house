"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";
import {
  verifyShareLinkPasswordAction,
  type VerifyShareLinkPasswordFormState,
} from "@/actions/share-link-access.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: VerifyShareLinkPasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending ? "Проверяем…" : "Открыть"}
    </Button>
  );
}

/**
 * Password gate for a protected Share Link. On success, the server action
 * has already set the (HttpOnly, so unreadable here) proof cookie — a
 * router.refresh() re-runs app/share/[token]/page.tsx's server-side
 * resolveShareLinkAccess, which now finds the cookie and returns "granted".
 */
export function ShareLinkPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    verifyShareLinkPasswordAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1">
        <Label
          htmlFor="share-password"
          className="text-xs text-muted-foreground"
        >
          Пароль
        </Label>
        <PasswordInput id="share-password" name="password" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
