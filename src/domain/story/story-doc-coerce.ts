import {
  SAFE_LINK,
  isUuid,
  type StoryBlock,
  type StoryDoc,
  type StoryInline,
  type StoryList,
  type StoryListItem,
  type StoryMark,
  type StoryParagraph,
} from "./story-doc";

/**
 * The editor's JSON (Tiptap's loosely typed `JSONContent`) → a StoryDoc,
 * keeping only the story's vocabulary: an unknown node's text survives as
 * a paragraph, unknown marks are dropped. The editor's schema already
 * allows nothing else, so in practice this is a typed read, not a repair —
 * but it never trusts the shape.
 */
export function coerceStoryDoc(json: unknown): StoryDoc {
  return { type: "doc", content: blocks(children(json), true) };
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null;
}

function children(node: unknown): Json[] {
  if (!isObject(node) || !Array.isArray(node.content)) return [];
  return node.content.filter(isObject);
}

function attr(node: Json, name: string): unknown {
  return isObject(node.attrs) ? node.attrs[name] : undefined;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function blocks(nodes: Json[], topLevel: boolean): StoryBlock[] {
  return nodes.flatMap((node): StoryBlock[] => {
    switch (node.type) {
      case "paragraph":
        return [paragraph(node)];
      case "heading":
        return topLevel
          ? [{ type: "heading", attrs: { level: 2 }, ...inlineContent(node) }]
          : [paragraph(node)];
      case "blockquote":
        return [{ type: "blockquote", content: paragraphs(children(node)) }];
      case "bulletList":
      case "orderedList":
        return [list(node)];
      case "storyPhoto": {
        const mediaId = str(attr(node, "mediaId"));
        return isUuid(mediaId)
          ? [
              {
                type: "storyPhoto",
                attrs: {
                  mediaId,
                  caption: str(attr(node, "caption")),
                  wide: attr(node, "wide") === true,
                },
              },
            ]
          : [];
      }
      case "storyLetter":
        return [
          {
            type: "storyLetter",
            attrs: { caption: str(attr(node, "caption")) },
            content: paragraphs(children(node)),
          },
        ];
      default:
        return paragraphs(children(node));
    }
  });
}

function paragraph(node: Json): StoryParagraph {
  return { type: "paragraph", ...inlineContent(node) };
}

/** Paragraphs only — the content of a quote or a letter. */
function paragraphs(nodes: Json[]): StoryParagraph[] {
  return blocks(nodes, false).flatMap(flattenToParagraphs);
}

function flattenToParagraphs(block: StoryBlock): StoryParagraph[] {
  switch (block.type) {
    case "paragraph":
      return [block];
    case "blockquote":
    case "storyLetter":
      return block.content;
    case "bulletList":
    case "orderedList":
      return block.content.flatMap((item) =>
        item.content.flatMap(flattenToParagraphs),
      );
    default:
      return [];
  }
}

function list(node: Json): StoryList {
  const content = children(node).map((item): StoryListItem => ({
    type: "listItem",
    content: blocks(children(item), false).flatMap((block) =>
      block.type === "paragraph" ||
      block.type === "bulletList" ||
      block.type === "orderedList"
        ? [block]
        : [],
    ),
  }));
  if (node.type !== "orderedList") return { type: "bulletList", content };
  const start = attr(node, "start");
  return {
    type: "orderedList",
    attrs: { start: typeof start === "number" ? start : 1 },
    content,
  };
}

function inlineContent(node: Json): { content?: StoryInline[] } {
  const content = children(node).flatMap(inline);
  return content.length > 0 ? { content } : {};
}

function inline(node: Json): StoryInline[] {
  if (node.type === "hardBreak") return [{ type: "hardBreak" }];
  if (node.type === "mention") {
    const id = str(attr(node, "id"));
    const label = str(attr(node, "label"));
    return isUuid(id) && label
      ? [{ type: "mention", attrs: { id, label } }]
      : label
        ? [{ type: "text", text: label }]
        : [];
  }
  if (node.type !== "text" || !str(node.text)) return [];
  const marks = (Array.isArray(node.marks) ? node.marks : [])
    .filter(isObject)
    .flatMap(mark);
  return [
    marks.length > 0
      ? { type: "text", text: str(node.text), marks }
      : { type: "text", text: str(node.text) },
  ];
}

function mark(node: Json): StoryMark[] {
  if (node.type === "bold" || node.type === "italic") {
    return [{ type: node.type }];
  }
  const href = str(attr(node, "href"));
  return node.type === "link" && SAFE_LINK.test(href)
    ? [{ type: "link", attrs: { href } }]
    : [];
}
