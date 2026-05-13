import { useEffect, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { getStats } from "@/db/stats";
import { speak, ttsAvailable } from "@/lib/tts";

function articleColor(article: "der" | "die" | "das"): string {
  return { der: "text-article-der", die: "text-article-die", das: "text-article-das" }[article];
}

function WordHead({ word }: { word: Word }) {
  if (word.pos === "noun") {
    return (
      <div>
        <span className={articleColor(word.article)}>{word.article}</span>{" "}
        <span className="text-4xl font-bold tracking-tight">{word.lemma}</span>
      </div>
    );
  }
  return <span className="text-4xl font-bold tracking-tight">{word.lemma}</span>;
}

function MetaLine({ word }: { word: Word }) {
  if (word.pos === "noun") return <div className="text-xs text-neutral-500 mt-1">pl. {word.plural ?? "—"}</div>;
  if (word.pos === "verb") return <div className="text-xs text-neutral-500 mt-1">{word.aux} · {word.partizip}</div>;
  return null;
}

export function SwipeFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [revealed, setRevealed] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const [overlay, setOverlay] = useState<"hit" | "miss" | null>(null);

  useEffect(() => {
    setRevealed(false);
    setOverlay(null);
    if (current) {
      getStats(deck.id, current.id).then((s) => setMissCount((s?.attempts ?? 0) - (s?.successes ?? 0)));
    }
  }, [current, deck.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.key === "ArrowRight") handleResult(true);
      if (e.key === "ArrowLeft") handleResult(false);
      if (e.key === " " || e.key === "Enter") setRevealed(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  async function handleResult(success: boolean) {
    if (!current) return;
    setOverlay(success ? "hit" : "miss");
    setTimeout(async () => {
      await onResult(success);
    }, 250);
  }

  // Touch swipe
  const [touchX, setTouchX] = useState<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { setTouchX(e.touches[0].clientX); }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    setTouchX(null);
    if (Math.abs(dx) < 60) return;
    handleResult(dx > 0);
  }

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-2">← back to flows</button>

      <div
        onClick={() => setRevealed(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative flex-1 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 flex flex-col items-center justify-center text-center px-6 select-none">
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{current.pos}</span>
        {missCount > 0 && (
          <span className="absolute top-3 right-3 text-[10px] text-neutral-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 align-middle mr-1" />
            missed {missCount}×
          </span>
        )}

        <WordHead word={current} />
        <MetaLine word={current} />

        {revealed && (
          <>
            <div className="text-lg text-neutral-100 mt-4">{current.en.join(", ")}</div>
            {current.example && <div className="text-xs italic text-neutral-500 mt-3 max-w-[90%]">{current.example}</div>}
          </>
        )}

        {ttsAvailable() && (
          <button
            onClick={(e) => { e.stopPropagation(); speak(current.lemma, null); }}
            className="mt-5 text-xl opacity-50">🔊</button>
        )}

        {!revealed && <div className="absolute bottom-4 text-[10px] uppercase tracking-widest text-neutral-600">tap to reveal</div>}

        {overlay === "hit" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 rotate-[8deg] border-2 border-emerald-400 text-emerald-400 px-2 py-1 text-xs font-bold tracking-wider rounded">✓ GOT IT</div>
        )}
        {overlay === "miss" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-[8deg] border-2 border-rose-400 text-rose-400 px-2 py-1 text-xs font-bold tracking-wider rounded">✕ MISS</div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => handleResult(false)} className="flex-1 rounded-xl py-3 border border-rose-900 text-rose-300 active:bg-rose-950/40">✕ Miss</button>
        <button onClick={() => handleResult(true)} className="flex-1 rounded-xl py-3 border border-emerald-900 text-emerald-300 active:bg-emerald-950/40">✓ Got it</button>
      </div>
    </div>
  );
}
