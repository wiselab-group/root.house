import { useTranslations } from "next-intl";
import { BookOpen, CalendarHeart, ImageIcon, MapPin, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { cameraAt } from "@/components/marketing/shared/scroll-math";
import {
  GROWTH_BADGES,
  GROWTH_CAMERAS,
  GROWTH_LINES,
  GROWTH_PEOPLE,
  GROWTH_STEPS,
} from "./growth.data";

const ICONS = {
  story: BookOpen,
  photo: ImageIcon,
  event: CalendarHeart,
  place: MapPin,
  voice: Mic,
} as const;

const EASE = "duration-reveal ease-(--ease-reveal)";

/**
 * The tree growing around one person. `position` is the fractional step
 * (0 = just you, last = the whole family with its memories): people and
 * lines appear as their step arrives, and the camera — one transform on
 * the whole stage — pulls back from you to the family.
 */
export function GrowthStage({ position }: { position: number }) {
  const t = useTranslations("landing.growth.badges");
  const family = useDemoFamily();
  const camera = cameraAt(GROWTH_CAMERAS, position);
  const isShown = (step: number) => position >= step - 0.35;
  const memoriesShown = isShown(GROWTH_STEPS.length - 1);

  return (
    <div
      aria-hidden="true"
      className="relative aspect-square w-full overflow-hidden rounded-3xl bg-tree-canvas/40"
    >
      <div
        className="@container absolute inset-[4%] will-change-transform"
        style={{
          transformOrigin: `${camera.x}% ${camera.y}%`,
          transform: `translate(${50 - camera.x}%, ${50 - camera.y}%) scale(${camera.scale})`,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full overflow-visible"
        >
          {GROWTH_LINES.map(({ d, step }) => (
            <path
              key={d}
              d={d}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={isShown(step) ? 0 : 1}
              className="transition-[stroke-dashoffset] duration-cinematic ease-(--ease-transition)"
              fill="none"
              stroke="var(--branch)"
              strokeWidth={0.28}
            />
          ))}
        </svg>
        {GROWTH_PEOPLE.map(({ id, x, y, step }) => (
          <div
            key={id}
            className={cn(
              "absolute w-[15%] -translate-x-1/2 transition-[opacity,transform]",
              EASE,
              isShown(step) ? "opacity-100" : "scale-90 opacity-0",
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <MiniPersonCard
              name={family[id].name.split(" ")[0]}
              years={family[id].years}
              active={id === "owen"}
            />
          </div>
        ))}
        {GROWTH_BADGES.map(({ id, icon, side }, index) => {
          const person = GROWTH_PEOPLE.find((p) => p.id === id);
          if (!person) return null;
          const Icon = ICONS[icon];
          return (
            <span
              key={id}
              className={cn(
                "absolute inline-flex items-center gap-[0.4em] rounded-full border border-glass-edge bg-glass-strong px-[0.7em] py-[0.3em] text-[clamp(0.5625rem,0.3rem+1cqw,0.8125rem)] whitespace-nowrap text-foreground backdrop-blur-md transition-[opacity,transform]",
                EASE,
                side === "left" && "-translate-x-full",
                memoriesShown ? "opacity-100" : "translate-y-2 opacity-0",
              )}
              style={{
                left: `${person.x + (side === "left" ? -8.5 : 8.5)}%`,
                top: `${person.y + 3}%`,
                transitionDelay: memoriesShown ? `${index * 90}ms` : "0ms",
              }}
            >
              <Icon className="size-[1.1em] text-muted-foreground" />
              {t(id)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
