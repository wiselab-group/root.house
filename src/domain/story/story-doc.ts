/**
 * A Story's text as a structured document — the shape the story editor
 * (Tiptap, components/story/editor) edits and the story page renders. The
 * node/mark names and JSON layout are Tiptap's own, so this document goes
 * into the editor and comes back out of it unchanged, but the vocabulary is
 * deliberately closed: only what's listed here exists. What's stored in
 * `stories.body` is its Markdown form (story-markdown.ts), not this JSON.
 */

export type StoryMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

/** `marks` on a line break or a mention can come out of the editor (a
 *  break typed inside bold text) but mean nothing and aren't stored. */
export type StoryInline =
  | { type: "text"; text: string; marks?: StoryMark[] }
  | { type: "hardBreak"; marks?: StoryMark[] }
  /** A family member named in the text — `[label](person:id)` in Markdown. */
  | {
      type: "mention";
      attrs: { id: string; label: string };
      marks?: StoryMark[];
    };

export interface StoryParagraph {
  type: "paragraph";
  content?: StoryInline[];
}

/** A chapter heading — the story page's «Содержание» lists these. */
export interface StoryHeading {
  type: "heading";
  attrs: { level: 2 };
  content?: StoryInline[];
}

export interface StoryQuote {
  type: "blockquote";
  content: StoryParagraph[];
}

export interface StoryListItem {
  type: "listItem";
  content: (StoryParagraph | StoryList)[];
}

export type StoryList =
  | { type: "bulletList"; content: StoryListItem[] }
  | { type: "orderedList"; attrs: { start: number }; content: StoryListItem[] };

/** A family photo placed in the text — `::photo[caption]{media=… size=wide}`.
 *  Only a reference: which photo, and whether the viewer may see it, is
 *  resolved against the family's archive when the story is rendered. */
export interface StoryPhoto {
  type: "storyPhoto";
  attrs: { mediaId: string; caption: string; wide: boolean };
}

/** A letter or document from the archive, set as a sheet of paper —
 *  `:::letter[caption]` … `:::`. The caption says what it is and when. */
export interface StoryLetter {
  type: "storyLetter";
  attrs: { caption: string };
  content: StoryParagraph[];
}

export type StoryBlock =
  | StoryParagraph
  | StoryHeading
  | StoryQuote
  | StoryList
  | StoryPhoto
  | StoryLetter;

export interface StoryDoc {
  type: "doc";
  content: StoryBlock[];
}

/** Schemes a link in a story may point to — anything else stays plain text. */
export const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

export const PERSON_LINK_PREFIX = "person:";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** The plain text of inline content — mentions read as their label. */
export function inlineText(content: StoryInline[] | undefined): string {
  return (content ?? [])
    .map((node) =>
      node.type === "text"
        ? node.text
        : node.type === "mention"
          ? node.attrs.label
          : "\n",
    )
    .join("");
}

/** Every family member mentioned anywhere in the document. */
export function mentionedPersonIds(doc: StoryDoc): string[] {
  const ids = new Set<string>();
  const visit = (node: StoryBlock | StoryListItem) => {
    if (node.type === "paragraph" || node.type === "heading") {
      for (const inline of node.content ?? []) {
        if (inline.type === "mention") ids.add(inline.attrs.id);
      }
    } else if ("content" in node) {
      for (const child of node.content) visit(child);
    }
  };
  for (const block of doc.content) visit(block);
  return [...ids];
}

/** Every archive photo placed in the text, in reading order. */
export function storyPhotoIds(doc: StoryDoc): string[] {
  return doc.content
    .filter((block): block is StoryPhoto => block.type === "storyPhoto")
    .map((block) => block.attrs.mediaId);
}
