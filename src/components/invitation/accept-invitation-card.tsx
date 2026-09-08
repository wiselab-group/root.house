"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
import { ROLE_LABELS } from "@/domain/family/role-labels";
import type { FamilyRole } from "@/domain/family/roles";

const initialState: AcceptInvitationFormState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Присоединяемся…" : "Принять приглашение"}
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
  const boundAction = acceptInvitationAction.bind(null, token);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <>
      <CardHeader>
        <CardTitle>Приглашение в семью «{familyName}»</CardTitle>
        <CardDescription>
          {inviterName || "Владелец семьи"} приглашает вас присоединиться в роли
          «{ROLE_LABELS[role]}».
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
