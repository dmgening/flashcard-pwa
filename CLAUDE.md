# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # vite dev server
npm run build            # tsc -b && vite build  (used by CI)
npm run preview          # serve the prod build locally
npm test                 # vitest run (jsdom + fake-indexeddb)
npm run test:watch       # vitest in watch mode
npm run build:decks      # rebuild public/decks/*.json from upstream wordlists
```

Single test file or pattern:

```bash
npx vitest run src/lib/selection.test.ts
npx vitest run -t "draws from underused"
```

Build-decks is a separate npm workspace at `tools/build-decks` with its own deps; `npm install` at the repo root installs both. To run just its tests: `cd tools/build-decks && npm test`.

## Architecture

**Client-only PWA.** No backend. Everything that persists lives in the browser: deck JSON precached by the service worker, stats and settings in IndexedDB. Loading the app once makes it fully offline-capable.

### Data flow

```
public/decks/de-<level>.json  →  deck-loader  →  routes/study + flows  →  IndexedDB stats
       (static)                  (Zod-validated)    (Zustand session)        (Dexie)
```

- `src/lib/schema.ts` is the **contract** between the deck-building pipeline and the app. Zod discriminated union over `pos`: nouns have `article`/`plural`, verbs have `aux`/`partizip`, others have neither. The build pipeline parses against the same schema before writing each deck.
- `src/lib/deck-loader.ts` fetches a deck by id and Zod-parses it. `AVAILABLE_DECKS` is the source of truth for what the deck picker shows.
- `src/db/dexie.ts` holds two tables: `stats` (per-deck, per-word attempt counters keyed by `[deckId+wordId]`) and a single `settings` row with `id: "singleton"` (active deck, TTS voice, sound).
- `src/store/session-store.ts` is the **ephemeral** Zustand store: in-memory session history + cooldown. Resets on deck switch. Don't put anything here that needs to survive a reload.
- `src/lib/selection.ts` chooses the next word given the deck + stats + recent history. Weights words by mastery (lower success rate → higher weight), avoids the recent history window. This is the heart of the study experience — change it carefully.
- `src/flows/{swipe,mc,type}-flow.tsx` are the three study UIs. They all consume the same `useStudySession` hook (`src/flows/use-study-session.ts`) which handles word draw, double-tap protection, and `recordAttempt` calls.

### Routing

`react-router-dom@7`. URL shape: `/study/:deckId`, `/stats/:deckId`. The active deck is also persisted in `settings.activeDeckId`, and `src/app/router.tsx` redirects bare `/study` → `/study/<activeDeckId>` on first render.

### Path alias

`@/*` → `src/*` (set in `tsconfig.json` and `vite.config.ts`). Use it for cross-directory imports.

### Build-decks pipeline (`tools/build-decks/`)

Reads Goethe-Zertifikat A1/A2/B1 wordlists from a **pinned** commit of `ilkermeliksitki/goethe-institute-wordlist` (`SOURCE_COMMIT` in `src/sources/ilkermeliksitki.ts`), calls a chutes.ai-hosted LLM in batches of 25 to produce English glosses + verb forms, and writes `public/decks/de-<level>.json`. Key shape:

- **Source layer** (`src/sources/`) — only file that knows the upstream TSV format. Swapping sources is one new file plus a CLI flag.
- **Enrich** (`src/enrich.ts`) — batched LLM call, file-backed cache keyed by `(level, lemma, pos, promptVersion)`. **Loose envelope + per-item Zod validation** so one bad item in a 25-item batch doesn't drop the whole batch. Bumping `PROMPT_VERSION` invalidates the cache.
- **Assemble** (`src/assemble.ts`) — merges `RawEntry + EnrichedFields → Word`.
- **Validate** (`src/validate.ts`) — runs the same `deckSchema` the app uses.
- **Reports** — `npx tsx src/report-drops.ts [a1|a2|b1|all]` writes `reports/de-<level>.drops.json` listing lemmas in source but missing from the built deck.

Environment for `build:decks`: `.env` at the repo root (already gitignored) with `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `MODEL`. The LLM client anchors dotenv on `import.meta.url` so it loads `.env` regardless of cwd.

### CI/CD

`.github/workflows/deploy.yml` runs on push to `main`: `npm ci` → `npm test` → `npm run build` → `wrangler pages deploy dist`. Cloudflare Pages project name is hardcoded as `flashcard-pwa`. Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

### Test setup

`src/test/setup.ts` is loaded by vitest (jsdom env) and installs `fake-indexeddb` so Dexie code can be tested without a real browser. Tests that touch the DB should `await db.delete()` in `beforeEach` if they need a clean slate.
