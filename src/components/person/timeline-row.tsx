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
import { PartnershipDateDialogContent } from "@/components/forms/partnership-date-dialog-content";
import { PersonDateDialogContent } from "@/components/forms/person-date-dialog-content";
import { EditEventForm } from "@/components/forms/edit-event-form";
import type { TimelineRowTarget } from "./timeline-target";

const ROW_CLASSNAME =
  "flex cursor-pointer flex-col gap-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Renders one timeline row's clickable surface — a Dialog trigger opening
 * the same in-place edit form for a real Event or the narrow date-only
 * dialog for a synthetic Рождение/Смерть/Свадьба row (see
 * PersonTimeline's timelineRowTargetFor), a plain Link when this member
 * can view but not edit a real event (falls back to the read-only details
 * page), or plain unwrapped content when there's nothing to do at all (no
 * edit rights on a synthetic row, or an unresolvable partnership).
 * `isInteractive` (person-timeline.tsx/timeline-list-item.tsx) tells the
 * parent <li> whether to arm the group-hover terracotta ring on the
 * timeline dot — a non-interactive row must never look hoverable.
 */
export function TimelineRow({
  target,
  children,
}: {
  target: TimelineRowTarget;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (target.kind === "link") {
    return (
      <Link href={target.href} className={ROW_CLASSNAME}>
        {children}
      </Link>
    );
  }

  if (target.kind === "marriage-dialog") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<button type="button" className={ROW_CLASSNAME} />}
        >
          {children}
        </DialogTrigger>
        <PartnershipDateDialogContent
          familyId={target.familyId}
          personId={target.personId}
          otherPersonId={target.otherPersonId}
          relationshipId={target.relationshipId}
          startDate={target.startDate}
          label={`Дата свадьбы с ${target.otherPersonName}`}
          onOpenChange={setOpen}
        />
      </Dialog>
    );
  }

  if (target.kind === "person-date-dialog") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<button type="button" className={ROW_CLASSNAME} />}
        >
          {children}
        </DialogTrigger>
        <PersonDateDialogContent
          familyId={target.familyId}
          personId={target.personId}
          field={target.field}
          date={target.date}
          label={target.label}
          onOpenChange={setOpen}
        />
      </Dialog>
    );
  }

  if (target.kind === "event-edit-dialog") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<button type="button" className={ROW_CLASSNAME} />}
        >
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
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
