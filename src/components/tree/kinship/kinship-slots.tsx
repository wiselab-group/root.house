"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowUpDownIcon, MousePointerClickIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personDisplayName } from "@/domain/person/display-name";
import type { TreePersonClientPayload } from "@/domain/tree/tree-adapter";
import { PersonCombobox } from "../person-combobox";
import type { TraceSlot } from "./use-kinship-trace";

/**
 * The two people being compared: a search field each (same PersonCombobox
 * the old dialog used), a swap button between them, and — while a slot is
 * empty — a hint that a card on the tree can be clicked instead of typing.
 */
export function KinshipSlots({
  familyId,
  personA,
  personB,
  pickSlot,
  onSelect,
  onSwap,
}: {
  familyId: string;
  personA: TreePersonClientPayload | null;
  personB: TreePersonClientPayload | null;
  pickSlot: TraceSlot | null;
  onSelect: (slot: TraceSlot, personId: string | null) => void;
  onSwap: () => void;
}) {
  const t = useTranslations("kinship");
  const locale = useLocale();
  const asValue = (person: TreePersonClientPayload | null) =>
    person ? { id: person.id, name: personDisplayName(person, locale) } : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <PersonCombobox
            familyId={familyId}
            label={t("first")}
            value={asValue(personA)}
            onChange={(person) => onSelect("traceA", person?.id ?? null)}
            excludeId={personB?.id}
          />
          <PersonCombobox
            familyId={familyId}
            label={t("second")}
            value={asValue(personB)}
            onChange={(person) => onSelect("traceB", person?.id ?? null)}
            excludeId={personA?.id}
          />
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="mt-7"
          aria-label={t("swap")}
          disabled={!personA && !personB}
          onClick={onSwap}
        >
          <ArrowUpDownIcon className="fill-none!" />
        </Button>
      </div>
      {pickSlot && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <MousePointerClickIcon className="size-3.5 shrink-0 fill-none! text-primary" />
          {t("pickHint", { slot: pickSlot === "traceA" ? "first" : "second" })}
        </p>
      )}
    </div>
  );
}
