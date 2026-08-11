"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import ButtonSpinner from "@/components/ButtonSpinner";
import { apiCreateRoom, apiJoinRoom, leaveSession, tryReconnectRoom, useGameStore } from "@/lib/store";
import {
  DEFAULT_CHARACTER,
  isValidAvatar,
} from "@/lib/avatars";
import { DEFAULT_ROOM_CREATE_OPTIONS, type RoomSnapshot } from "@/lib/types";
import { sanitizePlayerName } from "@/lib/sanitize";
import { checkRoomExists, isExpiredRoomError } from "@/lib/roomInvite";
import { loadPersistedSession } from "@/lib/persistedSession";

const freshAvatar = () => DEFAULT_CHARACTER;

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteRoomId = searchParams.get("room");
  const disbanded = searchParams.get("disbanded");
  const expired = searchParams.get("expired");
  const { initPlayer, applySnapshot, applyRoomSnapshot, setJoinedRoom, resetRoom } =
    useGameStore();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(freshAvatar);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setReady(false);

      if (inviteRoomId && !disbanded && !expired) {
        const exists = await checkRoomExists(inviteRoomId);
        if (cancelled) return;
        if (!exists) {
          router.replace("/?expired=1");
          return;
        }

        const reconnect = await tryReconnectRoom(inviteRoomId);
        if (cancelled) return;
        if (reconnect.ok) {
          if (reconnect.data.snapshot) {
            applyRoomSnapshot(reconnect.data.snapshot as RoomSnapshot);
          } else {
            applySnapshot({
              settings: reconnect.data.settings as never,
              phase: reconnect.data.phase as never,
              players: (reconnect.data.players as never) ?? [],
            });
          }
          router.replace(`/room/${inviteRoomId}`);
          return;
        }

        const stored = loadPersistedSession();
        if (stored?.joinedRoomId === inviteRoomId) {
          setName(stored.name);
          setAvatar(stored.avatar);
        }
        setReady(true);
        return;
      }

      const { joinedRoomId } = useGameStore.getState();
      if (joinedRoomId) {
        await leaveSession();
      } else {
        useGameStore.getState().clearSession();
      }
      if (cancelled) return;
      setName("");
      setAvatar(freshAvatar());
      setError(
        disbanded
          ? "That room was disbanded. Pick a new name and avatar below."
          : expired
            ? "That room expired or no longer exists. Pick a new name and avatar below."
            : ""
      );

      setReady(true);
    };

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [disbanded, expired, inviteRoomId, router, applyRoomSnapshot, applySnapshot]);

  const saveProfile = (): boolean => {
    const sanitized = sanitizePlayerName(name);
    if (sanitized.length < 1) {
      setError("Pick a name (1–20 characters).");
      return false;
    }
    if (!isValidAvatar(avatar)) {
      setError("Choose an avatar!");
      return false;
    }

    const stored =
      inviteRoomId && loadPersistedSession()?.joinedRoomId === inviteRoomId
        ? loadPersistedSession()
        : null;
    if (stored && stored.name.trim().toLowerCase() === sanitized.toLowerCase()) {
      useGameStore.setState({
        player: {
          id: stored.id,
          name: sanitized,
          avatar,
        },
      });
    } else {
      initPlayer(sanitized, avatar);
    }
    setError("");
    return true;
  };

  const handleCustomize = () => {
    if (!saveProfile()) return;
    router.push("/create");
  };

  const handleCreate = async () => {
    if (!saveProfile()) return;

    setLoading(true);
    setError("");
    resetRoom();

    const p = useGameStore.getState().player;
    if (!p) {
      setLoading(false);
      return;
    }

    const result = await apiCreateRoom(p, DEFAULT_ROOM_CREATE_OPTIONS);

    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const data = result.data;
    applySnapshot({
      settings: data.settings as never,
      phase: data.phase as never,
      players: (data.players as never) ?? [],
    });
    setJoinedRoom(data.roomId as string);
    router.push(`/room/${data.roomId as string}`);
  };

  const handleJoin = async () => {
    if (!inviteRoomId) return;
    if (!saveProfile()) return;

    setLoading(true);
    setError("");

    const p = useGameStore.getState().player;
    if (!p) {
      setLoading(false);
      return;
    }

    const result = await apiJoinRoom(inviteRoomId, p);

    if (!result.ok) {
      setLoading(false);
      if (isExpiredRoomError(result.error)) {
        router.replace("/?expired=1");
        return;
      }
      setError(result.error);
      return;
    }

    if (result.data.snapshot) {
      applyRoomSnapshot(result.data.snapshot as RoomSnapshot);
    } else {
      applySnapshot({
        settings: result.data.settings as never,
        phase: result.data.phase as never,
        players: (result.data.players as never) ?? [],
      });
    }
    setJoinedRoom(inviteRoomId);
    router.push(`/room/${inviteRoomId}`);
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 font-sketch text-xl">
        <ButtonSpinner className="h-6 w-6" />
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <div className="wobble-left inline-block rounded-xl border-2 border-doodle-ink bg-doodle-sky/30 px-4 py-1 font-sketch text-sm shadow-sketch-sm">
            draw · guess · laugh
          </div>
          <h1 className="mt-4 font-sketch text-5xl leading-tight text-doodle-ink sm:text-6xl">
            Doodle Dash
          </h1>
          <p className="mt-2 text-doodle-muted">
            Real-time draw &amp; guess — no login needed.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border-2 border-doodle-coral bg-doodle-coral/10 px-4 py-3 text-sm text-doodle-coral">
            {error}
          </div>
        )}

        <div className="doodle-card wobble-right space-y-5 p-6">
          <div>
            <h2 className="font-sketch text-2xl">Who are you?</h2>
            <p className="text-sm text-doodle-muted">
              {inviteRoomId
                ? "Pick a name and avatar to join. Use the same name if you're rejoining a game in progress."
                : "Pick a name and avatar every time you play — nothing is saved."}
            </p>
          </div>

          <div>
            <label className="doodle-label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="e.g. Captain Scribble"
              className="doodle-input"
              disabled={loading}
            />
          </div>

          <div>
            <p className="doodle-label">Pick your character</p>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>

          {inviteRoomId ? (
            <button
              type="button"
              onClick={() => void handleJoin()}
              disabled={loading}
              className="doodle-btn-primary w-full"
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  Joining…
                </>
              ) : (
                "Join the lobby →"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={loading}
              className="doodle-btn-primary w-full"
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  Creating…
                </>
              ) : (
                "Create a room →"
              )}
            </button>
          )}

          {!inviteRoomId && (
            <p className="text-center text-xs text-doodle-muted">
              <button
                type="button"
                onClick={handleCustomize}
                disabled={loading}
                className="text-doodle-grape underline hover:no-underline disabled:opacity-50"
              >
                Customize room rules
              </button>
              {" · "}
              Got an invite? Open that link first.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-sketch text-xl">
          Loading...
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
