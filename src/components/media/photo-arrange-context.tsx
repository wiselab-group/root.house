"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ArrowDownUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoArrangeState {
  isArranging: boolean;
  setArranging: (value: boolean) => void;
}

const PhotoArrangeContext = createContext<PhotoArrangeState | null>(null);

/**
 * Shares PhotoGrid's «Упорядочить» mode with the section heading above it,
 * so the button can sit on the same row as «Добавить» (user request)
 * instead of on a row of its own over the grid. Only the on/off flag lives
 * here — the draft order stays in PhotoGrid (usePhotoGridReorder), which
 * owns the photos.
 */
export function PhotoArrangeProvider({ children }: { children: ReactNode }) {
  const [isArranging, setArranging] = useState(false);
  return (
    <PhotoArrangeContext value={{ isArranging, setArranging }}>
      {children}
    </PhotoArrangeContext>
  );
}

export function usePhotoArrange(): PhotoArrangeState {
  const state = useContext(PhotoArrangeContext);
  if (!state) {
    throw new Error("PhotoGrid must be inside a PhotoArrangeProvider");
  }
  return state;
}

/**
 * «Упорядочить» for a section heading. `look` matches whatever it sits
 * next to: the profile's text-link «+ Добавить», or the archive page's
 * filled «Добавить» button. While the mode is on it stays in the layout,
 * invisible, so the heading doesn't shift — «Готово»/«Отмена» live in the
 * bar at the bottom of the screen then.
 */
export function PhotoArrangeHeaderButton({
  look,
}: {
  look: "link" | "button";
}) {
  const { isArranging, setArranging } = usePhotoArrange();
  const hidden = isArranging ? "invisible" : "";

  if (look === "button") {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setArranging(true)}
        className={`text-muted-foreground hover:text-foreground ${hidden}`}
      >
        <ArrowDownUpIcon />
        {/* Icon only on phones — next to the page title and «Добавить» the
            full label pushed the row past a 390px screen. */}
        <span className="max-sm:sr-only">Упорядочить</span>
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArranging(true)}
      className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-sm text-sm text-foreground/60 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:size-9 max-sm:justify-center max-sm:rounded-full ${hidden}`}
    >
      {/* Icon only on phones, like ProfileSectionWithAdd's own actions. */}
      <ArrowDownUpIcon
        className="size-3.5 max-sm:size-4.5"
        aria-hidden="true"
      />
      <span className="max-sm:sr-only">Упорядочить</span>
    </button>
  );
}
