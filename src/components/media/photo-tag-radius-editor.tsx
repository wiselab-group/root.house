"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PHOTO_TAG_RADIUS_DEFAULT,
  PHOTO_TAG_RADIUS_MAX,
  PHOTO_TAG_RADIUS_MIN,
} from "@/domain/media/photo-tag";

type Point = { xPercent: number; yPercent: number };

const clamp = (r: number) =>
  Math.min(PHOTO_TAG_RADIUS_MAX, Math.max(PHOTO_TAG_RADIUS_MIN, r));

/** The radius (% of the layer's shorter side) that puts the circle's edge
 *  under a pointer at (clientX, clientY), for a circle centered on `point`. */
function radiusAt(
  container: HTMLElement,
  point: Point,
  clientX: number,
  clientY: number,
): number {
  const rect = container.getBoundingClientRect();
  const cx = rect.left + (point.xPercent / 100) * rect.width;
  const cy = rect.top + (point.yPercent / 100) * rect.height;
  const distance = Math.hypot(clientX - cx, clientY - cy);
  return clamp((distance / Math.min(rect.width, rect.height)) * 100);
}

/**
 * Where a new tag's circle starts: the default size, but — like the old
 * automatic spotlight — no more than 45% of the way to the nearest other
 * tag, so in a dense row of faces it starts at about one face. Worked out
 * against the layer's real size, since the radius is % of its shorter side.
 */
export function startingRadius(
  point: Point,
  others: Point[],
  container: HTMLElement,
): number {
  const { width, height } = container.getBoundingClientRect();
  const shorter = Math.min(width, height) || 1;
  const nearest = Math.min(
    Infinity,
    ...others.map((other) =>
      Math.hypot(
        ((other.xPercent - point.xPercent) / 100) * width,
        ((other.yPercent - point.yPercent) / 100) * height,
      ),
    ),
  );
  return clamp(
    Math.min(PHOTO_TAG_RADIUS_DEFAULT, ((nearest * 0.45) / shorter) * 100),
  );
}

/**
 * Picking the spotlight's size for one tag, by hand (user request
 * 2026-09-26: the light isn't computed any more, the tagger sets it). The
 * photo dims exactly as the viewer's spotlight will (same
 * .photo-tag-spotlight rule and vars as spotManual), a dashed ring marks the
 * edge, and one handle on the ring resizes it: drag it (mouse or finger),
 * or focus it and use the arrows (±1, Shift ±5) — it's a real slider. The
 * circle's middle drags to move it.
 *
 * Controlled, with a slot under the circle (above it, low on the photo):
 * PhotoTagLayer shows it the moment a new point is tapped, with the person
 * search in the slot, so size and person are picked in one step; and for
 * an existing tag via PhotoTagRadiusEditor below («Изменить область»).
 *
 * The radius is a % of the photo's shorter side (cqmin of PhotoTagLayer's
 * box), so the circle frames the same face at any lightbox size.
 */
