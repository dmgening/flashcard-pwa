# Deck Build Tooling — Design

**Date:** 2026-05-14
**Status:** Approved, ready for implementation plan
**Branch:** `feat/deck-tooling`
**Related spec:** `docs/superpowers/specs/2026-05-13-flashcard-pwa-design.md` (consumer of the output)

## 1. Overview

Build pipeline that turns the official Goethe-Zertifikat A1/A2/B1 wordlists into the dictionary JSON files the PWA consumes. Runs locally on demand, uses an OpenAI-compatible LLM (default DeepSeek V3 via chutes.ai) to fill in fields the source doesn't carry, and validates the final output against the same Zod `deckSchema` the app already uses.

Goals:

- Produce `public/decks/de-a1.json`, `de-a2.json`, `de-b1.json` matching `deckSchema` (Word discriminated union by `pos`).
- Make repeat runs free: cache LLM responses by `(level, lemma, pos, prompt-version)`.
- Be source-agnostic: the parser for the chosen GitHub repo is one swappable module, so a future source change is contained.
- Fail loudly: any schema violation, parse error, or LLM-output mismatch fails the build with a pointer to the offending entry.

Non-goals (v1 of this sub-project):

- Levels above B1 (B2/C1/C2). Same pipeline applies; add a parser when needed.
- Audio synthesis — the PWA uses Web Speech at runtime.
- A web UI or CI integration — local CLI only.
- Translation review tooling — the cache file IS the review surface (open in an editor, edit, re-run).

## 2. Source data

