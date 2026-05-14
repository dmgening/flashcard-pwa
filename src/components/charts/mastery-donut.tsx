import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import { useAnim } from "@/lib/transitions";
import { computeDeckBreakdown } from "@/lib/mastery";

export function MasteryDonut({ rows, totalWords, size = 180 }: { rows: StatRow[]; totalWords: number; size?: number }) {
  const anim = useAnim();
  const breakdown = computeDeckBreakdown(totalWords, rows);
  const total = Math.max(1, totalWords);
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  const masteredFrac = breakdown.mastered / total;
  const seenFrac = breakdown.seen / total;
  const missedFrac = breakdown.missed / total;

  // Three concatenated arcs sharing the same circle; cumulative offset moves
  // each segment's start point along the ring. Matches the deck-tile bar.
  const arcs = [
    { frac: masteredFrac, prefix: 0, color: "rgb(56,189,248)" },                 // sky-400
    { frac: seenFrac,     prefix: masteredFrac, color: "rgb(115,115,115)" },     // neutral-500
    { frac: missedFrac,   prefix: masteredFrac + seenFrac, color: "rgb(251,113,133)" }, // rose-400
  ];
  const duration = anim.reduced ? 0 : 0.7;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(38,38,38)" strokeWidth={12} />
        {arcs.map((a, i) => (
          <motion.circle
            key={i}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={a.color} strokeWidth={12}
            strokeDashoffset={-a.prefix * c}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${a.frac * c} ${c}` }}
            transition={{ duration, delay: anim.reduced ? 0 : i * 0.12 }}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        <div><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-2 align-middle" />Mastered: <strong>{breakdown.mastered}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-neutral-500 mr-2 align-middle" />Seen: <strong>{breakdown.seen}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-2 align-middle" />Missed: <strong>{breakdown.missed}</strong></div>
        <div className="text-xs text-neutral-500 mt-1">Untouched: {breakdown.untouched} / Total: {totalWords}</div>
      </div>
    </div>
  );
}
