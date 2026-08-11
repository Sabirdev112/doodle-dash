"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiCreateRoom, useGameStore } from "@/lib/store";
import ButtonSpinner from "@/components/ButtonSpinner";
import { DEFAULT_ROOM_CREATE_OPTIONS, TURN_DURATIONS, type WordMode } from "@/lib/types";

export default function CreateRoomPage() {
  const router = useRouter();
  const { player, applySnapshot, setJoinedRoom } = useGameStore();

  const [rounds, setRounds] = useState(DEFAULT_ROOM_CREATE_OPTIONS.rounds);
  const [maxPlayers, setMaxPlayers] = useState(DEFAULT_ROOM_CREATE_OPTIONS.maxPlayers);
  const [wordChoiceCount, setWordChoiceCount] = useState<3 | 4 | 5>(
    DEFAULT_ROOM_CREATE_OPTIONS.wordChoiceCount
  );
  const [turnDuration, setTurnDuration] = useState<(typeof TURN_DURATIONS)[number]>(
    DEFAULT_ROOM_CREATE_OPTIONS.turnDuration
  );
  const [customWords, setCustomWords] = useState("");
  const [hintsEnabled, setHintsEnabled] = useState(DEFAULT_ROOM_CREATE_OPTIONS.hintsEnabled);
  const [wordMode, setWordMode] = useState<WordMode>(DEFAULT_ROOM_CREATE_OPTIONS.wordMode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="doodle-card max-w-md space-y-4 p-8 text-center">
          <p className="text-doodle-muted">Set your name and avatar first.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="doodle-btn-primary"
          >
            Go to home
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await apiCreateRoom(player, {
      rounds,
      maxPlayers,
      wordChoiceCount,
      turnDuration,
      customWords: customWords || undefined,
      hintsEnabled,
      wordMode,
    });

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

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <h1 className="font-sketch text-4xl text-doodle-ink">Room rules</h1>
          <p className="mt-2 text-doodle-muted">
            You&apos;re the host — set the rules, then invite friends.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border-2 border-doodle-coral bg-doodle-coral/10 px-4 py-3 text-sm text-doodle-coral">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="doodle-card space-y-5 p-6">
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
            <span className="doodle-label text-base">Word mode</span>
            <select
              value={wordMode}
              onChange={(e) => setWordMode(e.target.value as WordMode)}
              className="doodle-input"
            >
              <option value="normal">Normal — show word length</option>
              <option value="hidden">Hidden — length after drawing starts</option>
            </select>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={hintsEnabled}
              onChange={(e) => setHintsEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-2 border-doodle-ink"
            />
            <span className="doodle-label mb-0 text-base">Enable letter hints</span>
          </label>

          <label>
            <span className="doodle-label text-base">
              Custom words{" "}
              <span className="text-sm font-normal text-doodle-muted">
                (optional — one per line)
              </span>
            </span>
            <textarea
              value={customWords}
              onChange={(e) => setCustomWords(e.target.value)}
              rows={4}
              placeholder={"pizza\ndragon\nwiggle"}
              className="doodle-input resize-none"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="doodle-btn-secondary flex-1"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="doodle-btn-primary flex-1"
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  Creating…
                </>
              ) : (
                "Create & enter lobby"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
