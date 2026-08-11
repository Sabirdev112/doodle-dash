"use client";

import { useState } from "react";
import ButtonSpinner from "./ButtonSpinner";
import { sendAction } from "@/lib/store";
import { REACTION_EMOJIS } from "@/lib/types";

interface ReactionBarProps {
  roomId: string;
  playerId: string;
}

export default function ReactionBar({ roomId, playerId }: ReactionBarProps) {
  const [firing, setFiring] = useState<string | null>(null);

  const fire = async (emoji: string) => {
    if (firing) return;
    setFiring(emoji);
    await sendAction({ type: "reaction", roomId, playerId, emoji });
    setFiring(null);
  };

  return (
    <div className="doodle-card flex flex-wrap items-center justify-center gap-2 p-3">
      <span className="font-sketch text-sm text-doodle-muted">React</span>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => void fire(emoji)}
          disabled={firing !== null}
          className="relative rounded-lg border-2 border-doodle-ink/20 bg-white px-3 py-1 text-xl transition hover:scale-110 hover:border-doodle-ink disabled:opacity-50"
          aria-label={`React ${emoji}`}
        >
          {firing === emoji ? (
            <span className="inline-flex h-7 w-7 items-center justify-center">
              <ButtonSpinner className="h-4 w-4 border-doodle-ink" />
            </span>
          ) : (
            emoji
          )}
        </button>
      ))}
    </div>
  );
}
