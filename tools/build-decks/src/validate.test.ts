// tools/build-decks/src/validate.test.ts
import { describe, it, expect, vi } from "vitest";
import { validateDeck, EXPECTED_COUNTS } from "./validate";
import type { Word } from "@app/lib/schema";

const noun = (id: string): Word => ({
  id, pos: "noun", lemma: id, article: "der", plural: null, en: ["x"],
});

describe("validateDeck", () => {
  it("returns the parsed Deck on success", () => {
    const d = validateDeck("A1", [noun("de-a1-x")]);
    expect(d.id).toBe("de-a1");
    expect(d.language).toBe("de");
    expect(d.level).toBe("A1");
    expect(d.words).toHaveLength(1);
  });

  it("throws on schema violation", () => {
    const bad = { ...noun("de-a1-x"), en: [] } as unknown as Word;
    expect(() => validateDeck("A1", [bad])).toThrow();
  });

  it("warns when the count is below the expected lower bound", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const lower = Math.floor(EXPECTED_COUNTS.A1 * 0.85);
    validateDeck("A1", Array.from({ length: lower - 1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns when the count is above the expected upper bound", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const upper = Math.ceil(EXPECTED_COUNTS.A1 * 1.15);
    validateDeck("A1", Array.from({ length: upper + 1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when the count is in range", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    validateDeck("A1", Array.from({ length: EXPECTED_COUNTS.A1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
