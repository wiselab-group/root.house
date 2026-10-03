"use client";

import { useTranslations } from "next-intl";
import type { MapStats } from "@/domain/place/map-snapshot";

/** «5 поколений · 5 городов · 3 страны» with the numbers set in Lora. */
export function StatsLine({ stats }: { stats: MapStats }) {
  const t = useTranslations("familyMap");
  const num = (n: number) => (
    <span className="font-heading text-base text-foreground">{n}</span>
  );
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground">
      <span>
        {t.rich("statGenerations", {
          count: stats.generations,
          n: () => num(stats.generations),
        })}
      </span>
      <span aria-hidden>·</span>
      <span>
        {t.rich("statPlaces", {
          count: stats.places,
          n: () => num(stats.places),
        })}
      </span>
      <span aria-hidden>·</span>
      <span>
        {t.rich("statCountries", {
          count: stats.countries,
          n: () => num(stats.countries),
        })}
      </span>
    </p>
  );
}
