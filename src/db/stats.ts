import { db, type StatRow } from "./dexie";

export type StatBucket = "new" | "learning" | "mastered";

async function recordAttemptOnce(deckId: string, wordId: string, success: boolean): Promise<void> {
  await db.transaction("rw", db.stats, async () => {
    const existing = await db.stats.get([deckId, wordId]);
    const now = Date.now();
    if (!existing) {
      await db.stats.put({
        deckId,
        wordId,
        attempts: 1,
        successes: success ? 1 : 0,
        lastSeenAt: now,
        lastResult: success ? "hit" : "miss",
      });
    } else {
      await db.stats.put({
        ...existing,
        attempts: existing.attempts + 1,
        successes: existing.successes + (success ? 1 : 0),
        lastSeenAt: now,
        lastResult: success ? "hit" : "miss",
      });
    }
  });
}

// Retries once on transient IDB errors; rethrows on second failure so callers can surface a toast.
export async function recordAttempt(
  deckId: string,
  wordId: string,
  success: boolean,
): Promise<void> {
  try {
    await recordAttemptOnce(deckId, wordId, success);
  } catch (err) {
    console.warn("recordAttempt failed once, retrying", err);
    await recordAttemptOnce(deckId, wordId, success);
  }
}

export async function getStats(deckId: string, wordId: string): Promise<StatRow | undefined> {
  return db.stats.get([deckId, wordId]);
}

export async function getStatsForDeck(deckId: string): Promise<StatRow[]> {
  return db.stats.where("deckId").equals(deckId).toArray();
}

export function bucket(row: Pick<StatRow, "attempts" | "successes">): StatBucket {
  if (row.attempts < 1) return "new";
  const rate = row.successes / row.attempts;
  if (row.attempts >= 3 && rate >= 0.7) return "mastered";
  return "learning";
}

export async function hardestWords(deckId: string, limit: number): Promise<StatRow[]> {
  const rows = await getStatsForDeck(deckId);
  return rows
    .sort((a, b) => (b.attempts - b.successes) - (a.attempts - a.successes))
    .slice(0, limit);
}
