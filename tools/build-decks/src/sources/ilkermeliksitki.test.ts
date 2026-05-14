// tools/build-decks/src/sources/ilkermeliksitki.test.ts
import { describe, it, expect } from "vitest";
import { parseTsv, IlkermeliksitkiSource } from "./ilkermeliksitki";
import fs from "node:fs";
import path from "node:path";

const fixture = fs.readFileSync(
  path.resolve(__dirname, "../../fixtures/sample.a1.tsv"),
  "utf8",
);

describe("parseTsv", () => {
  const entries = parseTsv("A1", fixture);

  it("parses nouns with article + plural", () => {
    const e = entries.find((x) => x.lemma === "Adresse")!;
    expect(e.pos).toBe("noun");
    expect(e.article).toBe("die");
    expect(e.plural).toBe("Adressen");
    expect(e.example_de).toBe("Können Sie mir seine Adresse sagen?");
    expect(e.example_en).toBe("Could you tell me his address?");
  });

  it("handles plural notation with leading space", () => {
    const e = entries.find((x) => x.lemma === "Auto")!;
    expect(e.plural).toBe("Autos");
  });

  it("returns plural=null when no notation given", () => {
    const e = entries.find((x) => x.lemma === "Wasser")!;
    expect(e.plural).toBeNull();
  });

  it("handles umlaut plural notation", () => {
    const e = entries.find((x) => x.lemma === "Mann")!;
    expect(e.plural).toBe("Männer");
  });

  it("classifies bare -en lemmas as verbs", () => {
    const e = entries.find((x) => x.lemma === "abfahren")!;
    expect(e.pos).toBe("verb");
    expect(e.article).toBeUndefined();
  });

  it("collapses polysemy markers into one entry with senses count", () => {
    const e = entries.find((x) => x.lemma === "alt")!;
    expect(e.senses).toBe(2);
    expect(e.example_de).toBe("Wie alt sind Sie?"); // lowest-numbered wins
  });

  it("lowest-numbered sense wins even when source lists them out of order", () => {
    const ooo = "alt(2)\tMein Auto ist alt.\tMy car is old.\nalt(1)\tWie alt sind Sie?\tHow old are you?\n";
    const e = parseTsv("A1", ooo);
    const alt = e.find((x) => x.lemma === "alt")!;
    expect(alt.senses).toBe(2);
    expect(alt.example_de).toBe("Wie alt sind Sie?");
  });

  it("classifies remaining lemmas as 'other'", () => {
    const e = entries.find((x) => x.lemma === "und")!;
    expect(e.pos).toBe("other");
  });

  it("skips B1-style header row when present", () => {
    const withHeader = "german word\tgerman sentence\tenglish translation\n" + fixture;
    const e = parseTsv("B1", withHeader);
    expect(e.find((x) => x.lemma === "german word")).toBeUndefined();
    expect(e.length).toBe(entries.length);
  });

  it("preserves the raw column 1 for debugging", () => {
    const e = entries.find((x) => x.lemma === "Adresse")!;
    expect(e.raw).toBe("die Adresse,-en");
  });

  it("tags every entry with the given level", () => {
    for (const e of entries) {
      expect(e.level).toBe("A1");
    }
  });
});

describe("IlkermeliksitkiSource", () => {
  it("returns a DeckSource implementation", () => {
    const s = new IlkermeliksitkiSource();
    expect(typeof s.fetch).toBe("function");
  });
});
