"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonCombobox } from "./person-combobox";

/**
 * Relationship Trace panel (plan §17): both slots — Person A, Person B —
 * are shown at once, each an inline search-as-you-type combobox (input +
 * results list in one control, no separate picker dialog), rather than one
 * shared trigger that only reveals whichever slot happens to be empty. This
 * component owns none of the trace state itself (personA/B, the outcome
 * label) — it's purely presentational, same split as TreeFilterPanel.
 *
 * Picking either slot already writes ?traceA=/?traceB= to the URL and
 * re-renders the highlighted path immediately — the "Показать" button in
 * the footer doesn't trigger that computation, it just closes the panel
 * once both slots are filled, so the reveal reads as a deliberate final
 * step instead of the modal silently sitting in front of an already-updated
 * tree until the user thinks to hit the × themselves. "Сбросить" is the
 * button-form counterpart to that: clearing a single slot is already
 * possible via that combobox's own × (Combobox.Clear), but clearing BOTH
 * at once needs an explicit control next to "Показать" rather than two
 * separate clicks — and closes the panel too, same as "Показать", since
 * there's nothing left to review once both slots are empty.
 */
export function TreeTracePanel({
  open,
  onOpenChange,
  familyId,
  traceA,
  traceB,
  traceLabel,
  onSelectSlot,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  traceA: { id: string; name: string } | null;
  traceB: { id: string; name: string } | null;
  traceLabel: string | null;
  onSelectSlot: (slot: "traceA" | "traceB", person: { id: string; name: string } | null) => void;
  onReset: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Сравнить родство</DialogTitle>
          <DialogDescription>Выберите двух людей, чтобы увидеть, как они связаны, и подсветить путь на дереве.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <PersonCombobox
            familyId={familyId}
            label="Человек A"
            value={traceA}
            onChange={(person) => onSelectSlot("traceA", person)}
            excludeId={traceB?.id}
          />
          <PersonCombobox
            familyId={familyId}
            label="Человек B"
            value={traceB}
            onChange={(person) => onSelectSlot("traceB", person)}
            excludeId={traceA?.id}
          />
        </div>

        {traceLabel && (
          <Badge variant="secondary" className="w-fit">
            {traceLabel}
          </Badge>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={!traceA && !traceB}
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            Сбросить
          </Button>
          <Button disabled={!traceA || !traceB} onClick={() => onOpenChange(false)}>
            Показать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
