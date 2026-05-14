// tools/build-decks/src/assemble.ts
import type { Word } from "@app/lib/schema";
import type { RawEntry } from "./sources/types";
import type { EnrichedFields } from "./enrich-schema";

export function assembleWord(id: string, raw: RawEntry, enriched: EnrichedFields): Word {
  const example = raw.example_de ?? enriched.example;

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
      ...(example ? { example } : {}),
    };
  }

  if (raw.pos === "verb") {
    if (!enriched.aux || !enriched.partizip) {
      throw new Error(`assembleWord: verb ${raw.lemma} missing aux or partizip`);
    }
    return {
      id,
      pos: "verb",
      lemma: raw.lemma,
      aux: enriched.aux,
      partizip: enriched.partizip,
      en: enriched.en,
      ...(example ? { example } : {}),
    };
  }

  return {
    id,
    pos: raw.pos,
    lemma: raw.lemma,
    en: enriched.en,
    ...(example ? { example } : {}),
  };
}
