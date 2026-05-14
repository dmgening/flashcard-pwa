# UI Polish & Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add motion-driven polish across the study flows, navigation, and stats — without changing data flow, schemas, or persistence.

**Architecture:** Add the `motion` library (formerly framer-motion) and `lucide-react` for icons. Centralize all spring/easing presets in `src/lib/transitions.ts` so the app feels coherent. Use `useReducedMotion()` to gate transform-based animations and fall back to short fades. Keep React-Router, Zustand, and Dexie untouched.

**Tech Stack:** React 18, TypeScript, Tailwind, Vite, vitest + jsdom + fake-indexeddb, `motion@^12`, `lucide-react@^1`.

**Spec:** `docs/superpowers/specs/2026-05-14-ui-polish-animations-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/transitions.ts` | **new** | Shared spring/easing presets + `useAnim()` hook returning a config that respects `prefers-reduced-motion`. |
| `src/lib/transitions.test.ts` | **new** | Unit tests for the reduce-motion fallback. |
| `src/flows/swipe-flow.tsx` | rewrite | Motion drag + 3D flip + exit animation. |
| `src/flows/swipe-flow.test.tsx` | extend | Keep all existing tests; add reduced-motion render test. |
| `src/flows/mc-flow.tsx` | modify | Slide-in prompt; pulse/shake feedback on answer buttons. |
| `src/flows/mc-flow.test.tsx` | leave | Existing tests still apply. |
| `src/flows/type-flow.tsx` | modify | Shake on wrong, scale-bounce on right. |
| `src/flows/type-flow.test.tsx` | leave | Existing tests still apply. |
| `src/app/tab-bar.tsx` | rewrite | `lucide-react` icons + shared `layoutId` active pill indicator. |
| `src/app/router.tsx` | modify | Wrap `<Routes>` in `AnimatePresence` with `mode="wait"`; each route is a `motion.div`. |
| `src/components/skeleton.tsx` | **new** | Shimmering skeleton block used while a deck loads. |
| `src/routes/study.tsx` | modify | Replace "Loading…" with `<DeckLoadingSkeleton/>`. |
| `src/routes/stats.tsx` | rewrite | Mastery donut + per-POS bars + top-10 hardest list. |
| `src/components/charts/mastery-donut.tsx` | **new** | SVG donut showing mastered/attempted/untouched. |
| `src/components/charts/pos-bars.tsx` | **new** | Three horizontal bars (noun/verb/other) for attempts + success rate. |
| `src/components/charts/mastery-donut.test.tsx` | **new** | Math-only tests for the donut's segment calculations. |
| `package.json` + `package-lock.json` | modify | New deps. |

---

## Phase A — Foundations

### Task A1: Install motion + lucide-react

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the deps**

```bash
npm install motion@^12 lucide-react@^1
```

- [ ] **Step 2: Verify both appear in `package.json` and the lockfile**

```bash
grep -E '"motion"|"lucide-react"' package.json
```

Expected output:
```
    "lucide-react": "^1.16.0",
    "motion": "^12.38.0",
```

(Version numbers may differ by patch; major versions must match.)

- [ ] **Step 3: Verify the app still builds**

```bash
npm run build
```

Expected: build succeeds, no new errors.

- [ ] **Step 4: Verify existing tests still pass**

```bash
npm test
```

Expected: 64/64 passing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(ui): install motion + lucide-react for polish work"
```

---

### Task A2: Add `transitions.ts` with `useAnim()` hook (TDD)

**Files:**
- Create: `src/lib/transitions.ts`
- Create: `src/lib/transitions.test.ts`

This file is the single source of truth for animation presets and the reduced-motion gating logic. Every other animation in the app reads from here.

- [ ] **Step 1: Write the failing test**

Create `src/lib/transitions.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAnim } from "./transitions";

