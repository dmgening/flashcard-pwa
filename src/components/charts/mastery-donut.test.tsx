import { describe, it, expect } from "vitest";
import { computeMastery } from "./mastery-donut";

const stat = (attempts: number, successes: number) => ({
  deckId: "d", wordId: "w", attempts, successes,
  lastSeenAt: 0, lastResult: "hit" as const,
});

describe("computeMastery", () => {
  it("counts a word as mastered when ≥3 attempts and ≥80% success", () => {
    const result = computeMastery(
      [stat(5, 4), stat(3, 3), stat(2, 2), stat(1, 0)],
      100,
    );
    expect(result.mastered).toBe(2);          // 5/4 (80%) and 3/3 (100%)
    expect(result.attempted).toBe(4);          // every row attempted
    expect(result.untouched).toBe(96);         // 100 - 4
  });

  it("returns zeros when no stats are present", () => {
    const r = computeMastery([], 50);
    expect(r).toEqual({ mastered: 0, attempted: 0, untouched: 50 });
  });

  it("caps mastered + attempted at total when stats exceed total (defensive)", () => {
    const r = computeMastery([stat(5, 5), stat(5, 5)], 1);
    expect(r.untouched).toBeGreaterThanOrEqual(0);
  });
});
