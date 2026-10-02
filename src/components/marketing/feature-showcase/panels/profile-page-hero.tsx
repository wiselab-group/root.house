import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  HouseIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PlayIcon,
  UserRoundIcon,
} from "lucide-react";
import { glassChip, glassIconButton, glassPill } from "@/components/hero/glass";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";

export const PROFILE_HERO_HEIGHT = 640;

/**
 * PersonProfileHero at desktop size (classes from person-profile-hero.tsx,
 * hero-top-bar.tsx, hero-meta.tsx and voice-capsule.tsx, `sm:` variants
 * resolved, fluid sizes fixed — the canvas is always "desktop"): the warm
 * glow, the portrait dissolving into the page (.hero-photo-mask), «← Люди»
 * and «⋮», the «Профиль» chip, the name, years and the way from birthplace
 * to home, and the voice capsule. Decorative: nothing is a real control.
 */
export function ProfilePageHero() {
  const t = useTranslations("landing.panel");
  const tp = useTranslations("profile");
  const tNav = useTranslations("familyNav");
  const vera = useDemoFamily().vera;
  return (
    <div
      className="relative isolate overflow-hidden"
      style={{ height: PROFILE_HERO_HEIGHT }}
    >
      <div className="hero-glow absolute inset-0" />
      {/* The mask starts a few px outside a clipping box: scaled down, its
          fully transparent edge otherwise renders as a 1px light seam. */}
      <div className="absolute inset-y-0 right-0 w-[58%] overflow-hidden">
        <div className="hero-photo-mask hero-photo-mask-wide absolute inset-y-0 -left-1 right-0">
          <Image
            src={LANDING_PHOTOS.wedding.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, 55vw"
            className="object-cover object-[78%_12%]"
          />
        </div>
      </div>
      <div className="absolute inset-x-7 top-6 z-20 flex items-start justify-between gap-2">
        <span className={glassPill}>
          <ArrowLeftIcon />
          {tNav("people")}
        </span>
        <span className={glassIconButton}>
          <MoreVerticalIcon />
        </span>
      </div>
      <div className="absolute bottom-16 left-11 z-10 flex max-w-[min(560px,46%)] flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <span className={glassChip}>
            <UserRoundIcon />
            {tp("pill")}
          </span>
        </div>
        <p className="font-heading text-[3.75rem] leading-[1.05] font-normal tracking-tight text-balance">
          {vera.name}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/65">
          <li className="flex items-center gap-1.5 tabular-nums">
            <CalendarIcon className="size-4 shrink-0" />
            {vera.years}
          </li>
          <li className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4 shrink-0" />
              {t("riga")}
            </span>
            <ArrowRightIcon className="size-3.5 shrink-0 text-foreground/40" />
            <span className="flex items-center gap-1.5">
              <HouseIcon className="size-4 shrink-0" />
              {t("tallinn")}
            </span>
          </li>
        </ul>
        <span className="flex w-fit max-w-full items-center gap-3.5 rounded-full border border-glass-edge bg-background/45 py-1.5 pr-6 pl-1.5 backdrop-blur-xl backdrop-saturate-150">
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-foreground/8">
            <svg
              viewBox="0 0 48 48"
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx="24"
                cy="24"
                r="23"
                fill="none"
                strokeWidth="1.5"
                className="stroke-foreground/15"
              />
            </svg>
            <PlayIcon className="size-[38%] fill-current" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-medium">
              {t("voiceTitle")}
            </span>
            <span className="truncate text-sm text-foreground/60 tabular-nums">
              1998 · 2:41
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
