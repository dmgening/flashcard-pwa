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
