import { describe, it, expect, vi, beforeEach } from "vitest";
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
    await expect(loadDeck("missing")).rejects.toThrow(/deck/i);
  });

  it("throws on schema failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validDeck, level: "Z9" }),
    }));
    await expect(loadDeck("bad")).rejects.toThrow();
  });

  it("exports an AVAILABLE_DECKS list", () => {
    expect(AVAILABLE_DECKS).toEqual(expect.arrayContaining(["de-a1"]));
  });
});
