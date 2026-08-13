"use client";

import type { PublicPlayer } from "@/lib/types";
import AvatarDisplay from "@/components/AvatarDisplay";

interface ScoreboardProps {
  players: PublicPlayer[];
}

export default function Scoreboard({ players }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2">
      <h3 className="font-sketch text-lg text-doodle-ink">Scores</h3>
      <div className="space-y-2">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={`rounded-lg px-2 py-2 text-sm ${
              player.isDrawer
                ? "bg-doodle-sky/35 ring-2 ring-doodle-sky"
                : "bg-white/60"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="w-4 shrink-0 pt-1 text-center font-sketch text-doodle-muted">
                {index + 1}
              </span>
              <AvatarDisplay
                avatar={player.avatar}
                className="h-8 w-8 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium leading-tight">
                  {player.hasCrown ? "👑 " : ""}
                  {player.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold text-doodle-grape">
                    {player.score} pts
                  </span>
                  {player.isDrawer && (
                    <span className="rounded bg-doodle-sky px-1 py-0.5 font-sketch text-[10px] uppercase leading-none text-doodle-ink">
                      drawing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
