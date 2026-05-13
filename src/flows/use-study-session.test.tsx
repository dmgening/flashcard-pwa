import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStudySession } from "./use-study-session";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const fixtureDeck: Deck = {
  id: "test",
  language: "de",
  level: "A1",
  name: "Test",
  words: [
    { id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
    { id: "w2", lemma: "Katze", pos: "noun", article: "die", plural: "Katzen", en: ["cat"] },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("useStudySession", () => {
  it("yields a current word", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    expect(["w1", "w2"]).toContain(result.current.current!.id);
  });

  it("onResult(true) increments successes in the DB and advances", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    const firstId = result.current.current!.id;
    await act(async () => { await result.current.onResult(true); });
    const row = await db.stats.get([fixtureDeck.id, firstId]);
    expect(row?.successes).toBe(1);
    expect(result.current.current).not.toBeNull();
  });

  it("onResult(false) increments attempts but not successes", async () => {
    const { result } = renderHook(() => useStudySession(fixtureDeck));
    await waitFor(() => expect(result.current.current).not.toBeNull());
    const firstId = result.current.current!.id;
    await act(async () => { await result.current.onResult(false); });
    const row = await db.stats.get([fixtureDeck.id, firstId]);
    expect(row?.attempts).toBe(1);
    expect(row?.successes).toBe(0);
  });
});
