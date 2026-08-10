const FIRST_GUESS_POINTS = 300;

export function getGuesserPoints(place: number): number {
  if (place === 1) return FIRST_GUESS_POINTS;
  if (place === 2) return Math.floor(FIRST_GUESS_POINTS / 2);
  if (place === 3) return Math.floor(FIRST_GUESS_POINTS / 4);
  return 35;
}

export function getDrawerPoints(correctCount: number): number {
  if (correctCount === 0) return 0;
  return Math.min(correctCount * 50, 200);
}

export interface TurnScoreResult {
  playerId: string;
  pointsEarned: number;
}

export function calculateTurnScores(
  drawerId: string,
  correctGuessers: string[]
): TurnScoreResult[] {
  if (correctGuessers.length === 0) {
    return [{ playerId: drawerId, pointsEarned: 0 }];
  }

  const results: TurnScoreResult[] = [];
  correctGuessers.forEach((playerId, index) => {
    results.push({
      playerId,
      pointsEarned: getGuesserPoints(index + 1),
    });
  });

  results.push({
    playerId: drawerId,
    pointsEarned: getDrawerPoints(correctGuessers.length),
  });

  return results;
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
