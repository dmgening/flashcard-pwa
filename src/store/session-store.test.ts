import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./session-store";

beforeEach(() => {
  useSessionStore.getState().resetSession();
});

describe("session-store", () => {
  it("starts with empty history and zero counters", () => {
    const s = useSessionStore.getState();
    expect(s.history).toEqual([]);
    expect(s.done).toBe(0);
    expect(s.missed).toBe(0);
  });

  it("pushHistory appends and caps at 100", () => {
    const { pushHistory } = useSessionStore.getState();
    for (let i = 0; i < 150; i++) pushHistory(`w${i}`);
    expect(useSessionStore.getState().history.length).toBe(100);
    expect(useSessionStore.getState().history.at(-1)).toBe("w149");
  });

  it("recordResult increments counters", () => {
    const { recordResult } = useSessionStore.getState();
    recordResult(true);
    recordResult(false);
    recordResult(true);
    const s = useSessionStore.getState();
    expect(s.done).toBe(3);
    expect(s.missed).toBe(1);
  });

  it("resetSession clears history and counters", () => {
    const s0 = useSessionStore.getState();
    s0.pushHistory("a");
    s0.recordResult(false);
    s0.resetSession();
    const s1 = useSessionStore.getState();
    expect(s1.history).toEqual([]);
    expect(s1.done).toBe(0);
    expect(s1.missed).toBe(0);
  });
});
