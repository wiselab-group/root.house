"use client";

import { useTranslations } from "next-intl";
import { useRef, type KeyboardEvent } from "react";
import { ImagesIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StripMode = "people" | "photos";

const tabClass =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums text-muted-foreground transition-colors duration-fast ease-(--ease-reveal) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 aria-selected:bg-glass-strong aria-selected:text-foreground motion-reduce:transition-none [&_svg]:size-4";

/**
 * Switch for the lightbox's bottom strip: all photos ⇄ who's on this photo.
 * Both tabs carry a count, so the people tab says «3» even while the
 * filmstrip is showing — the names are never hidden without a trace
 * (the reason this won over a single quiet toggle in the mock, 2026-09-29).
 * ←/→ move between the tabs (lightbox-keys.ts leaves them alone here).
 */
export function LightboxStripTabs({
  mode,
  onModeChange,
  photoCount,
  peopleCount,
  photosDisabled,
  panelId,
  className,
}: {
  mode: StripMode;
  onModeChange: (mode: StripMode) => void;
  photoCount: number;
  peopleCount: number;
  /** While tagging, the strip is pinned to people. */
  photosDisabled: boolean;
  panelId: string;
  className?: string;
}) {
  const t = useTranslations("media");
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (photosDisabled) return;
    event.preventDefault();
    const next = mode === "people" ? "photos" : "people";
    onModeChange(next);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)
      ?.focus();
  };

  const tabs = [
    {
      value: "photos",
      icon: <ImagesIcon />,
      count: photoCount,
      label: t("stripPhotos"),
    },
    {
      value: "people",
      icon: <UsersIcon />,
      count: peopleCount,
      label: t("stripPeople"),
    },
  ] as const;

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("stripLabel")}
      onKeyDown={onKeyDown}
      className={cn(
        "flex rounded-full border border-glass-edge bg-glass p-0.5 backdrop-blur-xl",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          data-mode={tab.value}
          aria-selected={mode === tab.value}
          aria-controls={panelId}
          aria-label={`${tab.label}: ${tab.count}`}
          title={tab.label}
          tabIndex={mode === tab.value ? 0 : -1}
          disabled={tab.value === "photos" && photosDisabled}
          onClick={() => onModeChange(tab.value)}
          className={tabClass}
        >
          {tab.icon}
          {tab.count}
        </button>
      ))}
    </div>
  );
}
