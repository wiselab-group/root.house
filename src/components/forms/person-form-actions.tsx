"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";

function SubmitButton({
  label,
  pendingLabel,
  pending,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
}) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** PersonForm's submit/cancel row — a plain row on the standalone page, a
 *  footer pinned to the scroll edge inside the EditPanel. */
export function PersonFormActions({
  submitLabel,
  submitPendingLabel,
  cancelHref,
  pending,
}: {
  submitLabel: string;
  submitPendingLabel: string;
  cancelHref?: string;
  /** From PersonForm's useActionState — the form submits via
   *  submitWithoutReset, which useFormStatus doesn't see. */
  pending: boolean;
}) {
  const tc = useTranslations("common");
  const panel = useEditPanel();
  const submit = (
    <SubmitButton
      label={submitLabel}
      pendingLabel={submitPendingLabel}
      pending={pending}
    />
  );

  if (panel) {
    // «Отмена» closes the panel (asking first if there are edits) instead
    // of navigating; the hidden field tells updatePersonAction to return
    // instead of redirecting.
    return (
      <EditPanelFooter>
        <input type="hidden" name="presentation" value="panel" />
        <Button type="button" variant="ghost" onClick={panel.requestClose}>
          {tc("cancel")}
        </Button>
        {submit}
      </EditPanelFooter>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {submit}
      {cancelHref && (
        <LinkButton href={cancelHref} variant="ghost">
          {tc("cancel")}
        </LinkButton>
      )}
    </div>
  );
}
