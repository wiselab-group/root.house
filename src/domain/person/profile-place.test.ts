import { describe, expect, it } from "vitest";
import { profilePlace } from "./profile-place";

const none = {
  birthPlaceName: null,
  deathPlaceName: null,
  residencePlaceName: null,
};

describe("profilePlace", () => {
  it("shows a living person's path from birthplace to residence", () => {
    expect(
      profilePlace({
        ...none,
        isLiving: true,
        birthPlaceName: "Минск",
        residencePlaceName: "Таллинн",
      }),
    ).toEqual({ kind: "journey", from: "Минск", to: "Таллинн" });
  });

  it("collapses the path when a person lives where they were born", () => {
    expect(
      profilePlace({
        ...none,
        isLiving: true,
        birthPlaceName: "Минск",
        residencePlaceName: " минск ",
      }),
    ).toEqual({ kind: "home", label: " минск " });
  });

  it("shows only what is known for a living person", () => {
    expect(
      profilePlace({ ...none, isLiving: true, birthPlaceName: "Минск" }),
    ).toEqual({ kind: "birth", label: "Минск" });
    expect(
      profilePlace({ ...none, isLiving: true, residencePlaceName: "Таллинн" }),
    ).toEqual({ kind: "residence", label: "Таллинн" });
  });

  it("shows the birth → death arc for the deceased, ignoring any residence", () => {
    expect(
      profilePlace({
        isLiving: false,
        birthPlaceName: "Гродно",
        deathPlaceName: "Минск",
        residencePlaceName: "Брест",
      }),
    ).toEqual({ kind: "life", label: "Гродно → Минск" });
  });

  it("returns null when no place is known", () => {
    expect(profilePlace({ ...none, isLiving: true })).toBeNull();
    expect(profilePlace({ ...none, isLiving: false })).toBeNull();
  });
});
