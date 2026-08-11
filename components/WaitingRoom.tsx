"use client";

import { useState } from "react";
import type { PublicPlayer } from "@/lib/types";
import PlayerList from "./PlayerList";
import CopyLinkButton from "./CopyLinkButton";
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
  const [starting, setStarting] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : `/room/${roomId}`;

  const startGame = async () => {
    setStarting(true);
    await sendAction({ type: "start_game", roomId, playerId });
    setStarting(false);
  };

  const disbandRoom = async () => {
    if (!confirm("Disband this room? The invite link will stop working.")) return;
    await sendAction({ type: "disband_room", roomId, playerId });
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="doodle-card wobble-left p-6 text-center">
        <p className="font-sketch text-sm uppercase tracking-wide text-doodle-muted">
          Room lobby
        </p>
        <h2 className="mt-1 font-sketch text-4xl text-doodle-ink">Almost ready!</h2>
        <p className="mt-2 text-sm text-doodle-muted">
          {players.length}/{maxPlayers} players · code{" "}
          <span className="rounded bg-paper-dark px-2 py-0.5 font-mono font-bold text-doodle-ink">
            {roomId}
          </span>
        </p>
      </div>

      <div className="doodle-card space-y-4 p-5">
        <div>
          <h3 className="font-sketch text-xl text-doodle-ink">Invite friends first</h3>
          <p className="mt-1 text-sm text-doodle-muted">
            Share the link below. Nothing starts until someone hits{" "}
            <strong>Start game</strong>.
          </p>
        </div>
        <CopyLinkButton url={inviteUrl} />
        <p className="break-all rounded-lg border border-dashed border-doodle-ink/30 bg-paper-dark px-3 py-2 text-center text-xs text-doodle-muted">
          {inviteUrl}
        </p>
      </div>

      <div className="doodle-card p-5">
        <PlayerList players={players} />
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div className="border-t-2 border-dashed border-doodle-ink/20 pt-4">
            <p className="mb-3 text-center font-sketch text-lg text-doodle-muted">
              Everyone here? Start when you&apos;re ready ↓
            </p>
            <button
              type="button"
              onClick={startGame}
              disabled={players.length < 2 || starting}
              className="doodle-btn-coral w-full"
            >
              {starting ? "Starting..." : "Start game"}
            </button>
            {players.length < 2 && (
              <p className="mt-2 text-center text-sm text-doodle-coral">
                Need at least 2 players — send the link to a friend!
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={disbandRoom}
            className="w-full py-2 text-sm text-doodle-muted underline hover:text-doodle-coral"
          >
            Disband room
          </button>
        </div>
      ) : (
        <div className="doodle-card p-4 text-center">
          <p className="font-sketch text-lg text-doodle-muted">
            Hang tight — waiting for the host to start…
          </p>
          <CopyLinkButton
            url={inviteUrl}
            label="Copy link for another friend"
            variant="secondary"
            className="mt-3"
          />
        </div>
      )}
    </div>
  );
}
