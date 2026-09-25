"use client";

import { useState, type ReactNode } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { CollapsibleFormCloseProvider } from "@/components/forms/collapsible-form";
import { ProfileSection } from "./profile-section";

const ACTION =
  "group flex shrink-0 cursor-pointer items-center gap-1 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * A ProfileSection whose «Добавить …» action sits on the heading row, right
 * where «Весь архив» / «Ещё» / «Открыть в дереве» sit elsewhere (user
 * request) — instead of a button under the list. Pressing it opens `form`
 * right under the heading. Without `form` (the viewer may not add), there's
 * no action at all.
 *
 * Two ways to close it again:
 * - a form with its own Cancel (story, event) closes through the same
 *   useCollapsibleFormClose hook CollapsibleForm provides, and is unmounted —
 *   reopening starts from a clean form;
 * - an upload panel (photos, documents) has no Cancel, so pass `closeLabel`:
 *   the heading action turns into «Закрыть» while open, and the panel stays
 *   mounted (just hidden) once opened, so closing it mid-upload doesn't drop
 *   the upload queue.
 */
export function ProfileSectionWithAdd({
  title,
  count,
  addLabel,
  closeLabel,
  form,
  children,
}: {
  title: string;
  count?: number;
  addLabel: string;
  closeLabel?: string;
  form?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const keepMounted = Boolean(closeLabel);

  const openForm = () => {
    setOpen(true);
    setEverOpened(true);
  };

  const action = !form ? null : !open ? (
    <button
      type="button"
      aria-expanded={false}
      onClick={openForm}
      className={`${ACTION} text-primary hover:text-primary/80`}
    >
      <PlusIcon
        className="size-3.5 transition-transform group-hover:rotate-90"
        aria-hidden="true"
      />
      {addLabel}
    </button>
  ) : (
    closeLabel && (
      <button
        type="button"
        aria-expanded
        onClick={() => setOpen(false)}
        className={`${ACTION} text-foreground/60 hover:text-foreground`}
      >
        <XIcon className="size-3.5" aria-hidden="true" />
        {closeLabel}
      </button>
    )
  );

  return (
    <ProfileSection title={title} count={count} action={action}>
      {(open || (keepMounted && everOpened)) && (
        <div hidden={!open}>
          <CollapsibleFormCloseProvider value={() => setOpen(false)}>
            {form}
          </CollapsibleFormCloseProvider>
        </div>
      )}
      {children}
    </ProfileSection>
  );
}
