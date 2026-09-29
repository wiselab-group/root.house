"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CaptionPlacement = "bar" | "below";

export const captionTextClass =
  "block min-w-0 truncate font-heading text-foreground";

/**
 * A read-only lightbox caption, always one line so the photo's box never
 * changes height between captions. A caption too long for its line becomes
 * a button that opens the full text in a panel laid OVER the photo (below
 * the top bar on desktop, above the strip on phones) — reading it never
 * pushes the photo around. Closes on a second click or when focus leaves.
 */
export function PhotoCaptionText({
  text,
  placement,
}: {
  text: string;
  placement: CaptionPlacement;
}) {
  const t = useTranslations("media");
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const size = placement === "bar" ? "text-lg" : "text-base";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
    // `truncated` too: switching to the button remounts the span.
  }, [text, truncated]);

  const line = (
    <span ref={ref} className={cn(captionTextClass, size)}>
      {text}
    </span>
  );

  if (!truncated) return <p className="min-w-0">{line}</p>;

  return (
    <div className="relative min-w-0" onBlur={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        title={t("showFullCaption")}
        onClick={() => setOpen((v) => !v)}
        className="block w-full min-w-0 cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {line}
      </button>
      {open && (
        <p
          className={cn(
            "absolute z-20 w-[min(40rem,calc(100vw-1.5rem))] animate-in rounded-2xl border border-glass-edge bg-popover/95 p-4 font-heading text-pretty text-foreground shadow-xl shadow-black/40 backdrop-blur-xl duration-base ease-(--ease-reveal) fade-in-0 motion-reduce:animate-none",
            size,
            placement === "bar"
              ? "top-full left-0 mt-2 slide-in-from-top-1"
              : "bottom-full left-0 mb-2 slide-in-from-bottom-1",
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}
