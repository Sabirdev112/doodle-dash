const FIRST_GUESS_POINTS = 300;

export function getGuesserPoints(place: number): number {
  if (place === 1) return FIRST_GUESS_POINTS;
  if (place === 2) return Math.floor(FIRST_GUESS_POINTS / 2);
  if (place === 3) return Math.floor(FIRST_GUESS_POINTS / 4);
  return 35;
}

/** Fixed per-guesser drawer points plus time-remaining bonus on last correct guess. */
export function getDrawerPoints(
  correctCount: number,
  turnDurationSec: number,
  turnEndTime: number | null,
  lastGuessTime: number | null
): number {
  if (correctCount === 0) return 0;

  const base = Math.min(correctCount * 50, 200);
  if (!turnEndTime || !lastGuessTime || turnDurationSec <= 0) return base;

  const remainingMs = Math.max(0, turnEndTime - lastGuessTime);
  const remainingRatio = remainingMs / (turnDurationSec * 1000);
  const timeBonus = Math.round(remainingRatio * 100);
  return Math.min(base + timeBonus, 350);
}

export function updateCrownHolder(
  players: { id: string; score: number; crownReachedAt?: number }[],
  currentCrownId: string | null
): string | null {
  if (players.length === 0) return null;

  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.crownReachedAt ?? Infinity) - (b.crownReachedAt ?? Infinity);
  });

  const leader = sorted[0];
  if (leader.score === 0) return currentCrownId;

  if (currentCrownId) {
    const current = players.find((p) => p.id === currentCrownId);
    if (current && current.score === leader.score) return currentCrownId;
  }

  return leader.id;
}
