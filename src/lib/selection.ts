import type { Word } from "./schema";
import type { StatRow } from "@/db/dexie";

export const BASE = 0.2;
export const COOLDOWN_WINDOW = 5;
export const COOLDOWN_FACTOR = 0.1;

export type DrawInput = {
  words: Word[];
  stats: StatRow[];        // stats for this deck
  history: string[];       // word ids drawn this session, most recent at end
  rng: () => number;       // returns [0, 1)
};

export function drawWord({ words, stats, history, rng }: DrawInput): Word {
  if (words.length === 0) throw new Error("drawWord: empty deck");

  const statByWordId = new Map(stats.map(s => [s.wordId, s]));
  const cooldown = new Set(history.slice(-COOLDOWN_WINDOW));

  const weights = words.map((w) => {
    const s = statByWordId.get(w.id);
    const attempts = s?.attempts ?? 0;
    const successes = s?.successes ?? 0;
    // Unseen words (attempts == 0) collapse to successRate = 0, giving them the
    // same max weight as a word that's been missed every time. This is deliberate
    // — surface new words to the user quickly.
    const successRate = attempts > 0 ? successes / attempts : 0;
    let weight = (1 - successRate) + BASE;
    if (cooldown.has(w.id)) weight *= COOLDOWN_FACTOR;
    return weight;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < words.length; i++) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words[words.length - 1];
}
