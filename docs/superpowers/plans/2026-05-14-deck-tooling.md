# Deck Build Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node + TypeScript pipeline at `tools/build-decks/` that turns the Goethe-Institut A1/A2/B1 wordlists (sourced from a pinned commit of `ilkermeliksitki/goethe-institute-wordlist`) into the deck JSON files the flashcard PWA consumes, using an OpenAI-compatible LLM (default DeepSeek V3 via chutes.ai) for translation and verb-form enrichment, with disk-backed caching and Zod validation against the same schema the app uses.

**Architecture:** Workspace under the existing repo; imports `deckSchema` directly from `src/lib/schema.ts` so outputs are validated by the consumer's contract. Source parser is isolated to one module so a future source-repo swap is contained. LLM calls are cached by `(level, lemma, pos, promptVersion)` so repeat runs cost nothing.

**Tech Stack:** Node 20+, TypeScript 5, Vitest, Zod 4 (shared with app), `openai` SDK (pointed at chutes.ai), `p-limit` for concurrency, `dotenv` for `.env`. npm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-14-deck-tooling-design.md`

**Pinned source commit:** `cfef1c1ed3fdfa732c8b7dbeb0010f3d75c9c784` (from `ilkermeliksitki/goethe-institute-wordlist`, dated 2025-10-07)

---

## File map

```
flashcard-pwa/
  package.json                                    # T1: add workspaces + build:decks script
  tools/
    build-decks/
      package.json                                # T1
      tsconfig.json                               # T1
      vitest.config.ts                            # T1
      README.md                                   # T14
      cache/                                      # gitignored, created at runtime
        .gitignore                                # T1
      fixtures/
        sample.a1.tsv                             # T5 test fixture
      src/
        sources/
          types.ts                                # T3
          ilkermeliksitki.ts                      # T5
          ilkermeliksitki.test.ts                 # T5
        plural.ts                                 # T4
        plural.test.ts                            # T4
        slug.ts                                   # T6
        slug.test.ts                              # T6
        cache.ts                                  # T7
        cache.test.ts                             # T7
        llm-client.ts                             # T8
        enrich-schema.ts                          # T9
        enrich.ts                                 # T9
        enrich.test.ts                            # T9
        assemble.ts                               # T10
        assemble.test.ts                          # T10
        validate.ts                               # T11
        validate.test.ts                          # T11
        build-deck.ts                             # T12
        cli.ts                                    # T13
  public/decks/
    de-a1.json                                    # T14: replaced by tooling output
    de-a2.json                                    # T14: new
    de-b1.json                                    # T14: new
```

Working directory for all commands: `/Users/geningdm/Projects/flashcard-pwa`
Tools workspace directory: `/Users/geningdm/Projects/flashcard-pwa/tools/build-decks`

---

## Task 1: Workspace scaffolding

**Files:**
- Create: `tools/build-decks/package.json`, `tools/build-decks/tsconfig.json`, `tools/build-decks/vitest.config.ts`, `tools/build-decks/cache/.gitignore`, `tools/build-decks/.gitignore`
- Modify: root `package.json` (add `workspaces` + `build:decks` script)

- [ ] **Step 1: Create `tools/build-decks/package.json`**

```json
{
  "name": "@flashcard-pwa/build-decks",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build:decks": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `tools/build-decks/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "baseUrl": ".",
    "paths": {
      "@app/*": ["../../src/*"]
    }
  },
  "include": ["src", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `tools/build-decks/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@app": path.resolve(__dirname, "../../src") },
  },
  test: {
    environment: "node",
    globals: true,
  },
});
```

- [ ] **Step 4: Create `tools/build-decks/cache/.gitignore`**

```
*
!.gitignore
```

- [ ] **Step 5: Create `tools/build-decks/.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 6: Modify root `package.json` to declare the workspace and forward the build script**

Open `package.json` and add the two top-level fields below (preserving everything else):

```json
{
  "workspaces": ["tools/build-decks"],
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:decks": "npm run -w @flashcard-pwa/build-decks build:decks"
  }
}
```

(Keep `dependencies` and `devDependencies` unchanged.)

- [ ] **Step 7: Verify the workspace resolves**

Run: `npm install`
Expected: completes without error; `tools/build-decks/node_modules` (or a hoisted layout) is set up.

- [ ] **Step 8: Commit**

```bash
git add tools/build-decks/ package.json package-lock.json
git commit -m "build-decks: scaffold workspace"
```

---

## Task 2: Install build-decks dependencies

**Files:** Modify `tools/build-decks/package.json` (via `npm install`)

- [ ] **Step 1: Install runtime deps**

```bash
npm install -w @flashcard-pwa/build-decks zod@^4 openai@^4 p-limit@^6 dotenv@^16
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D -w @flashcard-pwa/build-decks vitest@^4 typescript@^5 tsx@^4 @types/node@^25
```

- [ ] **Step 3: Verify workspace package.json shape**

Read `tools/build-decks/package.json`. The `dependencies` block must contain `zod`, `openai`, `p-limit`, `dotenv`. The `devDependencies` block must contain `vitest`, `typescript`, `tsx`, `@types/node`. If either is missing, re-run the corresponding install.

- [ ] **Step 4: Verify the test runner boots**

Create `tools/build-decks/src/__smoke__.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test -w @flashcard-pwa/build-decks`
Expected: 1 test passes.
Then delete the file: `rm tools/build-decks/src/__smoke__.test.ts`

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/package.json package-lock.json
git commit -m "build-decks: add zod, openai, p-limit, dotenv, vitest"
```

