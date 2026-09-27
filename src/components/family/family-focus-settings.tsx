"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateDefaultFocusPersonAction } from "@/actions/family.actions";
import { PersonCombobox } from "@/components/tree/person-combobox";

/**
 * Per-user "which person does MY family tree open centered on" preference
 * (see family.service.ts::updateDefaultFocusPerson) — deliberately on the
 * shared Family Settings page (plan decision: one settings surface, not a
 * separate personal-preferences area) but scoped to the caller alone: any
 * member may set their own value regardless of role, and it never appears
 * to or affects any other member.
 */
export function FamilyFocusSettings({
  familyId,
  defaultFocusPerson,
}: {
  familyId: string;
  defaultFocusPerson: { id: string; name: string } | null;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [value, setValue] = useState(defaultFocusPerson);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: { id: string; name: string } | null) {
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await updateDefaultFocusPersonAction(
        familyId,
        next?.id ?? null,
      );
      if (!result.ok) {
        setError(result.error);
        // Roll back to the last known-saved value — an id that failed to
        // save (e.g. race with that Person being deleted) must not linger
        // in the field looking selected.
        setValue(defaultFocusPerson);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <PersonCombobox
        familyId={familyId}
        label={t("focusLabel")}
        value={value}
        onChange={handleChange}
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {isPending ? tc("saving") : error ? error : t("focusHint")}
      </p>
    </div>
  );
}
