import { HINT_EVERY, HINT_FIRST_AT } from "@/lib/types";

/** How many letter hints this word may receive given the host setting. */
export function maxHintsForWord(word: string, settingMax: number): number {
  const letters = word.replace(/\s/g, "").length;
  if (letters < 3) return Math.min(settingMax, 1);
  if (letters < 6) return Math.min(settingMax, 2);
  return Math.min(Math.max(1, settingMax), 4);
}

/** How many hints should already be visible at this point in the turn. */
export function expectedHintCount(
  elapsedRatio: number,
  maxHints: number
): number {
  if (maxHints <= 0 || elapsedRatio < HINT_FIRST_AT) return 0;
  return Math.min(
    maxHints,
    1 + Math.floor((elapsedRatio - HINT_FIRST_AT) / HINT_EVERY + 1e-9)
  );
}

export function letterHintCount(
  word: string,
  hintRevealed: boolean[]
): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " " && hintRevealed[i]) count++;
  }
  return count;
}
