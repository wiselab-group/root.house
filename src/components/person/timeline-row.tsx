"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditEventForm } from "@/components/forms/edit-event-form";
import type { TimelineRowTarget } from "./timeline-target";

const ROW_CLASSNAME =
  "flex cursor-pointer flex-col gap-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Renders one timeline row's clickable surface — a Dialog trigger opening
 * the in-place edit form for a real Event, a Link (the event's details
 * page, or where a synthetic Рождение/Смерть/Свадьба row's record is
 * edited — see timelineRowTargetFor), or plain unwrapped content when
 * there's nothing to do at all (no edit rights on a synthetic row).
 * `isInteractive` (person-timeline.tsx/timeline-list-item.tsx) tells the
 * parent <li> whether to arm the group-hover terracotta ring on the
 * timeline dot — a non-interactive row must never look hoverable.
 */
export function TimelineRow({
  target,
  children,
  className = ROW_CLASSNAME,
}: {
  target: TimelineRowTarget;
  children: ReactNode;
  /** Replaces the list-row styling — the Линия жизни card renders its
   *  action as a pill with the same dialogs behind it. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (target.kind === "link") {
    // A same-page anchor («#family») stays a plain <a>: the browser's own
    // hashchange is what switches ProfileTabs to the panel holding it.
    return target.href.startsWith("#") ? (
      <a href={target.href} className={className}>
        {children}
      </a>
    ) : (
      <Link href={target.href} className={className}>
        {children}
      </Link>
    );
  }

  if (target.kind === "event-edit-dialog") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<button type="button" className={className} />}>
          {children}
        </DialogTrigger>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать событие</DialogTitle>
          </DialogHeader>
          <EditEventForm
            familyId={target.familyId}
            event={target.event}
            participants={target.participants}
            places={target.places}
            onCancel={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return <div className="flex flex-col gap-0.5">{children}</div>;
}
