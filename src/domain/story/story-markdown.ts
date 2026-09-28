import type {
  BlockContent,
  DefinitionContent,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import {
  directiveFromMarkdown,
  directiveToMarkdown,
  type ContainerDirective,
  type LeafDirective,
} from "mdast-util-directive";
import { directive } from "micromark-extension-directive";
import {
  PERSON_LINK_PREFIX,
  SAFE_LINK,
  inlineText,
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
 * `stories.body` is Markdown: CommonMark plus two block directives —
 * `::photo[caption]{media=<id> size=wide}` and `:::letter[caption]` … `:::`
 * — and person links `[label](person:<id>)`. Only block (flow) directives
 * are enabled: inline `:name` directives would swallow ordinary text such
 * as «см.:стр».
 *
 * The same two functions run in the editor (loading/saving) and on the
 * server (rendering), so what the editor wrote is exactly what the page
 * reads. Parsing is lenient by design: anything outside the story's
 * vocabulary (raw HTML, images, code, rules) degrades to plain text or is
 * dropped, never rendered as-is. Bodies written before rich text (plain
 * text, `#` chapters, single line breaks inside a paragraph) parse to the
 * same layout they always had.
 */

const flowDirectives = { flow: directive().flow };

export function parseStoryMarkdown(markdown: string): StoryDoc {
  const tree = fromMarkdown(markdown.replace(/\r\n?/g, "\n"), {
    extensions: [flowDirectives],
    mdastExtensions: [directiveFromMarkdown()],
  });
  return { type: "doc", content: blocksOf(tree.children, true) };
}

export function serializeStoryDoc(doc: StoryDoc): string {
  const root: Root = {
    type: "root",
    children: doc.content.flatMap((block) => blockToMdast(block)),
  };
  return toMarkdown(root, {
    extensions: [directiveToMarkdown()],
    bullet: "-",
    emphasis: "*",
    strong: "*",
    listItemIndent: "one",
    // A lone line break stays a line break (see inlineOf's text case), so
    // there is no need for CommonMark's trailing-backslash hard break.
    handlers: { break: () => "\n" },
  }).trim();
}

// ─── Markdown → document ────────────────────────────────────────────────

type MdBlock = RootContent | BlockContent | DefinitionContent;

function blocksOf(nodes: MdBlock[], topLevel: boolean): StoryBlock[] {
  return nodes.flatMap((node) => blockOf(node, topLevel));
}

function blockOf(node: MdBlock, topLevel: boolean): StoryBlock[] {
  switch (node.type) {
    case "paragraph":
      return nonEmpty(paragraph(inlineOf(node.children)));
    case "heading": {
      const content = inlineOf(node.children);
      if (!topLevel) return nonEmpty(paragraph(content));
      return content.length > 0
        ? [{ type: "heading", attrs: { level: 2 }, content }]
        : [];
    }
    case "blockquote": {
      const content = paragraphsOf(node.children);
      return content.length > 0 ? [{ type: "blockquote", content }] : [];
    }
    case "list":
      return [listOf(node)];
    case "leafDirective":
      return photoOf(node);
    case "containerDirective":
      return node.name === "letter"
        ? letterOf(node)
        : blocksOf(node.children, topLevel);
    case "code":
    case "html":
      return nonEmpty(paragraph(textWithBreaks(node.value, [])));
    default:
      return [];
  }
}

function paragraph(content: StoryInline[]): StoryParagraph {
  return content.length > 0
    ? { type: "paragraph", content }
    : { type: "paragraph" };
}

function nonEmpty(block: StoryParagraph): StoryParagraph[] {
  return inlineText(block.content).trim() ? [block] : [];
}

/** Paragraphs only — the content of a quote or a letter. */
function paragraphsOf(nodes: MdBlock[]): StoryParagraph[] {
  return blocksOf(nodes, false).flatMap((block) =>
    block.type === "paragraph"
      ? [block]
      : block.type === "blockquote" || block.type === "storyLetter"
        ? block.content
        : block.type === "bulletList" || block.type === "orderedList"
          ? listParagraphs(block)
          : [],
  );
}

function listParagraphs(list: StoryList): StoryParagraph[] {
  return list.content.flatMap((item) =>
    item.content.flatMap((child) =>
      child.type === "paragraph" ? [child] : listParagraphs(child),
    ),
  );
}

function listOf(node: List): StoryList {
  const content = node.children.map(listItemOf);
  return node.ordered
    ? { type: "orderedList", attrs: { start: node.start ?? 1 }, content }
    : { type: "bulletList", content };
}

function listItemOf(node: ListItem): StoryListItem {
  const content: StoryListItem["content"] = [];
  for (const block of blocksOf(node.children, false)) {
    if (block.type === "bulletList" || block.type === "orderedList") {
      content.push(block);
    } else if (block.type === "paragraph") {
      content.push(block);
    }
  }
  // Tiptap's list item must open with a paragraph.
  if (content[0]?.type !== "paragraph") content.unshift(paragraph([]));
  return { type: "listItem", content };
}

function photoOf(node: LeafDirective): StoryBlock[] {
  const mediaId = node.attributes?.media ?? "";
  if (node.name !== "photo" || !isUuid(mediaId)) return [];
  return [
    {
      type: "storyPhoto",
      attrs: {
        mediaId,
        caption: inlineText(inlineOf(node.children)).trim(),
        wide: node.attributes?.size === "wide",
      },
    },
  ];
}

function letterOf(node: ContainerDirective): StoryBlock[] {
  const [first, ...rest] = node.children;
  const hasLabel = first?.type === "paragraph" && first.data?.directiveLabel;
  const caption = hasLabel ? inlineText(inlineOf(first.children)).trim() : "";
  const content = paragraphsOf(hasLabel ? rest : node.children);
  return content.length > 0
    ? [{ type: "storyLetter", attrs: { caption }, content }]
    : [];
}

function inlineOf(
  nodes: PhrasingContent[],
  marks: StoryMark[] = [],
): StoryInline[] {
  return mergeText(nodes.flatMap((node) => inlineNode(node, marks)));
}

function inlineNode(node: PhrasingContent, marks: StoryMark[]): StoryInline[] {
  switch (node.type) {
    case "text":
      return textWithBreaks(node.value, marks);
    case "strong":
      return inlineOf(node.children, withMark(marks, { type: "bold" }));
    case "emphasis":
      return inlineOf(node.children, withMark(marks, { type: "italic" }));
    case "break":
      return [{ type: "hardBreak" }];
    case "link": {
      if (node.url.startsWith(PERSON_LINK_PREFIX)) {
        const id = node.url.slice(PERSON_LINK_PREFIX.length);
        const label = inlineText(inlineOf(node.children)).trim();
        if (isUuid(id) && label) {
          return [{ type: "mention", attrs: { id, label } }];
        }
      }
      if (SAFE_LINK.test(node.url)) {
        const link: StoryMark = { type: "link", attrs: { href: node.url } };
        return inlineOf(node.children, withMark(marks, link));
      }
      return inlineOf(node.children, marks);
    }
    case "inlineCode":
    case "html":
      return textWithBreaks(node.value, marks);
    case "image":
    case "imageReference":
      return node.alt ? textWithBreaks(node.alt, marks) : [];
    case "linkReference":
    case "delete":
      return inlineOf(node.children, marks);
    default:
      return [];
  }
}

function withMark(marks: StoryMark[], mark: StoryMark): StoryMark[] {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

/** A newline inside a paragraph is a line break the writer typed. */
function textWithBreaks(value: string, marks: StoryMark[]): StoryInline[] {
  const out: StoryInline[] = [];
  value.split("\n").forEach((line, index) => {
    if (index > 0) out.push({ type: "hardBreak" });
    if (line) out.push(textNode(line, marks));
  });
  return out;
}

function textNode(text: string, marks: StoryMark[]): StoryInline {
  return marks.length > 0
    ? { type: "text", text, marks: sortMarks(marks) }
    : { type: "text", text };
}

const MARK_ORDER: StoryMark["type"][] = ["link", "bold", "italic"];

function sortMarks(marks: StoryMark[]): StoryMark[] {
  return [...marks].sort(
    (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
  );
}

function sameMarks(a: StoryMark[] = [], b: StoryMark[] = []): boolean {
  return (
    a.length === b.length &&
    a.every((mark, i) => JSON.stringify(mark) === JSON.stringify(b[i]))
  );
}

function mergeText(nodes: StoryInline[]): StoryInline[] {
  const out: StoryInline[] = [];
  for (const node of nodes) {
    const last = out.at(-1);
    if (
      node.type === "text" &&
      last?.type === "text" &&
      sameMarks(last.marks, node.marks)
    ) {
      out[out.length - 1] = { ...last, text: last.text + node.text };
    } else {
      out.push(node);
    }
  }
  return out;
}

// ─── document → Markdown ────────────────────────────────────────────────

function blockToMdast(block: StoryBlock): RootContent[] {
  switch (block.type) {
    case "paragraph":
      return inlineText(block.content).trim() ? [paragraphToMdast(block)] : [];
    case "heading":
      return [
        { type: "heading", depth: 2, children: phrasing(block.content ?? []) },
      ];
    case "blockquote":
      return [
        { type: "blockquote", children: block.content.map(paragraphToMdast) },
      ];
    case "bulletList":
    case "orderedList":
      return [listToMdast(block)];
    case "storyPhoto":
      return [
        {
          type: "leafDirective",
          name: "photo",
          attributes: {
            media: block.attrs.mediaId,
            ...(block.attrs.wide ? { size: "wide" } : {}),
          },
          children: block.attrs.caption
            ? [{ type: "text", value: block.attrs.caption }]
            : [],
        },
      ];
    case "storyLetter":
      return [
        {
          type: "containerDirective",
          name: "letter",
          children: [
            ...(block.attrs.caption
              ? [
                  {
                    type: "paragraph" as const,
                    data: { directiveLabel: true },
                    children: [
                      { type: "text" as const, value: block.attrs.caption },
                    ],
                  },
                ]
              : []),
            ...block.content.map(paragraphToMdast),
          ],
        },
      ];
  }
}

function paragraphToMdast(block: StoryParagraph): Paragraph {
  return { type: "paragraph", children: phrasing(block.content ?? []) };
}

function listToMdast(list: StoryList): List {
  return {
    type: "list",
    ordered: list.type === "orderedList",
    start: list.type === "orderedList" ? list.attrs.start : null,
    spread: false,
    children: list.content.map((item) => ({
      type: "listItem",
      spread: false,
      children: item.content.map((child) =>
        child.type === "paragraph"
          ? paragraphToMdast(child)
          : listToMdast(child),
      ),
    })),
  };
}

/**
 * Inline nodes → nested mdast. Neighbours that share a mark are wrapped
 * once (`**a *b***`, not `**a****_b_**`), outermost first in MARK_ORDER;
 * whitespace at the edge of bold/italic moves outside it, where CommonMark
 * would otherwise refuse to read the delimiters back as emphasis.
 */
function phrasing(nodes: StoryInline[]): PhrasingContent[] {
  return wrap(nodes.flatMap(splitEdgeWhitespace), []);
}

function splitEdgeWhitespace(node: StoryInline): StoryInline[] {
  // A person link can't sit inside another link, and a lone break or a
  // name wrapped in `**` would only add noise to the stored text.
  if (node.type !== "text") return [{ ...node, marks: undefined }];
  if (!node.marks?.length) return [node];
  const match = node.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || (!match[1] && !match[3])) return [node];
  const outer = node.marks.filter((m) => m.type === "link");
  const parts: StoryInline[] = [];
  if (match[1]) parts.push(textNode(match[1], outer));
  if (match[2]) parts.push({ ...node, text: match[2] });
  if (match[3]) parts.push(textNode(match[3], outer));
  return parts;
}

function marksOf(node: StoryInline): StoryMark[] {
  return node.marks ?? [];
}

function wrap(nodes: StoryInline[], applied: StoryMark[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    const next = nextMark(node, applied);
    if (!next) {
      out.push(leaf(node));
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < nodes.length && hasMark(nodes[end], next)) end += 1;
    const children = wrap(nodes.slice(i, end), [...applied, next]);
    out.push(
      next.type === "link"
        ? { type: "link", url: next.attrs.href, children }
        : next.type === "bold"
          ? { type: "strong", children }
          : { type: "emphasis", children },
    );
    i = end;
  }
  return out;
}

function nextMark(node: StoryInline, applied: StoryMark[]): StoryMark | null {
  const pending = sortMarks(marksOf(node)).filter(
    (mark) => !applied.some((a) => a.type === mark.type),
  );
  return pending[0] ?? null;
}

function hasMark(node: StoryInline, mark: StoryMark): boolean {
  return marksOf(node).some((m) => JSON.stringify(m) === JSON.stringify(mark));
}

function leaf(node: StoryInline): PhrasingContent {
  if (node.type === "text") return { type: "text", value: node.text };
  if (node.type === "hardBreak") return { type: "break" };
  return {
    type: "link",
    url: `${PERSON_LINK_PREFIX}${node.attrs.id}`,
    children: [{ type: "text", value: node.attrs.label }],
  };
}
