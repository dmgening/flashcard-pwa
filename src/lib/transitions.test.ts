import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { prefersReducedMotion } from "motion/react";
import { useAnim } from "./transitions";

describe("useAnim", () => {
  afterEach(() => {
    prefersReducedMotion.current = null;
  });

  it("returns full motion config when prefers-reduced-motion is unset", () => {
    prefersReducedMotion.current = false;
    const { result } = renderHook(() => useAnim());
    expect(result.current.reduced).toBe(false);
    expect(result.current.springSnappy).toEqual({ type: "spring", stiffness: 400, damping: 30 });
    expect(result.current.fade.duration).toBeGreaterThan(0.1);
  });

  it("collapses to short fades when prefers-reduced-motion is set", () => {
    prefersReducedMotion.current = true;
    const { result } = renderHook(() => useAnim());
    expect(result.current.reduced).toBe(true);
    expect(result.current.springSnappy).toEqual({ duration: 0 });
    expect(result.current.fade.duration).toBeLessThanOrEqual(0.1);
  });
});
