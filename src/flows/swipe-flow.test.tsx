import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SwipeFlow } from "./swipe-flow";
import { db } from "@/db/dexie";
import type { Deck } from "@/lib/schema";

const deck: Deck = {
  id: "test", language: "de", level: "A1", name: "Test",
  words: [{ id: "w1", lemma: "Hund", pos: "noun", article: "der", plural: "Hunde", en: ["dog"] }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("SwipeFlow", () => {
  it("renders the lemma and reveals on click", async () => {
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText("Hund")).toBeInTheDocument());
    expect(screen.queryByText("dog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Hund"));
    expect(screen.getByText("dog")).toBeInTheDocument();
  });

  it("Got it button records a success", async () => {
    const user = userEvent.setup();
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText("Hund"));
    await user.click(screen.getByRole("button", { name: /got it/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });

  it("Miss button records a miss", async () => {
    const user = userEvent.setup();
    render(<SwipeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText("Hund"));
    await user.click(screen.getByRole("button", { name: /miss/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.attempts).toBe(1);
      expect(row?.successes).toBe(0);
    });
  });
});
