import {
  inlineText,
  type StoryBlock,
  type StoryDoc,
  type StoryInline,
  type StoryList,
} from "./story-doc";
import { parseStoryMarkdown } from "./story-markdown";

/**
 * Turns a Story's body (Markdown, see story-markdown.ts) into the Story
 * page's reading layout: a paragraph that opens the story becomes the large
 * lead, chapter headings get numbers and anchor ids (the source for the
 * «Содержание» menu), everything else passes through as document blocks.
 * A story that opens with a photo, quote, letter or chapter has no lead —
 * the editor shows the same rule while writing (StoryEditor's lead style).
 */

export interface StoryChapter {
  type: "chapter";
  id: string;
  number: number;
  title: string;
}

export type StoryLayoutBlock =
  Exclude<StoryBlock, { type: "heading" }> | StoryChapter;

export interface StoryLayout {
  lead: StoryInline[] | null;
  blocks: StoryLayoutBlock[];
  chapters: Omit<StoryChapter, "type">[];
  wordCount: number;
}

export function layoutStoryBody(body: string): StoryLayout {
  return layoutStoryDoc(parseStoryMarkdown(body));
}

export function layoutStoryDoc(doc: StoryDoc): StoryLayout {
  const blocks: StoryLayoutBlock[] = [];
  const chapters: StoryLayout["chapters"] = [];
  let lead: StoryInline[] | null = null;

  for (const [index, block] of doc.content.entries()) {
    if (index === 0 && block.type === "paragraph") {
      lead = block.content ?? [];
      continue;
    }
    if (block.type === "heading") {
      const chapter = {
        id: `chapter-${chapters.length + 1}`,
        number: chapters.length + 1,
        title: inlineText(block.content).replace(/\s+/g, " ").trim(),
      };
      chapters.push(chapter);
      blocks.push({ type: "chapter", ...chapter });
      continue;
    }
    blocks.push(block);
  }

  const wordCount = storyPlainText(doc, { headings: true })
    .split(/\s+/)
    .filter(Boolean).length;
  return { lead, blocks, chapters, wordCount };
}

/**
 * The story's words without any markup, paragraphs separated by blank
 * lines — for previews in lists (`headings: false`, a chapter title reads
 * oddly mid-excerpt) and the word count. Photo captions aren't the story's
 * own prose and are left out.
 */
export function storyPlainText(
  doc: StoryDoc,
  { headings }: { headings: boolean },
): string {
  const parts: string[] = [];
  const visit = (block: StoryBlock) => {
    switch (block.type) {
      case "paragraph":
        parts.push(inlineText(block.content));
        break;
      case "heading":
        if (headings) parts.push(inlineText(block.content));
        break;
      case "blockquote":
      case "storyLetter":
        block.content.forEach(visit);
        break;
      case "bulletList":
      case "orderedList":
        visitList(block, visit);
        break;
    }
  };
  doc.content.forEach(visit);
  return parts.filter((part) => part.trim()).join("\n\n");
}

function visitList(list: StoryList, visit: (block: StoryBlock) => void) {
  for (const item of list.content) item.content.forEach(visit);
}

/** A story's plain-text preview straight from its stored body. */
export function storyPreviewText(body: string): string {
  return storyPlainText(parseStoryMarkdown(body), { headings: false });
}

/** Minutes at ~180 words/min (unhurried reading of family prose), at least 1. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 180));
}
