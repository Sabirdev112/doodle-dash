"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import { useGameStore } from "@/lib/store";
import { AVATARS, type AvatarId } from "@/lib/types";
import { sanitizePlayerName } from "@/lib/sanitize";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const disbanded = searchParams.get("disbanded");

  const { player, initPlayer } = useGameStore();
  const [name, setName] = useState(player?.name ?? "");
  const [avatar, setAvatar] = useState<AvatarId>(
    (player?.avatar as AvatarId) ?? "cat"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (disbanded) setError("This room was disbanded.");
  }, [disbanded]);

  const proceed = (destination: "create" | "join") => {
    const sanitized = sanitizePlayerName(name);
    if (sanitized.length < 1) {
      setError("Please enter a display name (1–20 characters).");
      return;
    }
    if (!AVATARS.includes(avatar)) {
      setError("Please select an avatar.");
      return;
    }
    initPlayer(sanitized, avatar);
    if (destination === "create") {
      router.push("/create");
    } else if (roomParam) {
      router.push(`/room/${roomParam}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-5xl font-black text-transparent">
            Doodle Dash
          </h1>
          <p className="mt-2 text-slate-400">
            Draw, guess, and score points with friends in real time.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Pick an avatar
            </label>
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {roomParam ? (
              <button
                type="button"
                onClick={() => proceed("join")}
                className="rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
              >
                Join Room
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => proceed("create")}
                  className="rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
                >
                  Create Room
                </button>
                <p className="text-center text-xs text-slate-500">
                  Have an invite link? Open it to join directly.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LandingContent />
    </Suspense>
  );
}
