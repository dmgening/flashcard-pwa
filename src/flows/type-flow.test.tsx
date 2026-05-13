import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypeFlow } from "./type-flow";
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

describe("TypeFlow", () => {
  it("records a success on exact match", async () => {
    const user = userEvent.setup();
    render(<TypeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.type(screen.getByPlaceholderText(/der\/die\/das/), "der Hund");
    await user.click(screen.getByRole("button", { name: /check/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.successes).toBe(1);
    });
  });

  it("shows a diff and records a miss on wrong case", async () => {
    const user = userEvent.setup();
    render(<TypeFlow deck={deck} onExit={() => {}} />);
    await waitFor(() => screen.getByText(/^dog$/));
    await user.type(screen.getByPlaceholderText(/der\/die\/das/), "die hund");
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(await screen.findByText(/You typed/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(async () => {
      const row = await db.stats.get(["test", "w1"]);
      expect(row?.attempts).toBe(1);
      expect(row?.successes).toBe(0);
    });
  });
});
