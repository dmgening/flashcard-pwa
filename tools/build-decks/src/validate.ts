// tools/build-decks/src/validate.ts
import { deckSchema, type Deck, type Word } from "@app/lib/schema";
import type { Level } from "./sources/types";

export const EXPECTED_COUNTS: Record<Level, number> = {
  A1: 650,
  A2: 1300,
  B1: 2400,
};

const NAME: Record<Level, string> = {
  A1: "Deutsch A1",
  A2: "Deutsch A2",
  B1: "Deutsch B1",
};

export function validateDeck(level: Level, words: Word[]): Deck {
  const deck = deckSchema.parse({
    id: `de-${level.toLowerCase()}`,
    language: "de",
    level,
    name: NAME[level],
    words,
  });

  const expected = EXPECTED_COUNTS[level];
  const low = Math.floor(expected * 0.85);
  const high = Math.ceil(expected * 1.15);
  if (words.length < low || words.length > high) {
    console.warn(
      `[validate] ${level} produced ${words.length} entries; expected ~${expected} (${low}-${high}).`,
    );
  }
  return deck;
}
