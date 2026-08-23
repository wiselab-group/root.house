"use client";

import { useTransition } from "react";
import { signInWithGoogleAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";

/**
 * Google's official four-color "G" mark. Brand marks are exempt from the
 * var(--color-name)-only rule (CLAUDE.md) — those colors identify Google,
 * not this app's design system, and must render as-is regardless of theme.
 */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v3h3.86c2.26-2.08 3.57-5.14 3.57-8.82Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.28A7.19 7.19 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.29 5.37l3.98-3.09Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => startTransition(() => signInWithGoogleAction())}
    >
      <GoogleIcon />
      {isPending ? "Открываем Google…" : "Продолжить с Google"}
    </Button>
  );
}
