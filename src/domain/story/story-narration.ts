import { inlineText, type StoryList } from "./story-doc";
import type { StoryLayout, StoryLayoutBlock } from "./story-layout";

/**
 * A Story as something to read aloud — the script for the «Слушать» player
 * (no AI: the device's own voice reads it, see CLAUDE.md § STORIES). Built
 * from the same StoryLayout the page renders, so every phrase knows which
 * block of the reading column it belongs to (to light it up), which chapter
 * it's in (for the progress bar) and which photo the text is next to (the
 * hero shows it while that part is read).
 */

export interface NarrationPhrase {
  text: string;
  /** "title", "lead", or `b${index}` into StoryLayout.blocks. */
  block: string;
  /** StoryLayout.chapters number, null before the first chapter. */
  chapter: number | null;
  /** The photo placed nearest above this text (or the first one, before any). */
  photoId: string | null;
  /** Estimated seconds at normal speed — the voice gives no durations. */
  seconds: number;
}

export interface Narration {
  phrases: NarrationPhrase[];
  /** Chapter titles by number, for the player's «where am I» line. */
  chapters: { number: number; title: string }[];
  /** BCP 47 tag of the story's language, for picking a voice. */
  lang: "ru-RU" | "en-US";
  totalSeconds: number;
}

/** Unhurried read-aloud pace; slower than silent reading (180/min). */
const WORDS_PER_MINUTE = 150;
/** Chrome cuts a single utterance off after ~15 s — keep phrases shorter. */
const MAX_PHRASE_CHARS = 220;

export function buildNarration(title: string, layout: StoryLayout): Narration {
  const phrases: NarrationPhrase[] = [];
  const photos = layout.blocks.flatMap((block) =>
    block.type === "storyPhoto" ? [block.attrs.mediaId] : [],
  );
  let photoId: string | null = photos[0] ?? null;
  let chapter: number | null = null;

  const push = (text: string, block: string) => {
    for (const piece of splitPhrases(text)) {
      phrases.push({
        text: piece,
        block,
        chapter,
        photoId,
        seconds: estimate(piece),
      });
    }
  };

  push(title, "title");
  if (layout.lead) push(inlineText(layout.lead), "lead");
  for (const [index, block] of layout.blocks.entries()) {
    const key = `b${index}`;
    if (block.type === "storyPhoto") {
      photoId = block.attrs.mediaId;
      continue;
    }
    if (block.type === "chapter") chapter = block.number;
    for (const text of blockTexts(block)) push(text, key);
  }

  const all = phrases.map((phrase) => phrase.text).join(" ");
  return {
    phrases,
    chapters: layout.chapters.map(({ number, title: name }) => ({
      number,
      title: name,
    })),
    // Any Cyrillic letter (U+0400–U+04FF) means a Russian-language story.
    lang: /[\u0400-\u04ff]/.test(all) ? "ru-RU" : "en-US",
    totalSeconds: phrases.reduce((sum, phrase) => sum + phrase.seconds, 0),
  };
}

/** Whole minutes for the «Слушать · N мин» label, at least 1. */
export function narrationMinutes(narration: Narration): number {
  return Math.max(1, Math.round(narration.totalSeconds / 60));
}

function blockTexts(block: StoryLayoutBlock): string[] {
  switch (block.type) {
    case "chapter":
      return [block.title];
    case "paragraph":
      return [inlineText(block.content)];
    case "blockquote":
    case "storyLetter":
      return block.content.map((paragraph) => inlineText(paragraph.content));
    case "bulletList":
    case "orderedList":
      return listTexts(block);
    case "storyPhoto":
      return [];
  }
}

function listTexts(list: StoryList): string[] {
  return list.content.flatMap((item) =>
    item.content.flatMap((child) =>
      child.type === "paragraph"
        ? [inlineText(child.content)]
        : listTexts(child),
    ),
  );
}

/**
 * Sentences, each short enough for one utterance: a long sentence is cut at
 * its last comma/semicolon/dash before the limit, or at a space.
 */
export function splitPhrases(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?…])\s+(?=[^\s])/u);
  return sentences.flatMap((sentence) => {
    const pieces: string[] = [];
    let rest = sentence;
    while (rest.length > MAX_PHRASE_CHARS) {
      const window = rest.slice(0, MAX_PHRASE_CHARS);
      const cut = Math.max(
        window.lastIndexOf(", "),
        window.lastIndexOf("; "),
        window.lastIndexOf(" — "),
      );
      const at = cut > MAX_PHRASE_CHARS / 3 ? cut + 1 : window.lastIndexOf(" ");
      if (at <= 0) break;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
    return pieces;
  });
}

function estimate(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return (words / WORDS_PER_MINUTE) * 60;
}
