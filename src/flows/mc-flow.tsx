import { useEffect, useMemo, useRef, useState } from "react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { pickDistractors } from "@/lib/distractors";
import { speak, ttsAvailable } from "@/lib/tts";
import { useSettingsStore } from "@/store/settings-store";

function articleColor(article: "der" | "die" | "das"): string {
  return { der: "text-article-der", die: "text-article-die", das: "text-article-das" }[article];
}

function PromptWord({ word }: { word: Word }) {
  if (word.pos === "noun") {
    return (
      <div className="text-3xl font-semibold">
        <span className={articleColor(word.article)}>{word.article}</span> {word.lemma}
      </div>
    );
  }
  return <div className="text-3xl font-semibold">{word.lemma}</div>;
}

type Choice = { word: Word; correct: boolean };

export function McFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [picked, setPicked] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const ttsVoiceURI = useSettingsStore((s) => s.ttsVoiceURI);

  const choices: Choice[] = useMemo(() => {
    if (!current) return [];
    const rng = Math.random;
    const distractors = pickDistractors(current, deck.words, 3, rng);
    const all: Choice[] = [{ word: current, correct: true }, ...distractors.map((w) => ({ word: w, correct: false }))];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [current, deck.words]);

  useEffect(() => {
    setPicked(null);
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [current]);

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
  }, []);

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  function pick(c: Choice) {
    if (picked !== null) return;
    setPicked(c.word.id);
    // Hold the right/wrong highlight long enough to actually be read.
    advanceTimerRef.current = setTimeout(async () => {
      advanceTimerRef.current = null;
      await onResult(c.correct);
    }, 600);
  }

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-3">← back to flows</button>

      <div className="text-center mb-5">
        <PromptWord word={current} />
        {ttsAvailable() && soundOn && (
          <button onClick={() => speak(current.lemma, ttsVoiceURI)} className="text-lg opacity-50 mt-2">🔊</button>
        )}
      </div>

      <div className="space-y-2">
        {choices.map((c) => {
          const isPicked = picked === c.word.id;
          const showCorrect = picked !== null && c.correct;
          const showWrong = isPicked && !c.correct;
          const dim = picked !== null && !c.correct && !isPicked;
          const classes = [
            "w-full text-left rounded-xl border px-4 py-3 text-base",
            showCorrect ? "border-emerald-700 bg-emerald-950/40 text-emerald-200" :
            showWrong ? "border-rose-700 bg-rose-950/40 text-rose-200" :
            "border-neutral-800 bg-neutral-900 text-neutral-100",
            dim ? "opacity-45" : "",
          ].join(" ");
          return (
            <button key={c.word.id} className={classes} onClick={() => pick(c)} disabled={picked !== null}>
              {c.word.en[0]}{showCorrect ? " ✓" : showWrong ? " ✕" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
