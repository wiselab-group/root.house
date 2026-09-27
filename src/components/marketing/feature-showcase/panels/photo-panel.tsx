import { UserRoundPlus } from "lucide-react";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import { GlassPill, PanelFrame } from "./panel-frame";

/** Three people in an old group photo, x = center in %. */
const PEOPLE = [
  { x: 26, name: "Ivan Hartley" },
  { x: 50, name: "Vera Hartley" },
  { x: 74, name: "Paul Hartley" },
];
const SPOTLIT = 1;

/** Lightbox with tagged people: the photo dims except a soft circle around
 *  the hovered face (the app's PhotoTagSpotlight), whose name floats below
 *  it. */
export function PhotoPanel() {
  const spot = PEOPLE[SPOTLIT];
  return (
    <PanelFrame className="bg-background p-0">
      <div className="absolute inset-[8%_10%_14%] overflow-hidden rounded-xl bg-secondary">
        {PEOPLE.map(({ x, name }) => (
          <PortraitSilhouette
            key={name}
            className="absolute bottom-0 w-[34%] -translate-x-1/2 text-muted-foreground/60"
            style={{ left: `${x}%` }}
          />
        ))}
        <div
          className="absolute inset-0 bg-background/60"
          style={{
            maskImage: `radial-gradient(circle at ${spot.x}% 52%, transparent 0, transparent 14%, black 26%)`,
          }}
        />
        <GlassPill
          className="absolute -translate-x-1/2"
          style={{ left: `${spot.x}%`, top: "76%" }}
        >
          {spot.name}
        </GlassPill>
      </div>
      <div className="absolute inset-x-[10%] bottom-[3%] flex items-center justify-between">
        <span className="text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] text-muted-foreground">
          Summer at the lake · 1961
        </span>
        <GlassPill>
          <UserRoundPlus className="size-[1em]" /> Tag people
        </GlassPill>
      </div>
    </PanelFrame>
  );
}
