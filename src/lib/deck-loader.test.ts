import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { loadDeck, AVAILABLE_DECKS } from "./deck-loader";

const validDeck = {
  id: "de-a1",
  language: "de",
  level: "A1",
  name: "Deutsch A1",
  words: [
    { id: "x", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
  ],
};

describe("loadDeck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, validates, and returns the deck", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validDeck,
    }));
    const deck = await loadDeck("de-a1");
    expect(deck.id).toBe("de-a1");
    expect(deck.words).toHaveLength(1);
  });

  it("throws on HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadDeck("de-a1")).rejects.toThrow(/HTTP 404/);
  });

  it("throws a ZodError on schema failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validDeck, level: "Z9" }),
    }));
    await expect(loadDeck("de-a1")).rejects.toThrow(ZodError);
  });

  it("exports an AVAILABLE_DECKS list", () => {
    expect(AVAILABLE_DECKS).toEqual(expect.arrayContaining(["de-a1"]));
  });
});
