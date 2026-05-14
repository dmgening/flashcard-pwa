# UI Polish & Animations — Design Spec

**Date:** 2026-05-14
**Branch:** `feat/ui-polish`

## Goal

Replace the current snap-to-state UI with motion-driven polish across the study flows, navigation, and stats — without changing data flow, schemas, or persistence. Animations should feel responsive and physical rather than mechanical, and must degrade gracefully when the user has `prefers-reduced-motion` set.

## Tech foundations

- **`motion` (formerly `framer-motion`)** — MIT, ~35 KB gz. Used for `drag`, `AnimatePresence` (enter/exit), spring physics, `useReducedMotion`.
- **`lucide-react`** — MIT, tree-shakeable icon set. Only the ~6 icons we need will end up in the bundle (~3 KB).
- **`src/lib/transitions.ts`** — central file with shared spring/easing presets so motion across the app feels coherent. Single source of truth for `springSnappy`, `springSoft`, `fadeFast`, etc.
- **No new state libraries.** Existing Zustand session-store + Dexie stay untouched.

**Bundle budget:** Current prod build is 378 KB gz JS. Expected post-change: ~+30 KB. Acceptable; revisit only if it grows further. If we ever need to shave: switch `motion` → `LazyMotion` with `domAnimation` feature, which drops ~15 KB.

## Reduced-motion policy

The `useReducedMotion()` hook from `motion` reads OS-level `prefers-reduced-motion`. Pattern:

- **Transform animations** (rotate, translate, scale, drag-rotation) → skipped or 0-duration when reduced-motion is set.
- **Fade-based reveals** → always run, but duration drops from 200 ms to 80 ms.
- **Drag** is still allowed (user-initiated, not autoplay), but the card snaps without spring physics — the threshold check still works.
- **Loading skeletons** → static instead of shimmer.

This is implemented once per flow, via a small `useAnim()` helper in `transitions.ts` that returns motion variants suitable for the current setting.

## In-scope features

### F1. Swipe flow — follow-the-finger drag

- Card is wrapped in `motion.div` with `drag="x"`, `dragSnapToOrigin` (snaps back on release below threshold).
- Live transforms while dragging:
  - `x = drag offset`
  - `rotate = drag offset * 0.05` (clamped at ±25°)
  - `opacity = 1 - abs(drag) / 400` (clamped at 0.4)
- Two hint stamps fade in based on drag direction:
  - Drag right past 40 px → "✓ GOT IT" overlay opacity ramps up
  - Drag left past 40 px → "✕ MISS" overlay opacity ramps up
- On release: if `|drag| > 100 px` *or* velocity > 500 px/s in either direction → fire `handleResult(direction)` and animate card off-screen (translate to ±1.5× viewport width, rotate ±30°, fade to 0 over 250 ms), then mount the next card with a `scale: 0.95 → 1` and `opacity: 0 → 1` enter.
- Buttons + keyboard arrows still work; they trigger the exit animation programmatically via Motion's `animate()` API.
- Existing 250 ms overlay stamp behavior moves into the drag system — the badge is the *same* element used during drag, just driven by either drag offset or programmatic value.

### F2. Swipe flow — 3D card flip (reveal)

- Card has a `<motion.div>` outer wrapper with `style={{ perspective: 1000 }}`.
- Inner wrapper has `transformStyle: "preserve-3d"` and animates `rotateY: 0 ↔ 180` on tap.
- Two children, both absolutely positioned, with `backfaceVisibility: "hidden"`:
  - **Front:** lemma + meta (article color, plural, aux/partizip).
  - **Back:** rotated 180° around Y; shows translation, source example, English example, TTS button.
- Tap on the card (anywhere not on a button) flips it.
- Under reduced-motion: the same two children stack and cross-fade instead of flipping.

### F3. MC flow — slide-in for each prompt, button press feedback

- Each prompt question wrapped in `AnimatePresence` keyed by `word.id`. Enter: slide from 24 px below with fade. Exit: slide 24 px up with fade. Duration 180 ms.
- Answer buttons: on press, briefly scale to 0.97 (active state), then return.
- After clicking a correct answer: the correct button briefly pulses green; after incorrect: the clicked button shakes (3 keyframes, ±6 px), the correct button pulses green.
- Reduced-motion: instant state change, color flash only.

### F4. Type flow — shake on wrong, subtle bounce on right

- Wrong submission: input wrapper shakes (translate-X keyframes: 0, -8, 8, -6, 6, 0 over 280 ms), red ring on the input for 600 ms.
- Right submission: subtle scale bounce (1 → 1.04 → 1) on the lemma area.
- Reduced-motion: red ring without shake; correct gets a color flash without bounce.

