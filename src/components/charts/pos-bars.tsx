import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import type { Word } from "@/lib/schema";
import { useAnim } from "@/lib/transitions";
import { bucket } from "@/db/stats";

type PosKey = "noun" | "verb" | "other";

function posOf(word: Word): PosKey {
  if (word.pos === "noun") return "noun";
  if (word.pos === "verb") return "verb";
  return "other";
}

type PosBreakdown = { mastered: number; seen: number; missed: number; total: number };

export function PosBars({ words, rows }: { words: Word[]; rows: StatRow[] }) {
  const anim = useAnim();
  const statByWordId = new Map(rows.map((r) => [r.wordId, r] as const));
  const buckets: Record<PosKey, PosBreakdown> = {
    noun: { mastered: 0, seen: 0, missed: 0, total: 0 },
    verb: { mastered: 0, seen: 0, missed: 0, total: 0 },
    other: { mastered: 0, seen: 0, missed: 0, total: 0 },
  };
  for (const w of words) {
    const key = posOf(w);
    buckets[key].total += 1;
    const s = statByWordId.get(w.id);
    if (!s || s.attempts <= 0) continue;
    if (bucket(s) === "mastered") buckets[key].mastered += 1;
    else if (s.lastResult === "miss") buckets[key].missed += 1;
    else buckets[key].seen += 1;
  }

  const transition = anim.reduced ? { duration: 0 } : { duration: 0.6 };

  return (
    <div className="flex flex-col gap-3">
      {(["noun", "verb", "other"] as const).map((k) => {
        const b = buckets[k];
        const safe = Math.max(1, b.total);
        const pct = (n: number) => (n / safe) * 100;
        const segments = [
          { key: "mastered", width: pct(b.mastered), cls: "bg-sky-400" },
          { key: "seen", width: pct(b.seen), cls: "bg-neutral-500" },
          { key: "missed", width: pct(b.missed), cls: "bg-rose-400" },
        ];
        return (
          <div key={k}>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span className="uppercase tracking-wider">{k} <span className="text-neutral-600">· {b.total} words</span></span>
              <span>{b.mastered} mastered · {b.missed} missed</span>
            </div>
            <div className="h-2 rounded bg-neutral-900 overflow-hidden flex">
              {segments.map((s) => (
                <motion.div
                  key={s.key}
                  className={`h-full ${s.cls}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.width}%` }}
                  transition={transition}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
