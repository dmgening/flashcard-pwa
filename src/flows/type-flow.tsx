import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { diffTokens, isExactMatch } from "@/lib/diff";
import { useAnim } from "@/lib/transitions";

function expectedAnswer(word: Word): string {
  if (word.pos === "noun") return `${word.article} ${word.lemma}`;
  return word.lemma;
}

export function TypeFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const anim = useAnim();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<null | { correct: boolean; expected: string; userInput: string }>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInput("");
    setSubmitted(null);
    // Cancel any pending auto-advance from the previous word so it can't
    // double-record on the new one.
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [current]);

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
  }, []);

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  const expected = expectedAnswer(current);
  const placeholder = current.pos === "noun" ? "der/die/das …" : "type in German";

  async function submit() {
    if (submitted) {
      await onResult(submitted.correct);
      return;
    }
    const correct = isExactMatch(input, expected);
    setSubmitted({ correct, expected, userInput: input });
    if (correct) {
      // Auto-advance on hit; on miss let the user read the diff.
      advanceTimerRef.current = setTimeout(async () => {
        advanceTimerRef.current = null;
        await onResult(true);
      }, 600);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-3">← back to flows</button>

      <div className="text-center mb-6">
        <div className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{current.pos}</div>
        <motion.div
          className="text-3xl font-semibold mt-3"
          animate={submitted?.correct && !anim.reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {current.en[0]}
        </motion.div>
        <div className="text-xs text-neutral-500 mt-1">type in German{current.pos === "noun" ? " (article + word)" : ""}</div>
      </div>

      <motion.div
        animate={submitted && !submitted.correct && !anim.reduced ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.28 }}
      >
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={submitted?.correct === true}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-4 py-3 text-lg bg-neutral-900 text-neutral-100 ${submitted && !submitted.correct ? "border-rose-700" : "border-neutral-800"}`}
        />
      </motion.div>

      <button onClick={submit} className="w-full mt-3 rounded-xl py-3 bg-sky-500 text-neutral-950 font-semibold">
        {submitted ? (submitted.correct ? "✓ Continue" : "Continue") : "Check"}
      </button>

      {submitted && !submitted.correct && (
        <DiffBlock userInput={submitted.userInput} expected={submitted.expected} />
      )}
    </div>
  );
}

function DiffBlock({ userInput, expected }: { userInput: string; expected: string }) {
  const d = diffTokens(userInput, expected);
  return (
    <div className="mt-4 rounded-xl border border-neutral-800 p-3 font-mono text-sm">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">You typed</div>
      <div className="mt-1">
        {d.input.map((t, i) => (
          <span key={i} className={`px-1 rounded ${t.correct ? "" : "bg-rose-950/60 text-rose-300"}`}>{t.token} </span>
        ))}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-3">Correct</div>
      <div className="mt-1">
        {d.expected.map((t, i) => (
          <span key={i} className={`px-1 rounded ${t.missing ? "bg-emerald-950/60 text-emerald-300 underline" : "text-neutral-200"}`}>{t.token} </span>
        ))}
      </div>
    </div>
  );
}