### F5. Bottom tab bar — icons + animated active indicator

- Replace text labels with **`lucide-react`** icons: Study → `Layers`, Stats → `BarChart3`, Decks → `BookOpen`, Settings → `Settings`. Keep the label text below the icon (small) for clarity.
- Active indicator: a single shared `motion.div` with `layoutId="tab-indicator"`, positioned absolutely behind the active item. As the route changes, Motion's layout animation slides the pill between items. Spring config from `transitions.ts`.
- Tabs use `<Link>` from react-router; the `motion.div` reads the active path from `useLocation()`.

### F6. Route page transitions

- Wrap `<Routes>` in `AnimatePresence mode="wait"`. Each route's top-level element is a `motion.div` with: enter `{ opacity: 0, y: 8 }` → `{ opacity: 1, y: 0 }`, exit `{ opacity: 0, y: -8 }`, duration 150 ms.
- Reduced-motion: cross-fade only, no y translate.

### F7. Loading states (deck-fetch)

- The current text "Loading…" placeholder in `study.tsx` and `stats.tsx` is replaced with a skeleton card matching the eventual layout. Skeleton uses a subtle shimmer (translate-X gradient on a pseudo-bg). Reduced-motion: static.
- Skeleton component lives at `src/components/skeleton.tsx`.

### F8. Stats page — visualization

Stats route gets a real layout:

1. **Mastery donut** at top — overall % of words attempted that are in "mastered" state (≥3 attempts, ≥80 % success). SVG donut, animated stroke-dashoffset on mount.
2. **Per-pos breakdown** — three small bars (noun, verb, other) showing attempts, success rate. Bars animate width from 0 → final on mount.
3. **Top-10 hardest words** — list of words sorted by lowest success rate (min 3 attempts). Each row enters with a stagger (40 ms between items). Already exists logically; just adds animation + better visual hierarchy.

No new metrics computed — everything derived from existing `stats` table.

Charts written by hand (SVG); no chart lib added. The data is simple enough that hand-built SVG keeps the bundle lean and the visual fully controllable.

## Out of scope (this branch)

- Toast / snack-bar system (deferred per user; not lost).
- Streak counter, confetti, celebration animations.
- Sound effects (separate from the existing TTS toggle).
- Haptic feedback (mobile only; future).
- Stats heatmap / calendar view.
- Replacing `react-router-dom` page-based transitions with the View Transitions API (different commitment).

## Files touched

| Area | Files |
|---|---|
| Foundations | `package.json` (new deps), `src/lib/transitions.ts` (new) |
| F1, F2 | `src/flows/swipe-flow.tsx` (rewritten), `src/flows/swipe-flow.test.tsx` (update to match new interaction) |
| F3 | `src/flows/mc-flow.tsx`, `src/flows/mc-flow.test.tsx` |
| F4 | `src/flows/type-flow.tsx`, `src/flows/type-flow.test.tsx` |
| F5 | `src/app/tab-bar.tsx` (rewritten) |
| F6 | `src/app/router.tsx`, `src/app/app.tsx` |
| F7 | `src/components/skeleton.tsx` (new), `src/routes/study.tsx`, `src/routes/stats.tsx` |
| F8 | `src/routes/stats.tsx`, `src/components/charts/*.tsx` (new) |

## Testing strategy

- All existing tests must continue to pass. They assert behavior, not animation internals — so they shouldn't break, but the rewrites need care around event handlers (`onTouchStart` → Motion's drag is invisible to RTL's fireEvent, so tests use `keyboard` interaction or a `swipe()` test helper).
- New tests:
  - `useReducedMotion` mock → confirm flip falls back to cross-fade.
  - Drag threshold → simulate pointer events; assert `recordAttempt` called with correct value.
  - Tab bar → click each tab; assert layoutId-driven indicator follows.
- We don't test animation values (rotation degrees, easings). That's visual; it's the human's job to look.

## Open questions

None blocking. Two minor calls deferred to implementation time:

1. Whether to keep both keyboard arrows + buttons + drag, or drop buttons on mobile. **Default: keep all three.** Buttons stay for desktop and a11y.
2. Stats donut size on narrow phones. **Default: max 200 px square; centers.** Adjust if cramped.

## Phasing

To keep the diff reviewable, the work splits into four PR-sized chunks (executed sequentially in this same branch, committed phase-by-phase):

1. **Phase A — Foundations.** Install deps, add `transitions.ts`, no visible change. Commit.
2. **Phase B — Study flows.** F1, F2, F3, F4 in one pass. Commit per flow if any single rewrite is large.
3. **Phase C — Navigation.** F5, F6, F7. Commit.
4. **Phase D — Stats.** F8. Commit.

Each phase ends with passing tests + a usable app.
