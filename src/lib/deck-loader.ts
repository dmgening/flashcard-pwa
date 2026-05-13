import { deckSchema, type Deck } from "./schema";

export const AVAILABLE_DECKS = ["de-a1"] as const;
export type DeckId = (typeof AVAILABLE_DECKS)[number];

export async function loadDeck(id: string): Promise<Deck> {
  const url = `/decks/${id}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch deck ${id}: HTTP ${res.status}`);
  }
  const json = await res.json();
  return deckSchema.parse(json);
}
