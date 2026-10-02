import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clamp01 } from "@/components/marketing/shared/scroll-math";
import {
  ISLAND_PATHS,
  LAKE_PATH,
  MAP_ASPECT,
  SEA_PATH,
  project,
} from "./map-geo";
import {
  CITIES,
  CITY_LABEL_SIDE,
  ROUTE_DRAW_YEARS,
  ROUTE_STOPS,
  routePath,
  stopAt,
  type CityId,
} from "./family-route.data";

const GRID = [10, 20, 30, 40, 50, 60, 70, 80, 90];

/**
 * The family's places as of `year` (fractional, so routes draw smoothly): cities appear once someone in the
 * family has lived there, moves draw in as terracotta arcs over the years
 * leading up to them, and the current place is ringed. Decorative — the
 * section lists the same stops as text.
 */
export function FamilyMapCanvas({ year }: { year: number }) {
  const t = useTranslations("landing.map.cities");
  const current = stopAt(year);
  const reached = new Set<CityId>(
    ROUTE_STOPS.filter((stop) => stop.year <= year).map((stop) => stop.city),
  );

  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden rounded-3xl border border-border bg-secondary"
      style={{ aspectRatio: MAP_ASPECT }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <path
          d={SEA_PATH}
          fill="var(--background)"
          stroke="var(--branch-subtle)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {ISLAND_PATHS.map((d) => (
          <path
            key={d}
            d={d}
            fill="var(--secondary)"
            stroke="var(--branch-subtle)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={LAKE_PATH}
          fill="var(--background)"
          stroke="var(--branch-subtle)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {GRID.map((at) => (
          <g
            key={at}
            stroke="var(--border)"
            strokeWidth={0.75}
            strokeDasharray="2 5"
            vectorEffect="non-scaling-stroke"
          >
            <line
              x1={at}
              x2={at}
              y1={0}
              y2={100}
              vectorEffect="non-scaling-stroke"
            />
            <line
              y1={at}
              y2={at}
              x1={0}
              x2={100}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {ROUTE_STOPS.filter((stop) => stop.from).map((stop) => {
          const drawn = clamp01(
            (year - stop.year + ROUTE_DRAW_YEARS) / ROUTE_DRAW_YEARS,
          );
          // Not drawn yet = not rendered: a round cap on a zero-length dash
          // would still paint a dot at the route's start.
          if (drawn === 0) return null;
          return (
            <path
              key={stop.id}
              d={routePath(stop.from as CityId, stop.city)}
              pathLength={1}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={0.45}
              strokeLinecap="round"
              strokeDasharray={1}
              strokeDashoffset={1 - drawn}
            />
          );
        })}
      </svg>
      {(Object.keys(CITIES) as CityId[]).map((city) => {
        const { x, y } = project(CITIES[city]);
        const isCurrent = current?.city === city;
        const left = CITY_LABEL_SIDE[city] === "left";
        return (
          <span
            key={city}
            className={cn(
              "absolute flex -translate-y-1/2 items-center gap-2 transition-opacity duration-reveal ease-(--ease-reveal)",
              left
                ? "-translate-x-[calc(100%-0.375rem)] flex-row-reverse"
                : "-translate-x-1.5",
              reached.has(city) ? "opacity-100" : "opacity-0",
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={cn(
                "size-3 shrink-0 rounded-full border-2 border-background transition-colors duration-slow ease-(--ease-reveal)",
                isCurrent ? "bg-primary ring-4 ring-primary/25" : "bg-branch",
              )}
            />
            <span
              className={cn(
                "rounded-full bg-background/80 px-2 py-0.5 text-xs whitespace-nowrap backdrop-blur-sm sm:text-sm",
                isCurrent ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(city)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
