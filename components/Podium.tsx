"use client";

import type { PublicPlayer } from "@/lib/types";
import AvatarDisplay from "@/components/AvatarDisplay";

interface PodiumProps {
  standings: PublicPlayer[];
}

function podiumBarHeight(score: number, rankIndex: number, maxScore: number): number {
  const rankScale = [1, 0.7, 0.48];
  const scale = rankScale[rankIndex] ?? 0.4;
  const byScore = maxScore > 0 ? score / maxScore : 0;
  return Math.max(44, Math.round(byScore * scale * 140));
}

export default function Podium({ standings }: PodiumProps) {
  const top3 = standings.slice(0, 3);
  const rest = standings.slice(3);
  const medals = ["🥇", "🥈", "🥉"];
  const maxScore = Math.max(...top3.map((p) => p.score), 1);

  return (
    <div className="doodle-card mx-auto max-w-lg space-y-6 p-8 text-center">
      <h2 className="font-sketch text-4xl text-doodle-ink">That&apos;s a wrap!</h2>

      <div className="flex items-end justify-center gap-4 py-4">
        {[1, 0, 2].map((idx) => {
          const p = top3[idx];
          if (!p) return null;
          return (
            <div key={p.id} className="flex flex-col items-center">
              <span className="text-3xl">{medals[idx]}</span>
              <AvatarDisplay
                avatar={p.avatar}
                className="my-2 h-14 w-14 rounded-lg"
              />
              <p className="font-sketch text-lg">{p.name}</p>
              <p className="text-sm font-bold text-doodle-grape">{p.score} pts</p>
              <div
                className="mt-2 w-20 rounded-t-lg border-2 border-b-0 border-doodle-ink bg-doodle-yellow/60"
                style={{ height: `${podiumBarHeight(p.score, idx, maxScore)}px` }}
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
