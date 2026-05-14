// tools/build-decks/src/cache.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileCache, cacheKey } from "./cache";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cache-test-"));
});

describe("cacheKey", () => {
  it("is deterministic for same inputs", () => {
    expect(cacheKey({ level: "A1", lemma: "Hund", pos: "noun", promptVersion: 1 }))
      .toBe(cacheKey({ level: "A1", lemma: "Hund", pos: "noun", promptVersion: 1 }));
  });

  it("differs across any input", () => {
    const base = { level: "A1" as const, lemma: "Hund", pos: "noun" as const, promptVersion: 1 };
    expect(cacheKey({ ...base, level: "A2" })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, lemma: "Katze" })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, pos: "verb" })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, promptVersion: 2 })).not.toBe(cacheKey(base));
  });
});

describe("FileCache", () => {
  it("returns undefined on miss", async () => {
    const c = new FileCache(tmp);
    expect(await c.get("nope")).toBeUndefined();
  });

  it("stores and returns json values", async () => {
    const c = new FileCache(tmp);
    await c.set("k1", { en: ["dog"] });
    expect(await c.get("k1")).toEqual({ en: ["dog"] });
  });

  it("shards by first 2 chars of the key", async () => {
    const c = new FileCache(tmp);
    await c.set("abcdef", { v: 1 });
    const sharded = path.join(tmp, "ab", "abcdef.json");
    expect(await fs.stat(sharded).then(() => true)).toBe(true);
  });

  it("survives a re-instantiation", async () => {
    const a = new FileCache(tmp);
    await a.set("k", { v: 1 });
    const b = new FileCache(tmp);
    expect(await b.get("k")).toEqual({ v: 1 });
  });

  it("logs a warning but does not throw on write failure", async () => {
    const c = new FileCache(path.join(tmp, "ro"));
    // Make the dir read-only after creation
    await fs.mkdir(path.join(tmp, "ro"), { recursive: true });
    await fs.chmod(path.join(tmp, "ro"), 0o500);
    await expect(c.set("k", { v: 1 })).resolves.toBeUndefined();
    await fs.chmod(path.join(tmp, "ro"), 0o700); // cleanup
  });
});
