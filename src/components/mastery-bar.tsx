import { motion } from "motion/react";
import type { DeckBreakdown } from "@/lib/mastery";
import { useAnim } from "@/lib/transitions";

export function MasteryBar({ breakdown, total, className }: { breakdown: DeckBreakdown; total: number; className?: string }) {
  const anim = useAnim();
  const safe = Math.max(1, total);
  const pct = (n: number) => (n / safe) * 100;
  const segments = [
    { key: "mastered", width: pct(breakdown.mastered), cls: "bg-sky-400" },
    { key: "seen", width: pct(breakdown.seen), cls: "bg-neutral-500" },
    { key: "missed", width: pct(breakdown.missed), cls: "bg-rose-400" },
  ];
  const transition = anim.reduced ? { duration: 0 } : { duration: 0.5 };
  return (
    <div className={`w-full bg-neutral-900 overflow-hidden flex ${className ?? "h-1.5 rounded"}`}>
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
  );
}
