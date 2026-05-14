import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import { useAnim } from "@/lib/transitions";

export type MasterySplit = { mastered: number; attempted: number; untouched: number };

export function computeMastery(rows: StatRow[], totalWords: number): MasterySplit {
  let mastered = 0;
  let attempted = 0;
  for (const r of rows) {
    if (r.attempts <= 0) continue;
    attempted += 1;
    if (r.attempts >= 3 && r.successes / r.attempts >= 0.8) mastered += 1;
  }
  const untouched = Math.max(0, totalWords - attempted);
  return { mastered, attempted, untouched };
}

export function MasteryDonut({ rows, totalWords, size = 180 }: { rows: StatRow[]; totalWords: number; size?: number }) {
  const anim = useAnim();
  const split = computeMastery(rows, totalWords);
  const total = Math.max(1, totalWords);
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  const masteredFrac = split.mastered / total;
  const attemptedFrac = (split.attempted - split.mastered) / total;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(38,38,38)" strokeWidth={12} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(110,231,183)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - masteredFrac) }}
          transition={anim.reduced ? { duration: 0 } : { duration: 0.9 }}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(56,189,248)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - masteredFrac)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, strokeDashoffset: c * (1 - masteredFrac - attemptedFrac) }}
          transition={anim.reduced ? { duration: 0 } : { duration: 0.9, delay: 0.3 }}
        />
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-300 mr-2 align-middle" />Mastered: <strong>{split.mastered}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-2 align-middle" />Practiced: <strong>{split.attempted}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-neutral-700 mr-2 align-middle" />Untouched: <strong>{split.untouched}</strong></div>
        <div className="text-xs text-neutral-500 mt-1">Total: {totalWords}</div>
      </div>
    </div>
  );
}
