"use client";

import { useEffect } from "react";
import { ChevronDownIcon, RouteIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KinshipPathStop } from "@/domain/relationship/kinship-terms";
import { KinshipResult } from "./kinship-result";
import { KinshipSlots } from "./kinship-slots";
import { useFramePathOnChange, useKinshipCamera } from "./use-kinship-camera";
import type { KinshipTrace } from "./use-kinship-trace";

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function stepsSummary(stops: KinshipPathStop[]): string | null {
  const steps = stops.length - 1;
  if (steps < 1) return null;
  const count = (via: KinshipPathStop["via"]) =>
    stops.filter((s) => s.via === via).length;
  const parts = [
    count("up") && `${count("up")} вверх`,
    count("down") && `${count("down")} вниз`,
    count("partner") && `${count("partner")} через брак`,
  ].filter(Boolean);
  return `${steps} ${plural(steps, "шаг", "шага", "шагов")}: ${parts.join(", ")}`;
}

/**
 * Relationship Trace panel — its own surface instead of a modal dialog, so
 * the tree stays visible and clickable while two people are compared, and
 * the answer stays on screen while the path is highlighted. Desktop: a
 * floating card at the canvas's top-left. Touch: a bottom sheet. Rendered
 * inside <ReactFlow> (TreeCanvas's `overlay` slot) so the path's stops can
 * move the camera.
 */
export function KinshipPanel({
  trace,
  familyId,
}: {
  trace: KinshipTrace;
  familyId: string;
}) {
  const { panTo, frame } = useKinshipCamera();
  const { isPanelOpen, setPanelOpen, stops } = trace;

  const pairKey =
    trace.outcome?.status === "found" ? `${trace.aId}:${trace.bId}` : null;
  useFramePathOnChange(
    pairKey,
    stops.map((s) => s.personId),
    frame,
  );

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape inside a search field closes that field's own list first.
      if (event.key !== "Escape" || event.target instanceof HTMLInputElement)
        return;
      setPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPanelOpen, setPanelOpen]);

  if (!isPanelOpen) return null;

  const personA = trace.aId ? (trace.personsById.get(trace.aId) ?? null) : null;
  const personB = trace.bId ? (trace.personsById.get(trace.bId) ?? null) : null;
  const summaryLine = stepsSummary(stops);

  return (
    <section
      aria-label="Родство"
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] animate-in flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-card-foreground shadow-lg duration-slow ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-6 motion-reduce:animate-none md:pointer-fine:inset-x-auto md:pointer-fine:top-3 md:pointer-fine:bottom-auto md:pointer-fine:left-3 md:pointer-fine:max-h-[calc(100%-5.5rem)] md:pointer-fine:w-84 md:pointer-fine:rounded-2xl md:pointer-fine:border md:pointer-fine:pb-4 md:pointer-fine:slide-in-from-bottom-0 md:pointer-fine:slide-in-from-left-3"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-lg font-medium">
          <RouteIcon className="size-4.5 fill-none! text-primary" />
          Родство
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Свернуть панель"
          onClick={() => setPanelOpen(false)}
        >
          <ChevronDownIcon className="fill-none! md:pointer-fine:hidden" />
          <XIcon className="hidden fill-none! md:pointer-fine:block" />
        </Button>
      </header>

      <KinshipSlots
        familyId={familyId}
        personA={personA}
        personB={personB}
        pickSlot={trace.pickSlot}
        onSelect={trace.setSlot}
        onSwap={trace.swap}
      />

      {trace.summary && personA && personB && (
        <KinshipResult
          summary={trace.summary}
          stops={stops}
          personA={personA}
          personB={personB}
          personsById={trace.personsById}
          familyId={familyId}
          onPanTo={panTo}
        />
      )}

      {(personA || personB) && (
        <footer className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {summaryLine}
          </span>
          <Button variant="ghost" size="sm" onClick={trace.reset}>
            Сбросить
          </Button>
        </footer>
      )}
    </section>
  );
}
