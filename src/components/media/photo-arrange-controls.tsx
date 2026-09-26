"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Entry and exit of PhotoGrid's «Упорядочить» mode (see usePhotoGridReorder):
 * drag to reorder, plus each tile's «⋯» menu. Only the order waits for
 * «Готово» — portrait/cover/delete from the menu apply at once (delete has
 * its own confirmation), so «Отмена» says it only undoes the order.
 * The entry button lives in the section heading (PhotoArrangeHeaderButton,
 * photo-arrange-context.tsx); the bar pins to the bottom of the screen so
 * «Готово» stays in reach while dragging through a long grid.
 */
export function PhotoArrangeBar({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      {/* Room under the grid so the pinned bar never covers its last row. */}
      <div aria-hidden="true" className="h-36 sm:h-20" />
      <div
        role="region"
        aria-label="Упорядочить фото"
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex max-w-xl animate-in flex-col gap-3 rounded-2xl border border-border bg-popover p-3 pl-4 text-popover-foreground shadow-lg duration-300 ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-4 sm:flex-row sm:items-center"
      >
        <p className="flex-1 text-sm leading-snug">
          Перетащите фото, чтобы поменять порядок. Действия с фото — в меню ⋯
          <span className="block text-xs text-muted-foreground">
            Порядок общий для всех альбомов и профилей. «Отмена» вернёт только
            порядок.
          </span>
        </p>
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="bg-confirm text-confirm-foreground hover:bg-confirm/85"
          >
            <CheckIcon />
            Готово
          </Button>
        </div>
      </div>
    </>
  );
}
