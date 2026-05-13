# flashcard-pwa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first PWA for studying CEFR-leveled German vocabulary with three study flows (swipe, multiple choice, typing) and weighted-random word selection that favors weak words.

**Architecture:** React 18 SPA built with Vite. Persistent state in IndexedDB via Dexie; ephemeral state in Zustand. Three study flows share a single `useStudySession` hook. Word selection uses a pluggable RNG so it can be tested deterministically. PWA wrapping via `vite-plugin-pwa`.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind CSS 3.4, Dexie 4, Zustand 4, Zod 3, react-router-dom 6, vite-plugin-pwa 0.20, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-13-flashcard-pwa-design.md`

---

## File map

```
flashcard-pwa/
  public/
    decks/de-a1.json                 # Task 4
    icons/icon-192.png, icon-512.png # Task 21
  src/
    main.tsx                         # Task 1
    app/router.tsx                   # Task 13
    app/tab-bar.tsx                  # Task 13
    routes/decks.tsx                 # Task 14
    routes/study.tsx                 # Task 15
    routes/stats.tsx                 # Task 19
    routes/settings.tsx              # Task 20
    flows/use-study-session.ts       # Task 12
    flows/swipe-flow.tsx             # Task 16
    flows/mc-flow.tsx                # Task 17
    flows/type-flow.tsx              # Task 18
    lib/schema.ts                    # Task 3
    lib/deck-loader.ts               # Task 5
    lib/selection.ts                 # Task 8
    lib/diff.ts                      # Task 9
    lib/tts.ts                       # Task 10
    db/dexie.ts                      # Task 6
    db/stats.ts                      # Task 7
    db/export-import.ts              # Task 20
    store/session-store.ts           # Task 11
    styles/index.css                 # Task 1
  index.html                         # Task 1
  vite.config.ts                     # Task 1, updated Task 21
  tailwind.config.ts                 # Task 1
  postcss.config.js                  # Task 1
  tsconfig.json                      # Task 1
  package.json                       # Task 1, updated Task 2
  vitest.config.ts                   # Task 2
```

Working directory for all commands: `/Users/geningdm/Projects/flashcard-pwa`

---

## Task 1: Scaffold Vite + React + TS + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/styles/index.css`, `src/app/app.tsx` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "flashcard-pwa",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        article: {
          der: "#5aa9ff",
          die: "#ff7a9a",
          das: "#6ee7b7",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0d0d0d" />
    <title>Flashcards</title>
  </head>
  <body class="bg-neutral-950 text-neutral-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { -webkit-tap-highlight-color: transparent; }
```

- [ ] **Step 9: Create `src/app/app.tsx` (placeholder; replaced in Task 13)**

```tsx
export function App() {
  return (
    <div className="min-h-full grid place-items-center">
      <h1 className="text-2xl font-bold">flashcard-pwa</h1>
    </div>
  );
}
```

- [ ] **Step 10: Create `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/app";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 11: Install + verify dev server boots**

Run: `npm install`
Run: `npm run dev`
Expected: Vite prints a localhost URL, opening it shows the "flashcard-pwa" heading. Stop the dev server (Ctrl+C).
Run: `npm run build`
Expected: build succeeds, emits `dist/`.

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: scaffold vite + react + ts + tailwind"
```

---

## Task 2: Add app dependencies and test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `src/test/setup.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install dexie zustand zod react-router-dom
```

- [ ] **Step 2: Install dev dependencies (test runner + PWA plugin)**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb vite-plugin-pwa workbox-window
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
```

- [ ] **Step 5: Verify the test runner boots**

Add a smoke test temporarily: create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test passes.
Then delete `src/test/smoke.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add app deps and vitest setup"
```

---

## Task 3: Zod schemas for Deck / Word

**Files:**
- Create: `src/lib/schema.ts`
- Test: `src/lib/schema.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deckSchema } from "./schema";

const validNoun = {
  id: "de-a1-hund",
  lemma: "Hund",
  pos: "noun",
  article: "der",
  plural: "Hunde",
  en: ["dog"],
};

const validVerb = {
  id: "de-a1-gehen",
  lemma: "gehen",
  pos: "verb",
  aux: "sein",
  partizip: "gegangen",
  en: ["to go", "to walk"],
};

const validDeck = {
  id: "de-a1",
  language: "de",
  level: "A1",
  name: "Deutsch A1",
  words: [validNoun, validVerb],
};

describe("deckSchema", () => {
  it("accepts a valid deck", () => {
    expect(() => deckSchema.parse(validDeck)).not.toThrow();
  });

  it("requires article on nouns", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, article: undefined }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("requires aux on verbs", () => {
    const bad = { ...validDeck, words: [{ ...validVerb, aux: undefined }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("rejects unknown pos", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, pos: "interjection" }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("rejects unknown level", () => {
    const bad = { ...validDeck, level: "Z9" };
    expect(() => deckSchema.parse(bad)).toThrow();
  });

  it("accepts en as a non-empty array", () => {
    const bad = { ...validDeck, words: [{ ...validNoun, en: [] }] };
    expect(() => deckSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/schema.test.ts`
Expected: FAIL — `deckSchema` is not exported yet.

- [ ] **Step 3: Implement schemas**

Create `src/lib/schema.ts`:

```ts
import { z } from "zod";

export const levelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const articleSchema = z.enum(["der", "die", "das"]);
export const auxSchema = z.enum(["haben", "sein"]);

const wordBase = z.object({
  id: z.string().min(1),
  lemma: z.string().min(1),
  en: z.array(z.string().min(1)).min(1),
  example: z.string().optional(),
});

export const wordSchema = z.discriminatedUnion("pos", [
  wordBase.extend({
    pos: z.literal("noun"),
    article: articleSchema,
    plural: z.string().nullable(),
  }),
  wordBase.extend({
    pos: z.literal("verb"),
    aux: auxSchema,
    partizip: z.string().min(1),
  }),
  wordBase.extend({
    pos: z.enum(["adj", "adv", "prep", "conj", "other"]),
  }),
]);

export const deckSchema = z.object({
  id: z.string().min(1),
  language: z.literal("de"),
  level: levelSchema,
  name: z.string().min(1),
  words: z.array(wordSchema),
});

export type Word = z.infer<typeof wordSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type Level = z.infer<typeof levelSchema>;
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/schema.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add zod schemas for deck/word"
```

---

## Task 4: Seed `de-a1.json` deck

**Files:**
- Create: `public/decks/de-a1.json`
- Test: `src/lib/schema.test.ts` (extend)

- [ ] **Step 1: Create `public/decks/de-a1.json`**

```json
{
  "id": "de-a1",
  "language": "de",
  "level": "A1",
  "name": "Deutsch A1",
  "words": [
    { "id": "de-a1-hund",      "pos": "noun", "lemma": "Hund",      "article": "der", "plural": "Hunde",   "en": ["dog"],           "example": "Der Hund bellt laut im Garten." },
    { "id": "de-a1-katze",     "pos": "noun", "lemma": "Katze",     "article": "die", "plural": "Katzen",  "en": ["cat"],           "example": "Die Katze schläft auf dem Sofa." },
    { "id": "de-a1-haus",      "pos": "noun", "lemma": "Haus",      "article": "das", "plural": "Häuser", "en": ["house"],       "example": "Das Haus ist sehr alt." },
    { "id": "de-a1-frau",      "pos": "noun", "lemma": "Frau",      "article": "die", "plural": "Frauen",  "en": ["woman"],         "example": "Die Frau liest ein Buch." },
    { "id": "de-a1-mann",      "pos": "noun", "lemma": "Mann",      "article": "der", "plural": "Männer", "en": ["man"],         "example": "Der Mann trinkt Kaffee." },
    { "id": "de-a1-kind",      "pos": "noun", "lemma": "Kind",      "article": "das", "plural": "Kinder",  "en": ["child"],         "example": "Das Kind spielt im Park." },
    { "id": "de-a1-auto",      "pos": "noun", "lemma": "Auto",      "article": "das", "plural": "Autos",   "en": ["car"],           "example": "Das Auto ist rot." },
    { "id": "de-a1-strasse",   "pos": "noun", "lemma": "Straße", "article": "die", "plural": "Straßen", "en": ["street", "road"], "example": "Die Straße ist breit." },
    { "id": "de-a1-stadt",     "pos": "noun", "lemma": "Stadt",     "article": "die", "plural": "Städte", "en": ["city", "town"], "example": "Die Stadt ist groß." },
    { "id": "de-a1-buch",      "pos": "noun", "lemma": "Buch",      "article": "das", "plural": "Bücher", "en": ["book"],       "example": "Das Buch liegt auf dem Tisch." },
    { "id": "de-a1-wasser",    "pos": "noun", "lemma": "Wasser",    "article": "das", "plural": null,      "en": ["water"],         "example": "Ich trinke Wasser." },
    { "id": "de-a1-brot",      "pos": "noun", "lemma": "Brot",      "article": "das", "plural": "Brote",   "en": ["bread"],         "example": "Wir kaufen Brot." },

    { "id": "de-a1-sein",      "pos": "verb", "lemma": "sein",      "aux": "sein",  "partizip": "gewesen", "en": ["to be"],        "example": "Ich bin müde." },
    { "id": "de-a1-haben",     "pos": "verb", "lemma": "haben",     "aux": "haben", "partizip": "gehabt",  "en": ["to have"],      "example": "Ich habe Zeit." },
    { "id": "de-a1-gehen",     "pos": "verb", "lemma": "gehen",     "aux": "sein",  "partizip": "gegangen","en": ["to go", "to walk"], "example": "Ich gehe nach Hause." },
    { "id": "de-a1-machen",    "pos": "verb", "lemma": "machen",    "aux": "haben", "partizip": "gemacht", "en": ["to do", "to make"], "example": "Was machst du?" },
    { "id": "de-a1-kommen",    "pos": "verb", "lemma": "kommen",    "aux": "sein",  "partizip": "gekommen","en": ["to come"],      "example": "Er kommt aus Berlin." },
    { "id": "de-a1-sprechen",  "pos": "verb", "lemma": "sprechen",  "aux": "haben", "partizip": "gesprochen","en": ["to speak"],   "example": "Sprichst du Deutsch?" },
    { "id": "de-a1-trinken",   "pos": "verb", "lemma": "trinken",   "aux": "haben", "partizip": "getrunken","en": ["to drink"],    "example": "Ich trinke Tee." },
    { "id": "de-a1-essen",     "pos": "verb", "lemma": "essen",     "aux": "haben", "partizip": "gegessen","en": ["to eat"],       "example": "Wir essen Brot." },
    { "id": "de-a1-lesen",     "pos": "verb", "lemma": "lesen",     "aux": "haben", "partizip": "gelesen", "en": ["to read"],      "example": "Sie liest ein Buch." },
    { "id": "de-a1-schreiben", "pos": "verb", "lemma": "schreiben", "aux": "haben", "partizip": "geschrieben","en": ["to write"], "example": "Er schreibt einen Brief." },

    { "id": "de-a1-gross",     "pos": "adj",  "lemma": "groß", "en": ["big", "large", "tall"], "example": "Das Haus ist groß." },
    { "id": "de-a1-klein",     "pos": "adj",  "lemma": "klein",     "en": ["small", "little"],     "example": "Die Katze ist klein." },
    { "id": "de-a1-gut",       "pos": "adj",  "lemma": "gut",       "en": ["good"],                "example": "Das Essen ist gut." },
    { "id": "de-a1-schlecht",  "pos": "adj",  "lemma": "schlecht",  "en": ["bad"],                 "example": "Das Wetter ist schlecht." },
    { "id": "de-a1-neu",       "pos": "adj",  "lemma": "neu",       "en": ["new"],                 "example": "Mein Auto ist neu." },
    { "id": "de-a1-alt",       "pos": "adj",  "lemma": "alt",       "en": ["old"],                 "example": "Das Haus ist alt." },

    { "id": "de-a1-und",       "pos": "conj", "lemma": "und",       "en": ["and"],                 "example": "Ich und du." },
    { "id": "de-a1-aber",      "pos": "conj", "lemma": "aber",      "en": ["but"],                 "example": "Klein aber fein." }
  ]
}
```

- [ ] **Step 2: Add a test that the bundled deck passes the schema**

Append to `src/lib/schema.test.ts`:

```ts
import deA1 from "../../public/decks/de-a1.json";

describe("bundled de-a1.json", () => {
  it("passes deckSchema", () => {
    expect(() => deckSchema.parse(deA1)).not.toThrow();
  });

  it("has at least 25 words", () => {
    const deck = deckSchema.parse(deA1);
    expect(deck.words.length).toBeGreaterThanOrEqual(25);
  });
});
```

Also enable `"resolveJsonModule": true` in `tsconfig.json` if not already on. Add it to `compilerOptions`:

```json
"resolveJsonModule": true,
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/lib/schema.test.ts`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: seed deutsch a1 deck"
```

---

## Task 5: Deck loader

Loads dictionary JSON from the public folder, validates with Zod, returns typed `Deck`. Caching is the service worker's job — this just `fetch`es and parses.

**Files:**
- Create: `src/lib/deck-loader.ts`
- Test: `src/lib/deck-loader.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/deck-loader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadDeck, AVAILABLE_DECKS } from "./deck-loader";

