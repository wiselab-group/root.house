import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { RouteStop } from "./family-route.data";

/** The year on the slider, big, and what happened in the family then. */
export function FamilyMapStop({
  year,
  stop,
}: {
  year: number;
  stop: RouteStop | undefined;
}) {
  const t = useTranslations("landing.map");
  const family = useDemoFamily();
  return (
    // Not a live region: autoplay changes it every frame; the slider's
    // aria-valuetext already says the same thing to screen readers.
    <div aria-hidden="true" className="flex min-h-40 flex-col gap-3">
      <span className="font-heading text-display font-medium tabular-nums">
        {year}
      </span>
      {stop ? (
        <>
          <span className="text-balance text-foreground sm:text-lg">
            {t(`stops.${stop.id}`)}
            <span className="text-muted-foreground"> · {stop.year}</span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            {stop.people.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-glass-edge bg-glass py-1 pr-3 pl-1 text-sm"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {family[id].name[0]}
                </span>
                {family[id].name}
              </span>
            ))}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">{t("before")}</span>
      )}
    </div>
  );
}
