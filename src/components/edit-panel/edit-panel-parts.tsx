"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** EditPanel's top row: the phone sheet's grab handle, the dialog's
 *  accessible title (with an optional leading slot, e.g. the avatar
 *  editor) and ✕, which goes through EditPanel's unsaved-changes check. */
export function EditPanelHeader({
  title,
  leading,
}: {
  title: string;
  leading?: React.ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <header className="flex shrink-0 flex-col px-5 pt-2 sm:pt-5">
      <span
        aria-hidden="true"
        className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/20 sm:hidden"
      />
      <div className="flex items-center gap-4">
        {leading}
        <DialogPrimitive.Title className="min-w-0 flex-1 font-heading text-heading font-normal tracking-tight text-balance">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label={tc("close")}
        >
          <XIcon />
        </DialogPrimitive.Close>
      </div>
    </header>
  );
}

/** A form's submit/cancel row inside the panel, pinned to the scroll
 *  area's bottom edge (the form itself gets min-h-full so it sits at the
 *  bottom even when the form is short). */
export function EditPanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-auto flex items-center justify-end gap-3 border-t border-border bg-popover px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

/** The panel's scrolling area. Forms inside pin their action row to its
 *  bottom edge (see PersonForm's in-panel actions) so «Сохранить» stays in
 *  reach — at the thumb on the phone sheet. */
export function EditPanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
