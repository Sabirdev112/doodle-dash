"use client";

import { sendAction } from "@/lib/store";

interface WordSelectProps {
  roomId: string;
  playerId: string;
  choices: string[];
  deadline: number | null;
  isDrawer: boolean;
  drawerName: string;
}

export default function WordSelect({
  roomId,
  playerId,
  choices,
  deadline,
  isDrawer,
  drawerName,
}: WordSelectProps) {
  const pick = async (word: string) => {
    await sendAction({ type: "pick_word", roomId, playerId, word });
  };

  if (!isDrawer) {
    return (
      <div className="doodle-card mx-auto max-w-md p-8 text-center">
        <p className="font-sketch text-2xl text-doodle-ink">
          {drawerName} is picking a word…
        </p>
        <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-doodle-ink border-t-transparent" />
      </div>
    );
  }

  const secondsLeft = deadline
    ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    : 15;

  return (
    <div className="doodle-card mx-auto max-w-lg p-6">
      <h3 className="text-center font-sketch text-2xl text-doodle-ink">
        Pick something to draw
      </h3>
      <p className="mb-4 text-center text-sm text-doodle-muted">
        {secondsLeft}s or we pick for you
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {choices.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => pick(word)}
            className="doodle-btn-secondary hover:bg-doodle-mint/30"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
