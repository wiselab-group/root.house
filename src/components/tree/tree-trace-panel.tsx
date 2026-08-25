"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Picker = "traceA" | "traceB" | null;

/**
 * Relationship Trace panel (plan §17): both slots — Person A, Person B —
 * are shown at once, each independently pickable and independently
 * clearable, rather than one shared trigger that only reveals whichever
 * slot happens to be empty. Opened from TreeToolbar's floating trace
 * button; this component owns none of the trace state itself (personA/B,
 * the outcome label) — it's purely presentational, same split as
 * TreeFilterPanel/PersonPickerDialog.
 */
export function TreeTracePanel({
  open,
  onOpenChange,
  traceA,
  traceB,
  traceLabel,
  onOpenPicker,
  onClearSlot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traceA: { id: string; name: string } | null;
  traceB: { id: string; name: string } | null;
  traceLabel: string | null;
  onOpenPicker: (slot: NonNullable<Picker>) => void;
  onClearSlot: (slot: NonNullable<Picker>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Сравнить родство</DialogTitle>
          <DialogDescription>Выберите двух людей, чтобы увидеть, как они связаны, и подсветить путь на дереве.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <TraceSlot label="Человек A" person={traceA} onOpenPicker={() => onOpenPicker("traceA")} onClear={() => onClearSlot("traceA")} />
          <TraceSlot label="Человек B" person={traceB} onOpenPicker={() => onOpenPicker("traceB")} onClear={() => onClearSlot("traceB")} />
        </div>

        {traceLabel && (
          <Badge variant="secondary" className="w-fit">
            {traceLabel}
          </Badge>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TraceSlot({
  label,
  person,
  onOpenPicker,
  onClear,
}: {
  label: string;
  person: { id: string; name: string } | null;
  onOpenPicker: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1 justify-start" onClick={onOpenPicker}>
          <SearchIcon />
          {person ? person.name : "Выбрать человека"}
        </Button>
        {person && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Сбросить ${label.toLowerCase()}`}
            onClick={onClear}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
