"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonFilter } from "@/domain/tree/tree-filter";

const GENDER_OPTIONS: Array<{
  value: NonNullable<PersonFilter["gender"]>[number];
  label: string;
}> = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "unknown", label: "Неизвестен" },
];

/**
 * Filter panel (plan §7): gender, living status, birth year range — the
 * fields Person actually has today without a new distinct-values query
 * (religion/nationality are free text; tree-filter.ts already supports
 * filtering on them, but a dropdown for those needs a "list of values used
 * in this family" query that doesn't exist yet — left for a follow-up
 * rather than scope-creeping this task). highlight is always the applied
 * mode (plan §7's default) — this UI never offers hide/focus, keeping the
 * "structure is never destroyed" guarantee visible at the UI level too.
 */
export function TreeFilterPanel({
  open,
  onOpenChange,
  filter,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: PersonFilter;
  onApply: (filter: PersonFilter) => void;
}) {
  const [draft, setDraft] = useState<PersonFilter>(filter);

  function toggleGender(value: NonNullable<PersonFilter["gender"]>[number]) {
    const current = draft.gender ?? [];
    const next = current.includes(value)
      ? current.filter((g) => g !== value)
      : [...current, value];
    setDraft({ ...draft, gender: next.length > 0 ? next : undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Фильтр по дереву</DialogTitle>
          <DialogDescription>
            Совпадающие люди выделяются, остальные остаются на дереве
            приглушёнными.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Пол</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={
                    draft.gender?.includes(option.value) ? "default" : "outline"
                  }
                  onClick={() => toggleGender(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-birth-from">Год рождения</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filter-birth-from"
                type="number"
                placeholder="от"
                value={draft.birthYearFrom ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    birthYearFrom: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
              <Input
                type="number"
                placeholder="до"
                value={draft.birthYearTo ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    birthYearTo: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Статус</Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant={draft.isLiving === true ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    isLiving: draft.isLiving === true ? undefined : true,
                  })
                }
              >
                Живые
              </Button>
              <Button
                type="button"
                variant={draft.isLiving === false ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    isLiving: draft.isLiving === false ? undefined : false,
                  })
                }
              >
                Умершие
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setDraft({});
              onApply({});
              onOpenChange(false);
            }}
          >
            Сбросить
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
