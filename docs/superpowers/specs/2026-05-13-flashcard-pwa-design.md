# flashcard-pwa — Design

**Date:** 2026-05-13
**Status:** Approved, ready for implementation plan

## 1. Overview

An offline-first PWA for studying CEFR-leveled vocabulary, starting with German. Three study flows over per-deck dictionaries, with weighted random word selection that favors weak words. Local-only persistence; export/import JSON for manual cross-device transfer.

Goals:

- Run fully offline after first load.
- Pick words probabilistically, weighted toward the ones the user keeps missing.
- Three distinct study modes — recognition (swipe), recognition (MC), production (typing).
- Per-deck stats dashboard.
- Architecture that admits more target languages later without rewrites.

Non-goals (v1):

- Cloud sync, auth, user accounts.
- The JSON build tooling that parses Goethe wordlists and enriches with translations — a separate spec.
- Pre-rendered audio (use the browser's Web Speech API instead).
- Charts/streaks in the stats UI.

## 2. Architecture

- **Stack:** React 18 + Vite + TypeScript + Tailwind CSS.
- **State:** Zustand for ephemeral app state (current deck, current flow, session counters). Dexie (IndexedDB wrapper) for persistent state.
- **Routing:** React Router with a tab-bar shell (`/decks`, `/study/:deckId`, `/stats/:deckId`).
- **PWA:** `vite-plugin-pwa` (Workbox-based) for service worker + manifest. App shell precached; dictionary JSON cached on first fetch with `staleWhileRevalidate`.
- **Build:** single SPA, deployed as a static bundle. No backend.

## 3. Data layer

### 3.1 Dictionary JSON (input contract)

Bundled deck files ship in `public/decks/`. The PWA does not build them; consumes them as a contract. A small hand-seeded `de-a1.json` (~30 words) is sufficient to develop against.

```ts
type Deck = {
  id: string;             // "de-a1"
  language: "de";         // ISO 639-1
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  name: string;           // human-readable, e.g. "Deutsch A1"
  words: Word[];
};

type WordBase = {
  id: string;             // stable, e.g. "de-a1-hund"
  lemma: string;          // headword
  en: string[];           // accepted English translations; en[0] is canonical
  example?: string;       // optional example sentence in target language
};

type Word =
  | (WordBase & { pos: "noun"; article: "der" | "die" | "das"; plural: string | null })
  | (WordBase & { pos: "verb"; aux: "haben" | "sein"; partizip: string })
  | (WordBase & { pos: "adj" | "adv" | "prep" | "conj" | "other" });
```

Validated with Zod on load. Malformed decks fail loudly; the app keeps previously cached decks usable.

### 3.2 IndexedDB schema (Dexie)

```ts
// stats — one row per (deck, word) the user has interacted with
stats: {
  key: [deckId, wordId];
  attempts: number;       // total attempts across all flows
  successes: number;      // misses = attempts - successes (derived, not stored)
  lastSeenAt: number;     // epoch ms
  lastResult: "hit" | "miss";
}

// settings — single row
settings: {
  id: "singleton";
  activeDeckId: string | null;
  ttsVoiceURI: string | null;
  soundOn: boolean;
}
```

A single function `recordAttempt(deckId, wordId, success: boolean)` is the only writer of `stats`. All three flows go through it. Session-level counters ("done so far this session", "missed so far this session") live in the Zustand store, not in IndexedDB — they reset on app reload, which is the desired behavior.

## 4. Word selection algorithm

On each draw from the active deck:

1. For each word `w`: `successRate = w.successes / max(w.attempts, 1)` (treat unseen as 0).
2. `weight = (1 - successRate) + BASE` where `BASE = 0.2`. Ensures unseen and mastered words still get airtime.
3. **Cooldown:** for the last 5 words drawn this session (kept in-memory in Zustand), `weight *= 0.1`.
4. Sample one word with probability proportional to weight.

Constants (`BASE`, `COOLDOWN_WINDOW = 5`, `COOLDOWN_FACTOR = 0.1`) live in `src/lib/selection.ts` and are tuned independently. The selection function takes an RNG injection point for deterministic tests.

## 5. The three study flows

All three flows share the same plumbing: a `useStudySession(deckId, flow)` hook that owns the draw queue, the current word, and an `onResult(success)` callback that calls `recordAttempt` and advances.

### 5.1 Swipe card (`flow="swipe"`) — DE → EN

- Front: article in der/die/das color (blue/pink/green), lemma in large type, plural underneath, POS badge top-left, miss-count badge top-right (only if `attempts - successes > 0`), speaker icon, "tap to reveal" hint.
- Tap card → reveal back: translations (`en.join(", ")`) and optional example, kept on the same card surface.
- Swipe right (or right-arrow on desktop) → success.
- Swipe left (or left-arrow) → miss.
- Auto-advance to next card; brief overlay (`✓ GOT IT` / `✕ MISS`) during the swipe.

### 5.2 Multiple choice (`flow="mc"`) — DE → EN

- Show DE word (with article colored, for nouns) + speaker icon.
- 4 options: 1 correct (the canonical `en[0]`) + 3 distractors sampled from same-POS words in the same deck. If the deck has fewer than 4 same-POS candidates, fall back to any-POS distractors.
- Tap an option → correct goes green, wrong picks go red, the correct one highlights regardless. Other options dim.
- Tap anywhere to continue.

### 5.3 Type translation (`flow="type"`) — EN → DE

- Show EN word + POS hint badge.
- Text input + Check button. Submit on Enter.
- **Strict match** of normalized strings: trim whitespace, collapse internal whitespace. Case is significant. Umlauts are significant (`Strasse` ≠ `Straße`). For nouns, the article is required.
- On miss: render a token-level diff with the user's input above (wrong tokens highlighted red) and the canonical answer below (right tokens green, missing-from-user underlined green).
- Tap to continue.

## 6. App shell

Persistent bottom tab bar visible on every primary screen:

- **Decks** (`/decks`) — list of installed decks with name, level chip, mastery %. Tapping a deck marks it as active and routes to `/study/:deckId`.
- **Study** (`/study/:deckId`) — picker showing three large buttons (Swipe / Multiple Choice / Type). Selecting one mounts the corresponding flow inline. Header: deck name + overall mastery % + back. Footer: in-session counters (`12 done · 5 missed this session`).
- **Stats** (`/stats/:deckId`) — counts of `new` (`attempts < 1`), `learning` (`successRate < 0.7` or `attempts < 3`), `mastered` (`attempts ≥ 3 and successRate ≥ 0.7`). A "Hardest words" list sorted by `missCount` desc, top 20.

A Settings screen reachable from the Decks tab header holds: TTS voice picker, sound toggle, Export JSON, Import JSON.

## 7. PWA / offline

- App shell (HTML/CSS/JS) precached by Workbox at install.
- `public/decks/*.json` cached on first fetch via `staleWhileRevalidate` — works offline after first load, but pulls updates when available.
- Standard install prompt; manifest with name, theme color, icons.
- Export JSON: serializes `stats` and `settings` into a single JSON file, triggers download.
- Import JSON: validates against schema, then either merges with `stats` (sum `attempts/successes`, max `lastSeenAt`) or replaces, based on a confirm dialog. Malformed input refused with a clear message; existing data preserved.

## 8. Error handling

- **Dictionary load failure with no cache:** Decks tab shows an error state with a retry action; other tabs remain usable.
- **IDB write failure:** retry once, then surface a toast. Stats writes are non-critical — a lost write is acceptable; the user is informed but not blocked.
- **Web Speech API unavailable:** speaker icon hidden, no error UI.
- **Empty deck** (e.g., 0 words): Decks list shows "no words" inline; selecting it shows a friendly empty state instead of crashing.
- **Same-POS distractor pool too small in MC:** silently fall back to any-POS distractors. Don't degrade to 3 options.

## 9. Testing

Vitest + Testing Library.

**Unit:**
- `selection.ts` with a seeded RNG — verify weight distribution and cooldown behavior on a synthetic dictionary.
- Diff renderer for Flow 3 — input/expected combinations, including umlaut and case differences.
- Zod validators reject malformed decks; accept the seed deck.
- `recordAttempt` updates the right row idempotently.

**Component:**
- Each flow renders for a fixture word and fires `recordAttempt` with the expected args on success/miss paths.
- Stats dashboard computes the right buckets from fixture stats rows.

No E2E for v1. Playwright on the swipe flow is a future option.

## 10. File layout (target)

```
flashcard-pwa/
  public/
    decks/
      de-a1.json
    icons/
  src/
    app/
      router.tsx
      tab-bar.tsx
    routes/
      decks.tsx
      study.tsx
      stats.tsx
      settings.tsx
    flows/
      swipe-flow.tsx
      mc-flow.tsx
      type-flow.tsx
      use-study-session.ts
    lib/
      selection.ts        # draw algorithm + RNG injection
      diff.ts             # token-level diff for Flow 3
      tts.ts              # Web Speech API wrapper
      schema.ts           # Zod schemas for Deck/Word
    db/
      dexie.ts            # database definition
      stats.ts            # recordAttempt + queries
      export-import.ts
    store/
      session-store.ts    # Zustand: active deck, draw history, session counters
    styles/
      index.css           # Tailwind entry
    main.tsx
  index.html
  vite.config.ts
  tailwind.config.ts
  package.json
  tsconfig.json
```

## 11. Open questions (resolved in this brainstorm, recorded for traceability)

- Word source: bundled JSON, cached locally; build tooling deferred to a later spec.
- Word schema: discriminated by `pos`; nouns include article + plural, verbs include aux + partizip.
- Selection: weighted random with cooldown (no SM-2).
- Flow 1 direction: DE → EN.
- Audio: Web Speech API only.
- Sync: local-only with JSON export/import.
- Sessions: free stream.
- Stats UI: simple per-deck dashboard, no charts.
- App shell: bottom tab bar.
- MC distractors: 4 options, same-POS distractors with fallback.
- Type check: strict, with diff on miss.
