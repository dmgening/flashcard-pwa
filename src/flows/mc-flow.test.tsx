import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { McFlow } from "./mc-flow";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const deck: Deck = {
  id: "test", language: "de", level: "A1", name: "Test",
  words: [
    { id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] },
    { id: "w2", lemma: "Katze", pos: "noun", article: "die", plural: "Katzen", en: ["cat"] },
    { id: "w3", lemma: "Haus", pos: "noun", article: "das", plural: "Häuser", en: ["house"] },
    { id: "w4", lemma: "Auto", pos: "noun", article: "das", plural: "Autos", en: ["car"] },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.restoreAllMocks();
});

describe("McFlow", () => {
  it("renders prompt and four option buttons", async () => {
    render(<McFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => {
      const options = screen.getAllByRole("button").filter(b => /^(dog|cat|house|car)/.test(b.textContent ?? ""));
      expect(options).toHaveLength(4);
    });
  });

  it("clicking the correct option records a success", async () => {
    // Force Math.random to always return 0 so drawWord picks the first word (w1/Hund/dog)
    vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    render(<McFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.click(screen.getByText(/^dog$/));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });
});
