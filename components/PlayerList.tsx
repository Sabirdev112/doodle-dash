"use client";

import type { PublicPlayer } from "@/lib/types";

interface PlayerListProps {
  players: PublicPlayer[];
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Players
      </h3>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2"
          >
            <div className="relative">
              <img
                src={`/avatars/${player.avatar}.svg`}
                alt=""
                className="h-9 w-9 rounded-lg bg-slate-700"
              />
              {player.hasCrown && (
                <span className="absolute -right-1 -top-1 text-sm" title="Leader">
                  👑
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">
                {player.name}
                {player.isOwner && (
                  <span className="ml-2 rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                    Owner
                  </span>
                )}
                {player.isDrawer && (
                  <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300">
                    Drawing
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">{player.score} pts</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
