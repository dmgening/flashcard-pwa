import { describe, it, expect } from "vitest";
import { drawWord, COOLDOWN_WINDOW } from "./selection";
import type { Word } from "./schema";
import type { StatRow } from "@/db/dexie";

const W = (id: string): Word => ({
  id, lemma: id, pos: "adj", en: [id],
} as Word);

const stat = (deckId: string, wordId: string, attempts: number, successes: number): StatRow => ({
  deckId, wordId, attempts, successes, lastSeenAt: 0, lastResult: "hit",
});

function seededRng(seed: number) {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("drawWord", () => {
  it("returns a word from the deck", () => {
    const words = [W("a"), W("b"), W("c")];
    const w = drawWord({ words, stats: [], history: [], rng: seededRng(1) });
    expect(words.map(x => x.id)).toContain(w.id);
  });

  it("weights misses higher than hits", () => {
    const words = [W("easy"), W("hard")];
    // easy: 10/10, hard: 0/10
    const stats = [
      stat("d", "easy", 10, 10),
      stat("d", "hard", 10, 0),
    ];
    const counts: Record<string, number> = { easy: 0, hard: 0 };
    const rng = seededRng(42);
    for (let i = 0; i < 2000; i++) {
      const w = drawWord({ words, stats, history: [], rng });
      counts[w.id]++;
    }
    expect(counts.hard).toBeGreaterThan(counts.easy * 3);
  });

  it("applies cooldown to recently-drawn words", () => {
    const words = [W("a"), W("b")];
    // identical stats: weights equal at baseline
    const stats = [stat("d", "a", 5, 5), stat("d", "b", 5, 5)];
    const history = ["a", "a", "a", "a", "a"]; // all cooldown slots are "a"
    const counts = { a: 0, b: 0 };
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const w = drawWord({ words, stats, history, rng });
      counts[w.id as "a" | "b"]++;
    }
    expect(counts.b).toBeGreaterThan(counts.a * 5);
  });

  it("exports a cooldown window constant of 5", () => {
    expect(COOLDOWN_WINDOW).toBe(5);
  });

  it("throws on empty deck", () => {
    expect(() => drawWord({ words: [], stats: [], history: [], rng: seededRng(1) })).toThrow();
  });
});
