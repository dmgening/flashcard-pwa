import { describe, it, expect } from "vitest";
import { pickDistractors } from "./distractors";
import type { Word } from "./schema";

const noun = (id: string, en: string[]): Word => ({
  id, lemma: id, pos: "noun", article: "der", plural: null, en,
});
const verb = (id: string, en: string[]): Word => ({
  id, lemma: id, pos: "verb", aux: "haben", partizip: "x", en,
});

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe("pickDistractors", () => {
  it("returns 3 same-POS words when enough", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), noun("b", ["bird"]), noun("c", ["horse"]), verb("v", ["run"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(3);
    expect(d.every(w => w.pos === "noun")).toBe(true);
  });

  it("falls back to any-POS when same-POS pool too small", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), verb("v1", ["run"]), verb("v2", ["jump"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(3);
  });

  it("never includes the correct word", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), noun("b", ["bird"]), noun("c", ["horse"]), noun("x", ["dog"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d.find(w => w.id === "x")).toBeUndefined();
  });

  it("returns fewer if the entire pool is too small", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(1);
  });
});
