"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeShareLinkAction } from "@/actions/share-link.actions";
import { Button } from "@/components/ui/button";

/**
 * Revoke-only control for an existing Share Link row — deliberately no
 * "Copy link" here: the plaintext token is never persisted (only its hash),
 * so it cannot be shown again once the creation response has been read —
 * only revoke-and-issue-a-new-one is possible for an already-listed row.
 */
export function ShareLinkRowActions({
  familyId,
  shareLinkId,
  disabled,
}: {
  familyId: string;
  shareLinkId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      await revokeShareLinkAction(familyId, shareLinkId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || isPending}
        onClick={handleRevoke}
      >
        Отозвать
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
