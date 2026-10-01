"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { DiscardChangesPrompt } from "./discard-changes-prompt";

interface EditPanelApi {
  /** Close as the user asked (✕, Esc, backdrop, «Отмена») — asks first when
   *  the form has unsaved input. */
  requestClose: () => void;
  /** Close without asking — the form just saved, nothing is left to lose. */
  closeAfterSave: () => void;
  /** The form's input is saved but the panel stays open (e.g. showing the
   *  result) — closing it shouldn't ask about unsaved changes any more. */
  markClean: () => void;
}

const EditPanelContext = createContext<EditPanelApi | null>(null);

/** The surrounding EditPanel, or null when the form renders as its own page
 *  (a hard load of /…/edit — see the route's @modal slot). */
export function useEditPanel() {
  return useContext(EditPanelContext);
}

/**
 * Edit form presented over the page it edits (user's pick 2026-09-27,
 * variants A/C of the editing mock): a panel sliding in from the right on
 * `sm+`, a bottom sheet on phones. Rendered only by an intercepted
 * `@modal/(.)edit` route, so the URL is still `/…/edit` — a refresh or a
 * shared link opens the plain edit page instead, and browser Back closes it.
 *
 * Closing animates out first and only then pops the history entry
 * (onOpenChangeComplete → router.back()), so the exit transition isn't cut
 * off by the route unmounting the panel.
 *
 * Without a route of its own (an edit opened in place, e.g. an event from
 * the profile's Линия жизни), pass `onClosed`: it replaces router.back() and
 * the owner unmounts the panel there. On a hard load of /…/edit there's no
 * in-app entry to go back to (Back would leave the site), so the page passes
 * `closeHref` and closing replaces the URL with it instead.
 */
export function EditPanel({
  children,
  onClosed,
  closeHref,
}: {
  children: React.ReactNode;
  onClosed?: () => void;
  closeHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const api = useMemo<EditPanelApi>(
    () => ({
      requestClose: () => (dirty ? setConfirming(true) : setOpen(false)),
      closeAfterSave: () => setOpen(false),
      markClean: () => setDirty(false),
    }),
    [dirty],
  );

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) api.requestClose();
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return;
        if (onClosed) onClosed();
        else if (closeHref) router.replace(closeHref, { scroll: false });
        else router.back();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background/55 transition-opacity duration-reveal ease-(--ease-reveal) supports-backdrop-filter:backdrop-blur-[2px] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          ref={popupRef}
          // Focus the panel itself, not its first control: that was the
          // portrait drop zone, lit with the terracotta focus ring as if
          // selected — and on the phone sheet a first input would pop the
          // keyboard over the form. Screen readers still land in the dialog.
          initialFocus={popupRef}
          onInput={() => setDirty(true)}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[92svh] flex-col overflow-hidden rounded-t-3xl border-t border-glass-edge bg-popover text-popover-foreground shadow-2xl outline-none transition-transform duration-reveal ease-(--ease-reveal) will-change-transform data-ending-style:translate-y-full data-starting-style:translate-y-full motion-reduce:transition-opacity motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:opacity-0 sm:inset-y-2 sm:right-2 sm:left-auto sm:h-auto sm:w-[min(30rem,calc(100vw-1rem))] sm:rounded-2xl sm:border sm:data-ending-style:translate-x-[calc(100%+1rem)] sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-x-[calc(100%+1rem)] sm:data-starting-style:translate-y-0 sm:motion-reduce:data-ending-style:translate-x-0 sm:motion-reduce:data-starting-style:translate-x-0"
        >
          <EditPanelContext.Provider value={api}>
            {children}
          </EditPanelContext.Provider>
          {confirming && (
            <DiscardChangesPrompt
              onKeep={() => setConfirming(false)}
              onDiscard={() => {
                setConfirming(false);
                setOpen(false);
              }}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
