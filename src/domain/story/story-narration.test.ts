import { describe, expect, it } from "vitest";
import { layoutStoryBody } from "./story-layout";
import { buildNarration, splitPhrases } from "./story-narration";

const PHOTO = "11111111-1111-4111-8111-111111111111";

describe("splitPhrases", () => {
  it("splits sentences", () => {
    expect(splitPhrases("Мы шли к морю. Было тепло! Правда?")).toEqual([
      "Мы шли к морю.",
      "Было тепло!",
      "Правда?",
    ]);
  });

  it("cuts a sentence longer than one utterance at a comma", () => {
    const long = `${"слово ".repeat(30).trim()}, ${"другое ".repeat(20).trim()}.`;
    const pieces = splitPhrases(long);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((piece) => piece.length <= 220)).toBe(true);
    expect(pieces.join(" ")).toBe(long);
  });

  it("drops empty text", () => {
    expect(splitPhrases("  \n ")).toEqual([]);
  });
});

describe("buildNarration", () => {
  const layout = layoutStoryBody(
    [
      "Мы познакомились летом. Он чинил велосипед.",
      "",
      "## Кабернеэме",
      "",
      "Шли вдоль сосен.",
      "",
      `::photo[На берегу]{media=${PHOTO}}`,
      "",
      "Потом было море.",
    ].join("\n"),
  );
  const narration = buildNarration("История знакомства", layout);

  it("reads the title, the lead, chapter titles and paragraphs in order", () => {
    expect(narration.phrases.map((p) => p.text)).toEqual([
      "История знакомства",
      "Мы познакомились летом.",
      "Он чинил велосипед.",
      "Кабернеэме",
      "Шли вдоль сосен.",
      "Потом было море.",
    ]);
  });

  it("knows each phrase's block and chapter", () => {
    expect(narration.phrases.map((p) => [p.block, p.chapter])).toEqual([
      ["title", null],
      ["lead", null],
      ["lead", null],
      ["b0", 1],
      ["b1", 1],
      ["b3", 1],
    ]);
  });

  it("ties text to the nearest photo above it, the first photo before any", () => {
    expect(narration.phrases.every((p) => p.photoId === PHOTO)).toBe(true);
  });

  it("detects the story's language and estimates its length", () => {
    expect(narration.lang).toBe("ru-RU");
    expect(narration.totalSeconds).toBeGreaterThan(0);
  });
});
