import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPinIcon, UserIcon } from "lucide-react";
import { lifeAge } from "@/domain/person/life-age";
import type { PartialDate } from "@/domain/shared/partial-date";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";

/** The popover's fixed width (PopoverContent's w-64). */
export const TREE_POPOVER_WIDTH = 256;

const year = (value: number): PartialDate => ({
  year: value,
  month: null,
  day: null,
  precision: "year_only",
  isApproximate: false,
});

/**
 * A tree card's click popover (person-node-popover-actions.tsx +
 * person-node-popover-summary.tsx) as plain markup, open on Vera: the
 * photo across its width, the name, the years with her age from the app's
 * own lifeAge, the birth place, what the archive holds, and «Посмотреть
 * профиль». The photo is her face from the wedding portrait, framed by
 * hand — the 176px card crop would go soft at this size.
 */
export function TreePopover({ name, years }: { name: string; years: string }) {
  const t = useTranslations("tree");
  const tc = useTranslations("counts");
  const tl = useTranslations("landing.panel");
  const age = lifeAge(
    { isLiving: false, birthDate: year(1931), deathDate: year(2014) },
    new Date(),
  );
  const archive = [
    tc("photos", { count: 24 }),
    tc("stories", { count: 3 }),
    tc("events", { count: 6 }),
  ].join(", ");

  return (
    <div
      className="flex flex-col rounded-lg bg-muted p-1 text-popover-foreground shadow-2xl ring-1 shadow-black/50 ring-foreground/20"
      style={{ width: TREE_POPOVER_WIDTH }}
    >
      <div className="relative h-48 overflow-hidden rounded-md bg-accent">
        <Image
          src={LANDING_PHOTOS.wedding.src}
          alt=""
          width={640}
          height={896}
          sizes="640px"
          className="absolute max-w-none"
          style={{ left: -280, top: -60 }}
        />
      </div>
      <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
        <p className="font-heading text-xl leading-tight font-medium text-balance">
          {name}
        </p>
        <p className="mt-0.5 text-sm text-foreground/80 tabular-nums">
          {years}
          {age &&
            ` (${t("lifeAge", { years: age.years, approx: String(age.isApproximate) })})`}
        </p>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{tl("riga")}</span>
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{archive}</p>
      </div>
      <div className="-mx-1 border-t border-border" />
      <span className="-mx-1 -mb-1 flex items-center gap-1.5 px-3 py-2 text-[0.8rem]">
        <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
        {t("viewProfile")}
      </span>
    </div>
  );
}
