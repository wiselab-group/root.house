"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resendInvitationAction,
  revokeInvitationAction,
} from "@/actions/invitation.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Resend/revoke controls for one pending invitation row. Resend issues a
 * brand-new token (the old link stops working — see
 * invitation.service.ts::resendInvitation) and reveals it inline as a
 * copyable link, same as the initial invite form.
 */
export function InvitationRowActions({
  familyId,
  invitationId,
}: {
  familyId: string;
  invitationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleResend() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resendInvitationAction(familyId, invitationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNewInviteUrl(result.inviteUrl ?? null);
      router.refresh();
    });
  }

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      await revokeInvitationAction(familyId, invitationId);
      router.refresh();
    });
  }

  async function copyLink() {
    if (!newInviteUrl) return;
    await navigator.clipboard.writeText(newInviteUrl);
    setCopied(true);
  }

  if (newInviteUrl) {
    return (
      <div className="flex flex-1 items-center gap-2">
        <Input readOnly value={newInviteUrl} className="text-xs" />
        <Button type="button" size="sm" variant="outline" onClick={copyLink}>
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleResend}
        >
          Отправить снова
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={handleRevoke}
        >
          Отозвать
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
