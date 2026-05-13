import { useCallback, useEffect, useRef, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { drawWord } from "@/lib/selection";
import { getStatsForDeck, recordAttempt } from "@/db/stats";
import { useSessionStore } from "@/store/session-store";

export function useStudySession(deck: Deck) {
  const [current, setCurrent] = useState<Word | null>(null);
  const pushHistory = useSessionStore((s) => s.pushHistory);
  const recordResult = useSessionStore((s) => s.recordResult);
  const inflightRef = useRef(false);

  const pickNext = useCallback(async () => {
    if (deck.words.length === 0) {
      setCurrent(null);
      return;
    }
    const stats = await getStatsForDeck(deck.id);
    const next = drawWord({
      words: deck.words,
      stats,
      history: useSessionStore.getState().history,
      rng: Math.random,
    });
    pushHistory(next.id);
    setCurrent(next);
  }, [deck, pushHistory]);

  useEffect(() => {
    // Switching decks must reset session state so the cooldown window
    // and counters don't bleed across decks.
    useSessionStore.getState().resetSession();
    pickNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  const onResult = useCallback(
    async (success: boolean) => {
      // Guard against double-tap or rapid keyboard re-entry: a second call
      // while the first is still mid-flight would double-record the same word.
      if (!current || inflightRef.current) return;
      inflightRef.current = true;
      try {
        await recordAttempt(deck.id, current.id, success);
        recordResult(success);
        await pickNext();
      } finally {
        inflightRef.current = false;
      }
    },
    [current, deck.id, recordResult, pickNext],
  );

  const history = useSessionStore((s) => s.history);

  return { current, onResult, history };
}
