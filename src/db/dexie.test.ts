import { describe, it, expect, beforeEach } from "vitest";
import { db, getSettings, setSettings } from "./dexie";

describe("dexie", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("returns defaults from getSettings", async () => {
    const s = await getSettings();
    expect(s.activeDeckId).toBeNull();
    expect(s.soundOn).toBe(true);
  });

  it("persists patches via setSettings", async () => {
    await setSettings({ activeDeckId: "de-a1" });
    const s = await getSettings();
    expect(s.activeDeckId).toBe("de-a1");
  });
});
