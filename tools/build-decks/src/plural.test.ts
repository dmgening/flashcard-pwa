// tools/build-decks/src/plural.test.ts
import { describe, it, expect } from "vitest";
import { parsePlural } from "./plural";

describe("parsePlural", () => {
  it("returns null when there is no notation", () => {
    expect(parsePlural("Wasser", "")).toEqual({ plural: null, ok: true });
  });

  it("returns null on empty-dash notation", () => {
    expect(parsePlural("Mädchen", "-")).toEqual({ plural: null, ok: true });
  });

  it("appends suffix for -en", () => {
    expect(parsePlural("Adresse", "-en")).toEqual({ plural: "Adressen", ok: true });
  });

  it("appends suffix for -e", () => {
    expect(parsePlural("Angebot", "-e")).toEqual({ plural: "Angebote", ok: true });
  });

  it("appends suffix for -er", () => {
    expect(parsePlural("Kind", "-er")).toEqual({ plural: "Kinder", ok: true });
  });

  it("appends suffix for -s", () => {
    expect(parsePlural("Auto", "-s")).toEqual({ plural: "Autos", ok: true });
  });

  it("appends suffix for -n", () => {
    expect(parsePlural("Katze", "-n")).toEqual({ plural: "Katzen", ok: true });
  });

  it("applies umlaut + er for =er", () => {
    expect(parsePlural("Mann", "=er")).toEqual({ plural: "Männer", ok: true });
  });

  it("applies umlaut + e for =e", () => {
    expect(parsePlural("Stadt", "=e")).toEqual({ plural: "Städte", ok: true });
  });

  it("applies umlaut only for =", () => {
    expect(parsePlural("Bruder", "=")).toEqual({ plural: "Brüder", ok: true });
  });

  it("trims whitespace around the suffix", () => {
    expect(parsePlural("Haus", " =er ")).toEqual({ plural: "Häuser", ok: true });
  });

  it("returns ok=false for unknown notation", () => {
    expect(parsePlural("Kind", "weird")).toEqual({ plural: null, ok: false });
  });
});
