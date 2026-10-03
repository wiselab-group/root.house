import { describe, expect, it } from "vitest";
import { surnameKey } from "./surname-key";

describe("surnameKey", () => {
  it("reads masculine and feminine forms as one family", () => {
    expect(surnameKey("Козловская")).toBe(surnameKey("Козловский"));
    expect(surnameKey("Чернецкая")).toBe(surnameKey("Чернецкий"));
    expect(surnameKey("Иванова")).toBe(surnameKey("Иванов"));
    expect(surnameKey("Толстая")).toBe(surnameKey("Толстой"));
    expect(surnameKey("Kowalska")).toBe(surnameKey("Kowalski"));
  });

  it("leaves ungendered names alone and keeps families apart", () => {
    expect(surnameKey("Кривуша")).toBe("кривуша");
    expect(surnameKey("Купчик")).not.toBe(surnameKey("Козловский"));
    expect(surnameKey("  ")).toBeNull();
    expect(surnameKey(null)).toBeNull();
  });
});
