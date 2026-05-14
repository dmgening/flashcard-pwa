// tools/build-decks/src/enrich.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { enrich, PROMPT_VERSION } from "./enrich";
import { FileCache } from "./cache";
import type { RawEntry } from "./sources/types";
import type { LlmClient } from "./llm-client";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "enrich-test-"));
});

const noun: RawEntry = {
  level: "A1", raw: "der Hund", lemma: "Hund", pos: "noun",
  article: "der", plural: "Hunde", example_de: "Der Hund bellt.", example_en: "The dog barks.",
  senses: 1,
};

const verb: RawEntry = {
  level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1,
};

function mockClient(responses: string[]) {
  let i = 0;
  const stats = { calls: 0 };
  const client: LlmClient = {
    async complete() {
      stats.calls += 1;
      const content = responses[i] ?? responses[responses.length - 1];
      i += 1;
      return { content };
    },
  };
  return { client, stats };
}

describe("enrich", () => {
  it("calls the LLM for a noun and returns parsed en[]", async () => {
    const { client, stats } = mockClient([JSON.stringify({ en: ["dog"] })]);
    const cache = new FileCache(tmp);
    const out = await enrich(noun, client, cache);
    expect(out).toEqual({ en: ["dog"] });
    expect(stats.calls).toBe(1);
  });

  it("requires aux + partizip for verbs", async () => {
    const { client } = mockClient([JSON.stringify({ en: ["to go"], aux: "sein", partizip: "gegangen" })]);
    const cache = new FileCache(tmp);
    const out = await enrich(verb, client, cache);
    expect(out?.aux).toBe("sein");
    expect(out?.partizip).toBe("gegangen");
  });

  it("hits cache on the second call", async () => {
    const { client, stats } = mockClient([JSON.stringify({ en: ["dog"] })]);
    const cache = new FileCache(tmp);
    await enrich(noun, client, cache);
    await enrich(noun, client, cache);
    expect(stats.calls).toBe(1);
  });

  it("bypassRead skips the cache on get but still writes", async () => {
    const { client, stats } = mockClient([JSON.stringify({ en: ["dog"] }), JSON.stringify({ en: ["dog"] })]);
    const cache = new FileCache(tmp);
    await enrich(noun, client, cache);
    await enrich(noun, client, cache, { bypassRead: true });
    expect(stats.calls).toBe(2);
  });

  it("retries once on malformed JSON", async () => {
    const { client, stats } = mockClient(["not json", JSON.stringify({ en: ["dog"] })]);
    const cache = new FileCache(tmp);
    const out = await enrich(noun, client, cache);
    expect(out?.en).toEqual(["dog"]);
    expect(stats.calls).toBe(2);
  });

  it("returns null after two consecutive failures", async () => {
    const { client, stats } = mockClient(["bad", "still bad"]);
    const cache = new FileCache(tmp);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await enrich(noun, client, cache);
    expect(out).toBeNull();
    expect(stats.calls).toBe(2);
    warn.mockRestore();
  });

  it("rejects LLM output that doesn't satisfy enrichedFieldsSchema (e.g. empty en)", async () => {
    const { client } = mockClient([JSON.stringify({ en: [] }), JSON.stringify({ en: [] })]);
    const cache = new FileCache(tmp);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await enrich(noun, client, cache);
    expect(out).toBeNull();
    warn.mockRestore();
  });

  it("exports a PROMPT_VERSION constant", () => {
    expect(typeof PROMPT_VERSION).toBe("number");
  });
});
