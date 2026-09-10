"use client";

import Link from "next/link";
import { UserIcon, FocusIcon } from "lucide-react";
import { PopoverClose } from "@/components/ui/popover";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";

/** The two actions offered by a card's click popover — kept separate from PersonNode so its already-long JSX doesn't grow a third nesting level. Both are suppressed in read-only mode (see PersonNodeData.readOnly): "Посмотреть профиль" links into the auth-gated, editable profile page, which has no reason to exist on the anonymous Share Link surface; "Сделать фокус-персоной" is already omitted upstream (xyflow-adapter.ts never passes onFocusPerson when readOnly). */
export function PersonNodePopoverActions({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  return (
    <div className="flex flex-col">
      {!data.readOnly && (
        <PopoverClose
          nativeButton={false}
          render={
            <Link
              href={`/families/${data.familySlug}/people/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.8rem] hover:bg-accent hover:text-accent-foreground"
            />
          }
        >
          <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
          Посмотреть профиль
        </PopoverClose>
      )}
      {data.onFocusPerson && (
        <PopoverClose
          render={
            <button
              type="button"
              onClick={() => data.onFocusPerson?.(data.personId)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[0.8rem] hover:bg-accent hover:text-accent-foreground"
            />
          }
        >
          <FocusIcon className="size-3.5 shrink-0 text-muted-foreground" />
          Сделать фокус-персоной
        </PopoverClose>
      )}
    </div>
  );
}
