import { describe, expect, it } from "vitest";
import { parseNarrationCues, storyTextHash } from "./narration-cues";
import { blockAt } from "./story-narration";

describe("parseNarrationCues", () => {
  const good = [
    { block: "title", ms: 0 },
    { block: "lead", ms: 2100 },
    { block: "b0", ms: 9000 },
  ];

  it("accepts cues from the start, in order, inside the recording", () => {
    expect(parseNarrationCues(good, 12000)).toEqual(good);
  });

  it("rejects anything off", () => {
    expect(parseNarrationCues("nope", 12000)).toBeNull();
    expect(parseNarrationCues([], 12000)).toBeNull();
    expect(parseNarrationCues([{ block: "lead", ms: 5 }], 12000)).toBeNull();
    expect(
      parseNarrationCues(
        [
          { block: "title", ms: 0 },
          { block: "x1", ms: 5 },
        ],
        99,
      ),
    ).toBeNull();
    expect(parseNarrationCues(good, 8000)).toBeNull();
    expect(
      parseNarrationCues(
        [
          { block: "title", ms: 0 },
          { block: "b1", ms: 900 },
          { block: "b0", ms: 800 },
        ],
        12000,
      ),
    ).toBeNull();
    expect(parseNarrationCues([{ block: "title", ms: 0.5 }], 12000)).toBeNull();
  });
});

describe("storyTextHash", () => {
  it("changes with the title or the text", () => {
    const base = storyTextHash("История", "Текст");
    expect(storyTextHash("История", "Текст")).toBe(base);
    expect(storyTextHash("История", "Текст!")).not.toBe(base);
    expect(storyTextHash("Другая", "Текст")).not.toBe(base);
  });
});

describe("blockAt", () => {
  const cues = [
    { block: "title", ms: 0 },
    { block: "lead", ms: 2000 },
    { block: "b0", ms: 5000 },
  ];
  it("finds the block being read at a moment of the recording", () => {
    expect(blockAt(cues, 0)).toBe("title");
    expect(blockAt(cues, 1999)).toBe("title");
    expect(blockAt(cues, 2000)).toBe("lead");
    expect(blockAt(cues, 99999)).toBe("b0");
  });
});
