import { describe, expect, it } from "vitest";
import {
  layoutStoryBody,
  readingMinutes,
  storyPreviewText,
} from "./story-layout";

const text = (value: string) => ({ type: "text", text: value });

describe("layoutStoryBody", () => {
  it("turns a one-line story into just a lead (real story «История любви»)", () => {
    const layout = layoutStoryBody("Как мы познакомились");
    expect(layout.lead).toEqual([text("Как мы познакомились")]);
    expect(layout.blocks).toEqual([]);
    expect(layout.chapters).toEqual([]);
    expect(layout.wordCount).toBe(3);
  });

  it("splits paragraphs on blank lines, keeping single line breaks inside one", () => {
    const layout = layoutStoryBody(
      "Первый.\n\nВторой,\nс переносом.\n\nТретий.",
    );
    expect(layout.lead).toEqual([text("Первый.")]);
    expect(layout.blocks).toEqual([
      {
        type: "paragraph",
        content: [text("Второй,"), { type: "hardBreak" }, text("с переносом.")],
      },
      { type: "paragraph", content: [text("Третий.")] },
    ]);
  });

  it("reads #/## lines as numbered chapters", () => {
    const layout = layoutStoryBody(
      "Вступление.\n\n## Декабрь\nПервые больные.\n\n# Январь\n\nПерсонал слёг.",
    );
    expect(layout.chapters).toEqual([
      { id: "chapter-1", number: 1, title: "Декабрь" },
      { id: "chapter-2", number: 2, title: "Январь" },
    ]);
    expect(layout.blocks).toEqual([
      { type: "chapter", id: "chapter-1", number: 1, title: "Декабрь" },
      { type: "paragraph", content: [text("Первые больные.")] },
      { type: "chapter", id: "chapter-2", number: 2, title: "Январь" },
      { type: "paragraph", content: [text("Персонал слёг.")] },
    ]);
  });

  it("has no lead when the story opens with a chapter", () => {
    const layout = layoutStoryBody("## Начало\n\nТекст.");
    expect(layout.lead).toBeNull();
    expect(layout.blocks[1]).toEqual({
      type: "paragraph",
      content: [text("Текст.")],
    });
  });

  it("has no lead when the story opens with a quote", () => {
    const layout = layoutStoryBody("> Сколько коек?\n\nТекст.");
    expect(layout.lead).toBeNull();
    expect(layout.blocks.map((block) => block.type)).toEqual([
      "blockquote",
      "paragraph",
    ]);
  });

  it("normalizes Windows line endings", () => {
    expect(layoutStoryBody("А.\r\n\r\nБ.").blocks).toEqual([
      { type: "paragraph", content: [text("Б.")] },
    ]);
  });

  it("counts words without markup", () => {
    expect(
      layoutStoryBody(
        "**Жирное** слово и [Мария](person:0b8e3f5c-2d7a-4e1b-9c3f-5a6d7e8f9a0b)",
      ).wordCount,
    ).toBe(4);
  });
});

describe("storyPreviewText", () => {
  it("strips markup and chapter titles", () => {
    expect(storyPreviewText("## Глава\n\nЭто *очень* **важно**.")).toBe(
      "Это очень важно.",
    );
  });
});

describe("readingMinutes", () => {
  it("never reports zero minutes", () => {
    expect(readingMinutes(3)).toBe(1);
    expect(readingMinutes(1800)).toBe(10);
  });
});
