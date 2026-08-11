function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Letters only — "ferris wheel", "ferriswheel", and "ferris  wheel" all match. */
function normalizeCompact(text: string): string {
  return normalizeForMatch(text).replace(/\s/g, "");
}

export function isExactMatch(guess: string, word: string): boolean {
  const g = normalizeForMatch(guess);
  const w = normalizeForMatch(word);
  if (g === w) return true;
  return normalizeCompact(guess) === normalizeCompact(word);
}

export function isCloseGuess(guess: string, word: string): boolean {
  const g = normalizeCompact(guess);
  const w = normalizeCompact(word);
  if (g.length !== w.length || g.length === 0) return false;
  let mismatches = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== w[i]) mismatches++;
    if (mismatches > 1) return false;
  }
  return mismatches === 1;
}

export function buildWordDisplay(
  word: string | null,
  hintRevealed: boolean[],
  wordMode: "normal" | "hidden",
  drawingStarted: boolean
): { wordLength: number; wordDisplay: string } {
  if (!word) return { wordLength: 0, wordDisplay: "" };

  const showLength = wordMode === "normal" || drawingStarted;
  if (!showLength) return { wordLength: 0, wordDisplay: "???" };

  const chars = word.split("");
  const display = chars
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (hintRevealed[i]) return ch;
      return "_";
    })
    .join(" ");

  return { wordLength: word.replace(/\s/g, "").length, wordDisplay: display };
}
