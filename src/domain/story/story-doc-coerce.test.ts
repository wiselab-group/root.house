import { describe, expect, it } from "vitest";
import { coerceStoryDoc } from "./story-doc-coerce";

const MEDIA = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

describe("coerceStoryDoc", () => {
  it("keeps the story's vocabulary as is", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "а", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
          ],
        },
        {
          type: "storyPhoto",
          attrs: { mediaId: MEDIA, caption: "Веранда", wide: true },
        },
      ],
    };
    expect(coerceStoryDoc(doc)).toEqual(doc);
  });

  it("drops unknown marks, unsafe links and photos without a real id", () => {
    expect(
      coerceStoryDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [
                  { type: "strike" },
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
          { type: "storyPhoto", attrs: { mediaId: "../etc" } },
        ],
      }),
    ).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
    });
  });

  it("flattens anything but paragraphs inside a quote", () => {
    expect(
      coerceStoryDoc({
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "пункт" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }).content,
    ).toEqual([
      {
        type: "blockquote",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "пункт" }] },
        ],
      },
    ]);
  });

  it("survives garbage", () => {
    expect(coerceStoryDoc(null)).toEqual({ type: "doc", content: [] });
    expect(
      coerceStoryDoc({ content: [1, "x", { type: "codeBlock" }] }),
    ).toEqual({ type: "doc", content: [] });
  });
});
