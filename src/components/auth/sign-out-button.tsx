"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("common");
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
      {isPending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
