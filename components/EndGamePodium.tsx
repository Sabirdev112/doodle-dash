"use client";

import type { PublicPlayer } from "@/lib/types";

interface EndGamePodiumProps {
  standings: PublicPlayer[];
}

export default function EndGamePodium({ standings }: EndGamePodiumProps) {
  const top3 = standings.slice(0, 3);
  const rest = standings.slice(3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center">
      <h2 className="text-3xl font-bold text-white">Game Over!</h2>

      <div className="flex items-end justify-center gap-4 py-4">
        {[1, 0, 2].map((idx) => {
          const player = top3[idx];
          if (!player) return null;
          const heights = ["h-28", "h-36", "h-24"];
          return (
            <div key={player.id} className="flex flex-col items-center">
              <span className="text-3xl">{medals[idx]}</span>
              <img
                src={`/avatars/${player.avatar}.svg`}
                alt=""
                className="my-2 h-14 w-14 rounded-xl bg-slate-700"
              />
              <p className="font-semibold text-white">{player.name}</p>
              <p className="text-sm text-brand-300">{player.score} pts</p>
              <div
                className={`mt-2 w-20 rounded-t-lg bg-brand-500/30 ${heights[idx]}`}
              />
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="border-t border-slate-800 pt-4 text-left">
          <p className="mb-2 text-sm text-slate-400">Other players</p>
          {rest.map((p, i) => (
            <div key={p.id} className="flex justify-between py-1 text-sm">
              <span>
                {i + 4}. {p.name}
              </span>
              <span className="text-slate-400">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <a
        href="/"
        className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600"
      >
        Play Again
      </a>
    </div>
  );
}
