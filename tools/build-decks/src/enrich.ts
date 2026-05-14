// tools/build-decks/src/enrich.ts
import type { RawEntry } from "./sources/types";
import type { LlmClient } from "./llm-client";
import { FileCache, cacheKey } from "./cache";
import { enrichedFieldsSchema, type EnrichedFields } from "./enrich-schema";

export const PROMPT_VERSION = 1;

function buildPrompt(entry: RawEntry): string {
  const lines: string[] = [];
  lines.push("You are a German lexicographer. Respond with JSON only.");
  lines.push(`Headword: ${entry.lemma}`);
  lines.push(`Part of speech: ${entry.pos}`);
  if (entry.pos === "noun") {
    lines.push(`Article: ${entry.article ?? "?"}`);
    lines.push(`Plural: ${entry.plural ?? "(none)"}`);
  }
  if (entry.example_de) lines.push(`Example sentence (de): ${entry.example_de}`);
  if (entry.senses > 1) {
    lines.push(`This headword has ${entry.senses} senses in the source; cover the main ones in en[].`);
  }
  lines.push("");
  lines.push("Return a JSON object with these fields:");
  lines.push('  "en": array of 1-3 canonical English glosses (strings)');
  if (entry.pos === "verb") {
    lines.push('  "aux": "haben" or "sein"');
    lines.push('  "partizip": past participle (string)');
  }
  if (!entry.example_de) {
    lines.push('  "example": one example sentence in German (string, optional)');
  }
  lines.push("Do not include any other text outside the JSON object.");
  return lines.join("\n");
}

async function attempt(
  entry: RawEntry,
  client: LlmClient,
): Promise<EnrichedFields | null> {
  let content: string;
  try {
    const res = await client.complete({ prompt: buildPrompt(entry) });
    content = res.content;
  } catch {
    // LlmClient throws on empty content or non-"stop" finish_reason — treat as malformed
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  const parsed = enrichedFieldsSchema.safeParse(raw);
  if (!parsed.success) return null;
  // For verbs, require aux + partizip — otherwise reject so the retry path triggers.
  if (entry.pos === "verb" && (!parsed.data.aux || !parsed.data.partizip)) return null;
  return parsed.data;
}

export async function enrich(
  entry: RawEntry,
  client: LlmClient,
  cache: FileCache,
  options: { bypassRead?: boolean } = {},
): Promise<EnrichedFields | null> {
  const key = cacheKey({
    level: entry.level,
    lemma: entry.lemma,
    pos: entry.pos,
    promptVersion: PROMPT_VERSION,
  });
  if (!options.bypassRead) {
    const cached = await cache.get(key);
    if (cached !== undefined) {
      // Re-validate against the current schema so a hand-edited or
      // schema-drifted cache file falls through to the LLM instead of
      // smuggling bad data into the build.
      const reparsed = enrichedFieldsSchema.safeParse(cached);
      if (reparsed.success) return reparsed.data;
    }
  }

  let result = await attempt(entry, client);
  if (!result) {
    result = await attempt(entry, client); // one retry
  }
  if (!result) {
    console.warn(`[enrich] giving up on ${entry.level}/${entry.lemma} (${entry.pos})`);
    return null;
  }
  await cache.set(key, result);
  return result;
}
