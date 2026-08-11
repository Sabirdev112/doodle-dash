"use client";

import { useState } from "react";
import type { PublicPlayer } from "@/lib/types";
import PlayerList from "./PlayerList";
import CopyLinkButton from "./CopyLinkButton";
import ButtonSpinner from "./ButtonSpinner";
import ConfirmDialog from "./ConfirmDialog";
import { leaveSession, sendAction, useGameStore } from "@/lib/store";
import type { RoomSnapshot } from "@/lib/types";

interface WaitingRoomProps {
  roomId: string;
  playerId: string;
  players: PublicPlayer[];
  isOwner: boolean;
  maxPlayers: number;
  onLeave?: () => void;
}

type BusyAction = "start" | "leave" | "disband" | null;
type ConfirmKind = "disband" | "leave" | null;

export default function WaitingRoom({
  roomId,
  playerId,
  players,
  isOwner,
  maxPlayers,
  onLeave,
}: WaitingRoomProps) {
  const [busy, setBusy] = useState<BusyAction>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [error, setError] = useState("");
  const applyRoomSnapshot = useGameStore((s) => s.applyRoomSnapshot);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?room=${roomId}`
      : `/?room=${roomId}`;

  const startGame = async () => {
    if (players.length < 2) {
      setError("Need at least 2 players — copy the link and invite a friend!");
      return;
    }
    setBusy("start");
    setError("");
    const res = await sendAction({ type: "start_game", roomId, playerId });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError("Could not start — make sure everyone is still in the lobby.");
      setBusy(null);
      return;
    }
    if (data.snapshot) {
      applyRoomSnapshot(data.snapshot as RoomSnapshot);
    }
    setBusy(null);
  };

  const disbandRoom = async () => {
    setBusy("disband");
    await sendAction({ type: "disband_room", roomId, playerId });
    useGameStore.getState().clearSession();
    window.location.href = "/?disbanded=1";
  };

  const leaveRoom = async () => {
    setBusy("leave");
    await leaveSession();
    if (onLeave) {
      onLeave();
    } else {
      window.location.href = "/";
    }
  };

  const isBusy = busy !== null;

  return (
    <>
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

        {error && (
          <div className="rounded-lg border-2 border-doodle-coral bg-doodle-coral/10 px-4 py-3 text-sm text-doodle-coral">
            {error}
          </div>
        )}

        <div className="doodle-card space-y-4 p-5">
          <div>
            <h3 className="font-sketch text-xl text-doodle-ink">Invite friends</h3>
            <p className="mt-1 text-sm text-doodle-muted">
              Share the link below. The host starts the game when ready.
            </p>
          </div>
          <CopyLinkButton url={inviteUrl} disabled={isBusy} />
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
              {players.length < 2 && (
                <p className="mb-3 text-center text-sm text-doodle-muted">
                  Invite at least one friend — you need 2 players to start.
                </p>
              )}
              <button
                type="button"
                onClick={() => void startGame()}
                disabled={isBusy}
                className="doodle-btn-coral w-full"
              >
                {busy === "start" ? (
                  <>
                    <ButtonSpinner />
                    Starting…
                  </>
                ) : (
                  "Start game"
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmKind("disband")}
              disabled={isBusy}
              className="doodle-btn-secondary w-full"
            >
              {busy === "disband" ? (
                <>
                  <ButtonSpinner />
                  Closing room…
                </>
              ) : (
                "Exit room"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="doodle-card p-4 text-center">
              <p className="font-sketch text-lg text-doodle-muted">
                Hang tight — waiting for the host to start…
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmKind("leave")}
              disabled={isBusy}
              className="doodle-btn-secondary w-full"
            >
              {busy === "leave" ? (
                <>
                  <ButtonSpinner />
                  Leaving…
                </>
              ) : (
                "Exit room"
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmKind === "disband"}
        title="Disband room?"
        message="The invite link will stop working and everyone will be sent back home."
        confirmLabel="Disband"
        variant="danger"
        busy={busy === "disband"}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void disbandRoom()}
      />

      <ConfirmDialog
        open={confirmKind === "leave"}
        title="Leave room?"
        message="You'll need to pick a new name and avatar to play again."
        confirmLabel="Leave"
        variant="danger"
        busy={busy === "leave"}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void leaveRoom()}
      />
    </>
  );
}
