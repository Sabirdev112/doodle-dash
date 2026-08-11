"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import CopyLinkButton from "@/components/CopyLinkButton";
import PlayerList from "@/components/PlayerList";
import WaitingRoom from "@/components/WaitingRoom";
import { sendAction, useGameStore } from "@/lib/store";
import { usePusher } from "@/lib/usePusher";
import { AVATARS, TURN_DURATIONS, type AvatarId } from "@/lib/types";
import { sanitizePlayerName } from "@/lib/sanitize";

type Step = "profile" | "settings" | "lobby";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const disbanded = searchParams.get("disbanded");

  const {
    player,
    initPlayer,
    applySnapshot,
    setRoomId,
    setHostRoom,
    setHostLobbyReady,
    hostRoomId,
    hostLobbyReady,
    players,
    phase,
    settings,
  } = useGameStore();

  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState(player?.name ?? "");
  const [avatar, setAvatar] = useState<AvatarId>(
    (player?.avatar as AvatarId) ?? "cat"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const [rounds, setRounds] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [wordChoiceCount, setWordChoiceCount] = useState<3 | 4 | 5>(3);
  const [turnDuration, setTurnDuration] =
    useState<(typeof TURN_DURATIONS)[number]>(90);
  const [customWords, setCustomWords] = useState("");

  const activeRoomId = hostRoomId ?? roomParam;
  const roomReady = Boolean(activeRoomId && hostLobbyReady);
  const canCopyLink = Boolean(activeRoomId);

  const getInviteUrl = () => {
    if (!activeRoomId) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${activeRoomId}`;
    }
    return `/room/${activeRoomId}`;
  };

  const inviteUrl = canCopyLink ? getInviteUrl() : "";

  usePusher(roomReady && activeRoomId ? activeRoomId : "", player?.id ?? "");

  useEffect(() => {
    if (disbanded) setError("That room was disbanded. Start a fresh one below.");
  }, [disbanded]);

  useEffect(() => {
    if (phase !== "waiting" && roomReady && activeRoomId) {
      router.push(`/room/${activeRoomId}`);
    }
  }, [phase, roomReady, activeRoomId, router]);

  const validateProfile = () => {
    const sanitized = sanitizePlayerName(name);
    if (sanitized.length < 1) {
      setError("Pick a name — even a silly one works (1–20 chars).");
      return null;
    }
    if (!AVATARS.includes(avatar)) {
      setError("Choose an avatar!");
      return null;
    }
    initPlayer(sanitized, avatar);
    setError("");
    return sanitized;
  };

  const joinRoom = useCallback(
    async (roomId: string, asGuest = false) => {
      if (!player && !validateProfile()) return;
      const p = player ?? useGameStore.getState().player;
      if (!p) return;

      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            playerId: p.id,
            name: p.name,
            avatar: p.avatar,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not join that room");
          return;
        }

        setHostRoom(roomId);
        setRoomId(roomId);
        setHostLobbyReady(true);
        applySnapshot({
          settings: data.settings,
          phase: data.phase,
          players: data.players ?? [],
        });

        if (asGuest) {
          setStep("lobby");
        } else {
          setStep("settings");
        }

        window.history.replaceState(null, "", `/?room=${roomId}`);
      } catch {
        setError("Network hiccup — try again?");
      } finally {
        setLoading(false);
      }
    },
    [player, applySnapshot, setHostRoom, setRoomId, setHostLobbyReady, name, avatar, initPlayer]
  );

  useEffect(() => {
    if (hostRoomId && hostLobbyReady) {
      setStep("settings");
    }
  }, [hostRoomId, hostLobbyReady]);

  useEffect(() => {
    if (!player || !roomParam || hostLobbyReady) return;
    void joinRoom(roomParam, true);
  }, [player, roomParam, hostLobbyReady, joinRoom]);

  const goToNextStep = () => {
    if (!validateProfile()) return;
    if (roomParam) {
      void joinRoom(roomParam, true);
    } else {
      setStep("settings");
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    let p = player;
    if (!p) {
      if (!validateProfile()) return;
      p = useGameStore.getState().player;
    }
    if (!p) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          rounds,
          maxPlayers,
          wordChoiceCount,
          turnDuration,
          customWords: customWords || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create room");
        return;
      }

      setHostRoom(data.roomId);
      setHostLobbyReady(true);
      setStep("settings");
      void joinRoom(data.roomId, false);
    } catch {
      setError("Network hiccup — try again?");
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!activeRoomId || !player) return;
    setStarting(true);
    await sendAction({
      type: "start_game",
      roomId: activeRoomId,
      playerId: player.id,
    });
    setStarting(false);
  };

  const me = players.find((p) => p.id === player?.id);
  const isOwner = me?.isOwner ?? false;

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
            Like scribbling on a napkin — but your friends can see it.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border-2 border-doodle-coral bg-doodle-coral/10 px-4 py-3 text-sm text-doodle-coral">
            {error}
          </div>
        )}

        {step === "profile" && (
          <div className="doodle-card wobble-right space-y-5 p-6">
            <div>
              <h2 className="font-sketch text-2xl">Who are you?</h2>
              <p className="text-sm text-doodle-muted">
                Name + face. No account, no fuss.
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
                onKeyDown={(e) => e.key === "Enter" && goToNextStep()}
              />
            </div>

            <div>
              <p className="doodle-label">Pick a mug</p>
              <AvatarPicker selected={avatar} onSelect={setAvatar} />
            </div>

            <button
              type="button"
              onClick={goToNextStep}
              disabled={loading}
              className="doodle-btn-primary w-full"
            >
              {loading
                ? "One sec..."
                : roomParam
                  ? "Join the lobby →"
                  : "Next — set up a room →"}
            </button>

            {!roomParam && (
              <p className="text-center text-xs text-doodle-muted">
                Got an invite? Open that link and come back here.
              </p>
            )}
          </div>
        )}

        {step === "settings" && (
          <div className="space-y-5">
            <div className="doodle-card space-y-5 p-6">
              <form onSubmit={createRoom} className="space-y-5">
                <div>
                  <h2 className="font-sketch text-2xl">Room rules</h2>
                  <p className="text-sm text-doodle-muted">
                    {canCopyLink
                      ? "Share your link below — the game won't start until you click Start."
                      : "Set the rules, create the room, then copy the invite link."}
                  </p>
                </div>

                <fieldset
                  disabled={canCopyLink}
                  className="space-y-5 disabled:opacity-70"
                >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="doodle-label text-base">Rounds</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="doodle-input"
                    />
                  </label>
                  <label>
                    <span className="doodle-label text-base">Max players</span>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="doodle-input"
                    />
                  </label>
                </div>

                <label>
                  <span className="doodle-label text-base">Words to pick from</span>
                  <select
                    value={wordChoiceCount}
                    onChange={(e) =>
                      setWordChoiceCount(Number(e.target.value) as 3 | 4 | 5)
                    }
                    className="doodle-input"
                  >
                    <option value={3}>3 words</option>
                    <option value={4}>4 words</option>
                    <option value={5}>5 words</option>
                  </select>
                </label>

                <label>
                  <span className="doodle-label text-base">Seconds per turn</span>
                  <select
                    value={turnDuration}
                    onChange={(e) =>
                      setTurnDuration(
                        Number(e.target.value) as (typeof TURN_DURATIONS)[number]
                      )
                    }
                    className="doodle-input"
                  >
                    {TURN_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="doodle-label text-base">
                    Custom words{" "}
                    <span className="text-sm font-normal text-doodle-muted">
                      (optional)
                    </span>
                  </span>
                  <textarea
                    value={customWords}
                    onChange={(e) => setCustomWords(e.target.value)}
                    rows={3}
                    placeholder={"pizza\ndragon\nwiggle"}
                    className="doodle-input resize-none"
                  />
                </label>
                </fieldset>

                {!canCopyLink ? (
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep("profile")}
                      className="doodle-btn-secondary flex-1"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="doodle-btn-primary flex-1"
                    >
                      {loading ? "Creating..." : "Create room"}
                    </button>
                  </div>
                ) : null}
              </form>

              {/* Outside form so nothing blocks clicks */}
              <div className="rounded-lg border-2 border-dashed border-doodle-ink/25 bg-paper-dark p-4">
                <p className="font-sketch text-lg text-doodle-ink">
                  Room invite link
                </p>
                <div className="relative z-10 mt-3 space-y-2">
                  <CopyLinkButton
                    url={inviteUrl}
                    label="Copy invite link"
                    disabled={!canCopyLink}
                    disabledHint='Click "Create room" first to unlock your link'
                  />
                  {canCopyLink && inviteUrl && (
                    <p className="break-all text-center text-xs text-doodle-muted">
                      {inviteUrl}
                    </p>
                  )}
                </div>
              </div>

              {canCopyLink ? (
                <div className="space-y-3 border-t-2 border-dashed border-doodle-ink/20 pt-4">
                  <PlayerList players={players} />
                  <p className="text-center text-sm text-doodle-muted">
                    {players.length}/{settings?.maxPlayers ?? maxPlayers} in lobby
                  </p>
                  <p className="text-center font-sketch text-lg text-doodle-muted">
                    Ready? Start when everyone&apos;s here ↓
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
                    <p className="text-center text-sm text-doodle-coral">
                      Need 2+ players — copy the link above and send it to a friend
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === "lobby" && activeRoomId && player && (
          <WaitingRoom
            roomId={activeRoomId}
            playerId={player.id}
            players={players}
            isOwner={isOwner}
            maxPlayers={settings?.maxPlayers ?? 8}
          />
        )}
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
