"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  updateMarriageAction,
  type UpdateMarriageFormState,
} from "@/actions/relationship.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";
import { PersonDateFields } from "./person-date-fields";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import type { PartialDate } from "@/domain/shared/partial-date";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";

const initialState: UpdateMarriageFormState = {};

function SubmitButton({ pending }: { pending: boolean }) {
  const tc = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? tc("saving") : tc("save")}
    </Button>
  );
}

/**
 * The «Свадьба» card's edit form on a Person's Линия жизни, inside an
 * EditPanel: the wedding date, whether the marriage is still ongoing and,
 * once it isn't, when it ended — everything about the marriage itself that
 * can be edited here (the spouse is the relationship, changed from «Семья»).
 * The end-date fields unmount while «Брак продолжается» is on, so a stale
 * end date can't be submitted for an ongoing marriage (the action clears
 * it too).
 */
export function MarriageEditForm({
  familyId,
  personId,
  otherPersonId,
  relationshipId,
  startDate,
  endDate,
  isCurrent,
  status,
}: {
  familyId: string;
  personId: string;
  otherPersonId: string;
  relationshipId: string;
  startDate: PartialDate | null;
  endDate: PartialDate | null;
  isCurrent: boolean;
  status: PartnershipRecord["status"];
}) {
  const t = useTranslations("timeline");
  const tr = useTranslations("relationships");
  const tc = useTranslations("common");
  const panel = useEditPanel();
  const boundAction = updateMarriageAction.bind(
    null,
    familyId,
    personId,
    otherPersonId,
    relationshipId,
  );
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [ongoing, setOngoing] = useState(isCurrent);

  const closeAfterSave = panel?.closeAfterSave;
  useEffect(() => {
    if (state.saved) closeAfterSave?.();
  }, [state, closeAfterSave]);

  return (
    <form
      // Not `action`: see submitWithoutReset — a validation error (e.g.
      // divorce before the wedding) must not throw the typed dates away.
      onSubmit={submitWithoutReset(formAction)}
      className="flex min-h-full flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        {/* Keyed on the saved date: the panel stays mounted through its
            exit animation while revalidation flows the new startDate in,
            and Base UI warns when an uncontrolled field's default changes —
            same fix as PartnershipDateDialogContent. */}
        <PersonDateFields
          key={JSON.stringify(startDate)}
          prefix="startDate"
          legend={t("weddingDate")}
          date={startDate}
        />
        <p className="text-sm text-muted-foreground">{tr("dateHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          {/* Sent from state, not the Switch's own hidden input, so what's
              saved is always exactly what the switch shows. */}
          <input type="hidden" name="isCurrent" value={ongoing ? "on" : ""} />
          <Switch
            id="isCurrent"
            size="lg"
            checked={ongoing}
            onCheckedChange={setOngoing}
          />
          <Label
            htmlFor="isCurrent"
            className="cursor-pointer text-sm font-normal"
          >
            {t("marriageOngoing")}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("marriageOngoingHint")}
        </p>
      </div>

      {!ongoing && (
        <PersonDateFields
          key={JSON.stringify(endDate)}
          prefix="endDate"
          // «Развод» is what switching off records; an ending already
          // recorded as widowhood/separation keeps a neutral label.
          legend={
            status === "widowed" || status === "separated"
              ? t("marriageEndDate")
              : t("divorceDate")
          }
          date={endDate}
        />
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {panel && (
        <EditPanelFooter>
          <Button type="button" variant="ghost" onClick={panel.requestClose}>
            {tc("cancel")}
          </Button>
          <SubmitButton pending={pending} />
        </EditPanelFooter>
      )}
    </form>
  );
}
