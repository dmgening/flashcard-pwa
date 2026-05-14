// tools/build-decks/src/assemble.ts
import type { Word } from "@app/lib/schema";
import type { RawEntry } from "./sources/types";
import type { EnrichedFields } from "./enrich-schema";

export function assembleWord(id: string, raw: RawEntry, enriched: EnrichedFields): Word {
  const example = raw.example_de ?? enriched.example;
  // exampleEn only comes from the source — the LLM call doesn't ask for one,
  // and pairing example.de with example.en preserves the source-language
  // alignment that makes the reveal UI useful.
  const exampleEn = example && example === raw.example_de ? raw.example_en : undefined;
  const exampleFields = {
    ...(example ? { example } : {}),
    ...(exampleEn ? { exampleEn } : {}),
  };

  if (raw.pos === "noun") {
    if (!raw.article) {
      throw new Error(`assembleWord: noun ${raw.lemma} missing article`);
    }
    return {
      id,
      pos: "noun",
      lemma: raw.lemma,
      article: raw.article,
      plural: raw.plural ?? null,
      en: enriched.en,
      ...exampleFields,
    };
  }

  if (raw.pos === "verb") {
    if (!enriched.aux) {
      throw new Error(`assembleWord: verb ${raw.lemma} missing aux`);
    }
    if (!enriched.partizip) {
      throw new Error(`assembleWord: verb ${raw.lemma} missing partizip`);
    }
    return {
      id,
      pos: "verb",
      lemma: raw.lemma,
      aux: enriched.aux,
      partizip: enriched.partizip,
      en: enriched.en,
      ...exampleFields,
    };
  }

  return {
    id,
    pos: raw.pos,
    lemma: raw.lemma,
    en: enriched.en,
    ...exampleFields,
  };
}
