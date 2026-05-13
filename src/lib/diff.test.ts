import { describe, it, expect } from "vitest";
import { tokenize, diffTokens, isExactMatch, normalize } from "./diff";

describe("normalize", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalize("  der   Hund  ")).toBe("der Hund");
  });
  it("preserves case and umlauts", () => {
    expect(normalize("Müde")).toBe("Müde");
  });
});

describe("isExactMatch", () => {
  it("matches identical strings after normalization", () => {
    expect(isExactMatch(" der Hund ", "der Hund")).toBe(true);
  });
  it("case difference fails", () => {
    expect(isExactMatch("der hund", "der Hund")).toBe(false);
  });
  it("umlaut difference fails", () => {
    expect(isExactMatch("mude", "müde")).toBe(false);
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("der Hund")).toEqual(["der", "Hund"]);
  });
});

describe("diffTokens", () => {
  it("flags wrong tokens in input and missing tokens in expected", () => {
    const d = diffTokens("die hund", "der Hund");
    expect(d.input).toEqual([
      { token: "die", correct: false },
      { token: "hund", correct: false },
    ]);
    expect(d.expected).toEqual([
      { token: "der", missing: true },
      { token: "Hund", missing: true },
    ]);
  });

  it("marks correct tokens as correct", () => {
    const d = diffTokens("der hund", "der Hund");
    expect(d.input[0].correct).toBe(true);
    expect(d.input[1].correct).toBe(false);
    expect(d.expected[0].missing).toBe(false);
    expect(d.expected[1].missing).toBe(true);
  });

  it("handles different token counts", () => {
    const d = diffTokens("Hund", "der Hund");
    expect(d.input).toHaveLength(1);
    expect(d.expected).toHaveLength(2);
    expect(d.expected[0].missing).toBe(true);
    expect(d.expected[1].missing).toBe(false);
  });
});
