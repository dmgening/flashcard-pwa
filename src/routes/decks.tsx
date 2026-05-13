import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AVAILABLE_DECKS, loadDeck } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck } from "@/db/stats";
import { setSettings } from "@/db/dexie";
import { computeMastery } from "@/lib/mastery";

type DeckListEntry = {
  deck: Deck | null;
  mastery: number;
  error: string | null;
};

export function DecksRoute() {
  const [entries, setEntries] = useState<Record<string, DeckListEntry>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const id of AVAILABLE_DECKS) {
        if (cancelled) return;
        try {
          const deck = await loadDeck(id);
          const stats = await getStatsForDeck(id);
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [id]: { deck, mastery: computeMastery(deck.words.length, stats), error: null },
          }));
        } catch (e) {
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [id]: { deck: null, mastery: 0, error: (e as Error).message },
          }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function pickDeck(id: string) {
    try {
      await setSettings({ activeDeckId: id });
      navigate(`/study/${id}`);
    } catch (e) {
      console.warn("pickDeck: setSettings failed, navigating anyway", e);
      navigate(`/study/${id}`);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Decks</h2>
        <Link to="/settings" className="text-neutral-400 text-sm">Settings</Link>
      </header>

      {AVAILABLE_DECKS.map((id) => {
        const e = entries[id];
        if (!e) {
          return <div key={id} className="rounded-xl border border-neutral-800 p-4 text-neutral-500">Loading {id}…</div>;
        }
        if (e.error || !e.deck) {
          return (
            <div key={id} className="rounded-xl border border-red-900 p-4">
              <div className="font-semibold">{id}</div>
              <div className="text-red-400 text-sm mt-1">{e.error}</div>
            </div>
          );
        }
        const pct = Math.round(e.mastery * 100);
        return (
          <button
            key={id}
            onClick={() => pickDeck(id)}
            className="w-full text-left rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex items-center justify-between active:bg-neutral-800">
            <div>
              <div className="font-semibold">{e.deck.name}</div>
              <div className="text-xs text-neutral-500 mt-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800 mr-2">{e.deck.level}</span>
                {e.deck.words.length} words
              </div>
            </div>
            <div className="text-sm text-neutral-300">{pct}%</div>
          </button>
        );
      })}
    </div>
  );
}
