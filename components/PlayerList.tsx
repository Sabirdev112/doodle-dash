"use client";

import type { PublicPlayer } from "@/lib/types";

interface PlayerListProps {
  players: PublicPlayer[];
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-sketch text-lg text-doodle-ink">Who&apos;s here</h3>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-lg border-2 border-doodle-ink/15 bg-white px-3 py-2"
          >
            <div className="relative">
              <img
                src={`/avatars/${player.avatar}.svg`}
                alt=""
                className="h-9 w-9 rounded-md border border-doodle-ink/20 bg-paper-dark"
              />
              {player.hasCrown && (
                <span className="absolute -right-1 -top-1 text-sm" title="Leader">
                  👑
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-doodle-ink">
                {player.name}
                {player.isOwner && (
                  <span className="ml-2 rounded-md border border-doodle-grape/40 bg-doodle-grape/15 px-1.5 py-0.5 font-sketch text-xs font-normal text-doodle-grape">
                    host
                  </span>
                )}
                {player.isDrawer && (
                  <span className="ml-2 rounded-md border border-doodle-sky/40 bg-doodle-sky/20 px-1.5 py-0.5 font-sketch text-xs font-normal text-doodle-ink">
                    drawing
                  </span>
                )}
              </p>
              <p className="text-xs text-doodle-muted">{player.score} pts</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
