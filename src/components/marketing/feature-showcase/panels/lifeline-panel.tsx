import { useLocale, useTranslations } from "next-intl";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { PanelFrame } from "./panel-frame";
import { LifelineScale, type ScalePoint } from "./lifeline-page/lifeline-scale";
import { LifelineCard } from "./lifeline-page/lifeline-card";

/** The profile's «Линия жизни» at a narrow real width, 4:3 — small enough
 *  that, scaled to the panel, its labels stay readable (user request). */
const WIDTH = 720;
const HEIGHT = 540;
const BORN = 1931;
const MOVE = 1956;

/** Years pinned to places on the axis — close years spread apart, as
 *  layoutLifelineScale does; anything between is read off linearly. */
const ANCHORS: readonly [number, number][] = [
  [1931, 0],
  [1952, 0.22],
  [1957, 0.5],
  [2014, 1],
];

function at(year: number): number {
  const i = ANCHORS.findIndex(([y]) => y >= year);
  if (i <= 0) return ANCHORS[0][1];
  const [y0, a0] = ANCHORS[i - 1];
  const [y1, a1] = ANCHORS[i];
  return a0 + ((year - y0) / (y1 - y0)) * (a1 - a0);
}

const DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010].map(
  (year) => ({ year, at: at(year) }),
);

/**
 * Vera's «Линия жизни» as her profile draws it (person-timeline.tsx →
 * PersonLifeline + LifelineEventCard), without the section title: the
 * axis from her birth to her death with the move to Tallinn picked, and
 * that event's card. Event names are the app's own
 * (eventTypes, timeline.*); scaled down as a whole.
 */
export function LifelinePanel() {
  const t = useTranslations("landing.panel");
  const tl = useTranslations("timeline");
  const types = useTranslations("eventTypes");
  const locale = useLocale();
  const family = useDemoFamily();
  const firstName = (name: string) => name.split(" ")[0];

  const points: ScalePoint[] = [
    { year: BORN, caption: types("birth"), side: "up", align: "start" },
    { year: 1952, caption: types("marriage"), side: "down", align: "center" },
    {
      year: 1955,
      caption: firstName(family.paul.name),
      side: "up",
      align: "center",
    },
    { year: MOVE, caption: types("migration"), side: "down", align: "center" },
    {
      year: 1957,
      caption: firstName(family.margaret.name),
      side: "up",
      align: "center",
    },
    { year: 2014, caption: types("death"), side: "down", align: "end" },
  ].map((point) => ({ ...point, at: at(point.year) }) as ScalePoint);

  return (
    <PanelFrame className="bg-background p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <div className="flex size-full flex-col justify-center gap-4 px-8">
          <LifelineScale points={points} selected={3} decades={DECADES} />
          <LifelineCard
            kicker={`${MOVE} · ${tl("age", { age: MOVE - BORN, gender: "female" })}`}
            title={t("e1956")}
            details={[
              types("migration"),
              formatPartialDate(
                {
                  year: MOVE,
                  month: null,
                  day: null,
                  precision: "year_only",
                  isApproximate: false,
                },
                locale,
              ),
              t("tallinn"),
            ].join(" · ")}
            text={t("moveStory")}
            peopleLabel={tl("participantsLabel")}
            person={{
              name: family.ivan.name,
              photo: LANDING_PHOTOS.ivanPortrait.src,
            }}
          />
        </div>
      </ScaledCanvas>
    </PanelFrame>
  );
}
