"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lays its children out at a real app size (width × height in px) and
 * scales the whole thing to fit its parent, centred — so a replica of an
 * app screen keeps every size, gap and font of the original. Fills its
 * parent (absolute inset-0); the parent sets the space, so nothing shifts
 * before the scale is measured — the canvas just fades in once it is.
 */
export function ScaledCanvas({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; x: number; y: number }>();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: boxW, height: boxH } = entry.contentRect;
      const scale = Math.min(boxW / width, boxH / height);
      setFit({
        scale,
        x: (boxW - width * scale) / 2,
        y: (boxH - height * scale) / 2,
      });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left transition-opacity duration-slow ease-(--ease-reveal)"
        style={{
          width,
          height,
          transform: fit
            ? `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`
            : undefined,
          opacity: fit ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
