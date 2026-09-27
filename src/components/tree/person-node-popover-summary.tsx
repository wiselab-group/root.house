"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPinIcon } from "lucide-react";
import { ArchiveImage } from "@/components/media/archive-image";
import { ArchiveSummaryLine } from "@/components/person/archive-summary-line";
import { lifeAge, type LifeAge } from "@/domain/person/life-age";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { personLabel, yearRange } from "./person-node-parts";

/**
 * The top of a tree card's click popover — who this is, at a glance,
 * without leaving the tree: the photo across the popover's full width
 * (omitted entirely, no empty frame, when there's none), the name with the
 * maiden name in parentheses, the years with the age in parentheses
 * («1988 (38 лет)», or the age at death «1936 — 2008 (72 года)»; a baby's
 * in months, «(8 мес.)», «(1 год 4 мес.)»), the
 * birth place, and what the archive holds for them.
 *
 * The name is text-xl, not the card's own text-sm: the card's text lives
 * in canvas space and grows with the zoom (~22px on screen at 1.6x), while
 * the popover is fixed screen UI — at a smaller size the popover, the
 * thing being read, was out-titled by the card behind it.
 *
 * Name and years come from the same personLabel/yearRange as the card, so
 * the two can never disagree. No kinship line («бабушка»): without naming
 * whose grandmother, the word alone can't be read (user decision).
 */
export function PersonNodePopoverSummary({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  const locale = useLocale();
  const t = useTranslations("tree");
  const tp = useTranslations("profile");
  const name = personLabel(data, locale);
  const years = yearRange(data);
  // Popover content only mounts once opened, on the client — no
  // server/client clock mismatch to hydrate.
  const age = lifeAge(data, new Date());
  const ageLabel = ({ years, months, isApproximate }: LifeAge) =>
    months === null
      ? t("lifeAge", { years, approx: String(isApproximate) })
      : years === 0
        ? t("lifeAgeMonths", { months })
        : t("lifeAgeYearsMonths", { years, months });
  const maidenName =
    data.maidenName && data.maidenName !== data.lastName
      ? data.maidenName
      : null;

  return (
    <div className="flex flex-col">
      {data.photoUrl && (
        // 4:3 (192px) when there's room; on a phone, where the popover
        // can't sit beside the card and flips above it, the photo gives up
        // height (down to an 80px strip) so the name and actions stay on
        // screen — ~15rem is what the rest of the popover needs (a two-line name included).
        <div className="relative h-[clamp(5rem,calc(var(--available-height)-15rem),12rem)] overflow-hidden rounded-md bg-accent">
          <ArchiveImage
            src={data.photoUrl}
            alt=""
            fill
            sizes="256px"
            // Portraits are usually framed head-high — keep faces in view.
            className="object-cover object-[50%_30%]"
          />
        </div>
      )}
      <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
        <p className="font-heading text-xl leading-tight font-medium text-balance">
          {name}
          {maidenName && (
            <span className="font-normal text-muted-foreground">
              {" "}
              ({maidenName})
            </span>
          )}
        </p>
        {years && (
          // Brighter than the place/archive lines below: after the name,
          // the years are what's read first.
          <p className="mt-0.5 text-sm text-foreground/80 tabular-nums">
            {years}
            {age && ` (${ageLabel(age)})`}
          </p>
        )}
        {data.birthPlaceName && (
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="sr-only">{tp("birthPlace")}: </span>
            <span className="truncate">{data.birthPlaceName}</span>
          </p>
        )}
        <ArchiveSummaryLine
          archive={data.archive}
          className="mt-1.5 text-xs text-muted-foreground"
        />
      </div>
    </div>
  );
}
