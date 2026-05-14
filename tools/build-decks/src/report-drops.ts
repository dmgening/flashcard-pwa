// tools/build-decks/src/report-drops.ts
// Standalone reporter: diffs the live source against each already-built deck
// and writes the missing lemmas to `tools/build-decks/reports/de-<level>.drops.json`.
// Usage: `npx tsx src/report-drops.ts [a1|a2|b1|all]` (default: all).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IlkermeliksitkiSource } from "./sources/ilkermeliksitki.ts";
import type { Level, RawEntry } from "./sources/types.ts";

const ALL: Level[] = ["A1", "A2", "B1"];

type DropRow = {
  lemma: string;
  pos: RawEntry["pos"];
  article?: RawEntry["article"];
  plural?: string | null;
  example_de?: string;
};

async function readDeck(deckPath: string): Promise<Set<string> | null> {
  try {
    const text = await fs.readFile(deckPath, "utf8");
    const json = JSON.parse(text) as { words: { lemma: string }[] };
    return new Set(json.words.map((w) => w.lemma));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function reportLevel(level: Level, repoRoot: string, reportsDir: string): Promise<void> {
  const deckPath = path.join(repoRoot, "public", "decks", `de-${level.toLowerCase()}.json`);
  const built = await readDeck(deckPath);
  if (!built) {
    console.log(`[${level}] no deck file found at ${deckPath}; skipping`);
    return;
  }
  const source = new IlkermeliksitkiSource();
  const raws = await source.fetch(level);
  const drops: DropRow[] = [];
  for (const r of raws) {
    if (built.has(r.lemma)) continue;
    drops.push({
      lemma: r.lemma,
      pos: r.pos,
      ...(r.article ? { article: r.article } : {}),
      ...(r.plural !== undefined ? { plural: r.plural } : {}),
      ...(r.example_de ? { example_de: r.example_de } : {}),
    });
  }
  const outPath = path.join(reportsDir, `de-${level.toLowerCase()}.drops.json`);
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ level, source: raws.length, built: built.size, dropped: drops.length, drops }, null, 2) + "\n");
  console.log(`[${level}] source=${raws.length} built=${built.size} dropped=${drops.length} → ${outPath}`);
}

async function main() {
  const arg = (process.argv[2] ?? "all").toLowerCase();
  const levels: Level[] = arg === "all"
    ? ALL
    : (() => {
        const v = arg.toUpperCase();
        if (v === "A1" || v === "A2" || v === "B1") return [v];
        throw new Error(`Unknown level: ${arg}. Use a1, a2, b1, or all.`);
      })();

  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../../..");
  const reportsDir = path.join(here, "..", "reports");

  for (const level of levels) {
    await reportLevel(level, repoRoot, reportsDir);
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? String(err));
  process.exit(1);
});
