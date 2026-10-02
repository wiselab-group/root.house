import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { glassSurface } from "@/components/hero/glass";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { PanelFrame } from "./panel-frame";
import { PROFILE_HERO_HEIGHT, ProfilePageHero } from "./profile-page-hero";

/** The profile at a real desktop width, 4:3 like the panel. */
const WIDTH = 1040;
const HEIGHT = 780;

/** The profile's tabs (person-profile-sections.tsx), with Vera's counts. */
const TABS = [
  { id: "tabOverview" },
  { id: "tabStories", count: 3 },
  { id: "tabTimeline", count: 6 },
  { id: "tabPhotos", count: 24 },
  { id: "tabDocuments", count: 2 },
] as const;

/**
 * A person's page as the app draws it (people/[personSlug]: PersonProfileHero
 * + ProfileTabs) — the hero, then the glass tab strip riding up over its
 * faded bottom with «Обзор» picked by the inverted pill. Built from the
 * app's own classes and `profile.*` labels, filled with the landing's
 * fictional family, scaled down as a whole.
 */
export function ProfilePanel() {
  const t = useTranslations("profile");
  return (
    <PanelFrame className="bg-background p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <ProfilePageHero />
        <div
          className="-mt-9 flex justify-center px-4 pt-8"
          style={{ height: HEIGHT - PROFILE_HERO_HEIGHT + 36 }}
        >
          <div
            className={cn(
              glassSurface,
              "flex h-fit gap-1.5 rounded-full p-1.5",
            )}
          >
            {TABS.map((tab, index) => (
              <span
                key={tab.id}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium",
                  index === 0
                    ? "bg-foreground text-background"
                    : "text-foreground/65",
                )}
              >
                {t(tab.id)}
                {"count" in tab && (
                  <span className="text-xs text-foreground/40 tabular-nums">
                    {tab.count}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </ScaledCanvas>
    </PanelFrame>
  );
}
