// tools/build-decks/src/enrich.ts
import pLimit from "p-limit";
import type { RawEntry } from "./sources/types";
import type { LlmClient } from "./llm-client";
import { FileCache, cacheKey } from "./cache";
import { z } from "zod";
import {
  batchItemSchema,
  enrichedFieldsSchema,
  type EnrichedFields,
} from "./enrich-schema";

// Loose envelope: just check the top-level shape so per-item validation
// can isolate bad items without nuking the whole batch.
const looseBatchEnvelope = z.object({
  results: z.array(z.unknown()),
});

// Bumped to 2 when we switched from per-word calls to batched calls. The
// prompt shape changed materially, so any old cache entries should not
// satisfy the new contract.
export const PROMPT_VERSION = 2;

// How many entries to bundle into one LLM call. Keeps requests under the
// chutes.ai rate limit while still giving the model enough context per call.
export const BATCH_SIZE = 25;

function describeEntry(idx: number, entry: RawEntry): string {
  const parts: string[] = [`[${idx}] ${entry.lemma} (pos=${entry.pos}`];
  if (entry.pos === "noun") {
    parts.push(`, article=${entry.article ?? "?"}`);
    parts.push(`, plural=${entry.plural ?? "(none)"}`);
  }
  if (entry.example_de) parts.push(`, example_de="${entry.example_de}"`);
  if (entry.senses > 1) parts.push(`, senses=${entry.senses}`);
  parts.push(")");
  return parts.join("");
}

export function buildBatchPrompt(entries: RawEntry[]): string {
  const lines: string[] = [];
  lines.push("You are a German lexicographer. Respond with JSON only.");
  lines.push("");
  lines.push("For each German headword below, produce one result with its English translations and (for verbs) auxiliary + past participle.");
  lines.push("");
  lines.push("Words:");
  for (let i = 0; i < entries.length; i++) {
    lines.push(describeEntry(i, entries[i]));
  }
  lines.push("");
  lines.push("Return JSON in exactly this shape:");
  lines.push('{ "results": [ { "idx": 0, "en": ["..."] }, ... ] }');
  lines.push("");
  lines.push("Per-item fields:");
  lines.push('- "idx" (number): the bracketed index from the input list. REQUIRED.');
  lines.push('- "en" (string[]): 1-3 canonical English glosses. REQUIRED.');
  lines.push('- "aux" ("haben"|"sein"): REQUIRED for pos=verb, omit otherwise.');
  lines.push('- "partizip" (string): past participle. REQUIRED for pos=verb, omit otherwise.');
  lines.push('- "example" (string): one German sentence. OPTIONAL — include only when the input had no example_de.');
  lines.push("");
  lines.push("Include exactly one result per input idx. Do not include any text outside the JSON object.");
  return lines.join("\n");
}

function keyFor(entry: RawEntry): string {
  return cacheKey({
    level: entry.level,
    lemma: entry.lemma,
    pos: entry.pos,
    promptVersion: PROMPT_VERSION,
  });
}

// Drops fields the schema doesn't want — specifically the input `idx`.
function stripIdx(item: { idx: number } & EnrichedFields): EnrichedFields {
  const { idx: _idx, ...rest } = item;
  return rest;
}

// One LLM round-trip for a single batch. Returns a map of idx → fields on
// success, null on any failure (malformed JSON, schema mismatch, network).
async function attemptBatch(
  batch: RawEntry[],
  client: LlmClient,
): Promise<Map<number, EnrichedFields> | null> {
  let content: string;
  try {
    const res = await client.complete({ prompt: buildBatchPrompt(batch) });
    content = res.content;
  } catch {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  const envelope = looseBatchEnvelope.safeParse(raw);
  if (!envelope.success) return null;

  const byIdx = new Map<number, EnrichedFields>();
  for (const candidate of envelope.data.results) {
    // Validate each item independently — a single bad item shouldn't drop
    // the whole batch. Common cause: LLM puts something invalid in `aux`
    // (e.g. "sich" or "werden") for one verb out of 25.
    const item = batchItemSchema.safeParse(candidate);
    if (!item.success) continue;
    if (item.data.idx < 0 || item.data.idx >= batch.length) continue;
    const entry = batch[item.data.idx];
    if (entry.pos === "verb" && (!item.data.aux || !item.data.partizip)) continue;
    byIdx.set(item.data.idx, stripIdx(item.data));
  }
  return byIdx;
}

export type EnrichBatchOptions = {
  bypassRead?: boolean;
  concurrency?: number;
};

/**
 * Enrich a list of RawEntry by batching them into single LLM calls.
 * Returns a Map keyed by `entry.lemma`:
 *   - successful items map to their EnrichedFields
 *   - failures (cache miss + LLM drop) map to `null`
 * Cache writes are per-lemma so a partial-failure run leaves successful
 * items reusable on the next attempt.
 */
export async function enrichBatch(
  entries: RawEntry[],
  client: LlmClient,
  cache: FileCache,
  options: EnrichBatchOptions = {},
): Promise<Map<string, EnrichedFields | null>> {
  const results = new Map<string, EnrichedFields | null>();
  const misses: RawEntry[] = [];

  for (const entry of entries) {
    results.set(entry.lemma, null);
    if (!options.bypassRead) {
      const cached = await cache.get(keyFor(entry));
      if (cached !== undefined) {
        const reparsed = enrichedFieldsSchema.safeParse(cached);
        if (reparsed.success) {
          results.set(entry.lemma, reparsed.data);
          continue;
        }
      }
    }
    misses.push(entry);
  }

  const batches: RawEntry[][] = [];
  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    batches.push(misses.slice(i, i + BATCH_SIZE));
  }

  const limit = pLimit(options.concurrency ?? 2);
  await Promise.all(batches.map((batch) =>
    limit(async () => {
      let byIdx = await attemptBatch(batch, client);
      if (!byIdx) byIdx = await attemptBatch(batch, client); // one retry
      if (!byIdx) {
        console.warn(
          `[enrich] batch of ${batch.length} dropped: ${batch.map((b) => b.lemma).join(", ")}`,
        );
        return;
      }
      for (let i = 0; i < batch.length; i++) {
        const fields = byIdx.get(i);
        if (!fields) continue;
        const entry = batch[i];
        await cache.set(keyFor(entry), fields);
        results.set(entry.lemma, fields);
      }
    })
  ));

  return results;
}
