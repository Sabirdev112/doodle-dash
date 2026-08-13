"use client";

import { useEffect, useState } from "react";
import ButtonSpinner from "./ButtonSpinner";
import { sendAction, useGameStore, requestRoomResync } from "@/lib/store";
import type { RoomSnapshot } from "@/lib/types";

interface WordSelectProps {
  roomId: string;
  playerId: string;
  choices: string[];
  deadline: number | null;
  isDrawer: boolean;
  drawerName: string;
  /** Render without outer card wrapper (for TurnOverlay). */
  embedded?: boolean;
}

export default function WordSelect({
  roomId,
  playerId,
  choices,
  deadline,
  isDrawer,
  drawerName,
  embedded = false,
}: WordSelectProps) {
  const [picking, setPicking] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 15
  );
  const applyRoomSnapshot = useGameStore((s) => s.applyRoomSnapshot);

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(15);
      return;
    }
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const pick = async (word: string) => {
    if (picking) return;
    setPicking(word);
    const res = await sendAction({ type: "pick_word", roomId, playerId, word });
    const data = await res.json();
    if (res.ok && data.ok && data.snapshot) {
      applyRoomSnapshot(data.snapshot as RoomSnapshot);
    } else if (res.ok && data.ok) {
      await requestRoomResync(roomId);
    } else {
      await requestRoomResync(roomId);
    }
    setPicking(null);
  };

  if (!isDrawer) {
    return (
      <div className={embedded ? "text-center" : "doodle-card mx-auto max-w-md p-8 text-center"}>
        <p className="font-sketch text-2xl text-doodle-ink">
          {drawerName} is picking a word…
        </p>
        <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-doodle-ink border-t-transparent" />
      </div>
    );
  }

  const content = (
    <>
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
            onClick={() => void pick(word)}
            disabled={picking !== null}
            className="doodle-btn-secondary hover:bg-doodle-mint/30"
          >
            {picking === word ? (
              <>
                <ButtonSpinner />
                {word}
              </>
            ) : (
              word
            )}
          </button>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="p-1">{content}</div>;
  }

  return <div className="doodle-card mx-auto max-w-lg p-6">{content}</div>;
}
