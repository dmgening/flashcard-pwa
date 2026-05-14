# flashcard-pwa

Offline-first flashcards for the Goethe-Zertifikat **A1 / A2 / B1** German vocabulary — 4,500+ words across three CEFR levels, three study modes, no backend, no account.

## Features

- Three study flows: swipe (recognition), multiple choice, type-the-translation
- Per-word stats (attempts, success rate) drive a mastery-weighted word picker — you see hard words more often
- Three CEFR decks built from the official Goethe wordlists (see `tools/build-decks/`)
- Full offline support: PWA, deck JSON precached by the service worker, stats in IndexedDB
- Optional TTS for the German prompt

## Quick start

```bash
npm install
npm run dev          # dev server on http://localhost:5173
npm test             # run the test suite
npm run build        # production build → dist/
```

## Tech stack

React 18 · Vite 6 · TypeScript · Tailwind · react-router 7 · Zustand (session state) · Dexie (IndexedDB) · Zod (schema validation) · vitest + jsdom + fake-indexeddb · vite-plugin-pwa (Workbox)

## Repo layout

- `src/` — the app
  - `lib/schema.ts` — Zod contract for the deck format
  - `lib/selection.ts` — mastery-weighted word picker
  - `flows/` — swipe / mc / type study UIs (share `use-study-session`)
  - `db/` — Dexie tables (`stats`, `settings`)
- `public/decks/` — built deck JSON shipped to the client
- `tools/build-decks/` — pipeline that builds the decks from upstream wordlists (npm workspace, see its README)
- `.github/workflows/deploy.yml` — CI: test → build → deploy to Cloudflare Pages on push to `main`

## Data source

Wordlists come from a pinned commit of [ilkermeliksitki/goethe-institute-wordlist](https://github.com/ilkermeliksitki/goethe-institute-wordlist). English glosses and verb forms are added by an LLM step in the build pipeline. See `tools/build-decks/README.md` for details.

## License

This repository contains two kinds of content with separate licensing.

### Code — AGPL-3.0

All source code (the app, the build pipeline at `tools/build-decks/`, configuration, tests) is licensed under [AGPL-3.0](./LICENSE). If you host a modified version, you must offer source code to its users. LLM-generated English glosses (the `en` field in deck JSON, and `exampleEn` where the source has no English translation) are produced by code in this repository and are covered by the same AGPL-3.0 terms.

### Deck data — © Goethe-Institut, personal use only

The German lemmas, articles, plural forms, verb forms, and example sentences in `public/decks/*.json` are derived from the official Goethe-Institut Wortlisten for the Goethe-Zertifikat A1 / A2 / B1 exams. These materials are protected by copyright (urheberrechtlich geschützt, § 52a UrhG). They are included here for personal study and reference only.

The AGPL on the code does **not** extend to this data. Redistribution, re-hosting, commercial use, or inclusion in derivative works requires written permission from the [Goethe-Institut](https://www.goethe.de/). If you fork this repo for personal use, the same restriction applies — and if you intend to deploy publicly, replace or remove `public/decks/*.json` first.
