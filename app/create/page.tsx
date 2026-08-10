"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { TURN_DURATIONS } from "@/lib/types";

export default function CreateRoomPage() {
  const router = useRouter();
  const { player } = useGameStore();
  const [rounds, setRounds] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [wordChoiceCount, setWordChoiceCount] = useState<3 | 4 | 5>(3);
  const [turnDuration, setTurnDuration] = useState<(typeof TURN_DURATIONS)[number]>(90);
  const [customWords, setCustomWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!player) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          name: player.name,
          avatar: player.avatar,
          rounds,
          maxPlayers,
          wordChoiceCount,
          turnDuration,
          customWords: customWords || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create room");
        return;
      }

      useGameStore.getState().setRoomId(data.roomId);
      router.push(`/room/${data.roomId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form
        onSubmit={createRoom}
        className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Create Room</h1>
          <p className="text-sm text-slate-400">
            Playing as {player.name}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-slate-300">Rounds</span>
            <input
              type="number"
              min={1}
              max={10}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Max players</span>
            <input
              type="number"
              min={2}
              max={12}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-slate-300">Word choices per turn</span>
          <select
            value={wordChoiceCount}
            onChange={(e) =>
              setWordChoiceCount(Number(e.target.value) as 3 | 4 | 5)
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          >
            <option value={3}>3 words</option>
            <option value={4}>4 words</option>
            <option value={5}>5 words</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Turn duration</span>
          <select
            value={turnDuration}
            onChange={(e) =>
              setTurnDuration(Number(e.target.value) as (typeof TURN_DURATIONS)[number])
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          >
            {TURN_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} seconds
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">
            Custom word list (optional, one per line)
          </span>
          <textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            rows={4}
            placeholder="apple&#10;banana&#10;rocket"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-slate-300 hover:bg-slate-800"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Join"}
          </button>
        </div>
      </form>
    </main>
  );
}
