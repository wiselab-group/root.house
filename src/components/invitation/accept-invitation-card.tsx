"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  acceptInvitationAction,
  type AcceptInvitationFormState,
} from "@/actions/invitation.actions";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FamilyRole } from "@/domain/family/roles";

const initialState: AcceptInvitationFormState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("invite");
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? t("accepting") : t("accept")}
    </Button>
  );
}

/**
 * Explicit-confirm accept screen — never auto-accepts on page load (this is
 * a state-changing action, so a bare GET must not trigger it). Shown only
 * once the visitor is logged in and the invitation is confirmed pending
 * (see InvitePage's branching). On success, acceptInvitationAction redirects
 * server-side (next/navigation's redirect()) — no client-side router.push
 * needed, and no race against InvitePage's own re-render after the action
 * commits (see acceptInvitationAction's doc comment for why that race
 * mattered with the previous client-redirect approach).
 */
export function AcceptInvitationCard({
  token,
  familyName,
  role,
  inviterName,
}: {
  token: string;
  familyName: string;
  role: FamilyRole;
  inviterName: string;
}) {
  const t = useTranslations("invite");
  const tr = useTranslations("roles");
  const boundAction = acceptInvitationAction.bind(null, token);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <>
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          {t("heading", { family: familyName })}
        </CardTitle>
        <CardDescription>
          {t("body", {
            inviter: inviterName || t("familyOwner"),
            role: tr(role),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={formAction}>
          <ConfirmButton />
        </form>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </CardContent>
    </>
  );
}
