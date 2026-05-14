// tools/build-decks/src/slug.ts
const UMLAUT_MAP: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", ß: "ss",
  Ä: "ae", Ö: "oe", Ü: "ue",
};

export function slugify(input: string): string {
  let s = "";
  for (const ch of input) {
    s += UMLAUT_MAP[ch] ?? ch;
  }
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

export function assignUniqueIds(slugs: string[], prefix: string): string[] {
  const counts = new Map<string, number>();
  const out: string[] = [];
  for (const slug of slugs) {
    const c = counts.get(slug) ?? 0;
    counts.set(slug, c + 1);
    out.push(c === 0 ? `${prefix}-${slug}` : `${prefix}-${slug}-${c + 1}`);
  }
  return out;
}
