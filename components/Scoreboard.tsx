"use client";

import type { PublicPlayer } from "@/lib/types";

interface ScoreboardProps {
  players: PublicPlayer[];
}

export default function Scoreboard({ players }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2">
      <h3 className="font-sketch text-lg text-doodle-ink">Scores</h3>
      <div className="space-y-1">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm"
          >
            <span className="w-5 text-center font-sketch text-doodle-muted">
              {index + 1}
            </span>
            <img
              src={`/avatars/${player.avatar}.svg`}
              alt=""
              className="h-7 w-7 rounded-md border border-doodle-ink/15 bg-paper-dark"
            />
            {player.hasCrown && <span className="text-xs">👑</span>}
            <span className="flex-1 truncate font-medium">{player.name}</span>
            <span className="font-bold text-doodle-grape">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