export function PhotoTagCircle({
  containerRef,
  point,
  onPointChange,
  radius,
  onRadiusChange,
  label,
  autoFocus,
  onEnter,
  onEscape,
  children,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  point: Point;
  /** Dragging the circle by its middle moves it — reported on release. */
  onPointChange: (point: Point) => void;
  radius: number;
  onRadiusChange: (radiusPercent: number) => void;
  /** Accessible name of the slider handle. */
  label: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape: () => void;
  children: ReactNode;
}) {
  // Two gestures on a placed circle (user request 2026-09-27): drag its
  // middle to move it, drag the handle on its edge to resize it. Neither
  // goes through React while the pointer moves: all the geometry below
  // reads CSS vars off the wrapper — --tag-x/--tag-y (the centre, % of the
  // layer) and --tag-r (the radius, % of its shorter side) — and a move
  // just rewrites them. A state update per move re-rendered the whole tag
  // layer and lagged behind the finger. React hears the result on release.
  const [gesture, setGesture] = useState<"move" | "resize" | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const live = useRef({ point, radius, grabX: 0, grabY: 0 });

  function begin(event: React.PointerEvent<HTMLElement>) {
    const kind =
      event.currentTarget.dataset.gesture === "resize" ? "resize" : "move";
    // Not a carousel swipe, nor a tap-to-place on the photo underneath.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = containerRef.current!.getBoundingClientRect();
    live.current = {
      point,
      radius,
      // Where in the circle it was grabbed, so it doesn't jump to centre
      // itself under the pointer.
      grabX: event.clientX - (rect.left + (point.xPercent / 100) * rect.width),
      grabY: event.clientY - (rect.top + (point.yPercent / 100) * rect.height),
    };
    setGesture(kind);
  }

  function follow(event: React.PointerEvent<HTMLElement>) {
    if (!gesture) return;
    const wrapper = wrapperRef.current!;
    if (gesture === "resize") {
      const r = radiusAt(
        containerRef.current!,
        live.current.point,
        event.clientX,
        event.clientY,
      );
      live.current.radius = r;
      wrapper.style.setProperty("--tag-r", String(r));
      handleRef.current?.setAttribute("aria-valuenow", String(Math.round(r)));
      return;
    }
    const rect = containerRef.current!.getBoundingClientRect();
    const toPercent = (value: number) => Math.min(100, Math.max(0, value));
    const next = {
      xPercent: toPercent(
        ((event.clientX - live.current.grabX - rect.left) / rect.width) * 100,
      ),
      yPercent: toPercent(
        ((event.clientY - live.current.grabY - rect.top) / rect.height) * 100,
      ),
    };
    live.current.point = next;
    wrapper.style.setProperty("--tag-x", `${next.xPercent}%`);
    wrapper.style.setProperty("--tag-y", `${next.yPercent}%`);
  }

  function end() {
    const kind = gesture;
    setGesture(null);
    if (kind === "resize") onRadiusChange(live.current.radius);
    if (kind === "move") onPointChange(live.current.point);
  }

  function release(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    end();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      onRadiusChange(clamp(radius + step));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      onRadiusChange(clamp(radius - step));
    } else if (event.key === "Enter" && onEnter) {
      onEnter();
    } else if (event.key === "Escape") {
      // Stop here: the lightbox dialog would otherwise close on it too.
      event.stopPropagation();
      onEscape();
    } else {
      return;
    }
    event.preventDefault();
  }

  // --tag-r × 1cqmin = the radius in the layer's own units.
  const r = "var(--tag-r) * 1cqmin";
  const x = "var(--tag-x)";
  const y = "var(--tag-y)";
  // Low on the photo, the slot goes above the circle instead of off the
  // bottom edge.
  const slotAbove = point.yPercent > 65;

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute inset-0"
      style={
        {
          "--tag-x": `${point.xPercent}%`,
          "--tag-y": `${point.yPercent}%`,
          "--tag-r": radius,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="photo-tag-spotlight absolute inset-0 rounded-xl bg-background/65"
        style={
          {
            "--spot-x": x,
            "--spot-y": y,
            "--spot-manual": `calc(${r})`,
            "--spot-feather": "1.35",
          } as React.CSSProperties
        }
      />
      {/* The circle itself: the dashed ring, and its whole inside is the
          grab area for moving it. */}
      <div
        aria-hidden="true"
        className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-dashed border-white/85 ${
          gesture === "move" ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: x,
          top: y,
          width: `calc(2 * ${r})`,
          height: `calc(2 * ${r})`,
        }}
        data-gesture="move"
        onPointerDown={begin}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={end}
        onClick={(event) => event.stopPropagation()}
      />
      <button
        ref={handleRef}
        type="button"
        role="slider"
        aria-label={label}
        aria-valuemin={PHOTO_TAG_RADIUS_MIN}
        aria-valuemax={PHOTO_TAG_RADIUS_MAX}
        aria-valuenow={Math.round(radius)}
        autoFocus={autoFocus}
        className={`pointer-events-auto absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-primary shadow-md outline-none transition-[scale] duration-base ease-(--ease-reveal) hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/60 ${
          gesture === "resize" ? "scale-110" : ""
        }`}
        // On the ring at 45° down-right — clear of the face above the point
        // and of the slot below it.
        style={{
          left: `calc(${x} + ${Math.SQRT1_2} * ${r})`,
          top: `calc(${y} + ${Math.SQRT1_2} * ${r})`,
        }}
        data-gesture="resize"
        onPointerDown={begin}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={end}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      />
      <div
        className={`pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap ${
          slotAbove ? "-translate-y-full" : ""
        }`}
        style={{
          left: x,
          top: slotAbove
            ? `calc(${y} - ${r} - 0.75rem)`
            : `calc(${y} + ${r} + 0.75rem)`,
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.stopPropagation();
          onEscape();
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * «Изменить область» on an already-placed tag: the circle with the
 * person's name and «Готово» under it — movable and resizable like a new
 * one. «Готово», Enter or a tap elsewhere
 * on the photo (PhotoTagLayer) keeps the size; Escape throws it away.
 */
export function PhotoTagRadiusEditor({
  containerRef,
  point,
  onPointChange,
  radius,
  onRadiusChange,
  name,
  onCommit,
  onCancel,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  point: Point;
  onPointChange: (point: Point) => void;
  radius: number;
  onRadiusChange: (radiusPercent: number) => void;
  name: string;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <PhotoTagCircle
      containerRef={containerRef}
      point={point}
      onPointChange={onPointChange}
      radius={radius}
      onRadiusChange={onRadiusChange}
      label={`Размер области: ${name}`}
      autoFocus
      onEnter={onCommit}
      onEscape={onCancel}
    >
      <span className="rounded-full bg-black/55 px-3 py-1 text-sm text-white">
        {name}
      </span>
      <Button
        type="button"
        size="sm"
        // Ends the edit and keeps it — the green confirm (CLAUDE.md).
        className="rounded-full bg-confirm text-confirm-foreground shadow-sm hover:bg-confirm/85"
        onClick={onCommit}
      >
        <CheckIcon />
        Готово
      </Button>
    </PhotoTagCircle>
  );
}
