"use client";

import { useEffect } from "react";
import { requestResolveDeadlines, useGameStore } from "@/lib/store";
import { HINT_EVERY, HINT_FIRST_AT } from "@/lib/types";

/** Fire resolve_deadlines at 30% of the turn, then every 10%, for letter hints. */
export function useHintRevealTick(
  roomId: string,
  active: boolean,
  turnEndTime: number | null,
  turnDurationSec: number,
  maxHints: number
) {
  useEffect(() => {
    if (!active || !roomId || !turnEndTime || maxHints <= 0 || turnDurationSec <= 0) {
      return;
    }

    const durationMs = turnDurationSec * 1000;
    const start = turnEndTime - durationMs;
    const timers: number[] = [];
    let cancelled = false;

    for (let i = 0; i < maxHints; i++) {
      const at = start + durationMs * (HINT_FIRST_AT + i * HINT_EVERY);
      const delay = at - Date.now();
      if (delay > durationMs) continue;
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          const { sessionToken, joinedRoomId } = useGameStore.getState();
          if (!sessionToken || joinedRoomId !== roomId) return;
          void requestResolveDeadlines(roomId);
        }, Math.max(0, delay))
      );
    }

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [roomId, active, turnEndTime, turnDurationSec, maxHints]);
}
