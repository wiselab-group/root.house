"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { RouteIcon, UserIcon } from "lucide-react";
import { PopoverClose } from "@/components/ui/popover";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { PersonNodePopoverSummary } from "./person-node-popover-summary";
import { useKinshipContext } from "./kinship/kinship-context";

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
 * component just no longer reads it. "Сравнить с…" starts a Relationship
 * Trace from this person (kinship-context.tsx) — absent where there's no
 * trace panel (the Share Link tree).
 */
export function PersonNodePopoverActions({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  const t = useTranslations("tree");
  const kinship = useKinshipContext();

  return (
    <div className="flex flex-col">
      <PersonNodePopoverSummary data={data} />
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
          {t("viewProfile")}
        </PopoverClose>
      )}
      {kinship && (
        <PopoverClose
          render={
            <button
              type="button"
              onClick={() => kinship.compareWith(data.personId)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[0.8rem] hover:bg-accent hover:text-accent-foreground"
            />
          }
        >
          <RouteIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {t("compareWith")}
        </PopoverClose>
      )}
    </div>
  );
}
