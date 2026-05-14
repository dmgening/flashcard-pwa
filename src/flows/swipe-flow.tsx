import { useEffect, useLayoutEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { getStats } from "@/db/stats";
import { speak, ttsAvailable } from "@/lib/tts";
import { useSettingsStore } from "@/store/settings-store";
import { useAnim } from "@/lib/transitions";

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

const SWIPE_THRESHOLD_PX = 100;
const SWIPE_VELOCITY = 500;
const SWIPE_OFFSCREEN = 600;
// Time we hold the card off-screen before mounting the next one. Spring physics
// settle around this mark too, so the visual fly-out aligns with the handoff.
const EXIT_HOLD_MS = 320;

export function SwipeFlow({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const { current, onResult } = useStudySession(deck);
  const [revealed, setRevealed] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const [exiting, setExiting] = useState<"hit" | "miss" | null>(null);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const ttsVoiceURI = useSettingsStore((s) => s.ttsVoiceURI);
  const anim = useAnim();

  const dragX = useMotionValue(0);
  // Live transforms while the user drags (skipped under reduced-motion).
  const rotate = useTransform(dragX, [-200, 0, 200], anim.reduced ? [0, 0, 0] : [-25, 0, 25]);
  const hitOpacity = useTransform(dragX, [40, 120], [0, 1]);
  const missOpacity = useTransform(dragX, [-120, -40], [1, 0]);

  // Reset the drag motion value SYNCHRONOUSLY (before paint) when the card
  // swaps. Otherwise the new motion.div mounts with style.x bound to a dragX
  // that's still off-screen from the previous fly-out, and the new card paints
  // off-screen for a frame — sometimes never recovering.
  useLayoutEffect(() => {
    dragX.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    setRevealed(false);
    setExiting(null);
    if (current) {
      getStats(deck.id, current.id).then((s) => setMissCount((s?.attempts ?? 0) - (s?.successes ?? 0)));
    }
  }, [current, deck.id]);

  async function handleResult(success: boolean) {
    if (!current || exiting !== null) return;
    setExiting(success ? "hit" : "miss");
    if (anim.reduced) {
      await onResult(success);
      return;
    }
    // Drive the card off-screen via the same motion value the drag uses.
    // This avoids the AnimatePresence/exit-prop conflict that occurs when a
    // motion-value-bound `x` fights an exit animation.
    const target = (success ? 1 : -1) * SWIPE_OFFSCREEN;
    animate(dragX, target, { type: "spring", stiffness: 200, damping: 25 });
    setTimeout(() => {
      setRevealed(false);
      onResult(success);
    }, EXIT_HOLD_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.key === "ArrowRight") handleResult(true);
      if (e.key === "ArrowLeft") handleResult(false);
      if (e.key === " " || e.key === "Enter") setRevealed((r) => !r);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, exiting]);

  if (!current) return <div className="p-4 text-neutral-500">No words.</div>;

  return (
    <div className="h-full flex flex-col p-4">
      <button onClick={onExit} className="self-start text-xs text-neutral-500 mb-2">← back to flows</button>

      <div className="flex-1 relative" style={{ perspective: 1000 }}>
        <motion.div
          key={current.id}
          className="absolute inset-0"
          style={{ x: dragX, rotate, transformStyle: "preserve-3d" }}
          drag={anim.reduced || exiting !== null ? false : "x"}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            const dx = info.offset.x;
            const vx = info.velocity.x;
            if (dx > SWIPE_THRESHOLD_PX || vx > SWIPE_VELOCITY) handleResult(true);
            else if (dx < -SWIPE_THRESHOLD_PX || vx < -SWIPE_VELOCITY) handleResult(false);
            else animate(dragX, 0, { type: "spring", stiffness: 400, damping: 35 });
          }}
          initial={{ scale: 0.95, opacity: 0, x: 0 }}
          animate={{ scale: 1, opacity: 1, rotateY: revealed ? 180 : 0 }}
          transition={anim.springSoft}
        >
          <CardFace front>
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{current.pos}</span>
            {missCount > 0 && (
              <span className="absolute top-3 right-3 text-[10px] text-neutral-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 align-middle mr-1" />
                missed {missCount}×
              </span>
            )}
            <button
              onClick={() => setRevealed(true)}
              className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 select-none"
            >
              <WordHead word={current} />
              <MetaLine word={current} />
              <div className="absolute bottom-4 text-[10px] uppercase tracking-widest text-neutral-600">tap to reveal</div>
            </button>

            {/* Drag hint stamps — opacity driven by dragX */}
            <motion.div
              style={{ opacity: hitOpacity }}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-[8deg] border-2 border-emerald-400 text-emerald-400 px-2 py-1 text-xs font-bold tracking-wider rounded"
            >✓ GOT IT</motion.div>
            <motion.div
              style={{ opacity: missOpacity }}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 -rotate-[8deg] border-2 border-rose-400 text-rose-400 px-2 py-1 text-xs font-bold tracking-wider rounded"
            >✕ MISS</motion.div>
          </CardFace>

          {revealed && (
            <CardFace>
              <button
                onClick={() => setRevealed(false)}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 select-none"
              >
                <div className="text-3xl font-semibold text-neutral-100">{current.en.join(", ")}</div>
                {current.example && (
                  <div className="text-sm italic text-neutral-400 mt-4 max-w-[90%]">{current.example}</div>
                )}
                {current.exampleEn && (
                  <div className="text-xs text-neutral-500 mt-1 max-w-[90%]">{current.exampleEn}</div>
                )}
                {ttsAvailable() && soundOn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(current.lemma, ttsVoiceURI); }}
                    className="mt-5 text-xl opacity-50">🔊</button>
                )}
              </button>
            </CardFace>
          )}
        </motion.div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => handleResult(false)} className="flex-1 rounded-xl py-3 border border-rose-900 text-rose-300 active:bg-rose-950/40">✕ Miss</button>
        <button onClick={() => handleResult(true)} className="flex-1 rounded-xl py-3 border border-emerald-900 text-emerald-300 active:bg-emerald-950/40">✓ Got it</button>
      </div>
    </div>
  );
}

// Front / back of the 3D card. `front` is shown without rotation; the back is
// pre-rotated 180° so that flipping the parent reveals it right-side-up.
function CardFace({ children, front }: { children: React.ReactNode; front?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950"
      style={{
        backfaceVisibility: "hidden",
        transform: front ? undefined : "rotateY(180deg)",
      }}
    >
      {children}
    </div>
  );
}
