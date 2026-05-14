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
  concurrency?: number;
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
    } else if (a === "--concurrency") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`--concurrency requires a positive integer (got ${argv[i]})`);
      }
      out.concurrency = n;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: build:decks [--level a1|a2|b1|all] [--dry-run] [--no-cache] [--concurrency N]");
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
    await buildDeck({
      level,
      outputDir,
      cacheDir,
      dryRun: args.dryRun,
      noCache: args.noCache,
      concurrency: args.concurrency,
    });
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? String(err));
  process.exit(1);
});
