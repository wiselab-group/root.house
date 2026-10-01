"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { UserIcon } from "lucide-react";
import { PopoverClose } from "@/components/ui/popover";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { PersonNodePopoverSummary } from "./person-node-popover-summary";

/**
 * The card's click popover: the who-is-this summary
 * (PersonNodePopoverSummary — photo, name, years with age, birth place,
 * archive counts; the ONLY place in the tree UI archive counts show, the
 * card itself stays plain) above the actions — kept separate from
 * PersonNode so its already-long JSX doesn't grow a third nesting level. The "Посмотреть профиль" action is suppressed in read-only
 * mode (see PersonNodeData.readOnly): it links into the auth-gated, editable
 * profile page, which has no reason to exist on the anonymous Share Link
 * surface. The header/archive line render in both modes — read-only
 * visitors still benefit from seeing who this is and what's attached to
 * them, they just can't act on it beyond browsing. "Сделать фокус-персоной"
 * was removed from this popover per explicit user request 2026-09-23 —
 * focus switching now lives only in settings; data.onFocusPerson is still
 * threaded through (xyflow-adapter.ts) for that other surface, this
 * component just no longer reads it. "Сравнить с…" was removed the same way
 * (user request 2026-09-28) — a trace starts from the dock's «Родство».
 */
export function PersonNodePopoverActions({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  const t = useTranslations("tree");

  return (
    <div className="flex flex-col">
      <PersonNodePopoverSummary data={data} />
      {/* Rows run to the popover's edges (out through its p-1 matte) and
          its rounded corner clips the last one — same as DropdownMenu. */}
      <div className="-mx-1 border-t border-border" />
      {!data.readOnly && (
        <PopoverClose
          nativeButton={false}
          render={
            <Link
              href={`/families/${data.familySlug}/people/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-1 -mb-1 flex items-center gap-1.5 px-3 py-2 text-[0.8rem] hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
            />
          }
        >
          <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {t("viewProfile")}
        </PopoverClose>
      )}
    </div>
  );
}