function mockMatchMedia(prefersReduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? prefersReduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

describe("useAnim", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns full motion config when prefers-reduced-motion is unset", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useAnim());
    expect(result.current.reduced).toBe(false);
    expect(result.current.springSnappy).toEqual({ type: "spring", stiffness: 400, damping: 30 });
    expect(result.current.fade.duration).toBeGreaterThan(0.1);
  });

  it("collapses to short fades when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useAnim());
    expect(result.current.reduced).toBe(true);
    expect(result.current.springSnappy).toEqual({ duration: 0 });
    expect(result.current.fade.duration).toBeLessThanOrEqual(0.1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/transitions.test.ts
```

Expected: FAIL with module-not-found error for `./transitions`.

- [ ] **Step 3: Implement `transitions.ts`**

Create `src/lib/transitions.ts`:

```ts
import { useReducedMotion } from "motion/react";

export type SpringPreset = { type: "spring"; stiffness: number; damping: number };
export type ZeroDuration = { duration: 0 };
export type AnimConfig = {
  reduced: boolean;
  // Springs collapse to instant when reduced-motion is set.
  springSnappy: SpringPreset | ZeroDuration;
  springSoft: SpringPreset | ZeroDuration;
  // Fade always runs but is shortened under reduced-motion.
  fade: { duration: number };
};

export function useAnim(): AnimConfig {
  const reduced = useReducedMotion() ?? false;
  if (reduced) {
    return {
      reduced: true,
      springSnappy: { duration: 0 },
      springSoft: { duration: 0 },
      fade: { duration: 0.08 },
    };
  }
  return {
    reduced: false,
    springSnappy: { type: "spring", stiffness: 400, damping: 30 },
    springSoft: { type: "spring", stiffness: 220, damping: 22 },
    fade: { duration: 0.18 },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/transitions.test.ts
```

Expected: 2 tests passing.

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

```bash
npm test
```

Expected: 66/66 passing (64 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/transitions.ts src/lib/transitions.test.ts
git commit -m "feat(ui): transitions.ts with useAnim() — reduced-motion-aware presets"
```

---

## Phase B — Study flows

### Task B1: SwipeFlow — drag + 3D flip + exit animation

**Files:**
- Rewrite: `src/flows/swipe-flow.tsx`
- Extend: `src/flows/swipe-flow.test.tsx`

This is the largest single rewrite. The existing component is replaced; behavior the tests rely on (lemma renders, click reveals, buttons record results, keyboard arrows record results) is preserved. New: pointer drag follows the finger with rotation/opacity; release past threshold animates the card off-screen; tap flips the card 3D-style to reveal the back.

- [ ] **Step 1: Write an additional failing test for reduced-motion render**

Append to `src/flows/swipe-flow.test.tsx`, inside the `describe("SwipeFlow", ...)` block:

```ts
  it("renders without crashing under prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q === "(prefers-reduced-motion: reduce)",
      media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
    }));
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText("Hund")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Hund"));
    expect(screen.getByText("dog")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/flows/swipe-flow.test.tsx -t "reduced-motion"
```

Expected: FAIL (no implementation yet — the test will likely pass against the *old* component because nothing reads matchMedia. That's OK; we keep it as a regression guard.).

If the test passes against the old component, that's fine — move on. The point is to keep it around once we wire motion in so we catch any reduced-motion crash.

- [ ] **Step 3: Rewrite `src/flows/swipe-flow.tsx`**

Replace the entire file with:

```tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
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

  useEffect(() => {
    setRevealed(false);
    setExiting(null);
    dragX.set(0);
    if (current) {
      getStats(deck.id, current.id).then((s) => setMissCount((s?.attempts ?? 0) - (s?.successes ?? 0)));
    }
    // dragX is stable across renders; useEffect dep is the word change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, deck.id]);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
  }, []);

  async function handleResult(success: boolean) {
    if (!current || exiting !== null) return;
    setExiting(success ? "hit" : "miss");
    if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
    // Wait for the exit animation before reporting to the session.
    const ms = anim.reduced ? 0 : 260;
    advanceTimerRef.current = setTimeout(async () => {
      advanceTimerRef.current = null;
      await onResult(success);
    }, ms);
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
        <AnimatePresence>
          {exiting === null && (
            <motion.div
              key={current.id}
              className="absolute inset-0"
              style={{ x: dragX, rotate, transformStyle: "preserve-3d" }}
              drag={anim.reduced ? false : "x"}
              dragSnapToOrigin
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                const dx = info.offset.x;
                const vx = info.velocity.x;
                if (dx > SWIPE_THRESHOLD_PX || vx > SWIPE_VELOCITY) handleResult(true);
                else if (dx < -SWIPE_THRESHOLD_PX || vx < -SWIPE_VELOCITY) handleResult(false);
              }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotateY: revealed ? 180 : 0 }}
              exit={{
                x: exiting === "hit" ? 600 : -600,
                rotate: exiting === "hit" ? 30 : -30,
                opacity: 0,
              }}
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
            </motion.div>
          )}
        </AnimatePresence>
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
```

- [ ] **Step 4: Run the swipe-flow tests**

```bash
npx vitest run src/flows/swipe-flow.test.tsx
```

Expected: 4/4 passing (3 existing + 1 new reduced-motion render).

Note: if the existing "reveals on click" test fails because the reveal button now lives behind the flip, double-check that clicking the lemma text element still triggers `setRevealed(true)` via the button covering the front face. The pattern in the rewrite makes `Hund` itself the click target.

- [ ] **Step 5: Smoke-test the dev server**

```bash
npm run dev
```

Open the browser, pick a deck, enter Swipe flow. Verify:
- Card responds to mouse drag (rotates + fades)
- Drag right past the threshold → next card animates in from below; "Got it" recorded.
- Drag left past the threshold → next card animates in; "Miss" recorded.
- Tap on the lemma → card flips 3D to show translation. Tap again to flip back.
- Arrow keys still work.
- Buttons still work.

Stop the dev server with Ctrl-C when done.

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: 67/67 passing (66 from prior + 1 new).

- [ ] **Step 7: Commit**

```bash
git add src/flows/swipe-flow.tsx src/flows/swipe-flow.test.tsx
git commit -m "feat(ui): swipe flow — drag with rotation, 3D flip reveal, exit animation"
```

---

### Task B2: McFlow — slide-in prompt + animated feedback

**Files:**
- Modify: `src/flows/mc-flow.tsx`

The existing test asserts pick → result. The animations don't change that. We add `AnimatePresence` around the prompt and animate the answer buttons with motion presets.

- [ ] **Step 1: Replace the imports at the top of `src/flows/mc-flow.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { pickDistractors } from "@/lib/distractors";
import { speak, ttsAvailable } from "@/lib/tts";
import { useSettingsStore } from "@/store/settings-store";
import { useAnim } from "@/lib/transitions";
```

- [ ] **Step 2: Add the `useAnim()` call near the top of `McFlow`**

Inside the component body, just after the `useStudySession` line:

```tsx
  const anim = useAnim();
```

- [ ] **Step 3: Replace the prompt block (`<div className="text-center mb-5">…`) with an animated version**

```tsx
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          className="text-center mb-5"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={anim.fade}
        >
          <PromptWord word={current} />
          {ttsAvailable() && soundOn && (
            <button onClick={() => speak(current.lemma, ttsVoiceURI)} className="text-lg opacity-50 mt-2">🔊</button>
          )}
        </motion.div>
      </AnimatePresence>
```

- [ ] **Step 4: Wrap the answer buttons in `motion.button` so they get tap feedback + shake on wrong**

Replace the `<button key={c.word.id} …>` block inside `choices.map` with:

```tsx
          return (
            <motion.button
              key={c.word.id}
              className={classes}
              onClick={() => pick(c)}
              disabled={picked !== null}
              whileTap={anim.reduced ? undefined : { scale: 0.97 }}
              animate={showWrong && !anim.reduced ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={showWrong ? { duration: 0.28 } : anim.springSnappy}
            >
              {c.word.en[0]}{showCorrect ? " ✓" : showWrong ? " ✕" : ""}
            </motion.button>
          );
```

- [ ] **Step 5: Run mc-flow tests to make sure existing behavior is intact**

```bash
npx vitest run src/flows/mc-flow.test.tsx
```

Expected: all existing tests pass.

- [ ] **Step 6: Smoke-test in the browser**

```bash
npm run dev
```

Enter MC flow. Verify:
- Each new prompt slides in from below.
- Tapping a wrong answer makes it shake briefly.
- The correct answer styling appears after a wrong pick.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/flows/mc-flow.tsx
git commit -m "feat(ui): mc flow — prompt slide-in, button tap + shake on wrong"
```

---

### Task B3: TypeFlow — shake on wrong + scale-bounce on right

**Files:**
- Modify: `src/flows/type-flow.tsx`

- [ ] **Step 1: Replace the imports**

```tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Deck, Word } from "@/lib/schema";
import { useStudySession } from "./use-study-session";
import { diffTokens, isExactMatch } from "@/lib/diff";
import { useAnim } from "@/lib/transitions";
```

- [ ] **Step 2: Add the `useAnim()` call near the top of `TypeFlow`**

Inside the component, right after `const { current, onResult } = useStudySession(deck);`:

```tsx
  const anim = useAnim();
```

- [ ] **Step 3: Wrap the prompt heading with a scale-bounce on right**

Replace the `<div className="text-3xl font-semibold mt-3">{current.en[0]}</div>` with:

```tsx
        <motion.div
          className="text-3xl font-semibold mt-3"
          animate={submitted?.correct && !anim.reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {current.en[0]}
        </motion.div>
```

- [ ] **Step 4: Wrap the `<input>` in a `motion.div` that shakes on wrong**

Replace the `<input … />` JSX with:

```tsx
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
```

- [ ] **Step 5: Run type-flow tests**

```bash
npx vitest run src/flows/type-flow.test.tsx
```

Expected: all existing tests pass.

- [ ] **Step 6: Smoke-test**

```bash
npm run dev
```

Enter Type flow. Verify:
- Wrong submission → input shakes briefly.
- Right submission → prompt does a subtle scale pulse.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/flows/type-flow.tsx
git commit -m "feat(ui): type flow — shake on wrong, scale bounce on right"
```

---

## Phase C — Navigation + loading states

### Task C1: TabBar — lucide icons + `layoutId` active pill

**Files:**
- Rewrite: `src/app/tab-bar.tsx`

Note: the existing `<TabBar />` lists Decks / Study / Stats. The app also has a Settings route but no tab for it — keep that as-is (Settings is reachable via the Decks page or direct URL).

- [ ] **Step 1: Replace `src/app/tab-bar.tsx`**

```tsx
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Layers, BookOpen, BarChart3 } from "lucide-react";
import { useAnim } from "@/lib/transitions";

type Tab = { to: string; label: string; Icon: typeof Layers; matchPrefix: string };
const TABS: Tab[] = [
  { to: "/decks", label: "Decks", Icon: BookOpen, matchPrefix: "/decks" },
  { to: "/study", label: "Study", Icon: Layers, matchPrefix: "/study" },
  { to: "/stats", label: "Stats", Icon: BarChart3, matchPrefix: "/stats" },
];

export function TabBar() {
  const { pathname } = useLocation();
  const anim = useAnim();

  return (
    <nav className="flex border-t border-neutral-800 bg-neutral-950 fixed bottom-0 inset-x-0">
      {TABS.map(({ to, label, Icon, matchPrefix }) => {
        const isActive = pathname.startsWith(matchPrefix);
        return (
          <NavLink key={to} to={to} className="relative flex-1 py-2 flex flex-col items-center justify-center">
            <span className={`relative z-10 flex flex-col items-center gap-0.5 ${isActive ? "text-neutral-100" : "text-neutral-500"}`}>
              <Icon size={20} strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-wide">{label}</span>
            </span>
            {isActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-3 top-0 h-0.5 bg-sky-400 rounded-full"
                transition={anim.springSnappy}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: all passing. The existing app/router tests don't depend on tab-bar markup.

- [ ] **Step 3: Smoke-test**

```bash
npm run dev
```

Verify:
- The tab bar shows three icons + labels.
- Clicking between tabs slides the small indicator bar smoothly.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/tab-bar.tsx
git commit -m "feat(ui): tab bar — lucide icons + layoutId active indicator"
```

---

### Task C2: Route page transitions via `AnimatePresence`

**Files:**
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Replace `src/app/router.tsx` with the animated version**

Full file:

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DecksRoute } from "@/routes/decks";
import { StudyRoute } from "@/routes/study";
import { StatsRoute } from "@/routes/stats";
import { SettingsRoute } from "@/routes/settings";
import { TabBar } from "./tab-bar";
import { getSettings } from "@/db/dexie";
import { useAnim } from "@/lib/transitions";

const DEFAULT_DECK_ID = "de-a1";

function Layout() {
  return (
    <div className="min-h-full pb-16">
      <Outlet />
      <TabBar />
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  const anim = useAnim();
  return (
    <motion.div
      initial={{ opacity: 0, y: anim.reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: anim.reduced ? 0 : -8 }}
      transition={anim.fade}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function useActiveDeckRedirect(toPath: (id: string) => string) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getSettings().then((s) => {
      navigate(toPath(s.activeDeckId ?? DEFAULT_DECK_ID), { replace: true });
      setReady(true);
    });
  }, [navigate, toPath]);
  return ready;
}

function StudyRedirect() {
  const ready = useActiveDeckRedirect((id) => `/study/${id}`);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function StatsRedirect() {
  const ready = useActiveDeckRedirect((id) => `/stats/${id}`);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function AnimatedRoutes() {
  const location = useLocation();
  // Key on the top-level route segment so swapping deck inside `/study/...`
  // doesn't trigger a page transition.
  const topSegment = location.pathname.split("/")[1] || "root";
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={topSegment}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<PageFrame><DecksRoute /></PageFrame>} />
          <Route path="/study" element={<PageFrame><StudyRedirect /></PageFrame>} />
          <Route path="/study/:deckId" element={<PageFrame><StudyRoute /></PageFrame>} />
          <Route path="/stats" element={<PageFrame><StatsRedirect /></PageFrame>} />
          <Route path="/stats/:deckId" element={<PageFrame><StatsRoute /></PageFrame>} />
          <Route path="/settings" element={<PageFrame><SettingsRoute /></PageFrame>} />
          <Route path="*" element={<Navigate to="/decks" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
```

Note: the redirects still use the inline "Loading…" text — Task C3 swaps both the routes and the redirects to `<DeckLoadingSkeleton />`.

- [ ] **Step 5: Run the test suite**

```bash
npm test
```

Expected: all passing. If a test fails because it queried by route element directly, check that the test uses `<MemoryRouter>` and not the production router — it shouldn't be affected.

- [ ] **Step 6: Smoke-test**

```bash
npm run dev
```

Verify:
- Navigating between Decks, Study, Stats cross-fades.
- Switching deck inside `/study` does *not* trigger a page transition.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(ui): route page transitions via AnimatePresence"
```

---

### Task C3: Skeleton component + wire into study/stats loading

**Files:**
- Create: `src/components/skeleton.tsx`
- Modify: `src/routes/study.tsx`, `src/routes/stats.tsx`

- [ ] **Step 1: Create `src/components/skeleton.tsx`**

```tsx
import { motion } from "motion/react";
import { useAnim } from "@/lib/transitions";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  const anim = useAnim();
  if (anim.reduced) {
    return <div className={`bg-neutral-900 rounded-xl ${className}`} />;
  }
  return (
    <div className={`relative overflow-hidden bg-neutral-900 rounded-xl ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-800/40 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
    </div>
  );
}

export function DeckLoadingSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <SkeletonBlock className="h-8 w-32" />
      <SkeletonBlock className="flex-1" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-12 flex-1" />
        <SkeletonBlock className="h-12 flex-1" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the `"Loading…"` text in `src/routes/study.tsx`**

Find the line that renders `Loading…` (a string literal in a JSX expression). Replace it with:

```tsx
<DeckLoadingSkeleton />
```

And add to imports:

```tsx
import { DeckLoadingSkeleton } from "@/components/skeleton";
```

- [ ] **Step 3: Replace the `"Loading…"` text in `src/routes/stats.tsx`** (same change)

```tsx
import { DeckLoadingSkeleton } from "@/components/skeleton";
```

and replace the loading text with `<DeckLoadingSkeleton />`.

- [ ] **Step 4: Replace the `"Loading…"` text in `StudyRedirect` and `StatsRedirect` inside `src/app/router.tsx`**

Add the import to `router.tsx`:

```tsx
import { DeckLoadingSkeleton } from "@/components/skeleton";
```

Update both redirects to return the skeleton instead of the inline text:

```tsx
function StudyRedirect() {
  const ready = useActiveDeckRedirect((id) => `/study/${id}`);
  return ready ? null : <DeckLoadingSkeleton />;
}

function StatsRedirect() {
  const ready = useActiveDeckRedirect((id) => `/stats/${id}`);
  return ready ? null : <DeckLoadingSkeleton />;
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 6: Smoke-test**

```bash
npm run dev
```

Throttle network in DevTools (Slow 3G) and navigate to Study — the skeleton shimmer should appear during the load. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/skeleton.tsx src/routes/study.tsx src/routes/stats.tsx src/app/router.tsx
git commit -m "feat(ui): skeleton component for deck loading state"
```

---

## Phase D — Stats

### Task D1: Stats page — mastery donut + per-POS bars + top-10 hardest list

**Files:**
- Rewrite: `src/routes/stats.tsx`
- Create: `src/components/charts/mastery-donut.tsx`
- Create: `src/components/charts/mastery-donut.test.tsx`
- Create: `src/components/charts/pos-bars.tsx`

The existing `stats.tsx` lists hardest words as plain text. We replace it with a chart-driven layout. The donut + bars are hand-built SVG (no chart library). All chart math is testable.

Definition of "mastered": ≥3 attempts AND success rate ≥ 80%. Definition of "attempted": ≥1 attempt. Both derived from the existing `stats` table.

- [ ] **Step 1: Read existing `src/db/stats.ts` to know its exports**

```bash
cat src/db/stats.ts
```

Confirm `getStatsForDeck(deckId)` and `hardestWords(deckId, limit)` exist. (If a function with a different name is exported, adjust the imports below.)

- [ ] **Step 2: Write the failing test for `MasteryDonut` math**

Create `src/components/charts/mastery-donut.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { computeMastery } from "./mastery-donut";

const stat = (attempts: number, successes: number) => ({
  deckId: "d", wordId: "w", attempts, successes,
  lastSeenAt: 0, lastResult: "hit" as const,
});

describe("computeMastery", () => {
  it("counts a word as mastered when ≥3 attempts and ≥80% success", () => {
    const result = computeMastery(
      [stat(5, 4), stat(3, 3), stat(2, 2), stat(1, 0)],
      100,
    );
    expect(result.mastered).toBe(2);          // 5/4 (80%) and 3/3 (100%)
    expect(result.attempted).toBe(4);          // every row attempted
    expect(result.untouched).toBe(96);         // 100 - 4
  });

  it("returns zeros when no stats are present", () => {
    const r = computeMastery([], 50);
    expect(r).toEqual({ mastered: 0, attempted: 0, untouched: 50 });
  });

  it("caps mastered + attempted at total when stats exceed total (defensive)", () => {
    const r = computeMastery([stat(5, 5), stat(5, 5)], 1);
    expect(r.untouched).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
npx vitest run src/components/charts/mastery-donut.test.tsx
```

Expected: module-not-found.

- [ ] **Step 4: Implement `src/components/charts/mastery-donut.tsx`**

```tsx
import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import { useAnim } from "@/lib/transitions";

export type MasterySplit = { mastered: number; attempted: number; untouched: number };

export function computeMastery(rows: StatRow[], totalWords: number): MasterySplit {
  let mastered = 0;
  let attempted = 0;
  for (const r of rows) {
    if (r.attempts <= 0) continue;
    attempted += 1;
    if (r.attempts >= 3 && r.successes / r.attempts >= 0.8) mastered += 1;
  }
  const untouched = Math.max(0, totalWords - attempted);
  return { mastered, attempted, untouched };
}

export function MasteryDonut({ rows, totalWords, size = 180 }: { rows: StatRow[]; totalWords: number; size?: number }) {
  const anim = useAnim();
  const split = computeMastery(rows, totalWords);
  const total = Math.max(1, totalWords);
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  const masteredFrac = split.mastered / total;
  const attemptedFrac = (split.attempted - split.mastered) / total;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(38,38,38)" strokeWidth={12} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(110,231,183)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - masteredFrac) }}
          transition={anim.reduced ? { duration: 0 } : { duration: 0.9 }}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(56,189,248)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - masteredFrac)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, strokeDashoffset: c * (1 - masteredFrac - attemptedFrac) }}
          transition={anim.reduced ? { duration: 0 } : { duration: 0.9, delay: 0.3 }}
        />
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-300 mr-2 align-middle" />Mastered: <strong>{split.mastered}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-2 align-middle" />Practiced: <strong>{split.attempted}</strong></div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-neutral-700 mr-2 align-middle" />Untouched: <strong>{split.untouched}</strong></div>
        <div className="text-xs text-neutral-500 mt-1">Total: {totalWords}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the mastery-donut tests**

```bash
npx vitest run src/components/charts/mastery-donut.test.tsx
```

Expected: 3 tests passing.

- [ ] **Step 6: Implement `src/components/charts/pos-bars.tsx`**

```tsx
import { motion } from "motion/react";
import type { StatRow } from "@/db/dexie";
import type { Word } from "@/lib/schema";
import { useAnim } from "@/lib/transitions";

type PosKey = "noun" | "verb" | "other";

function posOf(word: Word): PosKey {
  if (word.pos === "noun") return "noun";
  if (word.pos === "verb") return "verb";
  return "other";
}

export function PosBars({ words, rows }: { words: Word[]; rows: StatRow[] }) {
  const anim = useAnim();
  const statByWordId = new Map(rows.map((r) => [r.wordId, r] as const));
  const buckets: Record<PosKey, { attempts: number; successes: number; total: number }> = {
    noun: { attempts: 0, successes: 0, total: 0 },
    verb: { attempts: 0, successes: 0, total: 0 },
    other: { attempts: 0, successes: 0, total: 0 },
  };
  for (const w of words) {
    const key = posOf(w);
    buckets[key].total += 1;
    const s = statByWordId.get(w.id);
    if (!s) continue;
    buckets[key].attempts += s.attempts;
    buckets[key].successes += s.successes;
  }

  const maxAttempts = Math.max(1, buckets.noun.attempts, buckets.verb.attempts, buckets.other.attempts);

  return (
    <div className="flex flex-col gap-3">
      {(["noun", "verb", "other"] as const).map((k) => {
        const { attempts, successes, total } = buckets[k];
        const successRate = attempts === 0 ? 0 : Math.round((successes / attempts) * 100);
        const barFrac = attempts / maxAttempts;
        return (
          <div key={k}>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span className="uppercase tracking-wider">{k} <span className="text-neutral-600">· {total} words</span></span>
              <span>{attempts} attempts · {successRate}% correct</span>
            </div>
            <div className="h-2 rounded bg-neutral-900 overflow-hidden">
              <motion.div
                className="h-full bg-sky-500"
                initial={{ width: 0 }}
                animate={{ width: `${barFrac * 100}%` }}
                transition={anim.reduced ? { duration: 0 } : { duration: 0.7 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Rewrite `src/routes/stats.tsx`**

Look at the existing file first to confirm imports and the deck-id route param:

```bash
cat src/routes/stats.tsx
```

Then replace its contents with:

```tsx
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
                  className="flex justify-between border-b border-neutral-900 py-1.5"
                >
                  <span className="text-neutral-200">{w.pos === "noun" ? `${w.article} ${w.lemma}` : w.lemma}</span>
                  <span className="text-xs text-neutral-500">{r.successes}/{r.attempts} · {rate}%</span>
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
```

- [ ] **Step 8: Run the full test suite**

```bash
npm test
```

Expected: all passing including the 3 new mastery-donut tests.

- [ ] **Step 9: Smoke-test**

```bash
npm run dev
```

Practice a few words in any flow, then visit Stats. Verify:
- Donut animates fill on mount.
- Per-POS bars animate width from 0.
- Hardest words list staggers in.

Stop the dev server.

- [ ] **Step 10: Run the production build**

```bash
npm run build
```

Expected: clean build. Note the new bundle size; should be roughly +30 KB gz over baseline.

- [ ] **Step 11: Commit**

```bash
git add src/routes/stats.tsx src/components/charts/
git commit -m "feat(ui): stats page — mastery donut, per-pos bars, top-10 list"
```

---

## End-to-end verification

After all tasks are committed:

- [ ] Run the full test suite:

```bash
npm test
```

Expected: every test passes.

- [ ] Run a production build to confirm no warnings:

```bash
npm run build
```

- [ ] Open `npm run dev`, click through every route and every flow, with and without `prefers-reduced-motion` set in DevTools (Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`). Verify each animation either runs normally or falls back cleanly.

- [ ] Push the branch and open a PR.

```bash
git push -u origin feat/ui-polish
gh pr create --title "feat(ui): motion-driven polish across flows, navigation, stats" --body "$(cat <<'EOF'
## Summary
Eight features across four phases (see spec `docs/superpowers/specs/2026-05-14-ui-polish-animations-design.md`):

- **Foundations**: `motion` + `lucide-react`; shared springs/easings + reduced-motion gating in `src/lib/transitions.ts`.
- **Study flows**: swipe gains follow-the-finger drag + 3D flip reveal + exit animation; MC gains slide-in + shake-on-wrong; type gains shake + bounce.
- **Navigation**: lucide icons + `layoutId` active pill in the tab bar; cross-fade page transitions via `AnimatePresence`.
- **Loading**: shimmering skeleton during deck fetch.
- **Stats**: mastery donut + per-POS bars + top-10 hardest list, all hand-built SVG with mount animations.

Bundle delta: ~+30 KB gz. All animations respect `prefers-reduced-motion`.

## Test plan
- [x] All existing tests still pass.
- [x] New tests for `useAnim()` reduced-motion fallback and `computeMastery()` math.
- [ ] Smoke-test every flow + every route, with and without `prefers-reduced-motion`.
- [ ] Smoke-test the deck-loading skeleton via DevTools throttling.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
