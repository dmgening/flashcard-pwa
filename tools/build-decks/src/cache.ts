// tools/build-decks/src/cache.ts
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type CacheKeyInput = {
  level: "A1" | "A2" | "B1";
  lemma: string;
  pos: string;
  promptVersion: number;
};

export function cacheKey(input: CacheKeyInput): string {
  const h = crypto.createHash("sha1");
  h.update(`${input.level}\0${input.lemma}\0${input.pos}\0${input.promptVersion}`);
  return h.digest("hex");
}

export class FileCache {
  constructor(private root: string) {}

  private pathFor(key: string): string {
    return path.join(this.root, key.slice(0, 2), `${key}.json`);
  }

  async get(key: string): Promise<unknown | undefined> {
    try {
      const text = await fs.readFile(this.pathFor(key), "utf8");
      return JSON.parse(text);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw err;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const file = this.pathFor(key);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(value));
    } catch (err) {
      // Cache write failures should never break a build — log and continue.
      console.warn(`[cache] write failed for ${key}: ${(err as Error).message}`);
    }
  }
}
