import { cn } from "@/lib/utils";
import { GlassPill, PanelFrame } from "./panel-frame";

const FROM = 1931;
const TO = 2014;
const EVENTS = [
  { year: 1931, label: "Born in Riga" },
  { year: 1952, label: "Married Ivan" },
  { year: 1956, label: "Moved to Tallinn" },
  { year: 1957, label: "Margaret is born" },
  { year: 1986, label: "Margaret's wedding" },
  { year: 2014, label: "Died in Tallinn" },
];
const SELECTED = 2;

function at(year: number): string {
  return `${((year - FROM) / (TO - FROM)) * 100}%`;
}

/** A life on one axis (the profile's «Линия жизни»): dated events as dots,
 *  the selected one ringed in terracotta with its card above. */
export function LifelinePanel() {
  const selected = EVENTS[SELECTED];
  return (
    <PanelFrame className="flex flex-col justify-center gap-[10%] px-[8%]">
      <div className="flex flex-col gap-[0.35em] rounded-2xl border border-glass-edge bg-glass p-[5%] text-[clamp(0.6875rem,0.5rem+1cqw,0.9375rem)]">
        <span className="text-primary">{selected.year} · age 25</span>
        <span className="font-heading text-[clamp(1rem,0.6rem+2.4cqw,1.75rem)] leading-tight">
          {selected.label}
        </span>
        <span className="text-muted-foreground">
          Ivan found work at the port; Vera followed with the children&apos;s
          things in two suitcases.
        </span>
      </div>
      <div className="relative mx-[3%] h-[0.6em] text-[clamp(0.5625rem,0.4rem+0.8cqw,0.75rem)]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-tree-accent" />
        {EVENTS.map((event, index) => (
          <span
            key={event.year}
            className={cn(
              "absolute top-1/2 size-[0.9em] -translate-1/2 rounded-full bg-tree-accent",
              index === SELECTED &&
                "size-[1.3em] bg-primary ring-4 ring-primary/30",
            )}
            style={{ left: at(event.year) }}
          />
        ))}
        {[FROM, 1956, 1986, TO].map((year) => (
          <span
            key={year}
            className="absolute top-[250%] -translate-x-1/2 text-muted-foreground"
            style={{ left: at(year) }}
          >
            {year}
          </span>
        ))}
      </div>
      <div className="flex justify-center">
        <GlassPill>6 events · 3 places</GlassPill>
      </div>
    </PanelFrame>
  );
}
