import { useTranslations } from "next-intl";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";
import { HeroArtifacts } from "./hero-artifacts";

/**
 * The stage is 100 wide × 108 tall in cqw, so the SVG lines and the cards
 * share one coordinate system. Cards are 18 wide; their square frame is
 * 13.68, so a frame's center sits 6.84 below the card's top.
 */
const PEOPLE: readonly {
  id: DemoPersonId;
  x: number;
  y: number;
  at: number;
}[] = [
  { id: "ivan", x: 18, y: 6, at: 100 },
  { id: "vera", x: 40, y: 6, at: 220 },
  { id: "margaret", x: 29, y: 38, at: 600 },
  { id: "david", x: 51, y: 38, at: 720 },
  { id: "owen", x: 40, y: 70, at: 1100 },
];

/** Family lines (solid) draw in with the people; links from a person to
 *  something remembered about them (dashed) follow each artifact. */
const LINES = [
  { d: "M24.84 12.84H33.16", at: 360 },
  { d: "M29 12.84V38", at: 480 },
  { d: "M35.84 44.84H44.16", at: 860 },
  { d: "M40 44.84V70", at: 980 },
] as const;
const LINKS = [
  { d: "M46.84 12.84C55 12.84 55 19 63 19", at: 1500 },
  { d: "M57.84 44.84H62", at: 1850 },
  { d: "M46.84 76.84H57", at: 2250 },
] as const;

export function HeroStoryVisual() {
  const t = useTranslations("landing.hero");
  const family = useDemoFamily();
  return (
    <Reveal threshold={0.1}>
      <div
        role="img"
        aria-label={t("visualLabel")}
        className="@container relative mx-auto aspect-[100/108] w-full max-w-xl"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 108"
          className="absolute inset-0 size-full overflow-visible"
        >
          {LINES.map(({ d, at }) => (
            <path
              key={d}
              d={d}
              pathLength={1}
              className="draw-line"
              style={delay(at)}
              fill="none"
              stroke="var(--branch)"
              strokeWidth={0.28}
            />
          ))}
          {LINKS.map(({ d, at }) => (
            <path
              key={d}
              d={d}
              data-reveal=""
              style={delay(at)}
              fill="none"
              stroke="var(--branch-subtle)"
              strokeWidth={1.25}
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div aria-hidden="true">
          {PEOPLE.map(({ id, x, y, at }) => (
            <div
              key={id}
              data-reveal="scale"
              className="absolute w-[18%] -translate-x-1/2"
              style={{ left: `${x}%`, top: `${y}cqw`, ...delay(at) }}
            >
              <MiniPersonCard
                name={family[id].name.split(" ")[0]}
                years={family[id].years}
                active={id === "owen"}
              />
            </div>
          ))}
          <HeroArtifacts />
        </div>
      </div>
    </Reveal>
  );
}
