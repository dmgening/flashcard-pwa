import type { StatRow } from "@/db/dexie";
import { bucket } from "@/db/stats";

export function computeMastery(totalWords: number, stats: StatRow[]): number {
  if (totalWords === 0) return 0;
  const mastered = stats.filter((s) => bucket(s) === "mastered").length;
  return Math.min(1, mastered / totalWords);
}
