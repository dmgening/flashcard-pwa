// tools/build-decks/src/assemble.test.ts
import { describe, it, expect } from "vitest";
import { wordSchema } from "@app/lib/schema";
import { assembleWord } from "./assemble";
import type { RawEntry } from "./sources/types";

const id = "de-a1-hund";

describe("assembleWord", () => {
  it("produces a noun that passes wordSchema", () => {
    const raw: RawEntry = {
      level: "A1", raw: "der Hund", lemma: "Hund", pos: "noun",
      article: "der", plural: "Hunde", example_de: "Der Hund bellt.", senses: 1,
    };
    const w = assembleWord(id, raw, { en: ["dog"] });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w).toMatchObject({
      id, pos: "noun", lemma: "Hund", article: "der", plural: "Hunde",
      en: ["dog"], example: "Der Hund bellt.",
    });
  });

  it("produces a verb with aux + partizip", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen",
    });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w).toMatchObject({
      pos: "verb", aux: "sein", partizip: "gegangen", en: ["to go"],
    });
  });

  it("produces an 'other' POS entry without article/aux fields", () => {
    const raw: RawEntry = { level: "A1", raw: "und", lemma: "und", pos: "other", senses: 1 };
    const w = assembleWord("de-a1-und", raw, { en: ["and"] });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w.pos).toBe("other");
    expect((w as { article?: string }).article).toBeUndefined();
  });

  it("falls back to llm example when source has none", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen", example: "Ich gehe nach Hause.",
    });
    expect(w.example).toBe("Ich gehe nach Hause.");
  });

  it("prefers source example over llm example when both are present", () => {
    const raw: RawEntry = {
      level: "A1", raw: "gehen", lemma: "gehen", pos: "verb",
      example_de: "SOURCE", senses: 1,
    };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen", example: "LLM",
    });
    expect(w.example).toBe("SOURCE");
  });

  it("passes the source example_en through as exampleEn when paired", () => {
    const raw: RawEntry = {
      level: "A1", raw: "der Hund", lemma: "Hund", pos: "noun",
      article: "der", plural: "Hunde",
      example_de: "Der Hund bellt.", example_en: "The dog barks.",
      senses: 1,
    };
    const w = assembleWord("de-a1-hund", raw, { en: ["dog"] });
    expect(w.example).toBe("Der Hund bellt.");
    expect((w as { exampleEn?: string }).exampleEn).toBe("The dog barks.");
  });

  it("does not surface exampleEn when the example came from the LLM (would be mismatched)", () => {
    const raw: RawEntry = {
      level: "A1", raw: "gehen", lemma: "gehen", pos: "verb",
      example_en: "Stale english.",  // source lacked example_de
      senses: 1,
    };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen",
      example: "LLM example.",
    });
    expect(w.example).toBe("LLM example.");
    expect((w as { exampleEn?: string }).exampleEn).toBeUndefined();
  });

  it("throws separately on missing aux vs missing partizip, naming the lemma", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    expect(() => assembleWord("de-a1-gehen", raw, { en: ["to go"] })).toThrow(/gehen.*aux/);
    expect(() => assembleWord("de-a1-gehen", raw, { en: ["to go"], aux: "sein" })).toThrow(/gehen.*partizip/);
  });

  it("throws if a noun is missing the article, naming the lemma", () => {
    const raw: RawEntry = {
      level: "A1", raw: "Hund", lemma: "Hund", pos: "noun", senses: 1,
    };
    expect(() => assembleWord("de-a1-hund", raw, { en: ["dog"] })).toThrow(/Hund.*article/);
  });
});
