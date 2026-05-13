export function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function isExactMatch(input: string, expected: string): boolean {
  return normalize(input) === normalize(expected);
}

export function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

export type DiffResult = {
  input: { token: string; correct: boolean }[];
  expected: { token: string; missing: boolean }[];
};

export function diffTokens(input: string, expected: string): DiffResult {
  const inTokens = tokenize(input);
  const exTokens = tokenize(expected);
  const exSet = new Set(exTokens);
  const inSet = new Set(inTokens);
  return {
    input: inTokens.map((t) => ({ token: t, correct: exSet.has(t) })),
    expected: exTokens.map((t) => ({ token: t, missing: !inSet.has(t) })),
  };
}
