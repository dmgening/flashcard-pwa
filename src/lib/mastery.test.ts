import { describe, it, expect } from "vitest";
import { computeMastery } from "./mastery";
import type { StatRow } from "@/db/dexie";

const row = (wordId: string, attempts: number, successes: number): StatRow => ({
  deckId: "d", wordId, attempts, successes, lastSeenAt: 0, lastResult: "hit",
});

describe("computeMastery", () => {
  it("returns 0 for an empty stats list", () => {
    expect(computeMastery(10, [])).toBe(0);
  });

  it("counts mastered words over total words", () => {
    const stats = [row("a", 5, 5), row("b", 3, 1)];
    expect(computeMastery(10, stats)).toBeCloseTo(0.1, 5); // 1 of 10
  });

  it("clamps to [0, 1]", () => {
    const stats = Array.from({ length: 10 }, (_, i) => row(`w${i}`, 5, 5));
    expect(computeMastery(10, stats)).toBe(1);
  });
});