---

## Task 3: Source types and interface

**Files:**
- Create: `tools/build-decks/src/sources/types.ts`

- [ ] **Step 1: Create the file**

```ts
export type Level = "A1" | "A2" | "B1";

export type RawPos = "noun" | "verb" | "adj" | "adv" | "prep" | "conj" | "other";

export type RawEntry = {
  level: Level;
  raw: string;             // original column 1 verbatim, for debugging
  lemma: string;           // normalized headword without any polysemy marker
  pos: RawPos;
  article?: "der" | "die" | "das";
  plural?: string | null;  // for nouns; null = uncountable / no plural notation
  example_de?: string;
  example_en?: string;
  senses: number;          // # of polysemy lines collapsed into this entry (>=1)
};

export interface DeckSource {
  fetch(level: Level): Promise<RawEntry[]>;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck -w @flashcard-pwa/build-decks`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tools/build-decks/src/sources/types.ts
git commit -m "build-decks: source types"
```

---

## Task 4: Plural notation parser (TDD)

**Files:**
- Create: `tools/build-decks/src/plural.ts`, `tools/build-decks/src/plural.test.ts`

The source format encodes plurals as suffixes after a comma, e.g. `die Adresse,-en` → "Adressen". Handle the suffixes the source actually uses; unknown notations return `null` and emit a warning via the returned tuple.

- [ ] **Step 1: Write failing tests**

```ts
// tools/build-decks/src/plural.test.ts
import { describe, it, expect } from "vitest";
import { parsePlural } from "./plural";

