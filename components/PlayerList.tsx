"use client";

import type { PublicPlayer } from "@/lib/types";
import AvatarDisplay from "@/components/AvatarDisplay";

interface PlayerListProps {
  players: PublicPlayer[];
  /** Show turn order numbers (join order = rotation order). */
  showTurnOrder?: boolean;
}

export default function PlayerList({ players, showTurnOrder = false }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-sketch text-lg text-doodle-ink">
        {showTurnOrder ? "Turn order" : "Who's here"}
      </h3>
      <ul className="space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 transition ${
              player.isDrawer
                ? "border-doodle-sky bg-doodle-sky/25 shadow-sketch-sm ring-2 ring-doodle-sky/50"
                : "border-doodle-ink/15 bg-white"
            }`}
          >
            {showTurnOrder && (
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-sketch text-sm ${
                  player.isDrawer
                    ? "border-doodle-sky bg-white text-doodle-ink"
                    : "border-doodle-ink/30 bg-paper-dark text-doodle-muted"
                }`}
              >
                {index + 1}
              </span>
            )}
            <div className="relative">
              <AvatarDisplay
                avatar={player.avatar}
                className="h-10 w-10 rounded-md"
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
                    Owner
                  </span>
                )}
                {player.isDrawer && (
                  <span className="ml-2 rounded-md border border-doodle-yellow bg-doodle-yellow/80 px-1.5 py-0.5 font-sketch text-xs font-normal text-doodle-ink">
                    drawing now
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
