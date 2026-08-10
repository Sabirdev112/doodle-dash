"use client";

import { useState } from "react";
import type { PublicPlayer } from "@/lib/types";
import PlayerList from "./PlayerList";
import { sendAction } from "@/lib/store";

interface WaitingRoomProps {
  roomId: string;
  playerId: string;
  players: PublicPlayer[];
  isOwner: boolean;
  maxPlayers: number;
}

export default function WaitingRoom({
  roomId,
  playerId,
  players,
  isOwner,
  maxPlayers,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?room=${roomId}`
      : `/room/${roomId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = async () => {
    setStarting(true);
    await sendAction({ type: "start_game", roomId, playerId });
    setStarting(false);
  };

  const disbandRoom = async () => {
    await sendAction({ type: "disband_room", roomId, playerId });
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Waiting Room</h2>
        <p className="mt-1 text-slate-400">
          {players.length}/{maxPlayers} players · Room {roomId}
        </p>
      </div>

      <PlayerList players={players} />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {copied ? "Link copied!" : "Copy invite link"}
        </button>

        {isOwner ? (
          <>
            <button
              type="button"
              onClick={startGame}
              disabled={players.length < 2 || starting}
              className="rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? "Starting..." : "Start Game"}
            </button>
            <button
              type="button"
              onClick={disbandRoom}
              className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Disband Room
            </button>
            {players.length < 2 && (
              <p className="text-center text-sm text-amber-400">
                Need at least 2 players to start
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-slate-400">
            Waiting for the owner to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
