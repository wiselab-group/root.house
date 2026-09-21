"use client";

import Link from "next/link";
import { UserIcon, FocusIcon } from "lucide-react";
import { PopoverClose } from "@/components/ui/popover";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { personLabel, yearRange } from "./person-node-parts";
import { ArchiveSummaryLine } from "./archive-summary-line";

/**
 * The card's click popover: a small identity header (name/years — same
 * source as the card itself, personLabel/yearRange from person-node-parts,
 * so the two can never say something different) and archive summary
 * (ArchiveSummaryLine, PersonArchiveSummary written out as words — see its
 * own doc comment on why this is the ONLY place in the tree UI archive
 * counts show; the card itself stays plain), above the two actions — kept
 * separate from PersonNode so its already-long JSX doesn't grow a third
 * nesting level. Both actions are suppressed in read-only mode (see
 * PersonNodeData.readOnly): "Посмотреть профиль" links into the auth-gated,
 * editable profile page, which has no reason to exist on the anonymous
 * Share Link surface; "Сделать фокус-персоной" is already omitted upstream
 * (xyflow-adapter.ts never passes onFocusPerson when readOnly). The header/
 * archive line render in both modes — read-only visitors still benefit from
 * seeing who this is and what's attached to them, they just can't act on it
 * beyond browsing.
 */
export function PersonNodePopoverActions({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  const name = personLabel(data);
  const years = yearRange(data);

  return (
    <div className="flex flex-col">
      <div className="px-2 pt-1 pb-2">
        <p className="font-heading text-sm font-medium">{name}</p>
        {years && <p className="text-xs text-muted-foreground">{years}</p>}
        <ArchiveSummaryLine
          archive={data.archive}
          className="mt-1 text-xs text-muted-foreground"
        />
      </div>
      <div className="-mx-1 mb-1 border-t border-border" />
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
