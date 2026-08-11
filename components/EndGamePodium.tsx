"use client";

import type { PublicPlayer } from "@/lib/types";
import AvatarDisplay from "@/components/AvatarDisplay";

interface EndGamePodiumProps {
  standings: PublicPlayer[];
}

export default function EndGamePodium({ standings }: EndGamePodiumProps) {
  const top3 = standings.slice(0, 3);
  const rest = standings.slice(3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="doodle-card mx-auto max-w-lg space-y-6 p-8 text-center">
      <h2 className="font-sketch text-4xl text-doodle-ink">That&apos;s a wrap!</h2>

      <div className="flex items-end justify-center gap-4 py-4">
        {[1, 0, 2].map((idx) => {
          const player = top3[idx];
          if (!player) return null;
          const heights = ["h-24", "h-32", "h-20"];
          return (
            <div key={player.id} className="flex flex-col items-center">
              <span className="text-3xl">{medals[idx]}</span>
              <AvatarDisplay
                avatar={player.avatar}
                className="my-2 h-14 w-14 rounded-lg"
              />
              <p className="font-sketch text-lg">{player.name}</p>
              <p className="text-sm font-bold text-doodle-grape">{player.score} pts</p>
              <div
                className={`mt-2 w-20 rounded-t-lg border-2 border-b-0 border-doodle-ink bg-doodle-yellow/60 ${heights[idx]}`}
              />
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="border-t-2 border-dashed border-doodle-ink/20 pt-4 text-left">
          <p className="mb-2 font-sketch text-doodle-muted">Also played</p>
          {rest.map((p, i) => (
            <div key={p.id} className="flex justify-between py-1 text-sm">
              <span>
                {i + 4}. {p.name}
              </span>
              <span className="text-doodle-muted">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <a href="/" className="doodle-btn-primary inline-flex">
        Play again
      </a>
    </div>
  );
}
