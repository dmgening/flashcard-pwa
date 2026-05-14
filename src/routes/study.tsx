import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { loadDeck } from "@/lib/deck-loader";
import type { Deck } from "@/lib/schema";
import { getStatsForDeck } from "@/db/stats";
import { computeDeckBreakdown, type DeckBreakdown } from "@/lib/mastery";
import { useSessionStore } from "@/store/session-store";
import { DeckLoadingSkeleton } from "@/components/skeleton";
import { MasteryBar } from "@/components/mastery-bar";
import { MasterySummary } from "@/components/mastery-summary";
import { SwipeFlow } from "@/flows/swipe-flow";
import { McFlow } from "@/flows/mc-flow";
import { TypeFlow } from "@/flows/type-flow";
import type { DeckId } from "@/lib/deck-loader";

type FlowKind = "swipe" | "mc" | "type";

export function StudyRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [breakdown, setBreakdown] = useState<DeckBreakdown>({ mastered: 0, seen: 0, missed: 0, untouched: 0 });
  const [flow, setFlow] = useState<FlowKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { done, missed, resetSession } = useSessionStore();

  // Lock document scroll/overscroll while on the study route so vertical
  // swipe gestures don't trigger rubber-band or pull-to-refresh.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    resetSession();
    setFlow(null);
    setDeck(null);
    setError(null);
    setBreakdown({ mastered: 0, seen: 0, missed: 0, untouched: 0 });
    (async () => {
      try {
        const d = await loadDeck(deckId as DeckId);
        if (cancelled) return;
        setDeck(d);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Recompute the deck breakdown after every recorded attempt so the header
  // counts and progress bar reflect hits/misses live. `done` bumps in the
  // session store after recordAttempt has flushed to IndexedDB.
  useEffect(() => {
    if (!deck || !deckId) return;
    let cancelled = false;
    getStatsForDeck(deckId).then((stats) => {
      if (cancelled) return;
      setBreakdown(computeDeckBreakdown(deck.words.length, stats));
    });
    return () => { cancelled = true; };
  }, [deck, deckId, done]);

  if (error) {
    return <div className="p-4 text-red-400">{error} <Link to="/decks" className="underline">Back</Link></div>;
  }
  if (!deck) {
    return <DeckLoadingSkeleton />;
  }
  if (deck.words.length === 0) {
    return <div className="p-4 text-neutral-400">This deck has no words.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <Link
          to="/decks"
          className="flex items-center gap-1 text-sm font-semibold text-neutral-100 active:text-sky-300"
        >
          {deck.name}
          <ChevronDown size={14} className="text-neutral-500" />
        </Link>
        <MasterySummary breakdown={breakdown} />
      </header>
      <MasteryBar breakdown={breakdown} total={deck.words.length} className="h-[3px]" />

      <div className="flex-1 overflow-hidden">
        {flow === null && (
          <div className="p-4 space-y-3">
            <button onClick={() => setFlow("swipe")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Swipe</div>
              <div className="text-xs text-neutral-500 mt-1">DE → EN, reveal &amp; swipe</div>
            </button>
            <button onClick={() => setFlow("mc")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Multiple choice</div>
              <div className="text-xs text-neutral-500 mt-1">DE → EN, pick the right translation</div>
            </button>
            <button onClick={() => setFlow("type")} className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left active:bg-neutral-800">
              <div className="font-semibold">Type translation</div>
              <div className="text-xs text-neutral-500 mt-1">EN → DE, type the German</div>
            </button>
          </div>
        )}
        {flow === "swipe" && <SwipeFlow deck={deck} onExit={() => setFlow(null)} />}
        {flow === "mc" && <McFlow deck={deck} onExit={() => setFlow(null)} />}
        {flow === "type" && <TypeFlow deck={deck} onExit={() => setFlow(null)} />}
      </div>

      {flow !== null && (
        <footer className="px-4 py-2 text-center text-xs text-neutral-500 border-t border-neutral-800">
          {done} done · {missed} missed this session
        </footer>
      )}
    </div>
  );
}
