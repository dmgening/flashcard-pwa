// tools/build-decks/src/enrich.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { enrichBatch, PROMPT_VERSION, BATCH_SIZE, buildBatchPrompt } from "./enrich";
import { FileCache } from "./cache";
import type { RawEntry } from "./sources/types";
import type { LlmClient } from "./llm-client";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "enrich-test-"));
});

const noun = (lemma: string): RawEntry => ({
  level: "A1", raw: `der ${lemma}`, lemma, pos: "noun",
  article: "der", plural: `${lemma}e`, example_de: `Der ${lemma}.`, example_en: `The ${lemma}.`,
  senses: 1,
});

const verb = (lemma: string): RawEntry => ({
  level: "A1", raw: lemma, lemma, pos: "verb", senses: 1,
});

function mockClient(responses: string[]) {
  let i = 0;
  const stats = { calls: 0, prompts: [] as string[] };
  const client: LlmClient = {
    async complete(req) {
      stats.calls += 1;
      stats.prompts.push(req.prompt);
      const content = responses[i] ?? responses[responses.length - 1];
      i += 1;
      return { content };
    },
  };
  return { client, stats };
}

function batchResponse(items: Array<{ idx: number; en: string[]; aux?: "haben"|"sein"; partizip?: string; example?: string }>): string {
  return JSON.stringify({ results: items });
}

describe("constants", () => {
  it("exports a numeric PROMPT_VERSION and BATCH_SIZE", () => {
    expect(typeof PROMPT_VERSION).toBe("number");
    expect(typeof BATCH_SIZE).toBe("number");
    expect(BATCH_SIZE).toBeGreaterThan(1);
  });
});

describe("buildBatchPrompt", () => {
  it("numbers each entry with [idx] and includes POS-specific fields", () => {
    const prompt = buildBatchPrompt([noun("Hund"), verb("gehen")]);
    expect(prompt).toContain("[0] Hund (pos=noun, article=der");
    expect(prompt).toContain("[1] gehen (pos=verb");
  });

  it("instructs the model to return aux + partizip for verbs", () => {
    const prompt = buildBatchPrompt([verb("gehen")]);
    expect(prompt).toMatch(/aux/);
    expect(prompt).toMatch(/partizip/);
  });
});

describe("enrichBatch", () => {
  it("returns fields keyed by lemma after a successful batch call", async () => {
    const { client, stats } = mockClient([batchResponse([
      { idx: 0, en: ["dog"] },
      { idx: 1, en: ["cat"] },
    ])]);
    const cache = new FileCache(tmp);
    const out = await enrichBatch([noun("Hund"), noun("Katze")], client, cache);
    expect(out.get("Hund")).toEqual({ en: ["dog"] });
    expect(out.get("Katze")).toEqual({ en: ["cat"] });
    expect(stats.calls).toBe(1);
  });

  it("requires aux + partizip for verbs; drops verb items missing them", async () => {
    const { client } = mockClient([batchResponse([
      { idx: 0, en: ["to go"], aux: "sein", partizip: "gegangen" },
      { idx: 1, en: ["to do"] }, // missing aux/partizip → dropped
    ])]);
    const cache = new FileCache(tmp);
    const out = await enrichBatch([verb("gehen"), verb("machen")], client, cache);
    expect(out.get("gehen")?.aux).toBe("sein");
    expect(out.get("machen")).toBeNull();
  });

  it("hits cache on subsequent calls — does not re-invoke the LLM", async () => {
    const { client, stats } = mockClient([batchResponse([{ idx: 0, en: ["dog"] }])]);
    const cache = new FileCache(tmp);
    await enrichBatch([noun("Hund")], client, cache);
    await enrichBatch([noun("Hund")], client, cache);
    expect(stats.calls).toBe(1);
  });

  it("bypassRead forces re-fetch but still writes to cache", async () => {
    const { client, stats } = mockClient([
      batchResponse([{ idx: 0, en: ["dog"] }]),
      batchResponse([{ idx: 0, en: ["dog"] }]),
    ]);
    const cache = new FileCache(tmp);
    await enrichBatch([noun("Hund")], client, cache);
    await enrichBatch([noun("Hund")], client, cache, { bypassRead: true });
    expect(stats.calls).toBe(2);
  });

  it("retries the batch once on malformed JSON before dropping", async () => {
    const { client, stats } = mockClient([
      "not json",
      batchResponse([{ idx: 0, en: ["dog"] }]),
    ]);
    const cache = new FileCache(tmp);
    const out = await enrichBatch([noun("Hund")], client, cache);
    expect(out.get("Hund")?.en).toEqual(["dog"]);
    expect(stats.calls).toBe(2);
  });

  it("logs and returns null entries when a batch fails twice", async () => {
    const { client, stats } = mockClient(["bad", "still bad"]);
    const cache = new FileCache(tmp);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await enrichBatch([noun("Hund")], client, cache);
    expect(out.get("Hund")).toBeNull();
    expect(stats.calls).toBe(2);
    warn.mockRestore();
  });

  it("rejects a batch whose envelope doesn't match batchResponseSchema", async () => {
    const { client } = mockClient([JSON.stringify({ wrong: "shape" })]);
    const cache = new FileCache(tmp);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await enrichBatch([noun("Hund")], client, cache);
    expect(out.get("Hund")).toBeNull();
    warn.mockRestore();
  });

  it("ignores idx values outside the batch range", async () => {
    const { client } = mockClient([batchResponse([
      { idx: 0, en: ["dog"] },
      { idx: 9, en: ["bogus"] }, // out of range; should be skipped
    ])]);
    const cache = new FileCache(tmp);
    const out = await enrichBatch([noun("Hund")], client, cache);
    expect(out.get("Hund")?.en).toEqual(["dog"]);
  });

  it("splits a long input list into multiple batches", async () => {
    // BATCH_SIZE entries fit in one batch; BATCH_SIZE + 1 needs two.
    const inputs = Array.from({ length: BATCH_SIZE + 1 }, (_, i) => noun(`W${i}`));
    const batch1 = Array.from({ length: BATCH_SIZE }, (_, i) => ({ idx: i, en: [`gloss${i}`] }));
    const batch2 = [{ idx: 0, en: [`gloss${BATCH_SIZE}`] }];
    const { client, stats } = mockClient([batchResponse(batch1), batchResponse(batch2)]);
    const cache = new FileCache(tmp);
    const out = await enrichBatch(inputs, client, cache);
    expect(stats.calls).toBe(2);
    expect(out.get("W0")?.en).toEqual(["gloss0"]);
    expect(out.get(`W${BATCH_SIZE}`)?.en).toEqual([`gloss${BATCH_SIZE}`]);
  });
});
