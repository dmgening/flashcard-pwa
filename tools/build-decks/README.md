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
