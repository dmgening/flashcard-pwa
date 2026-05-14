import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { loadDeck } from "@/lib/deck-loader";
import type { DeckId } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import type { StatRow } from "@/db/dexie";
import { getStatsForDeck, hardestWords } from "@/db/stats";
import { DeckLoadingSkeleton } from "@/components/skeleton";
import { MasteryDonut } from "@/components/charts/mastery-donut";
import { PosBars } from "@/components/charts/pos-bars";
import { useAnim } from "@/lib/transitions";

export function StatsRoute() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [hardest, setHardest] = useState<StatRow[]>([]);
  const anim = useAnim();

  useEffect(() => {
    if (!deckId) return;
    let alive = true;
    (async () => {
      const d = await loadDeck(deckId as DeckId);
      const r = await getStatsForDeck(deckId);
      const h = await hardestWords(deckId, 10);
      if (!alive) return;
      setDeck(d);
      setRows(r);
      setHardest(h);
    })();
    return () => { alive = false; };
  }, [deckId]);

  if (!deck) return <DeckLoadingSkeleton />;
  const wordById = new Map(deck.words.map((w) => [w.id, w] as const));

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{deck.name}</h1>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Mastery</h2>
        <MasteryDonut rows={rows} totalWords={deck.words.length} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">By part of speech</h2>
        <PosBars words={deck.words} rows={rows} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Hardest words</h2>
        <AnimatePresence>
          <ul className="flex flex-col gap-1">
            {hardest.map((r, i) => {
              const w = wordById.get(r.wordId);
              if (!w) return null;
              const rate = r.attempts === 0 ? 0 : Math.round((r.successes / r.attempts) * 100);
              return (
                <motion.li
                  key={r.wordId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={anim.reduced ? { duration: 0 } : { duration: 0.25, delay: i * 0.04 }}
                  className="flex justify-between gap-3 border-b border-neutral-900 py-1.5"
                >
                  <span className="text-neutral-200 truncate">
                    {w.pos === "noun" ? `${w.article} ${w.lemma}` : w.lemma}
                    <span className="text-neutral-500 italic ml-2 text-sm">{w.en.join(", ")}</span>
                  </span>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">{r.successes}/{r.attempts} · {rate}%</span>
                </motion.li>
              );
            })}
          </ul>
        </AnimatePresence>
        {hardest.length === 0 && (
          <div className="text-sm text-neutral-500">No attempts yet — practice some words first.</div>
        )}
      </section>
    </div>
  );
}
