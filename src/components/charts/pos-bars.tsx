import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import type { Word } from "@/lib/schema";
import { useAnim } from "@/lib/transitions";

type PosKey = "noun" | "verb" | "other";

function posOf(word: Word): PosKey {
  if (word.pos === "noun") return "noun";
  if (word.pos === "verb") return "verb";
  return "other";
}

export function PosBars({ words, rows }: { words: Word[]; rows: StatRow[] }) {
  const anim = useAnim();
  const statByWordId = new Map(rows.map((r) => [r.wordId, r] as const));
  const buckets: Record<PosKey, { attempts: number; successes: number; total: number }> = {
    noun: { attempts: 0, successes: 0, total: 0 },
    verb: { attempts: 0, successes: 0, total: 0 },
    other: { attempts: 0, successes: 0, total: 0 },
  };
  for (const w of words) {
    const key = posOf(w);
    buckets[key].total += 1;
    const s = statByWordId.get(w.id);
    if (!s) continue;
    buckets[key].attempts += s.attempts;
    buckets[key].successes += s.successes;
  }

  const maxAttempts = Math.max(1, buckets.noun.attempts, buckets.verb.attempts, buckets.other.attempts);

  return (
    <div className="flex flex-col gap-3">
      {(["noun", "verb", "other"] as const).map((k) => {
        const { attempts, successes, total } = buckets[k];
        const successRate = attempts === 0 ? 0 : Math.round((successes / attempts) * 100);
        const barFrac = attempts / maxAttempts;
        return (
          <div key={k}>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span className="uppercase tracking-wider">{k} <span className="text-neutral-600">· {total} words</span></span>
              <span>{attempts} attempts · {successRate}% correct</span>
            </div>
            <div className="h-2 rounded bg-neutral-900 overflow-hidden">
              <motion.div
                className="h-full bg-sky-500"
                initial={{ width: 0 }}
                animate={{ width: `${barFrac * 100}%` }}
                transition={anim.reduced ? { duration: 0 } : { duration: 0.7 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
