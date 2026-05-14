export type Level = "A1" | "A2" | "B1";

export type RawPos = "noun" | "verb" | "adj" | "adv" | "prep" | "conj" | "other";

export type RawEntry = {
  level: Level;
  raw: string;             // original column 1 verbatim, for debugging
  lemma: string;           // normalized headword without any polysemy marker
  pos: RawPos;
  article?: "der" | "die" | "das";
  plural?: string | null;  // for nouns; null = uncountable / no plural notation
  example_de?: string;
  example_en?: string;
  senses: number;          // # of polysemy lines collapsed into this entry (>=1)
};

export interface DeckSource {
  fetch(level: Level): Promise<RawEntry[]>;
}