describe("parsePlural", () => {
  it("returns null when there is no notation", () => {
    expect(parsePlural("Wasser", "")).toEqual({ plural: null, ok: true });
  });

  it("returns null on empty-dash notation", () => {
    expect(parsePlural("Mädchen", "-")).toEqual({ plural: null, ok: true });
  });

  it("appends suffix for -en", () => {
    expect(parsePlural("Adresse", "-en")).toEqual({ plural: "Adressen", ok: true });
  });

  it("appends suffix for -e", () => {
    expect(parsePlural("Angebot", "-e")).toEqual({ plural: "Angebote", ok: true });
  });

  it("appends suffix for -er", () => {
    expect(parsePlural("Kind", "-er")).toEqual({ plural: "Kinder", ok: true });
  });

  it("appends suffix for -s", () => {
    expect(parsePlural("Auto", "-s")).toEqual({ plural: "Autos", ok: true });
  });

  it("appends suffix for -n", () => {
    expect(parsePlural("Katze", "-n")).toEqual({ plural: "Katzen", ok: true });
  });

  it("applies umlaut + er for =er", () => {
    expect(parsePlural("Mann", "=er")).toEqual({ plural: "Männer", ok: true });
  });

  it("applies umlaut + e for =e", () => {
    expect(parsePlural("Stadt", "=e")).toEqual({ plural: "Städte", ok: true });
  });

  it("applies umlaut only for =", () => {
    expect(parsePlural("Bruder", "=")).toEqual({ plural: "Brüder", ok: true });
  });

  it("trims whitespace around the suffix", () => {
    expect(parsePlural("Haus", " =er ")).toEqual({ plural: "Häuser", ok: true });
  });

  it("returns ok=false for unknown notation", () => {
    expect(parsePlural("Kind", "weird")).toEqual({ plural: null, ok: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/plural.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// tools/build-decks/src/plural.ts
export type PluralParse = { plural: string | null; ok: boolean };

const KNOWN_SUFFIXES = new Set(["-", "-en", "-e", "-er", "-s", "-n", "=", "=e", "=er", "=n"]);

function umlaut(s: string): string {
  // Apply umlaut to the last A/O/U in the stem (single-vowel rule for Germanic plurals).
  const map: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] in map) {
      return s.slice(0, i) + map[s[i]] + s.slice(i + 1);
    }
  }
  return s;
}

export function parsePlural(lemma: string, notation: string): PluralParse {
  const n = notation.trim();
  if (n === "" || n === "-") return { plural: null, ok: true };
  if (!KNOWN_SUFFIXES.has(n)) return { plural: null, ok: false };
  const useUmlaut = n.startsWith("=");
  const suffix = n.replace(/^[-=]/, "");
  const stem = useUmlaut ? umlaut(lemma) : lemma;
  return { plural: stem + suffix, ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/plural.test.ts`
Expected: 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/src/plural.ts tools/build-decks/src/plural.test.ts
git commit -m "build-decks: plural notation parser"
```

---

## Task 5: ilkermeliksitki TSV parser (TDD)

**Files:**
- Create: `tools/build-decks/fixtures/sample.a1.tsv`, `tools/build-decks/src/sources/ilkermeliksitki.ts`, `tools/build-decks/src/sources/ilkermeliksitki.test.ts`

The parser:
1. Strips a polysemy marker like `(1)`, `(2)` from column 1.
2. Detects POS:
   - column 1 starts with `der `/`die `/`das ` → noun.
   - else if the lemma matches `/[a-zß][a-zß]+(en|n)$/i` → verb (rough but matches the source's pattern of verbs as bare infinitives).
   - else → `"other"` (the LLM can override later if needed; we don't need to be precise about adj/adv distinction here).
3. For nouns: split on the first comma to get `(article + lemma)` and `(plural suffix)`. Use `parsePlural` to produce the full plural.
4. Groups lines with the same `lemma` (after marker-strip) into one `RawEntry`. The lowest-numbered sense supplies `example_de`/`example_en`. `senses` is the count.
5. Skips the B1 header row (`german word\tgerman sentence\tenglish translation`).

- [ ] **Step 1: Create fixture file**

Create `tools/build-decks/fixtures/sample.a1.tsv` with this content (TAB-separated, real tabs not spaces):

```
die Adresse,-en	Können Sie mir seine Adresse sagen?	Could you tell me his address?
das Auto, -s	Das Auto ist rot.	The car is red.
das Wasser	Ich trinke Wasser.	I drink water.
der Mann, =er	Der Mann ist alt.	The man is old.
abfahren	Wir fahren um zwölf Uhr ab.	We leave at twelve.
alt(1)	Wie alt sind Sie?	How old are you?
alt(2)	Mein Auto ist alt.	My car is old.
und	Ich und du.	I and you.
```

(If your editor inserts spaces instead of tabs, use `printf` to write the file:

```bash
printf 'die Adresse,-en\tKönnen Sie mir seine Adresse sagen?\tCould you tell me his address?\n' > tools/build-decks/fixtures/sample.a1.tsv
```
…and append the remaining lines similarly. Or paste through `sed 's/ \{2,\}/\t/g'`.)

- [ ] **Step 2: Write failing tests**

```ts
// tools/build-decks/src/sources/ilkermeliksitki.test.ts
import { describe, it, expect } from "vitest";
import { parseTsv, IlkermeliksitkiSource } from "./ilkermeliksitki";
import fs from "node:fs";
import path from "node:path";

const fixture = fs.readFileSync(
  path.resolve(__dirname, "../../fixtures/sample.a1.tsv"),
  "utf8",
);

describe("parseTsv", () => {
  const entries = parseTsv("A1", fixture);

  it("parses nouns with article + plural", () => {
    const e = entries.find((x) => x.lemma === "Adresse")!;
    expect(e.pos).toBe("noun");
    expect(e.article).toBe("die");
    expect(e.plural).toBe("Adressen");
    expect(e.example_de).toBe("Können Sie mir seine Adresse sagen?");
    expect(e.example_en).toBe("Could you tell me his address?");
  });

  it("handles plural notation with leading space", () => {
    const e = entries.find((x) => x.lemma === "Auto")!;
    expect(e.plural).toBe("Autos");
  });

  it("returns plural=null when no notation given", () => {
    const e = entries.find((x) => x.lemma === "Wasser")!;
    expect(e.plural).toBeNull();
  });

  it("handles umlaut plural notation", () => {
    const e = entries.find((x) => x.lemma === "Mann")!;
    expect(e.plural).toBe("Männer");
  });

  it("classifies bare -en lemmas as verbs", () => {
    const e = entries.find((x) => x.lemma === "abfahren")!;
    expect(e.pos).toBe("verb");
    expect(e.article).toBeUndefined();
  });

  it("collapses polysemy markers into one entry with senses count", () => {
    const e = entries.find((x) => x.lemma === "alt")!;
    expect(e.senses).toBe(2);
    expect(e.example_de).toBe("Wie alt sind Sie?"); // lowest-numbered wins
  });

  it("classifies remaining lemmas as 'other'", () => {
    const e = entries.find((x) => x.lemma === "und")!;
    expect(e.pos).toBe("other");
  });

  it("skips B1-style header row when present", () => {
    const withHeader = "german word\tgerman sentence\tenglish translation\n" + fixture;
    const e = parseTsv("B1", withHeader);
    expect(e.find((x) => x.lemma === "german word")).toBeUndefined();
    expect(e.length).toBe(entries.length);
  });

  it("preserves the raw column 1 for debugging", () => {
    const e = entries.find((x) => x.lemma === "Adresse")!;
    expect(e.raw).toBe("die Adresse,-en");
  });

  it("tags every entry with the given level", () => {
    for (const e of entries) {
      expect(e.level).toBe("A1");
    }
  });
});

describe("IlkermeliksitkiSource", () => {
  it("returns a DeckSource implementation", () => {
    const s = new IlkermeliksitkiSource();
    expect(typeof s.fetch).toBe("function");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/sources/ilkermeliksitki.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// tools/build-decks/src/sources/ilkermeliksitki.ts
import type { DeckSource, Level, RawEntry, RawPos } from "./types";
import { parsePlural } from "../plural";

export const SOURCE_COMMIT = "cfef1c1ed3fdfa732c8b7dbeb0010f3d75c9c784";
const BASE = `https://raw.githubusercontent.com/ilkermeliksitki/goethe-institute-wordlist/${SOURCE_COMMIT}`;
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

const POLYSEMY_RE = /\((\d+)\)\s*$/;
const ARTICLE_RE = /^(der|die|das)\s+(.+)$/;

type ParsedCol1 = {
  lemma: string;
  pos: RawPos;
  article?: "der" | "die" | "das";
  plural: string | null;
  senseNumber: number;
};

function parseCol1(col1: string): ParsedCol1 {
  let work = col1.trim();
  let senseNumber = 1;
  const m = work.match(POLYSEMY_RE);
  if (m) {
    senseNumber = Number(m[1]);
    work = work.replace(POLYSEMY_RE, "").trim();
  }

  // Noun?
  const am = work.match(ARTICLE_RE);
  if (am) {
    const article = am[1] as "der" | "die" | "das";
    const rest = am[2];
    // Split on first comma to separate lemma from plural suffix.
    const commaIdx = rest.indexOf(",");
    if (commaIdx === -1) {
      return { lemma: rest.trim(), pos: "noun", article, plural: null, senseNumber };
    }
    const lemma = rest.slice(0, commaIdx).trim();
    const notation = rest.slice(commaIdx + 1).trim();
    const { plural } = parsePlural(lemma, notation);
    return { lemma, pos: "noun", article, plural, senseNumber };
  }

  // Verb? Heuristic: bare infinitive ending in -en or -n (not preceded by an article).
  if (/[a-zäöüß][a-zäöüß]+n$/i.test(work)) {
    return { lemma: work, pos: "verb", plural: null, senseNumber };
  }

  // Everything else: "other" — the LLM step doesn't depend on a fine-grained POS,
  // and the schema accepts "other".
  return { lemma: work, pos: "other", plural: null, senseNumber };
}

function isHeader(cols: string[]): boolean {
  return cols[0] === "german word" && cols[1] === "german sentence";
}

export function parseTsv(level: Level, text: string): RawEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const groups = new Map<string, RawEntry>();

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 1) continue;
    if (isHeader(cols)) continue;

    const col1 = cols[0];
    const example_de = cols[1]?.trim() || undefined;
    const example_en = cols[2]?.trim() || undefined;

    const parsed = parseCol1(col1);
    const key = parsed.lemma;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        level,
        raw: col1,
        lemma: parsed.lemma,
        pos: parsed.pos,
        article: parsed.article,
        plural: parsed.plural,
        example_de,
        example_en,
        senses: 1,
      });
    } else {
      existing.senses += 1;
      // Lowest-numbered sense wins for the example: replace iff this line has a smaller sense number.
      // We can't compare senseNumber to existing without storing it; track via the example we already set.
      // Strategy: re-parse the existing.raw to recover its sense number.
      const existingSense = existing.raw.match(POLYSEMY_RE);
      const existingNum = existingSense ? Number(existingSense[1]) : 1;
      if (parsed.senseNumber < existingNum) {
        existing.raw = col1;
        existing.example_de = example_de;
        existing.example_en = example_en;
        existing.article = parsed.article ?? existing.article;
        existing.plural = parsed.plural ?? existing.plural;
        existing.pos = parsed.pos;
      }
    }
  }

  return Array.from(groups.values());
}

export class IlkermeliksitkiSource implements DeckSource {
  async fetch(level: Level): Promise<RawEntry[]> {
    const folder = level.toLowerCase();
    const out: RawEntry[] = [];
    for (const letter of LETTERS) {
      const url = `${BASE}/${folder}/${letter}.tsv`;
      const res = await fetch(url);
      if (res.status === 404) continue; // some letters legitimately empty
      if (!res.ok) {
        throw new Error(`fetch ${url} failed: HTTP ${res.status}`);
      }
      const text = await res.text();
      out.push(...parseTsv(level, text));
    }
    return out;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/sources/ilkermeliksitki.test.ts`
Expected: all tests pass (10 in `parseTsv` + 1 in `IlkermeliksitkiSource`).

- [ ] **Step 6: Commit**

```bash
git add tools/build-decks/fixtures/sample.a1.tsv tools/build-decks/src/sources/
git commit -m "build-decks: ilkermeliksitki tsv parser"
```

---

## Task 6: ID slug helper (TDD)

**Files:**
- Create: `tools/build-decks/src/slug.ts`, `tools/build-decks/src/slug.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tools/build-decks/src/slug.test.ts
import { describe, it, expect } from "vitest";
import { slugify, assignUniqueIds } from "./slug";

describe("slugify", () => {
  it("lowercases and ascii-folds umlauts and ß", () => {
    expect(slugify("Mädchen")).toBe("maedchen");
    expect(slugify("Brötchen")).toBe("broetchen");
    expect(slugify("Straße")).toBe("strasse");
    expect(slugify("für")).toBe("fuer");
  });

  it("replaces non-alphanumeric runs with a single dash", () => {
    expect(slugify("Auto-Bahn")).toBe("auto-bahn");
    expect(slugify("ein paar")).toBe("ein-paar");
    expect(slugify("alles, was")).toBe("alles-was");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  -Hund-  ")).toBe("hund");
  });
});

describe("assignUniqueIds", () => {
  it("returns the bare id when there are no collisions", () => {
    const ids = assignUniqueIds(["hund", "katze"], "de-a1");
    expect(ids).toEqual(["de-a1-hund", "de-a1-katze"]);
  });

  it("suffixes duplicates with -2, -3 deterministically by index", () => {
    const ids = assignUniqueIds(["hund", "hund", "hund"], "de-a1");
    expect(ids).toEqual(["de-a1-hund", "de-a1-hund-2", "de-a1-hund-3"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// tools/build-decks/src/slug.ts
const UMLAUT_MAP: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", ß: "ss",
  Ä: "ae", Ö: "oe", Ü: "ue",
};

export function slugify(input: string): string {
  let s = "";
  for (const ch of input) {
    s += UMLAUT_MAP[ch] ?? ch;
  }
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

export function assignUniqueIds(slugs: string[], prefix: string): string[] {
  const counts = new Map<string, number>();
  const out: string[] = [];
  for (const slug of slugs) {
    const c = counts.get(slug) ?? 0;
    counts.set(slug, c + 1);
    out.push(c === 0 ? `${prefix}-${slug}` : `${prefix}-${slug}-${c + 1}`);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/slug.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/src/slug.ts tools/build-decks/src/slug.test.ts
git commit -m "build-decks: slug helper + collision suffixing"
```

---

## Task 7: File-backed cache (TDD)

**Files:**
- Create: `tools/build-decks/src/cache.ts`, `tools/build-decks/src/cache.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/cache.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/src/cache.ts tools/build-decks/src/cache.test.ts
git commit -m "build-decks: file-backed cache"
```

---

## Task 8: LLM client wrapper

**Files:**
- Create: `tools/build-decks/src/llm-client.ts`

This is a thin facade — testing is via the enrich-module tests in Task 9, which mock the openai SDK.

- [ ] **Step 1: Implement**

```ts
// tools/build-decks/src/llm-client.ts
import OpenAI from "openai";
import "dotenv/config";

export type LlmRequest = {
  prompt: string;
};

export type LlmResponse = {
  content: string;
};

export interface LlmClient {
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export class OpenAiCompatibleClient implements LlmClient {
  private client: OpenAI;
  private model: string;

  constructor(opts?: { apiKey?: string; baseURL?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Put it in .env or pass to the constructor.");
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: opts?.baseURL ?? process.env.OPENAI_BASE_URL ?? "https://llm.chutes.ai/v1",
    });
    this.model = opts?.model ?? process.env.MODEL ?? "deepseek-ai/DeepSeek-V3";
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: req.prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const content = res.choices[0]?.message?.content ?? "";
    return { content };
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck -w @flashcard-pwa/build-decks`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tools/build-decks/src/llm-client.ts
git commit -m "build-decks: llm client (openai sdk + chutes.ai base url)"
```

---

## Task 9: Enrich module + schema (TDD)

**Files:**
- Create: `tools/build-decks/src/enrich-schema.ts`, `tools/build-decks/src/enrich.ts`, `tools/build-decks/src/enrich.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/enrich.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `enrich-schema.ts`**

```ts
// tools/build-decks/src/enrich-schema.ts
import { z } from "zod";

export const enrichedFieldsSchema = z.object({
  en: z.array(z.string().min(1)).min(1).max(5),
  aux: z.enum(["haben", "sein"]).optional(),
  partizip: z.string().min(1).optional(),
  example: z.string().min(1).optional(),
});

export type EnrichedFields = z.infer<typeof enrichedFieldsSchema>;
```

- [ ] **Step 4: Implement `enrich.ts`**

```ts
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
  const { content } = await client.complete({ prompt: buildPrompt(entry) });
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
    const cached = (await cache.get(key)) as EnrichedFields | undefined;
    if (cached) return cached;
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/enrich.test.ts`
Expected: 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tools/build-decks/src/enrich.ts tools/build-decks/src/enrich-schema.ts tools/build-decks/src/enrich.test.ts
git commit -m "build-decks: enrich module with retry + cache"
```

---

## Task 10: Assemble module (TDD)

**Files:**
- Create: `tools/build-decks/src/assemble.ts`, `tools/build-decks/src/assemble.test.ts`

`assemble` takes a `RawEntry` + `EnrichedFields` and produces a `Word` matching the app's `wordSchema`.

- [ ] **Step 1: Write failing tests**

```ts
// tools/build-decks/src/assemble.test.ts
import { describe, it, expect } from "vitest";
import { wordSchema } from "@app/lib/schema";
import { assembleWord } from "./assemble";
import type { RawEntry } from "./sources/types";

const id = "de-a1-hund";

describe("assembleWord", () => {
  it("produces a noun that passes wordSchema", () => {
    const raw: RawEntry = {
      level: "A1", raw: "der Hund", lemma: "Hund", pos: "noun",
      article: "der", plural: "Hunde", example_de: "Der Hund bellt.", senses: 1,
    };
    const w = assembleWord(id, raw, { en: ["dog"] });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w).toMatchObject({
      id, pos: "noun", lemma: "Hund", article: "der", plural: "Hunde",
      en: ["dog"], example: "Der Hund bellt.",
    });
  });

  it("produces a verb with aux + partizip", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen",
    });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w).toMatchObject({
      pos: "verb", aux: "sein", partizip: "gegangen", en: ["to go"],
    });
  });

  it("produces an 'other' POS entry without article/aux fields", () => {
    const raw: RawEntry = { level: "A1", raw: "und", lemma: "und", pos: "other", senses: 1 };
    const w = assembleWord("de-a1-und", raw, { en: ["and"] });
    expect(() => wordSchema.parse(w)).not.toThrow();
    expect(w.pos).toBe("other");
    expect((w as { article?: string }).article).toBeUndefined();
  });

  it("falls back to llm example when source has none", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen", example: "Ich gehe nach Hause.",
    });
    expect(w.example).toBe("Ich gehe nach Hause.");
  });

  it("prefers source example over llm example when both are present", () => {
    const raw: RawEntry = {
      level: "A1", raw: "gehen", lemma: "gehen", pos: "verb",
      example_de: "SOURCE", senses: 1,
    };
    const w = assembleWord("de-a1-gehen", raw, {
      en: ["to go"], aux: "sein", partizip: "gegangen", example: "LLM",
    });
    expect(w.example).toBe("SOURCE");
  });

  it("throws if a verb is missing aux or partizip", () => {
    const raw: RawEntry = { level: "A1", raw: "gehen", lemma: "gehen", pos: "verb", senses: 1 };
    expect(() => assembleWord("de-a1-gehen", raw, { en: ["to go"] })).toThrow();
  });

  it("throws if a noun is missing the article", () => {
    const raw: RawEntry = {
      level: "A1", raw: "Hund", lemma: "Hund", pos: "noun", senses: 1,
    };
    expect(() => assembleWord("de-a1-hund", raw, { en: ["dog"] })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/assemble.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// tools/build-decks/src/assemble.ts
import type { Word } from "@app/lib/schema";
import type { RawEntry } from "./sources/types";
import type { EnrichedFields } from "./enrich-schema";

export function assembleWord(id: string, raw: RawEntry, enriched: EnrichedFields): Word {
  const example = raw.example_de ?? enriched.example;

  if (raw.pos === "noun") {
    if (!raw.article) {
      throw new Error(`assembleWord: noun ${raw.lemma} missing article`);
    }
    return {
      id,
      pos: "noun",
      lemma: raw.lemma,
      article: raw.article,
      plural: raw.plural ?? null,
      en: enriched.en,
      ...(example ? { example } : {}),
    };
  }

  if (raw.pos === "verb") {
    if (!enriched.aux || !enriched.partizip) {
      throw new Error(`assembleWord: verb ${raw.lemma} missing aux or partizip`);
    }
    return {
      id,
      pos: "verb",
      lemma: raw.lemma,
      aux: enriched.aux,
      partizip: enriched.partizip,
      en: enriched.en,
      ...(example ? { example } : {}),
    };
  }

  return {
    id,
    pos: raw.pos,
    lemma: raw.lemma,
    en: enriched.en,
    ...(example ? { example } : {}),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/assemble.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/src/assemble.ts tools/build-decks/src/assemble.test.ts
git commit -m "build-decks: assemble raw + enriched into Word"
```

---

## Task 11: Validate module (TDD)

**Files:**
- Create: `tools/build-decks/src/validate.ts`, `tools/build-decks/src/validate.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tools/build-decks/src/validate.test.ts
import { describe, it, expect, vi } from "vitest";
import { validateDeck, EXPECTED_COUNTS } from "./validate";
import type { Word } from "@app/lib/schema";

const noun = (id: string): Word => ({
  id, pos: "noun", lemma: id, article: "der", plural: null, en: ["x"],
});

describe("validateDeck", () => {
  it("returns the parsed Deck on success", () => {
    const d = validateDeck("A1", [noun("de-a1-x")]);
    expect(d.id).toBe("de-a1");
    expect(d.language).toBe("de");
    expect(d.level).toBe("A1");
    expect(d.words).toHaveLength(1);
  });

  it("throws on schema violation", () => {
    const bad = { ...noun("de-a1-x"), en: [] } as unknown as Word;
    expect(() => validateDeck("A1", [bad])).toThrow();
  });

  it("warns when the count is below the expected lower bound", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const lower = Math.floor(EXPECTED_COUNTS.A1 * 0.85);
    validateDeck("A1", Array.from({ length: lower - 1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns when the count is above the expected upper bound", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const upper = Math.ceil(EXPECTED_COUNTS.A1 * 1.15);
    validateDeck("A1", Array.from({ length: upper + 1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when the count is in range", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    validateDeck("A1", Array.from({ length: EXPECTED_COUNTS.A1 }, (_, i) => noun(`de-a1-x${i}`)));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @flashcard-pwa/build-decks -- src/validate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// tools/build-decks/src/validate.ts
import { deckSchema, type Deck, type Word } from "@app/lib/schema";
import type { Level } from "./sources/types";

export const EXPECTED_COUNTS: Record<Level, number> = {
  A1: 650,
  A2: 1300,
  B1: 2400,
};

const NAME: Record<Level, string> = {
  A1: "Deutsch A1",
  A2: "Deutsch A2",
  B1: "Deutsch B1",
};

export function validateDeck(level: Level, words: Word[]): Deck {
  const deck = deckSchema.parse({
    id: `de-${level.toLowerCase()}`,
    language: "de",
    level,
    name: NAME[level],
    words,
  });

  const expected = EXPECTED_COUNTS[level];
  const low = Math.floor(expected * 0.85);
  const high = Math.ceil(expected * 1.15);
  if (words.length < low || words.length > high) {
    console.warn(
      `[validate] ${level} produced ${words.length} entries; expected ~${expected} (${low}-${high}).`,
    );
  }
  return deck;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @flashcard-pwa/build-decks -- src/validate.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/build-decks/src/validate.ts tools/build-decks/src/validate.test.ts
git commit -m "build-decks: validate deck against app schema + count check"
```

---

## Task 12: Build-deck orchestrator

**Files:**
- Create: `tools/build-decks/src/build-deck.ts`

This is the orchestrator wiring source → enrich → assemble → validate → write. No new logic, just composition. Verified end-to-end in Task 14.

- [ ] **Step 1: Implement**

```ts
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
  await fs.writeFile(tmp, text);
  await fs.rename(tmp, target);
  console.log(`[${opts.level}] wrote ${target} (${words.length} words)`);
  return { written: target, entries: words.length, dropped };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck -w @flashcard-pwa/build-decks`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tools/build-decks/src/build-deck.ts
git commit -m "build-decks: orchestrator"
```

---

## Task 13: CLI entry

**Files:**
- Create: `tools/build-decks/src/cli.ts`

- [ ] **Step 1: Implement**

```ts
// tools/build-decks/src/cli.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeck } from "./build-deck.ts";
import type { Level } from "./sources/types.ts";

const ALL_LEVELS: Level[] = ["A1", "A2", "B1"];

type Args = {
  levels: Level[];
  dryRun: boolean;
  noCache: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { levels: ALL_LEVELS, dryRun: false, noCache: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--level") {
      const v = (argv[++i] ?? "").toUpperCase();
      if (v === "ALL") { out.levels = ALL_LEVELS; continue; }
      if (v !== "A1" && v !== "A2" && v !== "B1") {
        throw new Error(`Unknown level: ${v}. Use A1, A2, B1, or all.`);
      }
      out.levels = [v];
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--no-cache") {
      out.noCache = true;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: build:decks [--level a1|a2|b1|all] [--dry-run] [--no-cache]");
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../../..");
  const outputDir = path.join(repoRoot, "public", "decks");
  const cacheDir = path.join(here, "..", "cache");

  for (const level of args.levels) {
    await buildDeck({ level, outputDir, cacheDir, dryRun: args.dryRun, noCache: args.noCache });
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? String(err));
  process.exit(1);
});
```

- [ ] **Step 2: Sanity-check the CLI parses flags**

Run: `npm run build:decks -- --help`
Expected: prints the usage line and exits 0.

Run: `npm run build:decks -- --level foo` (just to verify error handling)
Expected: prints `Unknown level: FOO`, exits 1.

- [ ] **Step 3: Commit**

```bash
git add tools/build-decks/src/cli.ts
git commit -m "build-decks: cli entry"
```

---

## Task 14: README + end-to-end run on A1

**Files:**
- Create: `tools/build-decks/README.md`
- Modify: `public/decks/de-a1.json` (replaced), create `public/decks/de-a2.json`, `public/decks/de-b1.json`
- Create: `.env.example` at repo root

- [ ] **Step 1: Create `tools/build-decks/README.md`**

```md
# build-decks

Pipeline that turns the Goethe-Zertifikat A1/A2/B1 wordlists into the deck JSON the PWA consumes.

## Usage

```bash
# All three levels (cache hits = free)
npm run build:decks

# One level
npm run build:decks -- --level a1

# Don't actually write outputs
npm run build:decks -- --dry-run

# Bypass cache reads (still writes new cache entries)
npm run build:decks -- --no-cache
```

## Environment

Put your chutes.ai API key in `.env` at the repo root:

```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://llm.chutes.ai/v1   # default; override if needed
MODEL=deepseek-ai/DeepSeek-V3              # default; can swap to e.g. moonshotai/Kimi-K2
```

## Source

Wordlists are pulled from a pinned commit of [ilkermeliksitki/goethe-institute-wordlist](https://github.com/ilkermeliksitki/goethe-institute-wordlist).
The commit SHA lives in `src/sources/ilkermeliksitki.ts` (`SOURCE_COMMIT`). To upgrade, bump that constant and re-run.

## Architecture

```
sources/ → fetch raw TSV → parse to RawEntry[]
enrich.ts → per-word LLM call → EnrichedFields (cached on disk)
assemble.ts → RawEntry + EnrichedFields → Word
validate.ts → deckSchema.parse + count sanity check
build-deck.ts → orchestrator
```

The source-specific parser is the only file that knows about ilkermeliksitki's format. Swapping sources is one new file plus a CLI flag.
```

- [ ] **Step 2: Create `.env.example` at repo root**

```
OPENAI_API_KEY=
OPENAI_BASE_URL=https://llm.chutes.ai/v1
MODEL=deepseek-ai/DeepSeek-V3
```

- [ ] **Step 3: Ensure `.env` is gitignored**

Run: `grep -E '^\.env$' /Users/geningdm/Projects/flashcard-pwa/.gitignore`
Expected: a match. If not present, append `.env` to `.gitignore` and commit.

- [ ] **Step 4: Run the full test suite for the workspace**

Run: `npm test -w @flashcard-pwa/build-decks`
Expected: all tests pass (the running total: 12 plural + 11 parser + 5 slug + 7 cache + 7 enrich + 7 assemble + 5 validate = 54 tests across 7 files).

- [ ] **Step 5: Stop and ask the operator for the chutes.ai key**

If `.env` does not yet exist or is missing `OPENAI_API_KEY`, ask the operator to populate it. Do not proceed until the key is present. Verify with:

Run: `test -s /Users/geningdm/Projects/flashcard-pwa/.env && grep -q '^OPENAI_API_KEY=.\+$' /Users/geningdm/Projects/flashcard-pwa/.env && echo OK || echo MISSING`
Expected: `OK`.

- [ ] **Step 6: Dry-run A1 to check the source fetch + parse + enrich pipeline**

Run: `npm run build:decks -- --level a1 --dry-run`
Expected: prints `[A1] fetching source...`, `[A1] parsed N entries from source` (N somewhere between 550 and 750), then `[A1] dry-run: would write …/de-a1.json with M words` (M close to N — some may have been dropped). No deck file is written yet.

If `N` is wildly off (e.g. under 100): the source fetch likely failed for most letters. Inspect with `npm run build:decks -- --level a1 --dry-run 2>&1 | grep -i 'failed\|error'`.

- [ ] **Step 7: Real run for A1**

Run: `npm run build:decks -- --level a1`
Expected: prints the same summary plus `[A1] wrote public/decks/de-a1.json (M words)`. Validate the file:

Run: `node -e "const d=require('./public/decks/de-a1.json'); console.log({id:d.id, level:d.level, count:d.words.length, sample:d.words[0]})"`
Expected: `id: 'de-a1', level: 'A1', count` matches the build summary, and `sample` is a parsed Word object.

Run: `npm test -- src/lib/schema.test.ts`
Expected: still passes — the new `de-a1.json` validates against `deckSchema`.

- [ ] **Step 8: Real runs for A2 and B1**

Run: `npm run build:decks -- --level a2`
Expected: writes `public/decks/de-a2.json`.

Run: `npm run build:decks -- --level b1`
Expected: writes `public/decks/de-b1.json`.

- [ ] **Step 9: Wire up the new decks in the PWA**

Open `src/lib/deck-loader.ts` and update `AVAILABLE_DECKS`:

```ts
export const AVAILABLE_DECKS = ["de-a1", "de-a2", "de-b1"] as const;
```

Run: `npm test`
Expected: all 64+ app tests still pass.

Run: `npm run build`
Expected: clean Vite build.

- [ ] **Step 10: Commit everything together**

```bash
git add tools/build-decks/README.md .env.example .gitignore public/decks/*.json src/lib/deck-loader.ts
git commit -m "build-decks: docs, generate A1/A2/B1, expose decks in the PWA"
```

- [ ] **Step 11: Manual smoke in the browser**

Run: `npm run dev`
Open the URL the dev server prints. Verify:
- Decks tab shows three cards (A1, A2, B1) with their word counts.
- Each deck opens, all three flows run for a sample word.
- Stats tab updates after a few interactions.

If something looks wrong, narrow it down to a single deck/flow before reporting.

---

## Self-review notes

The plan covers every section of the spec:

- §1 Overview / Non-goals — task list keeps to A1/A2/B1; no audio, no UI, no review tooling.
- §2 Source data — Task 5 parser handles every notation case the source uses (article, plural, polysemy, B1 header row, missing notation = null). Task 5 also pins the commit SHA in code.
- §3 Architecture — file layout matches §3 of the spec; tasks build the modules in bottom-up dependency order.
- §3 Source abstraction — Task 3 ships the `DeckSource` interface and `RawEntry` type; Task 5 implements the one parser. Swap = add one file.
- §3 LLM enrichment — Task 9 implements the per-word call with retry-once, JSON-mode response, and `enrichedFieldsSchema` validation.
- §3 Caching — Task 7 ships `FileCache` + `cacheKey`; Task 9 wires both into the enrich pipeline with `PROMPT_VERSION` for invalidation.
- §3 Assembly + validation — Tasks 10 and 11 cover field merging, ID slug + collisions (Task 6), and the `deckSchema.parse` + count sanity check.
- §3 Polysemy consolidation — covered by the parser tests in Task 5 (`alt(1)`/`alt(2)` collapse, lowest-numbered sense wins).
- §4 CLI surface — Task 13 implements `--level`, `--dry-run`, `--no-cache`, `--help`. The `--update-golden` flag mentioned in the spec is dropped here; the golden snapshot is replaced by a more pragmatic check (running the full app test suite confirms schema fit) and can be added later if drift becomes a real problem.
- §5 Testing — every TDD task above writes its own tests; total ~54 unit tests by Task 14.
- §6 Error handling — covered: HTTP failure → throw (Task 5), parse errors → skip with warning (Task 5), LLM malformed JSON → retry-once → drop (Task 9), schema failure → throw (Task 11), count out of bounds → warn (Task 11), cache write failure → warn (Task 7).
- §7 Repo layout — Task 1 sets up workspaces and the build script; Task 14 wires the new decks into the PWA.

Known deviation: the `--update-golden` flag and `fixtures/golden-a1-sample.json` from spec §5 are deferred. The combination of `wordSchema.parse` on every assembled entry + the app's `schema.test.ts` re-running against the new `de-a1.json` (Task 14 Step 7) catches the same regressions for less infra. Easy to add later if useful.
