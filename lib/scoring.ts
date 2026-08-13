import {
  FIRST_GUESS_POINTS,
  FIRST_PLACE_HALF_TIME_REDUCTION,
} from "@/lib/types";

/**
 * First place at t=0 is 300. At 50% elapsed that is 30% less (210).
 * Reduction is linear: 300 * (1 - 0.6 * elapsedRatio).
 * 2nd gets half of the current first-place value; 3rd half of 2nd.
 */
export function getGuesserPoints(place: number, elapsedRatio = 0): number {
  const clamped = Math.min(1, Math.max(0, elapsedRatio));
  const reductionPerFullTurn = FIRST_PLACE_HALF_TIME_REDUCTION / 0.5;
  const first = Math.max(
    10,
    Math.round(FIRST_GUESS_POINTS * (1 - reductionPerFullTurn * clamped))
  );
  let points = first;
  for (let i = 1; i < place; i++) {
    points = Math.floor(points / 2);
  }
  return Math.max(5, points);
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
