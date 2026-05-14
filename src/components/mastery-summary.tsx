import type { DeckBreakdown } from "@/lib/mastery";

export function MasterySummary({ breakdown, className }: { breakdown: DeckBreakdown; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 font-medium tabular-nums ${className ?? "text-xs"}`}>
      <span className="text-sky-400">{breakdown.mastered}</span>
      <span className="text-neutral-700">·</span>
      <span className="text-neutral-400">{breakdown.seen}</span>
      <span className="text-neutral-700">·</span>
      <span className="text-rose-400">{breakdown.missed}</span>
    </div>
  );
}
