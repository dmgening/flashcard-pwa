import { describe, it, expect, beforeEach } from "vitest";
import { db, setSettings, getSettings } from "./dexie";
import { recordAttempt } from "./stats";
import { exportAll, importAll, ImportMode } from "./export-import";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("exportAll", () => {
  it("returns stats and settings", async () => {
    await recordAttempt("d", "w", true);
    await setSettings({ activeDeckId: "d" });
    const data = await exportAll();
    expect(data.stats).toHaveLength(1);
    expect(data.settings.activeDeckId).toBe("d");
    expect(data.version).toBe(1);
  });
});

describe("importAll", () => {
  it("rejects malformed input", async () => {
    await expect(importAll({ nope: true } as any, "replace")).rejects.toThrow();
  });

  it("replace mode wipes and replaces", async () => {
    await recordAttempt("d", "w1", true);
    await importAll({
      version: 1,
      stats: [{ deckId: "d", wordId: "wX", attempts: 3, successes: 2, lastSeenAt: 1, lastResult: "hit" }],
      settings: { id: "singleton", activeDeckId: "d", ttsVoiceURI: null, soundOn: false },
    }, "replace");
    const rows = await db.stats.toArray();
    expect(rows).toEqual([
      { deckId: "d", wordId: "wX", attempts: 3, successes: 2, lastSeenAt: 1, lastResult: "hit" },
    ]);
    const s = await getSettings();
    expect(s.soundOn).toBe(false);
  });

  it("merge mode sums attempts/successes per (deck,word)", async () => {
    await recordAttempt("d", "w1", true);
    await recordAttempt("d", "w1", false);
    await importAll({
      version: 1,
      stats: [{ deckId: "d", wordId: "w1", attempts: 4, successes: 3, lastSeenAt: 999, lastResult: "miss" }],
      settings: (await getSettings()),
    }, "merge");
    const row = await db.stats.get(["d", "w1"]);
    expect(row?.attempts).toBe(6);
    expect(row?.successes).toBe(4);
    expect(row?.lastSeenAt).toBe(999);
  });

  it("exports ImportMode union", () => {
    const m: ImportMode = "merge";
    expect<string>(m).toBe("merge");
  });
});
