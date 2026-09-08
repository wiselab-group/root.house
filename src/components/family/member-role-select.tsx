"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRoleAction } from "@/actions/family.actions";
import { ROLE_LABELS } from "@/domain/family/role-labels";
import type { FamilyRole } from "@/domain/family/roles";

const ROLE_OPTIONS: FamilyRole[] = ["owner", "editor", "contributor", "viewer"];

/**
 * Role <select> for one member row — owner-only surface (rendered only
 * inside FamilySettingsPage's isOwner branch); re-checked server-side in
 * updateMemberRoleAction regardless. `disabled` covers the "would demote
 * the last remaining owner" case — the server also refuses this
 * (family.repository.ts::updateMemberRole), this is just the UX backstop.
 */
export function MemberRoleSelect({
  familyId,
  memberUserId,
  role,
  disabled,
}: {
  familyId: string;
  memberUserId: string;
  role: FamilyRole;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newRole: FamilyRole) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction(
        familyId,
        memberUserId,
        newRole,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        disabled={disabled || isPending}
        onChange={(e) => handleChange(e.target.value as FamilyRole)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Роль участника"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
