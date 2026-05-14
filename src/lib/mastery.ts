import type { StatRow } from "@/db/dexie";
import { bucket } from "@/db/stats";

export function computeMastery(totalWords: number, stats: StatRow[]): number {
  if (totalWords === 0) return 0;
  const mastered = stats.filter((s) => bucket(s) === "mastered").length;
  return Math.min(1, mastered / totalWords);
}

export type DeckBreakdown = {
  mastered: number;
  // Attempted, not mastered, last result was a hit — the user is on track.
  seen: number;
  // Attempted, not mastered, last result was a miss — currently struggling.
  missed: number;
  // Never attempted.
  untouched: number;
};

export function computeDeckBreakdown(totalWords: number, stats: StatRow[]): DeckBreakdown {
  let mastered = 0;
  let seen = 0;
  let missed = 0;
  for (const s of stats) {
    if (s.attempts <= 0) continue;
    if (bucket(s) === "mastered") {
      mastered += 1;
    } else if (s.lastResult === "miss") {
      missed += 1;
    } else {
      seen += 1;
    }
  }
  const untouched = Math.max(0, totalWords - mastered - seen - missed);
  return { mastered, seen, missed, untouched };
}
