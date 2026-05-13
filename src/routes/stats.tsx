import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadDeck } from "@/lib/deck-loader";
import type { DeckId } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck, bucket, hardestWords } from "@/db/stats";
import type { StatRow } from "@/db/dexie";

export function StatsRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [hardest, setHardest] = useState<StatRow[]>([]);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    (async () => {
      const d = await loadDeck(deckId as DeckId);
      const rows = await getStatsForDeck(deckId);
      const top = await hardestWords(deckId, 20);
      if (cancelled) return;
      setDeck(d);
      setStats(rows);
      setHardest(top);
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  if (!deck) return <div className="p-4 text-neutral-500">Loading…</div>;

  // recordAttempt always writes attempts >= 1, so any row in `stats` is past the
  // "new" stage. A word is "new" iff it has no row at all in this deck.
  const seenIds = new Set(stats.map((s) => s.wordId));
  const newCount = deck.words.length - seenIds.size;
  const learningCount = stats.filter((s) => bucket(s) === "learning").length;
  const masteredCount = stats.filter((s) => bucket(s) === "mastered").length;

  const wordById = new Map(deck.words.map((w) => [w.id, w]));

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-4">
        <Link to="/decks" className="text-neutral-400 text-sm">←</Link>
        <h2 className="text-xl font-semibold">{deck.name}</h2>
        <span className="w-4" />
      </header>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Bucket label="New" value={newCount} color="text-neutral-300" />
        <Bucket label="Learning" value={learningCount} color="text-sky-400" />
        <Bucket label="Mastered" value={masteredCount} color="text-emerald-400" />
      </div>

      <h3 className="text-sm font-semibold text-neutral-300 mb-2">Hardest words</h3>
      {hardest.length === 0 && <div className="text-sm text-neutral-500">No misses yet.</div>}
      <ul className="space-y-1">
        {hardest.map((s) => {
          const w = wordById.get(s.wordId);
          const misses = s.attempts - s.successes;
          return (
            <li key={s.wordId} className="flex justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm">
              <span>{w?.lemma ?? s.wordId}</span>
              <span className="text-rose-300">×{misses}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bucket({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
