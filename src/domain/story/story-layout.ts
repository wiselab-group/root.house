/**
 * Turns a Story's plain-text body into the Story page's reading layout: the
 * first paragraph becomes the large lead, blank-line-separated paragraphs
 * become body paragraphs, and a line starting with "#"/"##" becomes a
 * chapter heading (the source for the «Содержание» menu). Bodies are plain
 * text typed into a textarea — this is deliberately the whole "markup"
 * vocabulary, not a Markdown subset.
 */

export type StoryBlock =
  | { type: "paragraph"; text: string }
  | { type: "chapter"; id: string; number: number; title: string };

export interface StoryLayout {
  lead: string | null;
  blocks: StoryBlock[];
  chapters: { id: string; number: number; title: string }[];
  wordCount: number;
}

const HEADING = /^#{1,3}\s+(.+)$/;

export function layoutStoryBody(body: string): StoryLayout {
  const chunks = body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const blocks: StoryBlock[] = [];
  const chapters: StoryLayout["chapters"] = [];
  let lead: string | null = null;

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const heading = lines[0].match(HEADING);
    if (heading) {
      const chapter = {
        id: `chapter-${chapters.length + 1}`,
        number: chapters.length + 1,
        title: heading[1].trim(),
      };
      chapters.push(chapter);
      blocks.push({ type: "chapter", ...chapter });
      const rest = lines.slice(1).join("\n").trim();
      if (rest) blocks.push({ type: "paragraph", text: rest });
      continue;
    }
    if (lead === null && blocks.length === 0) {
      lead = chunk;
      continue;
    }
    blocks.push({ type: "paragraph", text: chunk });
  }

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  return { lead, blocks, chapters, wordCount };
}

/** Minutes at ~180 words/min (unhurried reading of family prose), at least 1. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 180));
}