**Repo:** [`ilkermeliksitki/goethe-institute-wordlist`](https://github.com/ilkermeliksitki/goethe-institute-wordlist)

Pinned by **commit SHA** (resolved at implementation time) so source drift doesn't silently change our output. Fetched via `raw.githubusercontent.com`.

**Format** (per level, one TSV per starting letter under `<level>/<letter>.tsv`, 3 columns; B1 has a header row, A1/A2 do not):

```
die Adresse,-en        Können Sie mir seine Adresse sagen?        Could you tell me his address?
abfahren               Wir fahren um zwölf Uhr ab.                We leave at twelve o'clock.
alt(1)                 Wie alt sind Sie?                          How old are you?
alt(2)                 Sie sehen aber nicht so alt aus.           But you don't look that old.
```

What we can extract from column 1:

- **Article + plural for nouns:** `die Adresse,-en` → `{ pos: "noun", article: "die", lemma: "Adresse", plural: "Adressen" }`. Several plural notations exist (`-en`, `-e`, `-er`, `-s`, `=` for umlaut, no suffix for unchanged plurals); the parser resolves the suffix against the singular stem.
- **Verb detection:** no article + ends in `-en` / `-n` → verb. Lemma is the column verbatim.
- **Adjective/adverb/other:** everything else.
- **Polysemy markers:** `alt(1)…alt(5)` → five lines that share a lemma. Parser groups by lemma and emits one entry whose `en[]` aggregates the senses and whose `example` is the highest-frequency or first sense (deterministic: pick the lowest-numbered).

What the source does **not** give us:

- Lemma-level English translation — the EN column glosses the *sentence*, not the headword. LLM call required.
- Verb `aux` (haben/sein) + `partizip` (past participle) — LLM call required.

Caveats:

- No license file in the source repo. The underlying material is the Goethe-Institut's publicly published wordlist. Treat the derived deck files as personal-use; if the project is ever published, cite the source explicitly and recheck redistribution rights.
- The README acknowledges occasional missing words. The build will print a per-level count and a "low-confidence" flag if the entry count falls outside known reference bounds (A1≈650, A2≈1300, B1≈2400). This is a soft warning, not a build-stopper.

## 3. Architecture

A separate Node + TypeScript workspace at `tools/build-decks/`, with its own `package.json` and `tsconfig.json`. It imports `deckSchema` directly from the app's `src/lib/schema.ts` via a relative path — outputs validate against the same Zod schema the PWA consumes, so any drift fails the build.

```
tools/build-decks/
  src/
    cli.ts                  # `npm run build:decks [--level a1|a2|b1|all] [--no-cache]`
    build-deck.ts           # orchestrator: source → parse → enrich → assemble → validate → write
    sources/
      ilkermeliksitki.ts    # repo-specific parser (TSV → RawEntry[]); the only file that knows about this source
      types.ts              # RawEntry interface — the swap point
    enrich.ts               # per-word LLM call, returns EnrichedFields
    llm-client.ts           # OpenAI SDK wired to chutes.ai
    cache.ts                # file-backed cache: hash(level, lemma, pos, promptVersion) → response
    assemble.ts             # RawEntry + EnrichedFields → Word
    validate.ts             # deckSchema.parse + count sanity check
  cache/
    .gitignore              # `*` — cache contents not committed
  fixtures/
    golden-a1-sample.json   # 10-word snapshot; only regen'd via `--update-golden`
  src/__tests__/
    parser.test.ts          # ilkermeliksitki parser
    cache.test.ts           # key stability, hit/miss behavior
    enrich.test.ts          # LLM-response Zod parser, retry behavior
    assemble.test.ts        # field merging including polysemy consolidation
  package.json
  tsconfig.json
  README.md
```

### Source abstraction (the swap point)

`sources/types.ts` defines the common contract:

```ts
export type RawEntry = {
  level: "A1" | "A2" | "B1";
  raw: string;                       // original column 1, for debugging
  lemma: string;                     // normalized headword without polysemy marker
  pos: "noun" | "verb" | "adj" | "adv" | "prep" | "conj" | "other";
  article?: "der" | "die" | "das";   // for nouns
  plural?: string | null;            // for nouns (null = uncountable)
  example_de?: string;
  example_en?: string;
  senses: number;                    // # of polysemy lines collapsed into this entry
};

export interface DeckSource {
  fetch(level: "A1" | "A2" | "B1"): Promise<RawEntry[]>;
}
```

`sources/ilkermeliksitki.ts` is one implementation. Swapping sources is one new file plus a CLI flag (`--source <name>`).

### LLM enrichment

Per `RawEntry`, one LLM call produces:

```ts
type EnrichedFields = {
  en: string[];                                    // 1–3 canonical English translations
  aux?: "haben" | "sein";                          // verbs only
  partizip?: string;                               // verbs only
  example?: string;                                // only when source didn't supply one
};
```

Prompt (per call, JSON-only response):

```
You are a German lexicographer. Given a German headword, return JSON.

Headword: {lemma}
Part of speech: {pos}
{if pos == noun: Article: {article} / Plural: {plural}}
{if example_de: Example sentence: {example_de}}
{if senses > 1: This headword has {senses} senses in the source; produce up to 3 canonical English glosses covering the main ones.}

Return JSON exactly matching this shape, no commentary:
{
  "en": ["..."],
  {pos==verb: "aux": "haben"|"sein", "partizip": "..."}
}
```

- **Model:** default `deepseek-ai/DeepSeek-V3` via `OPENAI_BASE_URL=https://llm.chutes.ai/v1` (chutes.ai is OpenAI-compatible — exact URL resolved at impl time). Configurable via `MODEL` env var.
- **Concurrency:** `p-limit(8)`.
- **Retries:** one retry on HTTP 5xx or malformed JSON; after that the build records the failure and continues; the entry is dropped with a warning.
- **Output validation:** every LLM response is parsed with a dedicated Zod schema (`enrichedFieldsSchema`). Schema failure → retry once → drop.

### Caching

- **Key:** `sha1(level + "\0" + lemma + "\0" + pos + "\0" + promptVersion)`
- **Value:** the parsed `EnrichedFields` JSON (the post-Zod-validated output, not the raw LLM string).
- **Storage:** `tools/build-decks/cache/<first-2-chars-of-hash>/<full-hash>.json`. Sharded to keep directory size sane.
- **Invalidation:** bumping the `PROMPT_VERSION` constant in `enrich.ts` invalidates everything. `--no-cache` flag bypasses reads (writes still happen).

### Assembly + validation

1. For each level, parse → list of `RawEntry`.
2. Enrich each (cache or LLM call).
3. Merge into the schema's discriminated union shape:
   - noun: `{ id, pos: "noun", lemma, article, plural, en, example? }`
   - verb: `{ id, pos: "verb", lemma, aux, partizip, en, example? }`
   - other: `{ id, pos, lemma, en, example? }`
   - `example` precedence: source's `example_de` first, otherwise the LLM's fallback. In practice the source covers nearly all entries.
4. `id` format: `de-<level>-<slug>` where slug is the lowercase ASCII transliteration of the lemma (ä→ae, ö→oe, ü→ue, ß→ss; non-alphanumerics → `-`).
5. ID collision: if two entries slug to the same id (rare — happens with separable-verb pairs or homographs), suffix `-2`, `-3`, … deterministically by insertion order.
6. `deckSchema.parse({ id: "de-<level>", language: "de", level: "<LEVEL>", name: "Deutsch <LEVEL>", words })`.
7. Sanity check: `words.length` within `[expected*0.85, expected*1.15]` for the level. Warn if out of range, do not fail.
8. Pretty-print with stable key order (sort keys alphabetically) and 2-space indent. Atomic write via temp file + rename.

### Polysemy consolidation

When the parser sees `alt(1)…alt(5)` it emits ONE `RawEntry`:
- `lemma`: `"alt"` (marker stripped)
- `senses`: `5`
- `example_de` / `example_en`: from the `(1)` line (deterministic, lowest-numbered)
- The other senses are discarded from the structural output; their content informs the LLM prompt by way of the `senses` count.

This loses the per-sense example sentences but matches our schema (one example per entry). A future iteration could keep multiple examples in a new schema field.

## 4. CLI surface

```
npm run build:decks                # rebuild all three levels (cache hits = free)
npm run build:decks -- --level a1  # one level
npm run build:decks -- --no-cache  # bypass cache reads
npm run build:decks -- --dry-run   # don't write outputs; print summary
npm run build:decks -- --update-golden   # regen golden snapshot
```

Exit codes:
- `0` on success.
- `1` on parse error, validation failure, or all-retries exhausted on a non-recoverable LLM error.
- Soft warnings (count out of range, dropped entries) print to stderr but exit 0.

`.env` contract (loaded via `dotenv` at process start):

```
OPENAI_API_KEY=...                       # chutes.ai key, required
OPENAI_BASE_URL=https://llm.chutes.ai/v1  # default; override if needed
MODEL=deepseek-ai/DeepSeek-V3            # default; can swap to Kimi-K2 or similar
```

## 5. Testing

- **Parser tests** (`parser.test.ts`): fixtures covering each notation case — `die Adresse,-en`, `der Mann, =er`, `das Auto, -s`, plain verbs, polysemy collapse, the B1 header row. ~12 hand-built cases.
- **Cache tests** (`cache.test.ts`): same input → same key; different `PROMPT_VERSION` → different key; round-trip read/write.
- **Enrich tests** (`enrich.test.ts`): mock the OpenAI client; verify retry-once on malformed JSON; verify schema enforcement on LLM output; verify cache hit avoids the network call.
- **Assemble tests** (`assemble.test.ts`): given a `RawEntry` + `EnrichedFields`, produce a Word that passes `wordSchema.parse`. Includes noun/verb/adj cases.
- **Golden snapshot** (`fixtures/golden-a1-sample.json`): a small curated subset of A1 (10 entries) representing each POS + polysemy. The snapshot is updated only via `--update-golden` so any regen against `main` shows up as a deliberate diff in PRs.
- No end-to-end test against the real network — the cache makes integration testing slow and chutes.ai outages would block CI.

## 6. Error handling

| Failure mode | Behavior |
|---|---|
| HTTP fetch fails (source repo down / bad commit) | Hard fail with the URL and HTTP status. |
| TSV parse error on a single line | Skip the line, print warning with line content. |
| Parser can't infer POS | Default to `"other"`. Print warning. |
| LLM returns malformed JSON | Retry once. On second failure, drop the entry, print warning. |
| LLM returns valid JSON but fails `enrichedFieldsSchema` | Same as above. |
| Final `deckSchema.parse` fails | Hard fail. Print the first violation's path + offending entry. |
| Entry count outside expected bounds | Soft warning, continue. |
| Cache write fails | Soft warning, continue (don't lose the build over disk). |

## 7. Repository layout impact

Files added under `tools/build-decks/` (see §3). A workspace entry in the root `package.json` so `npm run build:decks` resolves. The root project gains:

```json
{
  "scripts": {
    "build:decks": "npm run -w tools/build-decks build:decks"
  },
  "workspaces": ["tools/build-decks"]
}
```

`public/decks/de-a1.json` is **replaced** by the tooling output — the existing 30-word hand-curated file is no longer the source of truth. The new file is ~650 entries.

`tools/build-decks/cache/` is gitignored. Cache files are intentionally local: the LLM responses depend on the model + prompt and aren't a public artifact.

## 8. Open questions (resolved in this brainstorm, recorded for traceability)

- Source: `ilkermeliksitki/goethe-institute-wordlist`, pinned by commit. Future swap is one parser file.
- Tooling: Node + TS in `tools/build-decks/`, shares Zod schema with the app.
- LLM provider: chutes.ai (OpenAI-compatible), default model `deepseek-ai/DeepSeek-V3`, key via `.env`.
- Enrichment scope: lemma-level translations, verb aux+partizip, fallback example. Article+plural come from the source.
- Polysemy: collapse into one entry, multi-translation `en[]`, single example from the lowest-numbered sense.
- Caching: keyed on `(level, lemma, pos, promptVersion)`, sharded file storage, prompt-version-gated invalidation.
- Validation: same `deckSchema` the PWA uses; mismatched outputs fail the build hard.
- Levels: A1, A2, B1. B2+ deferred to a future iteration.
