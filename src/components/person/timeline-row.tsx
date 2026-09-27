"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { EditEventForm } from "@/components/forms/edit-event-form";
import { MarriageEditForm } from "@/components/forms/marriage-edit-form";
import { EditPanel } from "@/components/edit-panel/edit-panel";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";
import type { TimelineRowTarget } from "./timeline-target";

const ROW_CLASSNAME =
  "flex cursor-pointer flex-col gap-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * A row/action button that opens an EditPanel in place (no route of its
 * own): the panel is mounted only while open, unmounted by onClosed once
 * its exit animation ends, and focus goes back to the button.
 */
function InPlaceEdit({
  title,
  className,
  children,
  form,
}: {
  title: string;
  className: string;
  children: ReactNode;
  form: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <EditPanel
          onClosed={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          <EditPanelHeader title={title} />
          <EditPanelBody>{form}</EditPanelBody>
        </EditPanel>
      )}
    </>
  );
}

/**
 * Renders one timeline row's clickable surface — a button opening an
 * in-place EditPanel (a real Event's form, or the synthetic «Свадьба»'s
 * date/status form), a Link (the event's details page, or where a
 * synthetic Рождение/Смерть row's record is edited — see
 * timelineRowTargetFor), or plain unwrapped content when there's nothing
 * to do at all (no edit rights on a synthetic row).
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
   *  action as a pill with the same panels behind it. */
  className?: string;
}) {
  const t = useTranslations("timeline");

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
      <InPlaceEdit
        title={t("editEvent")}
        className={className}
        form={
          <EditEventForm
            familyId={target.familyId}
            event={target.event}
            participants={target.participants}
            places={target.places}
          />
        }
      >
        {children}
      </InPlaceEdit>
    );
  }

  if (target.kind === "marriage-edit") {
    return (
      <InPlaceEdit
        title={t("weddingTitle")}
        className={className}
        form={
          <MarriageEditForm
            familyId={target.familyId}
            personId={target.personId}
            otherPersonId={target.otherPersonId}
            relationshipId={target.relationshipId}
            startDate={target.startDate}
            endDate={target.endDate}
            isCurrent={target.isCurrent}
            status={target.status}
          />
        }
      >
        {children}
      </InPlaceEdit>
    );
  }

  return <div className="flex flex-col gap-0.5">{children}</div>;
}
