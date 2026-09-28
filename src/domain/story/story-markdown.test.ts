import { describe, expect, it } from "vitest";
import { parseStoryMarkdown, serializeStoryDoc } from "./story-markdown";
import type { StoryDoc } from "./story-doc";

const PERSON = "0b8e3f5c-2d7a-4e1b-9c3f-5a6d7e8f9a0b";
const MEDIA = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

/** Document → Markdown → document must come back identical. */
function roundTrip(doc: StoryDoc) {
  const markdown = serializeStoryDoc(doc);
  expect(parseStoryMarkdown(markdown)).toEqual(doc);
  return markdown;
}

const p = (...content: StoryDoc["content"][number][]) => content;

describe("parseStoryMarkdown — bodies written before rich text", () => {
  it("keeps paragraphs, single line breaks and # chapters", () => {
    expect(
      parseStoryMarkdown("Вступление.\n\n# Декабрь\nПервые,\nбольные."),
    ).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Вступление." }] },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Декабрь" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Первые," },
            { type: "hardBreak" },
            { type: "text", text: "больные." },
          ],
        },
      ],
    });
  });

  it("reads raw HTML, images and code as plain text, never as markup", () => {
    const doc = parseStoryMarkdown(
      '<img src=x onerror="alert(1)">\n\n![портрет](http://x/y.jpg) и `код`',
    );
    expect(doc.content).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: '<img src=x onerror="alert(1)">' }],
      },
      { type: "paragraph", content: [{ type: "text", text: "портрет и код" }] },
    ]);
  });

  it("drops unsafe link schemes but keeps their text", () => {
    expect(parseStoryMarkdown("[жми](javascript:alert(1))").content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "жми" }] },
    ]);
  });

  it("does not read «слово:слово» as an inline directive", () => {
    expect(parseStoryMarkdown("см.:стр и 10:30").content).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "см.:стр и 10:30" }],
      },
    ]);
  });

  it("ignores a photo whose id isn't a uuid", () => {
    expect(parseStoryMarkdown("::photo{media=../../etc}").content).toEqual([]);
  });
});

describe("round trip", () => {
  it("bold, italic, both, links and mentions", () => {
    const md = roundTrip({
      type: "doc",
      content: p({
        type: "paragraph",
        content: [
          { type: "text", text: "Отец " },
          { type: "text", text: "перестал", marks: [{ type: "bold" }] },
          { type: "text", text: " " },
          { type: "text", text: "ходить", marks: [{ type: "italic" }] },
          { type: "text", text: " " },
          {
            type: "text",
            text: "домой",
            marks: [{ type: "bold" }, { type: "italic" }],
          },
          { type: "text", text: ". Спросите " },
          { type: "mention", attrs: { id: PERSON, label: "Марию Белову" } },
          { type: "text", text: " или " },
          {
            type: "text",
            text: "архив",
            marks: [
              { type: "link", attrs: { href: "https://example.org/a_b" } },
            ],
          },
          { type: "text", text: "." },
        ],
      }),
    });
    expect(md).toContain(`[Марию Белову](person:${PERSON})`);
  });

  it("moves edge whitespace out of emphasis so it parses back", () => {
    const markdown = serializeStoryDoc({
      type: "doc",
      content: p({
        type: "paragraph",
        content: [
          { type: "text", text: "а" },
          { type: "text", text: " жирно ", marks: [{ type: "bold" }] },
          { type: "text", text: "б" },
        ],
      }),
    });
    expect(markdown).toBe("а **жирно** б");
  });

  it("bold punctuation next to a letter", () => {
    roundTrip({
      type: "doc",
      content: p({
        type: "paragraph",
        content: [
          { type: "text", text: "«Цитата»", marks: [{ type: "bold" }] },
          { type: "text", text: "сразу" },
        ],
      }),
    });
  });

  it("markdown-looking plain text survives", () => {
    roundTrip({
      type: "doc",
      content: p({
        type: "paragraph",
        content: [
          { type: "text", text: "# не глава, *не курсив*, 1. не список" },
          { type: "hardBreak" },
          { type: "text", text: "- и не пункт [не ссылка](x)" },
        ],
      }),
    });
  });

  it("chapters, quotes, lists, photos and letters", () => {
    const md = roundTrip({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Лид." }],
        },
        {
          type: "storyPhoto",
          attrs: { mediaId: MEDIA, caption: "Веранда [1919]", wide: true },
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Январь" }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Сколько коек?" }],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "раз" }] },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "два" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "storyLetter",
          attrs: { caption: "Письмо к Ольге, 12 января 1919" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Оля, не приходи." }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Целую. Н." }],
            },
          ],
        },
        {
          type: "storyPhoto",
          attrs: { mediaId: MEDIA, caption: "", wide: false },
        },
      ],
    });
    expect(md).toContain(
      `::photo[Веранда \\[1919\\]]{media="${MEDIA}" size="wide"}`,
    );
    expect(md).toContain(":::letter[Письмо к Ольге, 12 января 1919]");
  });

  it("drops empty paragraphs the editor leaves between blocks", () => {
    expect(
      serializeStoryDoc({
        type: "doc",
        content: [
          { type: "paragraph" },
          { type: "paragraph", content: [{ type: "text", text: "А" }] },
          { type: "paragraph", content: [{ type: "text", text: "  " }] },
        ],
      }),
    ).toBe("А");
  });
});
