import { describe, expect, it } from "vitest";
import { pickVoice } from "./pick-voice";

const voice = (name: string, lang: string, isDefault = false) => ({
  name,
  lang,
  default: isDefault,
  localService: true,
});

describe("pickVoice", () => {
  it("prefers a natural/enhanced voice of the story's language", () => {
    const voices = [
      voice("Milena", "ru-RU", true),
      voice("Microsoft Svetlana Online (Natural)", "ru-RU"),
      voice("Samantha", "en-US"),
    ];
    expect(pickVoice(voices, "ru-RU")?.name).toBe(
      "Microsoft Svetlana Online (Natural)",
    );
  });

  it("never picks another language", () => {
    expect(pickVoice([voice("Samantha", "en-US", true)], "ru-RU")).toBeNull();
  });

  it("accepts another region of the same language, and Android's ru_RU", () => {
    expect(pickVoice([voice("Русский", "ru_RU")], "ru-RU")?.name).toBe(
      "Русский",
    );
  });
});
