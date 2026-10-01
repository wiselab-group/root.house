"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  inviteFamilyMemberAction,
  type InviteMemberFormState,
} from "@/actions/invitation.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { FamilyRole } from "@/domain/family/roles";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { CreatedLinkResult } from "./created-link-result";

const initialState: InviteMemberFormState = {};
const ROLE_OPTIONS: FamilyRole[] = ["editor", "contributor", "viewer", "owner"];
const DEFAULT_ROLE: FamilyRole = "viewer";

/**
 * Invite-by-email form, rendered inside the EditPanel opened by «Пригласить
 * участника» (FamilyMembersSection) — on success shows the invite link
 * (copyable) in the panel rather than closing it, since email delivery is best-effort (see
 * src/lib/email/send-invitation.ts) and the link is the guaranteed path.
 */
export function InviteMemberForm({ familyId }: { familyId: string }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const trd = useTranslations("roleDescriptions");
  const boundAction = inviteFamilyMemberAction.bind(null, familyId);
  const panel = useEditPanel();
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [role, setRole] = useState<FamilyRole>(DEFAULT_ROLE);

  if (state.inviteUrl)
    return (
      <CreatedLinkResult message={t("inviteCreated")} url={state.inviteUrl} />
    );

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className="flex min-h-full flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
          Email
        </Label>
        <Input id="invite-email" name="email" type="email" required />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="invite-role" className="text-xs text-muted-foreground">
          {t("role")}
        </Label>
        <NativeSelect
          id="invite-role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as FamilyRole)}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {tr(option)}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">{trd(role)}</p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <EditPanelFooter>
        <Button type="button" variant="ghost" onClick={panel?.requestClose}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("sending") : t("sendInvite")}
        </Button>
      </EditPanelFooter>
    </form>
  );
}
