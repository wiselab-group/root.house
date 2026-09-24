"use client";

import { useEffect, useState } from "react";
import { ContentsMenu } from "@/components/hero/contents-menu";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const roman = (n: number) => ROMAN[n - 1] ?? String(n);

/**
 * The Story page's sticky «Содержание» pill. While reading, the pill shows
 * the chapter currently on screen instead of the word «Содержание» (the
 * last chapter heading scrolled above ~⅓ of the viewport). Only rendered
 * for stories with 2+ chapters — a one-section story has nothing to jump to.
 * No initial measurement on mount: the page opens at the top, above every
 * chapter, where «Содержание» is already the right label.
 */
export function StoryChaptersNav({
  chapters,
}: {
  chapters: { id: string; number: number; title: string }[];
}) {
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight / 3;
      let found: string | null = null;
      for (const chapter of chapters) {
        const el = document.getElementById(chapter.id);
        if (el && el.getBoundingClientRect().top < line) found = chapter.id;
      }
      setCurrentId(found);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapters]);

  const current = chapters.find((c) => c.id === currentId);

  return (
    <div className="sticky top-3 z-30 flex justify-center px-4 pt-6">
      <ContentsMenu
        menuId="story-chapters"
        menuLabel="Главы истории"
        buttonLabel={
          current ? `${roman(current.number)} · ${current.title}` : "Содержание"
        }
        items={chapters.map((chapter) => ({
          id: chapter.id,
          label: chapter.title,
          aside: roman(chapter.number),
          current: chapter.id === currentId,
        }))}
      />
    </div>
  );
}
