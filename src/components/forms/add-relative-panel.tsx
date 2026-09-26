"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
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
    <CollapsibleForm
      triggerLabel="Добавить родственника"
      renderTrigger={(open) => (
        // Same row shape as the relatives above it (RelativeListItem), so
        // «add» reads as the next item in the family list, not a form — and
        // the same width as one of them: half the row on sm+, minus half of
        // RelativeGroup's gap-2, so it lines up with the left column. On
        // touch screens (no hover) the hover look is the resting one — the
        // grey dashed slot alone read as an empty placeholder, not an action.
        <button
          type="button"
          aria-expanded={false}
          onClick={open}
          className="group/add flex w-full cursor-pointer items-center sm:w-[calc(50%-0.25rem)] gap-3.5 rounded-2xl border border-dashed border-foreground/20 p-2.5 text-left duration-200 ease-(--ease-reveal) hover:border-primary/60 hover:bg-primary/5 pointer-coarse:border-primary/60 pointer-coarse:bg-primary/5 active:scale-[0.98] transition-[background-color,border-color,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-glass text-foreground/60 transition-colors group-hover/add:text-primary pointer-coarse:text-primary">
            <PlusIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.95rem] font-medium">
              Добавить родственника
            </span>
            <span className="text-sm text-muted-foreground">
              родителя, супруга или ребёнка
            </span>
          </span>
        </button>
      )}
    >
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
