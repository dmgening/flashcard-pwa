import { describe, it, expect } from "vitest";
import { deckSchema } from "./schema";
import deA1 from "../../public/decks/de-a1.json";

const validNoun = {
  id: "de-a1-hund",
  lemma: "Hund",
  pos: "noun",
  article: "der",
  plural: "Hunde",
  en: ["dog"],
};

const validVerb = {
  id: "de-a1-gehen",
  lemma: "gehen",
  pos: "verb",
  aux: "sein",
  partizip: "gegangen",
  en: ["to go", "to walk"],
};

const validDeck = {
  id: "de-a1",
  language: "de",
  level: "A1",
  name: "Deutsch A1",
  words: [validNoun, validVerb],
};

describe("deckSchema", () => {
  it("accepts a valid deck", () => {
    expect(() => deckSchema.parse(validDeck)).not.toThrow();
  });

  it("requires article on nouns", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, article: undefined }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("requires aux on verbs", () => {
    const bad = { ...validDeck, words: [{ ...validVerb, aux: undefined }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("rejects unknown pos", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, pos: "interjection" }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("rejects unknown level", () => {
    const bad = { ...validDeck, level: "Z9" };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("accepts en as a non-empty array", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, en: [] }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });
});

describe("bundled de-a1.json", () => {
  it("passes deckSchema", () => {
    expect(() => deckSchema.parse(deA1)).not.toThrow();
  });

  it("has at least 25 words", () => {
    const deck = deckSchema.parse(deA1);
    expect(deck.words.length).toBeGreaterThanOrEqual(25);
  });
});
