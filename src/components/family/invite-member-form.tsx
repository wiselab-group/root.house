"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  inviteFamilyMemberAction,
  type InviteMemberFormState,
} from "@/actions/invitation.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_DESCRIPTIONS } from "@/domain/family/role-labels";
import type { FamilyRole } from "@/domain/family/roles";

const initialState: InviteMemberFormState = {};
const ROLE_OPTIONS: FamilyRole[] = ["editor", "contributor", "viewer", "owner"];
const DEFAULT_ROLE: FamilyRole = "viewer";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Отправляем…" : "Отправить приглашение"}
    </Button>
  );
}

/**
 * Invite-by-email form — on success shows the invite link inline (copyable)
 * rather than navigating away, since email delivery is best-effort (see
 * src/lib/email/send-invitation.ts) and the link is the guaranteed path.
 */
export function InviteMemberForm({
  familyId,
  roleLabels,
}: {
  familyId: string;
  roleLabels: Record<FamilyRole, string>;
}) {
  const boundAction = inviteFamilyMemberAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<FamilyRole>(DEFAULT_ROLE);

  async function copyLink() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
  }

  if (state.inviteUrl) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-sm text-muted-foreground">
          Приглашение создано. Если письмо не дойдёт, отправьте эту ссылку
          вручную:
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly value={state.inviteUrl} className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Скопировано" : "Копировать"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label
            htmlFor="invite-email"
            className="text-xs text-muted-foreground"
          >
            Email
          </Label>
          <Input id="invite-email" name="email" type="email" required />
          {state.fieldErrors?.email && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.email}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="invite-role"
            className="text-xs text-muted-foreground"
          >
            Роль
          </Label>
          <NativeSelect
            id="invite-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as FamilyRole)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {roleLabels[option]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton />
      </div>
      <p className="max-w-md text-xs text-muted-foreground">
        {ROLE_DESCRIPTIONS[role]}
      </p>
      {state.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
