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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center">
        <p className="text-lg text-slate-300">
          {drawerName} is choosing a word...
        </p>
        <div className="mt-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const secondsLeft = deadline
    ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    : 15;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
      <h3 className="mb-2 text-center text-lg font-semibold text-white">
        Choose a word to draw
      </h3>
      <p className="mb-4 text-center text-sm text-slate-400">
        {secondsLeft}s remaining
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {choices.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => pick(word)}
            className="rounded-xl bg-brand-500/20 px-6 py-3 font-medium text-brand-200 transition hover:bg-brand-500 hover:text-white"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
