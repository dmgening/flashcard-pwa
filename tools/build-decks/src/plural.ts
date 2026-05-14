// tools/build-decks/src/plural.ts
export type PluralParse = { plural: string | null; ok: boolean };

const KNOWN_SUFFIXES = new Set(["-", "-en", "-e", "-er", "-s", "-n", "=", "=e", "=er", "=n"]);

function umlaut(s: string): string {
  // Handle au → äu diphthong first (e.g. Haus → Häuser).
  const auIdx = s.lastIndexOf("au");
  const AuIdx = s.lastIndexOf("Au");
  const diphthongIdx = Math.max(auIdx, AuIdx);
  if (diphthongIdx !== -1) {
    const a = s[diphthongIdx] === "a" ? "ä" : "Ä";
    return s.slice(0, diphthongIdx) + a + s.slice(diphthongIdx + 1);
  }
  // Apply umlaut to the last A/O/U in the stem (single-vowel rule for Germanic plurals).
  const map: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] in map) {
      return s.slice(0, i) + map[s[i]] + s.slice(i + 1);
    }
  }
  return s;
}

export function parsePlural(lemma: string, notation: string): PluralParse {
  const n = notation.trim();
  if (n === "" || n === "-") return { plural: null, ok: true };
  if (!KNOWN_SUFFIXES.has(n)) return { plural: null, ok: false };
  const useUmlaut = n.startsWith("=");
  const suffix = n.replace(/^[-=]/, "");
  let stem = useUmlaut ? umlaut(lemma) : lemma;
  // Drop trailing silent -e when the suffix begins with a vowel to avoid doubling.
  if (stem.endsWith("e") && suffix.startsWith("e")) {
    stem = stem.slice(0, -1);
  }
  return { plural: stem + suffix, ok: true };
}
