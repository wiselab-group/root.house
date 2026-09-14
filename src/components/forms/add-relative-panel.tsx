"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleForm } from "./collapsible-form";
import { AddRelativeForm } from "./add-relative-form";
import type { PersonRecord } from "@/domain/person/person.service";

type RelativeKind = "parent" | "spouse" | "child";

const KIND_LABELS: Record<RelativeKind, { tab: string; submit: string }> = {
  parent: { tab: "Родитель", submit: "Добавить родителя" },
  spouse: { tab: "Супруг", submit: "Добавить супруга" },
  child: { tab: "Ребёнок", submit: "Добавить ребёнка" },
};

const KIND_ORDER: RelativeKind[] = ["parent", "spouse", "child"];

/**
 * Single "Добавить родственника" entry point for the Person Profile's
 * Семья section — replaces three side-by-side CollapsibleForm triggers
 * (one per relative kind), which used to sit in a `grid-cols-3` row.
 * Opening any one of those old forms kept it pinned to its own ⅓-width
 * column next to two still-collapsed trigger buttons, so the form's own
 * "Отмена" button had nowhere near enough room and spilled into the
 * neighboring card (the bug this replaces) — three parallel forms also
 * meant tripling the same mode-radio/select/name-fields UI for what is, to
 * the user, one action ("add a relative") with one choice inside it (which
 * kind). Now a single CollapsibleForm opens to the full section width, and
 * Tabs (the same primitive already used for ShareLinksTabs' status filter)
 * picks the kind — each tab keeps its own AddRelativeForm mounted
 * (TabsContent, not conditionally rendered) so switching tabs never
 * discards a half-filled form.
 */
export function AddRelativePanel({
  familyId,
  personId,
  candidates,
}: {
  familyId: string;
  personId: string;
  candidates: PersonRecord[];
}) {
  const [kind, setKind] = useState<RelativeKind>("parent");

  return (
    <CollapsibleForm triggerLabel="Добавить родственника">
      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <Tabs
          value={kind}
          onValueChange={(value) => setKind(value as RelativeKind)}
        >
          <TabsList className="w-full">
            {KIND_ORDER.map((k) => (
              <TabsTrigger key={k} value={k} className="flex-1">
                {KIND_LABELS[k].tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {KIND_ORDER.map((k) => (
            <TabsContent key={k} value={k} className="pt-3">
              <AddRelativeForm
                familyId={familyId}
                personId={personId}
                kind={k}
                candidates={candidates}
                submitLabel={KIND_LABELS[k].submit}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </CollapsibleForm>
  );
}
