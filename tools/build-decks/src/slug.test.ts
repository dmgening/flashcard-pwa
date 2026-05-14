// tools/build-decks/src/slug.test.ts
import { describe, it, expect } from "vitest";
import { slugify, assignUniqueIds } from "./slug";

describe("slugify", () => {
  it("lowercases and ascii-folds umlauts and ß", () => {
    expect(slugify("Mädchen")).toBe("maedchen");
    expect(slugify("Brötchen")).toBe("broetchen");
    expect(slugify("Straße")).toBe("strasse");
    expect(slugify("für")).toBe("fuer");
  });

  it("replaces non-alphanumeric runs with a single dash", () => {
    expect(slugify("Auto-Bahn")).toBe("auto-bahn");
    expect(slugify("ein paar")).toBe("ein-paar");
    expect(slugify("alles, was")).toBe("alles-was");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  -Hund-  ")).toBe("hund");
  });
});

describe("assignUniqueIds", () => {
  it("returns the bare id when there are no collisions", () => {
    const ids = assignUniqueIds(["hund", "katze"], "de-a1");
    expect(ids).toEqual(["de-a1-hund", "de-a1-katze"]);
  });

  it("suffixes duplicates with -2, -3 deterministically by index", () => {
    const ids = assignUniqueIds(["hund", "hund", "hund"], "de-a1");
    expect(ids).toEqual(["de-a1-hund", "de-a1-hund-2", "de-a1-hund-3"]);
  });

  it("throws on an empty slug to surface bad source data", () => {
    expect(() => assignUniqueIds(["hund", "", "katze"], "de-a1")).toThrow(/empty slug at index 1/);
  });
});
