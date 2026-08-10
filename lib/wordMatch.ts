export function isExactMatch(guess: string, answer: string): boolean {
  return guess.trim().toLowerCase() === answer.trim().toLowerCase();
}

export function isCloseGuess(guess: string, answer: string): boolean {
  const g = guess.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  if (g === a) return false;
  if (g.length !== a.length) return false;
  let mismatches = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== a[i]) mismatches++;
    if (mismatches > 1) return false;
  }
  return mismatches === 1;
}

export function wordToUnderscores(word: string): string {
  return word
    .split("")
    .map((c) => (c === " " ? " " : "_"))
    .join("");
}
