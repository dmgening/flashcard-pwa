// tools/build-decks/src/build-deck.ts
import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import type { Level, RawEntry } from "./sources/types";
import { IlkermeliksitkiSource } from "./sources/ilkermeliksitki";
import { FileCache } from "./cache";
import { OpenAiCompatibleClient, type LlmClient } from "./llm-client";
import { enrich } from "./enrich";
import { assembleWord } from "./assemble";
import { validateDeck } from "./validate";
import { slugify, assignUniqueIds } from "./slug";
import type { Word } from "@app/lib/schema";

export type BuildOptions = {
  level: Level;
  outputDir: string;        // e.g. "public/decks"
  cacheDir: string;         // e.g. "tools/build-decks/cache"
  dryRun?: boolean;
  noCache?: boolean;
  concurrency?: number;
  client?: LlmClient;
};

function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeys) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return value;
}

export async function buildDeck(opts: BuildOptions): Promise<{ written: string | null; entries: number; dropped: number }> {
  const source = new IlkermeliksitkiSource();
  const client = opts.client ?? new OpenAiCompatibleClient();
  const cache = new FileCache(opts.cacheDir);

  console.log(`[${opts.level}] fetching source...`);
  const raws = await source.fetch(opts.level);
  console.log(`[${opts.level}] parsed ${raws.length} entries from source`);

  const limit = pLimit(opts.concurrency ?? 8);
  const enriched = await Promise.all(raws.map((r: RawEntry) =>
    limit(async () => {
      const e = await enrich(r, client, cache, { bypassRead: opts.noCache });
      return { raw: r, fields: e };
    })
  ));

  const kept = enriched.filter((x) => x.fields !== null) as Array<{ raw: RawEntry; fields: NonNullable<typeof enriched[number]["fields"]> }>;
  const dropped = enriched.length - kept.length;
  if (dropped > 0) {
    console.warn(`[${opts.level}] dropped ${dropped} entries due to LLM failures`);
  }

  const slugs = kept.map((x) => slugify(x.raw.lemma));
  const ids = assignUniqueIds(slugs, `de-${opts.level.toLowerCase()}`);
  const words: Word[] = kept.map((x, i) => assembleWord(ids[i], x.raw, x.fields));

  const deck = validateDeck(opts.level, words);
  const target = path.join(opts.outputDir, `de-${opts.level.toLowerCase()}.json`);

  if (opts.dryRun) {
    console.log(`[${opts.level}] dry-run: would write ${target} with ${words.length} words`);
    return { written: null, entries: words.length, dropped };
  }

  const text = JSON.stringify(sortKeys(deck), null, 2) + "\n";
  await fs.mkdir(opts.outputDir, { recursive: true });
  const tmp = `${target}.tmp`;
  try {
    await fs.writeFile(tmp, text);
    await fs.rename(tmp, target);
  } catch (err) {
    // Best-effort cleanup of the temp file so we don't leave a stale
    // de-<lvl>.json.tmp behind if writeFile or rename fails.
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
  console.log(`[${opts.level}] wrote ${target} (${words.length} words)`);
  return { written: target, entries: words.length, dropped };
}
