import { describe, expect, it } from "vitest";
import { layoutStoryBody, readingMinutes } from "./story-layout";

describe("layoutStoryBody", () => {
  it("turns a one-line story into just a lead (real story «История любви»)", () => {
    const layout = layoutStoryBody("Как мы познакомились");
    expect(layout.lead).toBe("Как мы познакомились");
    expect(layout.blocks).toEqual([]);
    expect(layout.chapters).toEqual([]);
    expect(layout.wordCount).toBe(3);
  });

  it("splits paragraphs on blank lines, keeping single line breaks inside one", () => {
    const layout = layoutStoryBody(
      "Первый.\n\nВторой,\nс переносом.\n\nТретий.",
    );
    expect(layout.lead).toBe("Первый.");
    expect(layout.blocks).toEqual([
      { type: "paragraph", text: "Второй,\nс переносом." },
      { type: "paragraph", text: "Третий." },
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
      { type: "paragraph", text: "Первые больные." },
      { type: "chapter", id: "chapter-2", number: 2, title: "Январь" },
      { type: "paragraph", text: "Персонал слёг." },
    ]);
  });

  it("has no lead when the story opens with a chapter", () => {
    const layout = layoutStoryBody("## Начало\n\nТекст.");
    expect(layout.lead).toBeNull();
    expect(layout.blocks[1]).toEqual({ type: "paragraph", text: "Текст." });
  });

  it("normalizes Windows line endings", () => {
    expect(layoutStoryBody("А.\r\n\r\nБ.").blocks).toEqual([
      { type: "paragraph", text: "Б." },
    ]);
  });
});

describe("readingMinutes", () => {
  it("never reports zero minutes", () => {
    expect(readingMinutes(3)).toBe(1);
    expect(readingMinutes(1800)).toBe(10);
  });
});
