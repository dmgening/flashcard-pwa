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
