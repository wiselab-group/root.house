"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PartnershipDateDialogContent } from "./partnership-date-dialog-content";
import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * Sets/edits an existing partnership's start date — the icon sits next to
 * PartnershipStatusToggle/RemoveRelationshipButton on the spouse pill.
 * Needed because many partnerships were created before add-relative-form.tsx
 * had a date field at all (or the date simply wasn't known at the time), and
 * there was previously no way to add it after the fact.
 */
export function PartnershipDateEditButton({
  familyId,
  personId,
  otherPersonId,
  relationshipId,
  startDate,
  relativeName,
}: {
  familyId: string;
  personId: string;
  otherPersonId: string;
  relationshipId: string;
  startDate?: PartialDate | null;
  relativeName: string;
}) {
  const [open, setOpen] = useState(false);
  const label = `Дата начала отношений с ${relativeName}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className="cursor-pointer rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
          />
        }
      >
        <CalendarIcon />
      </DialogTrigger>
      <PartnershipDateDialogContent
        familyId={familyId}
        personId={personId}
        otherPersonId={otherPersonId}
        relationshipId={relationshipId}
        startDate={startDate}
        label={label}
        onOpenChange={setOpen}
      />
    </Dialog>
  );
}
