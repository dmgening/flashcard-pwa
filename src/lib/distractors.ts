import type { Word } from "./schema";

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickDistractors(correct: Word, pool: Word[], count: number, rng: () => number): Word[] {
  const others = pool.filter((w) => w.id !== correct.id);
  const sameP = others.filter((w) => w.pos === correct.pos);
  let chosen = shuffle(sameP, rng).slice(0, count);
  if (chosen.length < count) {
    const remaining = shuffle(others.filter((w) => !chosen.includes(w)), rng);
    chosen = chosen.concat(remaining.slice(0, count - chosen.length));
  }
  return chosen;
}
