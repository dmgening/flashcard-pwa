import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./dexie";
import {
  recordAttempt,
  getStats,
  getStatsForDeck,
  bucket,
  hardestWords,
  type StatBucket,
} from "./stats";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("recordAttempt", () => {
  it("creates a row on first attempt", async () => {
    await recordAttempt("de-a1", "w1", true);
    const row = await getStats("de-a1", "w1");
    expect(row?.attempts).toBe(1);
    expect(row?.successes).toBe(1);
    expect(row?.lastResult).toBe("hit");
  });

  it("increments attempts and successes", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a1", "w1", false);
    await recordAttempt("de-a1", "w1", true);
    const row = await getStats("de-a1", "w1");
    expect(row?.attempts).toBe(3);
    expect(row?.successes).toBe(2);
    expect(row?.lastResult).toBe("hit");
  });

  it("scopes per (deckId, wordId)", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a2", "w1", false);
    expect((await getStats("de-a1", "w1"))?.successes).toBe(1);
    expect((await getStats("de-a2", "w1"))?.successes).toBe(0);
  });
});

describe("bucket", () => {
  it("classifies new / learning / mastered", () => {
    expect(bucket({ attempts: 0, successes: 0 })).toBe<StatBucket>("new");
    expect(bucket({ attempts: 1, successes: 1 })).toBe<StatBucket>("learning");
    expect(bucket({ attempts: 3, successes: 2 })).toBe<StatBucket>("learning"); // 0.67 < 0.7
    expect(bucket({ attempts: 3, successes: 3 })).toBe<StatBucket>("mastered");
    expect(bucket({ attempts: 5, successes: 4 })).toBe<StatBucket>("mastered"); // 0.8 >= 0.7
    expect(bucket({ attempts: 10, successes: 6 })).toBe<StatBucket>("learning"); // 0.6
  });
});

describe("hardestWords", () => {
  it("returns words with at least one miss, sorted by misses desc", async () => {
    await recordAttempt("de-a1", "easy", true);
    for (let i = 0; i < 5; i++) await recordAttempt("de-a1", "hard", false);
    for (let i = 0; i < 2; i++) await recordAttempt("de-a1", "mid", false);
    const rows = await hardestWords("de-a1", 10);
    expect(rows.map(r => r.wordId)).toEqual(["hard", "mid"]);
  });

  it("respects the limit", async () => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < i + 1; j++) await recordAttempt("de-a1", `w${i}`, false);
    }
    const rows = await hardestWords("de-a1", 2);
    expect(rows.map(r => r.wordId)).toEqual(["w3", "w2"]);
  });
});

describe("getStatsForDeck", () => {
  it("returns only the matching deck", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a2", "w2", true);
    const rows = await getStatsForDeck("de-a1");
    expect(rows).toHaveLength(1);
    expect(rows[0].wordId).toBe("w1");
  });
});
