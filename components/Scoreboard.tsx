"use client";

import type { PublicPlayer } from "@/lib/types";

interface ScoreboardProps {
  players: PublicPlayer[];
}

export default function Scoreboard({ players }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Scoreboard
      </h3>
      <div className="space-y-1">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
          >
            <span className="w-5 text-center text-slate-500">{index + 1}</span>
            <img
              src={`/avatars/${player.avatar}.svg`}
              alt=""
              className="relative h-7 w-7 rounded-md bg-slate-700"
            />
            {player.hasCrown && <span className="text-xs">👑</span>}
            <span className="flex-1 truncate">{player.name}</span>
            <span className="font-semibold text-brand-300">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
