import { describe, expect, it } from "vitest";
import { demoKinship } from "./kinship-demo";

describe("demoKinship", () => {
  it("traces you to your uncle through your mother and grandfather", () => {
    const { summary, stops } = demoKinship("owen", "paul", "en");
    expect(stops.map((s) => s.personId)).toEqual([
      "owen",
      "margaret",
      "ivan",
      "paul",
    ]);
    expect(stops.find((s) => s.isCommonAncestor)?.personId).toBe("ivan");
    expect(summary.roles).toEqual({ a: "nephew", b: "uncle" });
  });
});
