"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { EditEventForm } from "@/components/forms/edit-event-form";
import { EditPanel } from "@/components/edit-panel/edit-panel";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";
import type { TimelineRowTarget } from "./timeline-target";

const ROW_CLASSNAME =
  "flex cursor-pointer flex-col gap-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Renders one timeline row's clickable surface — a button opening the
 * in-place EditPanel for a real Event, a Link (the event's details
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
  const t = useTranslations("timeline");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    // The same EditPanel as the event page's own «Редактировать», opened in
    // place (no route of its own): mounted only while open, unmounted by
    // onClosed once its exit animation ends, focus back on the row.
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
            <EditPanelHeader title={t("editEvent")} />
            <EditPanelBody>
              <EditEventForm
                familyId={target.familyId}
                event={target.event}
                participants={target.participants}
                places={target.places}
              />
            </EditPanelBody>
          </EditPanel>
        )}
      </>
    );
  }

  return <div className="flex flex-col gap-0.5">{children}</div>;
}