const validDeck = {
  id: "de-a1",
  language: "de",
  level: "A1",
  name: "Deutsch A1",
  words: [
    { id: "x", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
  ],
};

describe("loadDeck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, validates, and returns the deck", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validDeck,
    }));
    const deck = await loadDeck("de-a1");
    expect(deck.id).toBe("de-a1");
    expect(deck.words).toHaveLength(1);
  });

  it("throws on HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadDeck("missing")).rejects.toThrow(/deck/i);
  });

  it("throws on schema failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validDeck, level: "Z9" }),
    }));
    await expect(loadDeck("bad")).rejects.toThrow();
  });

  it("exports an AVAILABLE_DECKS list", () => {
    expect(AVAILABLE_DECKS).toEqual(expect.arrayContaining(["de-a1"]));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/deck-loader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement deck loader**

Create `src/lib/deck-loader.ts`:

```ts
import { deckSchema, type Deck } from "./schema";

export const AVAILABLE_DECKS = ["de-a1"] as const;
export type DeckId = (typeof AVAILABLE_DECKS)[number];

export async function loadDeck(id: string): Promise<Deck> {
  const url = `/decks/${id}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch deck ${id}: HTTP ${res.status}`);
  }
  const json = await res.json();
  return deckSchema.parse(json);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/deck-loader.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: deck loader with zod validation"
```

---

## Task 6: Dexie database definition

**Files:**
- Create: `src/db/dexie.ts`

- [ ] **Step 1: Implement the database**

Create `src/db/dexie.ts`:

```ts
import Dexie, { type Table } from "dexie";

export type StatRow = {
  deckId: string;
  wordId: string;
  attempts: number;
  successes: number;
  lastSeenAt: number;
  lastResult: "hit" | "miss";
};

export type SettingsRow = {
  id: "singleton";
  activeDeckId: string | null;
  ttsVoiceURI: string | null;
  soundOn: boolean;
};

export class AppDB extends Dexie {
  stats!: Table<StatRow, [string, string]>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("flashcard-pwa");
    this.version(1).stores({
      stats: "[deckId+wordId], deckId, lastSeenAt",
      settings: "id",
    });
  }
}

export const db = new AppDB();

export async function getSettings(): Promise<SettingsRow> {
  const existing = await db.settings.get("singleton");
  if (existing) return existing;
  const defaults: SettingsRow = {
    id: "singleton",
    activeDeckId: null,
    ttsVoiceURI: null,
    soundOn: true,
  };
  await db.settings.put(defaults);
  return defaults;
}

export async function setSettings(patch: Partial<Omit<SettingsRow, "id">>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch });
}
```

- [ ] **Step 2: Quick sanity test**

Create `src/db/dexie.test.ts`:

```ts
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
```

Run: `npm test -- src/db/dexie.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: dexie database and settings helpers"
```

---

## Task 7: `recordAttempt` and stats queries (TDD)

**Files:**
- Create: `src/db/stats.ts`
- Test: `src/db/stats.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/db/stats.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./dexie";
import {
  recordAttempt,
  getStats,
  getStatsForDeck,
  bucket,
  hardestWords,
  type StatBucket,
} from "./stats";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("recordAttempt", () => {
  it("creates a row on first attempt", async () => {
    await recordAttempt("de-a1", "w1", true);
    const row = await getStats("de-a1", "w1");
    expect(row?.attempts).toBe(1);
    expect(row?.successes).toBe(1);
    expect(row?.lastResult).toBe("hit");
  });

  it("increments attempts and successes", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a1", "w1", false);
    await recordAttempt("de-a1", "w1", true);
    const row = await getStats("de-a1", "w1");
    expect(row?.attempts).toBe(3);
    expect(row?.successes).toBe(2);
    expect(row?.lastResult).toBe("hit");
  });

  it("scopes per (deckId, wordId)", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a2", "w1", false);
    expect((await getStats("de-a1", "w1"))?.successes).toBe(1);
    expect((await getStats("de-a2", "w1"))?.successes).toBe(0);
  });
});

describe("bucket", () => {
  it("classifies new / learning / mastered", () => {
    expect(bucket({ attempts: 0, successes: 0 })).toBe<StatBucket>("new");
    expect(bucket({ attempts: 1, successes: 1 })).toBe<StatBucket>("learning");
    expect(bucket({ attempts: 3, successes: 2 })).toBe<StatBucket>("learning"); // 0.67 < 0.7
    expect(bucket({ attempts: 3, successes: 3 })).toBe<StatBucket>("mastered");
    expect(bucket({ attempts: 5, successes: 4 })).toBe<StatBucket>("mastered"); // 0.8 >= 0.7
    expect(bucket({ attempts: 10, successes: 6 })).toBe<StatBucket>("learning"); // 0.6
  });
});

describe("hardestWords", () => {
  it("returns words sorted by misses desc, limited", async () => {
    await recordAttempt("de-a1", "easy", true);
    for (let i = 0; i < 5; i++) await recordAttempt("de-a1", "hard", false);
    for (let i = 0; i < 2; i++) await recordAttempt("de-a1", "mid", false);
    const rows = await hardestWords("de-a1", 10);
    expect(rows.map(r => r.wordId)).toEqual(["hard", "mid", "easy"]);
  });
});

describe("getStatsForDeck", () => {
  it("returns only the matching deck", async () => {
    await recordAttempt("de-a1", "w1", true);
    await recordAttempt("de-a2", "w2", true);
    const rows = await getStatsForDeck("de-a1");
    expect(rows).toHaveLength(1);
    expect(rows[0].wordId).toBe("w1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/db/stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement stats module**

Create `src/db/stats.ts`:

```ts
import { db, type StatRow } from "./dexie";

export type StatBucket = "new" | "learning" | "mastered";

async function recordAttemptOnce(deckId: string, wordId: string, success: boolean): Promise<void> {
  await db.transaction("rw", db.stats, async () => {
    const existing = await db.stats.get([deckId, wordId]);
    const now = Date.now();
    if (!existing) {
      await db.stats.put({
        deckId,
        wordId,
        attempts: 1,
        successes: success ? 1 : 0,
        lastSeenAt: now,
        lastResult: success ? "hit" : "miss",
      });
    } else {
      await db.stats.put({
        ...existing,
        attempts: existing.attempts + 1,
        successes: existing.successes + (success ? 1 : 0),
        lastSeenAt: now,
        lastResult: success ? "hit" : "miss",
      });
    }
  });
}

// Retries once on transient IDB errors; rethrows on second failure so callers can surface a toast.
export async function recordAttempt(
  deckId: string,
  wordId: string,
  success: boolean,
): Promise<void> {
  try {
    await recordAttemptOnce(deckId, wordId, success);
  } catch (err) {
    console.warn("recordAttempt failed once, retrying", err);
    await recordAttemptOnce(deckId, wordId, success);
  }
}

export async function getStats(deckId: string, wordId: string): Promise<StatRow | undefined> {
  return db.stats.get([deckId, wordId]);
}

export async function getStatsForDeck(deckId: string): Promise<StatRow[]> {
  return db.stats.where("deckId").equals(deckId).toArray();
}

export function bucket(row: Pick<StatRow, "attempts" | "successes">): StatBucket {
  if (row.attempts < 1) return "new";
  const rate = row.successes / row.attempts;
  if (row.attempts >= 3 && rate >= 0.7) return "mastered";
  return "learning";
}

export async function hardestWords(deckId: string, limit: number): Promise<StatRow[]> {
  const rows = await getStatsForDeck(deckId);
  return rows
    .filter(r => r.attempts - r.successes > 0)
    .sort((a, b) => (b.attempts - b.successes) - (a.attempts - a.successes))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/db/stats.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: stats writes and queries"
```

---

## Task 8: Word selection algorithm (TDD)

**Files:**
- Create: `src/lib/selection.ts`
- Test: `src/lib/selection.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/selection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { drawWord, COOLDOWN_WINDOW } from "./selection";
import type { Word } from "./schema";
import type { StatRow } from "@/db/dexie";

const W = (id: string): Word => ({
  id, lemma: id, pos: "adj", en: [id],
} as Word);

const stat = (deckId: string, wordId: string, attempts: number, successes: number): StatRow => ({
  deckId, wordId, attempts, successes, lastSeenAt: 0, lastResult: "hit",
});

function seededRng(seed: number) {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("drawWord", () => {
  it("returns a word from the deck", () => {
    const words = [W("a"), W("b"), W("c")];
    const w = drawWord({ words, stats: [], history: [], rng: seededRng(1) });
    expect(words.map(x => x.id)).toContain(w.id);
  });

  it("weights misses higher than hits", () => {
    const words = [W("easy"), W("hard")];
    // easy: 10/10, hard: 0/10
    const stats = [
      stat("d", "easy", 10, 10),
      stat("d", "hard", 10, 0),
    ];
    const counts: Record<string, number> = { easy: 0, hard: 0 };
    const rng = seededRng(42);
    for (let i = 0; i < 2000; i++) {
      const w = drawWord({ words, stats, history: [], rng });
      counts[w.id]++;
    }
    expect(counts.hard).toBeGreaterThan(counts.easy * 3);
  });

  it("applies cooldown to recently-drawn words", () => {
    const words = [W("a"), W("b")];
    // identical stats: weights equal at baseline
    const stats = [stat("d", "a", 5, 5), stat("d", "b", 5, 5)];
    const history = ["a", "a", "a", "a", "a"]; // all cooldown slots are "a"
    const counts = { a: 0, b: 0 };
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const w = drawWord({ words, stats, history, rng });
      counts[w.id as "a" | "b"]++;
    }
    expect(counts.b).toBeGreaterThan(counts.a * 5);
  });

  it("exports a cooldown window constant of 5", () => {
    expect(COOLDOWN_WINDOW).toBe(5);
  });

  it("throws on empty deck", () => {
    expect(() => drawWord({ words: [], stats: [], history: [], rng: seededRng(1) })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/selection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement selection**

Create `src/lib/selection.ts`:

```ts
import type { Word } from "./schema";
import type { StatRow } from "@/db/dexie";

export const BASE = 0.2;
export const COOLDOWN_WINDOW = 5;
export const COOLDOWN_FACTOR = 0.1;

export type DrawInput = {
  words: Word[];
  stats: StatRow[];        // stats for this deck
  history: string[];       // word ids drawn this session, most recent at end
  rng: () => number;       // returns [0, 1)
};

export function drawWord({ words, stats, history, rng }: DrawInput): Word {
  if (words.length === 0) throw new Error("drawWord: empty deck");

  const statByWordId = new Map(stats.map(s => [s.wordId, s]));
  const cooldown = new Set(history.slice(-COOLDOWN_WINDOW));

  const weights = words.map((w) => {
    const s = statByWordId.get(w.id);
    const attempts = s?.attempts ?? 0;
    const successes = s?.successes ?? 0;
    const successRate = attempts > 0 ? successes / attempts : 0;
    let weight = (1 - successRate) + BASE;
    if (cooldown.has(w.id)) weight *= COOLDOWN_FACTOR;
    return weight;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < words.length; i++) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words[words.length - 1];
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/selection.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: weighted-random word selection with cooldown"
```

---

## Task 9: Diff renderer for typing flow (TDD)

Renders a token-level diff between the user's input and the expected answer. Operates on whitespace-split tokens.

**Files:**
- Create: `src/lib/diff.ts`
- Test: `src/lib/diff.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/diff.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tokenize, diffTokens, isExactMatch, normalize } from "./diff";

describe("normalize", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalize("  der   Hund  ")).toBe("der Hund");
  });
  it("preserves case and umlauts", () => {
    expect(normalize("Müde")).toBe("Müde");
  });
});

describe("isExactMatch", () => {
  it("matches identical strings after normalization", () => {
    expect(isExactMatch(" der Hund ", "der Hund")).toBe(true);
  });
  it("case difference fails", () => {
    expect(isExactMatch("der hund", "der Hund")).toBe(false);
  });
  it("umlaut difference fails", () => {
    expect(isExactMatch("mude", "müde")).toBe(false);
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("der Hund")).toEqual(["der", "Hund"]);
  });
});

describe("diffTokens", () => {
  it("flags wrong tokens in input and missing tokens in expected", () => {
    const d = diffTokens("die hund", "der Hund");
    expect(d.input).toEqual([
      { token: "die", correct: false },
      { token: "hund", correct: false },
    ]);
    expect(d.expected).toEqual([
      { token: "der", missing: true },
      { token: "Hund", missing: true },
    ]);
  });

  it("marks correct tokens as correct", () => {
    const d = diffTokens("der hund", "der Hund");
    expect(d.input[0].correct).toBe(true);
    expect(d.input[1].correct).toBe(false);
    expect(d.expected[0].missing).toBe(false);
    expect(d.expected[1].missing).toBe(true);
  });

  it("handles different token counts", () => {
    const d = diffTokens("Hund", "der Hund");
    expect(d.input).toHaveLength(1);
    expect(d.expected).toHaveLength(2);
    expect(d.expected[0].missing).toBe(true);
    expect(d.expected[1].missing).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/diff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement diff**

Create `src/lib/diff.ts`:

```ts
export function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function isExactMatch(input: string, expected: string): boolean {
  return normalize(input) === normalize(expected);
}

export function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

export type DiffResult = {
  input: { token: string; correct: boolean }[];
  expected: { token: string; missing: boolean }[];
};

export function diffTokens(input: string, expected: string): DiffResult {
  const inTokens = tokenize(input);
  const exTokens = tokenize(expected);
  const exSet = new Set(exTokens);
  const inSet = new Set(inTokens);
  return {
    input: inTokens.map((t) => ({ token: t, correct: exSet.has(t) })),
    expected: exTokens.map((t) => ({ token: t, missing: !inSet.has(t) })),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/diff.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: token-level diff for typing flow"
```

---

## Task 10: TTS wrapper

Thin facade over Web Speech API. Hidden if unavailable.

**Files:**
- Create: `src/lib/tts.ts`

- [ ] **Step 1: Implement TTS wrapper**

Create `src/lib/tts.ts`:

```ts
export function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listGermanVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("de"));
}

export function speak(text: string, voiceURI: string | null): void {
  if (!ttsAvailable()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  if (voiceURI) {
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) u.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
```

- [ ] **Step 2: Sanity test (availability flag in jsdom)**

Create `src/lib/tts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ttsAvailable, speak } from "./tts";

describe("tts", () => {
  it("ttsAvailable returns a boolean", () => {
    expect(typeof ttsAvailable()).toBe("boolean");
  });

  it("speak does not throw when unavailable", () => {
    expect(() => speak("Hallo", null)).not.toThrow();
  });
});
```

Run: `npm test -- src/lib/tts.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: web speech api wrapper"
```

---

## Task 11: Zustand session store

Holds ephemeral session state: active deck id, current deck (loaded), draw history, in-session counters.

**Files:**
- Create: `src/store/session-store.ts`
- Test: `src/store/session-store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/session-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./session-store";

beforeEach(() => {
  useSessionStore.getState().resetSession();
});

describe("session-store", () => {
  it("starts with empty history and zero counters", () => {
    const s = useSessionStore.getState();
    expect(s.history).toEqual([]);
    expect(s.done).toBe(0);
    expect(s.missed).toBe(0);
  });

  it("pushHistory appends and caps at 100", () => {
    const { pushHistory } = useSessionStore.getState();
    for (let i = 0; i < 150; i++) pushHistory(`w${i}`);
    expect(useSessionStore.getState().history.length).toBe(100);
    expect(useSessionStore.getState().history.at(-1)).toBe("w149");
  });

  it("recordResult increments counters", () => {
    const { recordResult } = useSessionStore.getState();
    recordResult(true);
    recordResult(false);
    recordResult(true);
    const s = useSessionStore.getState();
    expect(s.done).toBe(3);
    expect(s.missed).toBe(1);
  });

  it("resetSession clears history and counters", () => {
    const s0 = useSessionStore.getState();
    s0.pushHistory("a");
    s0.recordResult(false);
    s0.resetSession();
    const s1 = useSessionStore.getState();
    expect(s1.history).toEqual([]);
    expect(s1.done).toBe(0);
    expect(s1.missed).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/store/session-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `src/store/session-store.ts`:

```ts
import { create } from "zustand";

type SessionState = {
  history: string[];
  done: number;
  missed: number;
  pushHistory: (wordId: string) => void;
  recordResult: (success: boolean) => void;
  resetSession: () => void;
};

const HISTORY_CAP = 100;

export const useSessionStore = create<SessionState>((set) => ({
  history: [],
  done: 0,
  missed: 0,
  pushHistory: (wordId) =>
    set((s) => {
      const next = [...s.history, wordId];
      if (next.length > HISTORY_CAP) next.splice(0, next.length - HISTORY_CAP);
      return { history: next };
    }),
  recordResult: (success) =>
    set((s) => ({
      done: s.done + 1,
      missed: s.missed + (success ? 0 : 1),
    })),
  resetSession: () => set({ history: [], done: 0, missed: 0 }),
}));
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/store/session-store.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: zustand session store"
```

---

## Task 12: `useStudySession` hook

Wires deck + stats + selection + store + recordAttempt into a single hook that flow components consume.

**Files:**
- Create: `src/flows/use-study-session.ts`
- Test: `src/flows/use-study-session.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/flows/use-study-session.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStudySession } from "./use-study-session";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const fixtureDeck: Deck = {
  id: "test",
  language: "de",
  level: "A1",
  name: "Test",
  words: [
    { id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
    { id: "w2", lemma: "Katze", pos: "noun", article: "die", plural: "Katzen", en: ["cat"] },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("useStudySession", () => {
  it("yields a current word", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    expect(["w1", "w2"]).toContain(result.current.current!.id);
  });

  it("onResult(true) increments successes in the DB and advances", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    const firstId = result.current.current!.id;
    await act(async () => { await result.current.onResult(true); });
    const row = await db.stats.get([fixtureDeck.id, firstId]);
    expect(row?.successes).toBe(1);
    expect(result.current.current).not.toBeNull();
  });

  it("onResult(false) increments attempts but not successes", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    const firstId = result.current.current!.id;
    await act(async () => { await result.current.onResult(false); });
    const row = await db.stats.get([fixtureDeck.id, firstId]);
    expect(row?.attempts).toBe(1);
    expect(row?.successes).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/flows/use-study-session.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `src/flows/use-study-session.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { drawWord } from "@/lib/selection";
import { getStatsForDeck, recordAttempt } from "@/db/stats";
import { useSessionStore } from "@/store/session-store";

export function useStudySession(deck: Deck) {
  const [current, setCurrent] = useState<Word | null>(null);
  const pushHistory = useSessionStore((s) => s.pushHistory);
  const recordResult = useSessionStore((s) => s.recordResult);
  const history = useSessionStore((s) => s.history);

  const pickNext = useCallback(async () => {
    if (deck.words.length === 0) {
      setCurrent(null);
      return;
    }
    const stats = await getStatsForDeck(deck.id);
    const next = drawWord({
      words: deck.words,
      stats,
      history: useSessionStore.getState().history,
      rng: Math.random,
    });
    pushHistory(next.id);
    setCurrent(next);
  }, [deck, pushHistory]);

  useEffect(() => {
    // Reset whenever deck changes
    pickNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  const onResult = useCallback(
    async (success: boolean) => {
      if (!current) return;
      await recordAttempt(deck.id, current.id, success);
      recordResult(success);
      await pickNext();
    },
    [current, deck.id, recordResult, pickNext],
  );

  return { current, onResult, history };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/flows/use-study-session.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: useStudySession hook ties draw + recordAttempt"
```

---

## Task 13: Router + bottom tab bar shell

**Files:**
- Replace: `src/app/app.tsx`
- Create: `src/app/router.tsx`, `src/app/tab-bar.tsx`, placeholder routes (`src/routes/decks.tsx`, `src/routes/study.tsx`, `src/routes/stats.tsx`, `src/routes/settings.tsx`)

- [ ] **Step 1: Create placeholder route components**

Create `src/routes/decks.tsx`:

```tsx
export function DecksRoute() {
  return <div className="p-4"><h2 className="text-xl font-semibold">Decks</h2></div>;
}
```

Create `src/routes/study.tsx`:

```tsx
import { useParams } from "react-router-dom";
export function StudyRoute() {
  const { deckId } = useParams();
  return <div className="p-4"><h2 className="text-xl font-semibold">Study {deckId}</h2></div>;
}
```

Create `src/routes/stats.tsx`:

```tsx
import { useParams } from "react-router-dom";
export function StatsRoute() {
  const { deckId } = useParams();
  return <div className="p-4"><h2 className="text-xl font-semibold">Stats {deckId}</h2></div>;
}
```

Create `src/routes/settings.tsx`:

```tsx
export function SettingsRoute() {
  return <div className="p-4"><h2 className="text-xl font-semibold">Settings</h2></div>;
}
```

- [ ] **Step 2: Create `src/app/tab-bar.tsx`**

```tsx
import { NavLink } from "react-router-dom";

const tab = "flex-1 py-3 text-center text-xs uppercase tracking-wide";

export function TabBar() {
  return (
    <nav className="flex border-t border-neutral-800 bg-neutral-950 fixed bottom-0 inset-x-0">
      <NavLink to="/decks" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Decks
      </NavLink>
      <NavLink to="/study" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Study
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Stats
      </NavLink>
    </nav>
  );
}
```

- [ ] **Step 3: Create `src/app/router.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DecksRoute } from "@/routes/decks";
import { StudyRoute } from "@/routes/study";
import { StatsRoute } from "@/routes/stats";
import { SettingsRoute } from "@/routes/settings";
import { TabBar } from "./tab-bar";
import { getSettings } from "@/db/dexie";

function Layout() {
  return (
    <div className="min-h-full pb-16">
      <Outlet />
      <TabBar />
    </div>
  );
}

function StudyRedirect() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getSettings().then((s) => {
      const id = s.activeDeckId ?? "de-a1";
      navigate(`/study/${id}`, { replace: true });
      setReady(true);
    });
  }, [navigate]);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function StatsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    getSettings().then((s) => navigate(`/stats/${s.activeDeckId ?? "de-a1"}`, { replace: true }));
  }, [navigate]);
  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<DecksRoute />} />
          <Route path="/study" element={<StudyRedirect />} />
          <Route path="/study/:deckId" element={<StudyRoute />} />
          <Route path="/stats" element={<StatsRedirect />} />
          <Route path="/stats/:deckId" element={<StatsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="*" element={<Navigate to="/decks" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Replace `src/app/app.tsx`**

```tsx
import { AppRouter } from "./router";

export function App() {
  return <AppRouter />;
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`
Expected: tabs render at the bottom; clicking between Decks / Study / Stats updates the URL and active tab style. Stop server.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: tab bar shell and router"
```

---

## Task 14: Decks tab

Lists installed decks; computes mastery % from stats. Tap → sets active deck and routes to `/study/:deckId`.

**Files:**
- Replace: `src/routes/decks.tsx`
- Create: `src/lib/mastery.ts`
- Test: `src/lib/mastery.test.ts`

- [ ] **Step 1: Write failing test for mastery util**

Create `src/lib/mastery.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeMastery } from "./mastery";
import type { StatRow } from "@/db/dexie";

const row = (wordId: string, attempts: number, successes: number): StatRow => ({
  deckId: "d", wordId, attempts, successes, lastSeenAt: 0, lastResult: "hit",
});

describe("computeMastery", () => {
  it("returns 0 for an empty stats list", () => {
    expect(computeMastery(10, [])).toBe(0);
  });

  it("counts mastered words over total words", () => {
    const stats = [row("a", 5, 5), row("b", 3, 1)];
    expect(computeMastery(10, stats)).toBeCloseTo(0.1, 5); // 1 of 10
  });

  it("clamps to [0, 1]", () => {
    const stats = Array.from({ length: 10 }, (_, i) => row(`w${i}`, 5, 5));
    expect(computeMastery(10, stats)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/mastery.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement mastery util**

Create `src/lib/mastery.ts`:

```ts
import type { StatRow } from "@/db/dexie";
import { bucket } from "@/db/stats";

export function computeMastery(totalWords: number, stats: StatRow[]): number {
  if (totalWords === 0) return 0;
  const mastered = stats.filter((s) => bucket(s) === "mastered").length;
  return Math.min(1, mastered / totalWords);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/mastery.test.ts`
Expected: passes.

- [ ] **Step 5: Replace `src/routes/decks.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AVAILABLE_DECKS, loadDeck } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck } from "@/db/stats";
import { setSettings } from "@/db/dexie";
import { computeMastery } from "@/lib/mastery";

type DeckListEntry = {
  deck: Deck | null;
  mastery: number;
  error: string | null;
};

export function DecksRoute() {
  const [entries, setEntries] = useState<Record<string, DeckListEntry>>({});
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      for (const id of AVAILABLE_DECKS) {
        try {
          const deck = await loadDeck(id);
          const stats = await getStatsForDeck(id);
          setEntries((prev) => ({
            ...prev,
            [id]: { deck, mastery: computeMastery(deck.words.length, stats), error: null },
          }));
        } catch (e) {
          setEntries((prev) => ({
            ...prev,
            [id]: { deck: null, mastery: 0, error: (e as Error).message },
          }));
        }
      }
    })();
  }, []);

  async function pickDeck(id: string) {
    await setSettings({ activeDeckId: id });
    navigate(`/study/${id}`);
  }

  return (
    <div className="p-4 space-y-3">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Decks</h2>
        <Link to="/settings" className="text-neutral-400 text-sm">Settings</Link>
      </header>

      {AVAILABLE_DECKS.map((id) => {
        const e = entries[id];
        if (!e) {
          return <div key={id} className="rounded-xl border border-neutral-800 p-4 text-neutral-500">Loading {id}…</div>;
        }
        if (e.error || !e.deck) {
          return (
            <div key={id} className="rounded-xl border border-red-900 p-4">
              <div className="font-semibold">{id}</div>
              <div className="text-red-400 text-sm mt-1">{e.error}</div>
            </div>
          );
        }
        const pct = Math.round(e.mastery * 100);
        return (
          <button
            key={id}
            onClick={() => pickDeck(id)}
            className="w-full text-left rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex items-center justify-between active:bg-neutral-800">
            <div>
              <div className="font-semibold">{e.deck.name}</div>
              <div className="text-xs text-neutral-500 mt-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800 mr-2">{e.deck.level}</span>
                {e.deck.words.length} words
              </div>
            </div>
            <div className="text-sm text-neutral-300">{pct}%</div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`
Expected: Decks tab shows one "Deutsch A1" card with 0% mastery and 30 words. Tapping it routes to `/study/de-a1`. Stop server.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: decks tab"
```

---

## Task 15: Study tab — flow picker

Loads the active deck and shows three large buttons. Tapping one mounts the corresponding flow inline. Header shows deck name + mastery; footer shows in-session counters.

**Files:**
- Replace: `src/routes/study.tsx`

- [ ] **Step 1: Implement the route**

Replace `src/routes/study.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadDeck } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck } from "@/db/stats";
import { computeMastery } from "@/lib/mastery";
import { useSessionStore } from "@/store/session-store";
import { SwipeFlow } from "@/flows/swipe-flow";
import { McFlow } from "@/flows/mc-flow";
import { TypeFlow } from "@/flows/type-flow";

type FlowKind = "swipe" | "mc" | "type";

export function StudyRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [mastery, setMastery] = useState(0);
  const [flow, setFlow] = useState<FlowKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { done, missed, resetSession } = useSessionStore();

  useEffect(() => {
    if (!deckId) return;
    resetSession();
    (async () => {
      try {
        const d = await loadDeck(deckId);
        setDeck(d);
        setMastery(computeMastery(d.words.length, await getStatsForDeck(deckId)));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  if (error) {
    return <div className="p-4 text-red-400">{error} <Link to="/decks" className="underline">Back</Link></div>;
  }
  if (!deck) {
    return <div className="p-4 text-neutral-500">Loading…</div>;
  }
  if (deck.words.length === 0) {
    return <div className="p-4 text-neutral-400">This deck has no words.</div>;
  }

  const pct = Math.round(mastery * 100);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <Link to="/decks" className="text-neutral-400">←</Link>
        <div className="text-sm font-semibold">{deck.name}</div>
        <div className="text-xs text-neutral-400">{pct}%</div>
      </header>
      <div className="h-[3px] bg-neutral-900">
        <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex-1 overflow-hidden">
        {flow === null && (
          <div className="p-4 space-y-3">
            <button onClick={() => setFlow("swipe")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Swipe</div>
              <div className="text-xs text-neutral-500 mt-1">DE → EN, reveal &amp; swipe</div>
            </button>
            <button onClick={() => setFlow("mc")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Multiple choice</div>
              <div className="text-xs text-neutral-500 mt-1">DE → EN, pick the right translation</div>
            </button>
            <button onClick={() => setFlow("type")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Type translation</div>
              <div className="text-xs text-neutral-500 mt-1">EN → DE, type the German</div>
            </button>
          </div>
        )}
        {flow === "swipe" && <SwipeFlow deck={deck} onExit={() => setFlow(null)} />}
        {flow === "mc" && <McFlow deck={deck} onExit={() => setFlow(null)} />}
        {flow === "type" && <TypeFlow deck={deck} onExit={() => setFlow(null)} />}
      </div>

      {flow !== null && (
        <footer className="px-4 py-2 text-center text-xs text-neutral-500 border-t border-neutral-800">
          {done} done · {missed} missed this session
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add stub exports so the file type-checks**

Create stub files (replaced in Tasks 16, 17, 18) so `tsc` is happy until those tasks land.

Create `src/flows/swipe-flow.tsx`:

```tsx
import type { Deck } from "@/lib/schema";
export function SwipeFlow(_: { deck: Deck; onExit: () => void }) { return null; }
```

Create `src/flows/mc-flow.tsx`:

```tsx
import type { Deck } from "@/lib/schema";
export function McFlow(_: { deck: Deck; onExit: () => void }) { return null; }
```

Create `src/flows/type-flow.tsx`:

```tsx
import type { Deck } from "@/lib/schema";
export function TypeFlow(_: { deck: Deck; onExit: () => void }) { return null; }
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds.
Run: `npm run dev`
Expected: Decks tab → tap deck → study screen shows 3 flow buttons. (Each is currently empty when tapped; that's fine.)

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: study tab flow picker"
```

---

## Task 16: Swipe flow

DE → EN. Card front → tap reveal → swipe left/right (or arrow keys). Records via `onResult`.

**Files:**
- Replace: `src/flows/swipe-flow.tsx`
- Test: `src/flows/swipe-flow.test.tsx`

- [ ] **Step 1: Implement the flow**

Replace `src/flows/swipe-flow.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { getStats } from "@/db/stats";
import { speak, ttsAvailable } from "@/lib/tts";

function articleColor(article: "der" | "die" | "das"): string {
  return { der: "text-article-der", die: "text-article-die", das: "text-article-das" }[article];
}

function WordHead({ word }: { word: Word }) {
  if (word.pos === "noun") {
    return (
      <div>
        <span className={articleColor(word.article)}>{word.article}</span>{" "}
        <span className="text-4xl font-bold tracking-tight">{word.lemma}</span>
      </div>
    );
  }
  return <span className="text-4xl font-bold tracking-tight">{word.lemma}</span>;
}

function MetaLine({ word }: { word: Word }) {
  if (word.pos === "noun") return <div className="text-xs text-neutral-500 mt-1">pl. {word.plural ?? "—"}</div>;
  if (word.pos === "verb") return <div className="text-xs text-neutral-500 mt-1">{word.aux} · {word.partizip}</div>;
  return null;
}

export function SwipeFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [revealed, setRevealed] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const [overlay, setOverlay] = useState<"hit" | "miss" | null>(null);

  useEffect(() => {
    setRevealed(false);
    setOverlay(null);
    if (current) {
      getStats(deck.id, current.id).then((s) => setMissCount((s?.attempts ?? 0) - (s?.successes ?? 0)));
    }
  }, [current, deck.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.key === "ArrowRight") handleResult(true);
      if (e.key === "ArrowLeft") handleResult(false);
      if (e.key === " " || e.key === "Enter") setRevealed(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  async function handleResult(success: boolean) {
    if (!current) return;
    setOverlay(success ? "hit" : "miss");
    setTimeout(async () => {
      await onResult(success);
    }, 250);
  }

  // Touch swipe
  const [touchX, setTouchX] = useState<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { setTouchX(e.touches[0].clientX); }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    setTouchX(null);
    if (Math.abs(dx) < 60) return;
    handleResult(dx > 0);
  }

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-2">← back to flows</button>

      <div
        onClick={() => setRevealed(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative flex-1 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 flex flex-col items-center justify-center text-center px-6 select-none">
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{current.pos}</span>
        {missCount > 0 && (
          <span className="absolute top-3 right-3 text-[10px] text-neutral-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 align-middle mr-1" />
            missed {missCount}×
          </span>
        )}

        <WordHead word={current} />
        <MetaLine word={current} />

        {revealed && (
          <>
            <div className="text-lg text-neutral-100 mt-4">{current.en.join(", ")}</div>
            {current.example && <div className="text-xs italic text-neutral-500 mt-3 max-w-[90%]">{current.example}</div>}
          </>
        )}

        {ttsAvailable() && (
          <button
            onClick={(e) => { e.stopPropagation(); speak(current.lemma, null); }}
            className="mt-5 text-xl opacity-50">🔊</button>
        )}

        {!revealed && <div className="absolute bottom-4 text-[10px] uppercase tracking-widest text-neutral-600">tap to reveal</div>}

        {overlay === "hit" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 rotate-[8deg] border-2 border-emerald-400 text-emerald-400 px-2 py-1 text-xs font-bold tracking-wider rounded">✓ GOT IT</div>
        )}
        {overlay === "miss" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-[8deg] border-2 border-rose-400 text-rose-400 px-2 py-1 text-xs font-bold tracking-wider rounded">✕ MISS</div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => handleResult(false)} className="flex-1 rounded-xl py-3 border border-rose-900 text-rose-300 active:bg-rose-950/40">✕ Miss</button>
        <button onClick={() => handleResult(true)} className="flex-1 rounded-xl py-3 border border-emerald-900 text-emerald-300 active:bg-emerald-950/40">✓ Got it</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write a component test**

Create `src/flows/swipe-flow.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SwipeFlow } from "./swipe-flow";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const deck: Deck = {
  id: "test", language: "de", level: "A1", name: "Test",
  words: [{ id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("SwipeFlow", () => {
  it("renders the lemma and reveals on click", async () => {
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText("Hund")).toBeInTheDocument());
    expect(screen.queryByText("dog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Hund"));
    expect(screen.getByText("dog")).toBeInTheDocument();
  });

  it("Got it button records a success", async () => {
    const user = userEvent.setup();
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText("Hund"));
    await user.click(screen.getByRole("button", { name: /got it/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });

  it("Miss button records a miss", async () => {
    const user = userEvent.setup();
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText("Hund"));
    await user.click(screen.getByRole("button", { name: /miss/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.attempts).toBe(1);
      expect(row?.successes).toBe(0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/flows/swipe-flow.test.tsx`
Expected: all tests pass.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Expected: Pick Deutsch A1 → Swipe → see card with article+lemma. Tap reveals translation. Use arrow keys or buttons to advance. Counters in footer increment.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: swipe flow"
```

---

## Task 17: Multiple choice flow

DE → EN. 4 options: 1 correct + 3 same-POS distractors; fallback to any-POS if pool too small.

**Files:**
- Replace: `src/flows/mc-flow.tsx`
- Create: `src/lib/distractors.ts`
- Test: `src/lib/distractors.test.ts`, `src/flows/mc-flow.test.tsx`

- [ ] **Step 1: Write failing tests for distractor picker**

Create `src/lib/distractors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickDistractors } from "./distractors";
import type { Word } from "./schema";

const noun = (id: string, en: string[]): Word => ({
  id, lemma: id, pos: "noun", article: "der", plural: null, en,
});
const verb = (id: string, en: string[]): Word => ({
  id, lemma: id, pos: "verb", aux: "haben", partizip: "x", en,
});

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe("pickDistractors", () => {
  it("returns 3 same-POS words when enough", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), noun("b", ["bird"]), noun("c", ["horse"]), verb("v", ["run"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(3);
    expect(d.every(w => w.pos === "noun")).toBe(true);
  });

  it("falls back to any-POS when same-POS pool too small", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), verb("v1", ["run"]), verb("v2", ["jump"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(3);
  });

  it("never includes the correct word", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"]), noun("b", ["bird"]), noun("c", ["horse"]), noun("x", ["dog"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d.find(w => w.id === "x")).toBeUndefined();
  });

  it("returns fewer if the entire pool is too small", () => {
    const correct = noun("x", ["dog"]);
    const pool = [noun("a", ["cat"])];
    const d = pickDistractors(correct, pool, 3, rng(1));
    expect(d).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/distractors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement distractor picker**

Create `src/lib/distractors.ts`:

```ts
import type { Word } from "./schema";

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickDistractors(correct: Word, pool: Word[], count: number, rng: () => number): Word[] {
  const others = pool.filter((w) => w.id !== correct.id);
  const sameP = others.filter((w) => w.pos === correct.pos);
  let chosen = shuffle(sameP, rng).slice(0, count);
  if (chosen.length < count) {
    const remaining = shuffle(others.filter((w) => !chosen.includes(w)), rng);
    chosen = chosen.concat(remaining.slice(0, count - chosen.length));
  }
  return chosen;
}
```

- [ ] **Step 4: Verify distractor tests pass**

Run: `npm test -- src/lib/distractors.test.ts`
Expected: passes.

- [ ] **Step 5: Replace `src/flows/mc-flow.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { pickDistractors } from "@/lib/distractors";
import { speak, ttsAvailable } from "@/lib/tts";

function articleColor(article: "der" | "die" | "das"): string {
  return { der: "text-article-der", die: "text-article-die", das: "text-article-das" }[article];
}

function PromptWord({ word }: { word: Word }) {
  if (word.pos === "noun") {
    return (
      <div className="text-3xl font-semibold">
        <span className={articleColor(word.article)}>{word.article}</span> {word.lemma}
      </div>
    );
  }
  return <div className="text-3xl font-semibold">{word.lemma}</div>;
}

type Choice = { word: Word; correct: boolean };

export function McFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [picked, setPicked] = useState<string | null>(null);

  const choices: Choice[] = useMemo(() => {
    if (!current) return [];
    const distractors = pickDistractors(current, deck.words, 3, Math.random);
    const all: Choice[] = [{ word: current, correct: true }, ...distractors.map((w) => ({ word: w, correct: false }))];
    // shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [current, deck.words]);

  useEffect(() => { setPicked(null); }, [current]);

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  async function pick(c: Choice) {
    if (picked) return;
    setPicked(c.word.id);
    await onResult(c.correct);
  }

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-3">← back to flows</button>

      <div className="text-center mb-5">
        <PromptWord word={current} />
        {ttsAvailable() && (
          <button onClick={() => speak(current.lemma, null)} className="text-lg opacity-50 mt-2">🔊</button>
        )}
      </div>

      <div className="space-y-2">
        {choices.map((c) => {
          const isPicked = picked === c.word.id;
          const showCorrect = picked !== null && c.correct;
          const showWrong = isPicked && !c.correct;
          const dim = picked !== null && !c.correct && !isPicked;
          const classes = [
            "w-full text-left rounded-xl border px-4 py-3 text-base",
            showCorrect ? "border-emerald-700 bg-emerald-950/40 text-emerald-200" :
            showWrong ? "border-rose-700 bg-rose-950/40 text-rose-200" :
            "border-neutral-800 bg-neutral-900 text-neutral-100",
            dim ? "opacity-45" : "",
          ].join(" ");
          return (
            <button key={c.word.id} className={classes} onClick={() => pick(c)} disabled={picked !== null}>
              {c.word.en[0]}{showCorrect ? " ✓" : showWrong ? " ✕" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write a component test**

Create `src/flows/mc-flow.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { McFlow } from "./mc-flow";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const deck: Deck = {
  id: "test", language: "de", level: "A1", name: "Test",
  words: [
    { id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
    { id: "w2", lemma: "Katze", pos: "noun", article: "die", plural: "Katzen", en: ["cat"] },
    { id: "w3", lemma: "Haus", pos: "noun", article: "das", plural: "Häuser", en: ["house"] },
    { id: "w4", lemma: "Auto", pos: "noun", article: "das", plural: "Autos", en: ["car"] },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("McFlow", () => {
  it("renders prompt and four option buttons", async () => {
    render(<McFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => {
      const options = screen.getAllByRole("button").filter(b => /^(dog|cat|house|car)/.test(b.textContent ?? ""));
      expect(options).toHaveLength(4);
    });
  });

  it("clicking the correct option records a success", async () => {
    const user = userEvent.setup();
    render(<McFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.click(screen.getByText(/^dog$/));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });
});
```

- [ ] **Step 7: Run all flow tests**

Run: `npm test -- src/flows/mc-flow.test.tsx src/lib/distractors.test.ts`
Expected: all pass.

- [ ] **Step 8: Verify in the browser**

Run: `npm run dev`
Expected: Multiple choice flow shows 4 options including "dog"; tapping the right one greens it and advances.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: multiple choice flow with same-pos distractors"
```

---

## Task 18: Typing flow

EN → DE. Strict match; diff on miss.

**Files:**
- Replace: `src/flows/type-flow.tsx`
- Test: `src/flows/type-flow.test.tsx`

- [ ] **Step 1: Implement the flow**

Replace `src/flows/type-flow.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { diffTokens, isExactMatch } from "@/lib/diff";

function expectedAnswer(word: Word): string {
  if (word.pos === "noun") return `${word.article} ${word.lemma}`;
  return word.lemma;
}

export function TypeFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<null | { correct: boolean; expected: string; userInput: string }>(null);

  useEffect(() => { setInput(""); setSubmitted(null); }, [current]);

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  const expected = expectedAnswer(current);
  const placeholder = current.pos === "noun" ? "der/die/das …" : "type in German";

  async function submit() {
    if (submitted) {
      await onResult(submitted.correct);
      return;
    }
    const correct = isExactMatch(input, expected);
    setSubmitted({ correct, expected, userInput: input });
    if (correct) {
      // Auto-advance on hit; on miss let the user read the diff
      setTimeout(async () => { await onResult(true); }, 600);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-3">← back to flows</button>

      <div className="text-center mb-6">
        <div className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{current.pos}</div>
        <div className="text-3xl font-semibold mt-3">{current.en[0]}</div>
        <div className="text-xs text-neutral-500 mt-1">type in German{current.pos === "noun" ? " (article + word)" : ""}</div>
      </div>

      <input
        autoFocus
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        disabled={submitted !== null && !submitted.correct ? false : submitted !== null}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 text-lg bg-neutral-900 text-neutral-100 ${submitted && !submitted.correct ? "border-rose-700" : "border-neutral-800"}`}
      />

      <button onClick={submit} className="w-full mt-3 rounded-xl py-3 bg-sky-500 text-neutral-950 font-semibold">
        {submitted ? (submitted.correct ? "✓ Continue" : "Continue") : "Check"}
      </button>

      {submitted && !submitted.correct && (
        <DiffBlock userInput={submitted.userInput} expected={submitted.expected} />
      )}
    </div>
  );
}

function DiffBlock({ userInput, expected }: { userInput: string; expected: string }) {
  const d = diffTokens(userInput, expected);
  return (
    <div className="mt-4 rounded-xl border border-neutral-800 p-3 font-mono text-sm">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">You typed</div>
      <div className="mt-1">
        {d.input.map((t, i) => (
          <span key={i} className={`px-1 rounded ${t.correct ? "" : "bg-rose-950/60 text-rose-300"}`}>{t.token} </span>
        ))}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-3">Correct</div>
      <div className="mt-1">
        {d.expected.map((t, i) => (
          <span key={i} className={`px-1 rounded ${t.missing ? "bg-emerald-950/60 text-emerald-300 underline" : "text-neutral-200"}`}>{t.token} </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write a component test**

Create `src/flows/type-flow.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypeFlow } from "./type-flow";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const deck: Deck = {
  id: "test", language: "de", level: "A1", name: "Test",
  words: [{ id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("TypeFlow", () => {
  it("records a success on exact match", async () => {
    const user = userEvent.setup();
    render(<TypeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.type(screen.getByPlaceholderText(/der\/die\/das/), "der Hund");
    await user.click(screen.getByRole("button", { name: /check/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });

  it("shows a diff and records a miss on wrong case", async () => {
    const user = userEvent.setup();
    render(<TypeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.type(screen.getByPlaceholderText(/der\/die\/das/), "die hund");
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(await screen.findByText(/You typed/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.attempts).toBe(1);
      expect(row?.successes).toBe(0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/flows/type-flow.test.tsx`
Expected: all pass.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Expected: Type flow shows English word; typing `der Hund` + Check → green, advances. Typing `die hund` → diff highlights wrong tokens.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: typing flow with diff on miss"
```

---

## Task 19: Stats tab

Per-deck dashboard: counts of new/learning/mastered + hardest words.

**Files:**
- Replace: `src/routes/stats.tsx`

- [ ] **Step 1: Implement the route**

Replace `src/routes/stats.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadDeck } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck, bucket, hardestWords } from "@/db/stats";
import type { StatRow } from "@/db/dexie";

export function StatsRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [hardest, setHardest] = useState<StatRow[]>([]);

  useEffect(() => {
    if (!deckId) return;
    (async () => {
      const d = await loadDeck(deckId);
      setDeck(d);
      const rows = await getStatsForDeck(deckId);
      setStats(rows);
      setHardest(await hardestWords(deckId, 20));
    })();
  }, [deckId]);

  if (!deck) return <div className="p-4 text-neutral-500">Loading…</div>;

  const seenIds = new Set(stats.map((s) => s.wordId));
  const newCount = deck.words.length - seenIds.size + stats.filter((s) => bucket(s) === "new").length;
  const learningCount = stats.filter((s) => bucket(s) === "learning").length;
  const masteredCount = stats.filter((s) => bucket(s) === "mastered").length;

  const wordById = new Map(deck.words.map((w) => [w.id, w]));

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-4">
        <Link to="/decks" className="text-neutral-400 text-sm">←</Link>
        <h2 className="text-xl font-semibold">{deck.name}</h2>
        <span className="w-4" />
      </header>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Bucket label="New" value={newCount} color="text-neutral-300" />
        <Bucket label="Learning" value={learningCount} color="text-sky-400" />
        <Bucket label="Mastered" value={masteredCount} color="text-emerald-400" />
      </div>

      <h3 className="text-sm font-semibold text-neutral-300 mb-2">Hardest words</h3>
      {hardest.length === 0 && <div className="text-sm text-neutral-500">No misses yet.</div>}
      <ul className="space-y-1">
        {hardest.map((s) => {
          const w = wordById.get(s.wordId);
          const misses = s.attempts - s.successes;
          return (
            <li key={s.wordId} className="flex justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm">
              <span>{w?.lemma ?? s.wordId}</span>
              <span className="text-rose-300">×{misses}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bucket({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`
Expected: Stats tab shows three bucket cards. After playing through a few cards in the Study tab, refresh Stats — counts and hardest list update.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: stats tab"
```

---

## Task 20: Settings + Export / Import

**Files:**
- Create: `src/db/export-import.ts`
- Test: `src/db/export-import.test.ts`
- Replace: `src/routes/settings.tsx`

- [ ] **Step 1: Write failing test for export/import**

Create `src/db/export-import.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db, setSettings, getSettings } from "./dexie";
import { recordAttempt } from "./stats";
import { exportAll, importAll, ImportMode } from "./export-import";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("exportAll", () => {
  it("returns stats and settings", async () => {
    await recordAttempt("d", "w", true);
    await setSettings({ activeDeckId: "d" });
    const data = await exportAll();
    expect(data.stats).toHaveLength(1);
    expect(data.settings.activeDeckId).toBe("d");
    expect(data.version).toBe(1);
  });
});

describe("importAll", () => {
  it("rejects malformed input", async () => {
    await expect(importAll({ nope: true } as any, "replace")).rejects.toThrow();
  });

  it("replace mode wipes and replaces", async () => {
    await recordAttempt("d", "w1", true);
    await importAll({
      version: 1,
      stats: [{ deckId: "d", wordId: "wX", attempts: 3, successes: 2, lastSeenAt: 1, lastResult: "hit" }],
      settings: { id: "singleton", activeDeckId: "d", ttsVoiceURI: null, soundOn: false },
    }, "replace");
    const rows = await db.stats.toArray();
    expect(rows).toEqual([
      { deckId: "d", wordId: "wX", attempts: 3, successes: 2, lastSeenAt: 1, lastResult: "hit" },
    ]);
    const s = await getSettings();
    expect(s.soundOn).toBe(false);
  });

  it("merge mode sums attempts/successes per (deck,word)", async () => {
    await recordAttempt("d", "w1", true);
    await recordAttempt("d", "w1", false);
    await importAll({
      version: 1,
      stats: [{ deckId: "d", wordId: "w1", attempts: 4, successes: 3, lastSeenAt: 999, lastResult: "miss" }],
      settings: (await getSettings()),
    }, "merge");
    const row = await db.stats.get(["d", "w1"]);
    expect(row?.attempts).toBe(6);
    expect(row?.successes).toBe(4);
    expect(row?.lastSeenAt).toBe(999);
  });

  it("exports ImportMode union", () => {
    const m: ImportMode = "merge";
    expect<string>(m).toBe("merge");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/db/export-import.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement export/import**

Create `src/db/export-import.ts`:

```ts
import { z } from "zod";
import { db, type StatRow, type SettingsRow } from "./dexie";

const statRowSchema = z.object({
  deckId: z.string(),
  wordId: z.string(),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  lastSeenAt: z.number().int().min(0),
  lastResult: z.enum(["hit", "miss"]),
});

const settingsRowSchema = z.object({
  id: z.literal("singleton"),
  activeDeckId: z.string().nullable(),
  ttsVoiceURI: z.string().nullable(),
  soundOn: z.boolean(),
});

const exportSchema = z.object({
  version: z.literal(1),
  stats: z.array(statRowSchema),
  settings: settingsRowSchema,
});

export type ExportPayload = z.infer<typeof exportSchema>;
export type ImportMode = "merge" | "replace";

export async function exportAll(): Promise<ExportPayload> {
  const stats = await db.stats.toArray();
  const settings = (await db.settings.get("singleton")) ?? {
    id: "singleton" as const, activeDeckId: null, ttsVoiceURI: null, soundOn: true,
  };
  return { version: 1, stats, settings };
}

export async function importAll(raw: unknown, mode: ImportMode): Promise<void> {
  const data = exportSchema.parse(raw);
  await db.transaction("rw", db.stats, db.settings, async () => {
    if (mode === "replace") {
      await db.stats.clear();
      await db.stats.bulkPut(data.stats);
      await db.settings.put(data.settings);
      return;
    }
    // merge
    for (const incoming of data.stats) {
      const existing = await db.stats.get([incoming.deckId, incoming.wordId]);
      if (!existing) {
        await db.stats.put(incoming);
      } else {
        await db.stats.put({
          deckId: incoming.deckId,
          wordId: incoming.wordId,
          attempts: existing.attempts + incoming.attempts,
          successes: existing.successes + incoming.successes,
          lastSeenAt: Math.max(existing.lastSeenAt, incoming.lastSeenAt),
          lastResult: incoming.lastSeenAt >= existing.lastSeenAt ? incoming.lastResult : existing.lastResult,
        } satisfies StatRow);
      }
    }
    // Settings: merge favors incoming when fields are non-null
    const existingSettings = (await db.settings.get("singleton"));
    const merged: SettingsRow = {
      id: "singleton",
      activeDeckId: data.settings.activeDeckId ?? existingSettings?.activeDeckId ?? null,
      ttsVoiceURI: data.settings.ttsVoiceURI ?? existingSettings?.ttsVoiceURI ?? null,
      soundOn: data.settings.soundOn,
    };
    await db.settings.put(merged);
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/db/export-import.test.ts`
Expected: all pass.

- [ ] **Step 5: Replace `src/routes/settings.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSettings, setSettings, type SettingsRow } from "@/db/dexie";
import { exportAll, importAll } from "@/db/export-import";
import { listGermanVoices, ttsAvailable } from "@/lib/tts";

export function SettingsRoute() {
  const [s, setS] = useState<SettingsRow | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setS);
    if (ttsAvailable()) {
      const refresh = () => setVoices(listGermanVoices());
      refresh();
      window.speechSynthesis.addEventListener("voiceschanged", refresh);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    }
  }, []);

  async function update(patch: Partial<Omit<SettingsRow, "id">>) {
    await setSettings(patch);
    setS(await getSettings());
  }

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcard-pwa-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(mode: "merge" | "replace") {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg("Choose a file first."); return; }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAll(parsed, mode);
      setMsg(`Imported (${mode}).`);
      setS(await getSettings());
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  if (!s) return <div className="p-4 text-neutral-500">Loading…</div>;

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/decks" className="text-neutral-400 text-sm">←</Link>
        <h2 className="text-xl font-semibold">Settings</h2>
        <span className="w-4" />
      </header>

      <section className="space-y-2">
        <label className="text-sm font-semibold">TTS voice (German)</label>
        {ttsAvailable() ? (
          <select
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            value={s.ttsVoiceURI ?? ""}
            onChange={(e) => update({ ttsVoiceURI: e.target.value || null })}>
            <option value="">Default</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        ) : <div className="text-sm text-neutral-500">Web Speech unavailable.</div>}
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.soundOn} onChange={(e) => update({ soundOn: e.target.checked })} />
          Sound on
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Backup</h3>
        <button onClick={doExport} className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">Export JSON</button>
        <input ref={fileRef} type="file" accept="application/json" className="block w-full text-sm" />
        <div className="flex gap-2">
          <button onClick={() => doImport("merge")} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">Import (merge)</button>
          <button onClick={() => doImport("replace")} className="flex-1 rounded-lg border border-rose-900 text-rose-300 px-3 py-2 text-sm">Import (replace)</button>
        </div>
        {msg && <div className="text-xs text-neutral-400">{msg}</div>}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`
Expected: Open Decks → Settings link → see TTS voice picker, sound toggle, export/import controls. Export downloads a JSON file. Import a tweaked file and verify changes show in Stats.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: settings, export/import"
```

---

## Task 21: PWA manifest + service worker

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholders OK)

- [ ] **Step 1: Add placeholder icons**

Create two PNGs in `public/icons/`. For the placeholder, generate solid-color images:

```bash
mkdir -p public/icons
# 192 and 512 px solid color squares; replace later with real artwork
node -e "
const fs = require('fs');
function png(size) {
  // 1x1 dark blue base64; browsers don't care about size for now (we'll set manifest sizes anyway).
  // Use a tiny script to write a valid file via the canvas only if available; otherwise drop a known good base64.
  const oneByOnePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync('public/icons/icon-' + size + '.png', oneByOnePng);
}
png(192); png(512);
"
```

(These are intentionally minimal placeholders. Replace with real artwork later — the manifest reports them as 192 and 512 regardless.)

- [ ] **Step 2: Update `vite.config.ts` with `vite-plugin-pwa`**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Flashcards",
        short_name: "Flashcards",
        description: "Offline flashcards for language learning",
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/decks/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "decks-cache" },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Build and preview**

Run: `npm run build`
Expected: build succeeds, `dist/manifest.webmanifest` and `dist/sw.js` are present.
Run: `npm run preview`
Expected: open the URL, devtools → Application → Manifest shows "Flashcards"; Service Worker is "activated".
Verify offline: in devtools → Network, throttle to "Offline", reload — app shell still loads and Decks tab works (deck JSON served from cache).

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: pwa manifest and service worker"
```

---

## Task 22: Final smoke test

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Manual end-to-end smoke**

Run: `npm run dev`

Walk through:
1. Decks tab → tap "Deutsch A1".
2. Study tab → "Swipe". Tap a card to reveal. Press → on 5 cards, ← on 2 cards. Footer says `7 done · 2 missed this session`.
3. Tap "← back to flows" → "Multiple choice". Tap a wrong option once, then a correct option twice. Verify the visual states.
4. Tap "← back to flows" → "Type translation". Type one correct (`der Hund`), one wrong (`die hund`). Verify the diff appears, and "Continue" advances.
5. Stats tab → verify the bucket counts and hardest words list reflect what you did.
6. Decks → Settings → Export JSON, then Import (merge) the same file. Stats should be unchanged (merge is idempotent against itself? — note: merge doubles counts when applied to its own export. This is expected; the spec defines merge as summing).
7. Run `npm run build && npm run preview`. In an incognito window with Network = Offline (after a single online load), the app loads and the Deutsch A1 deck is usable.

- [ ] **Step 3: Commit any final tweaks (if any)**

If you fixed anything during smoke testing:

```bash
git add .
git commit -m "fix: smoke-test followups"
```

If nothing needed fixing, skip this step.

---

## Self-review notes

The plan covers every section of the spec:

- §1 Goals / §2 Architecture — Tasks 1, 2, 13, 21.
- §3.1 Dictionary schema — Tasks 3, 4, 5.
- §3.2 IndexedDB schema — Tasks 6, 7.
- §4 Selection algorithm — Task 8.
- §5.1 Swipe flow — Tasks 12, 16.
- §5.2 MC flow — Task 17.
- §5.3 Typing flow — Tasks 9, 18.
- §6 App shell — Tasks 13, 14, 15, 19.
- §7 PWA / offline — Tasks 20 (export/import), 21 (manifest + sw).
- §8 Error handling — Decks tab (Task 14) shows per-deck errors; Study tab (Task 15) handles empty decks; MC fallback (Task 17 via `pickDistractors`); TTS hides on unavailable (Task 16/17); `recordAttempt` retries IDB writes once before throwing (Task 7). **Known partial:** the spec calls for a UI toast on persistent IDB failure — for v1 we log to `console.warn` and rethrow, but no visible toast is rendered. Adding a small toast layer is a viable follow-up (~30 lines: state slice in the session store + a `<Toaster>` component in the Layout).
- §9 Testing — TDD on every logic module; component tests for each flow.
- §10 File layout — matches the file map at the top of this plan.
