"use client";

import { useEffect } from "react";
import { requestResolveDeadlines } from "@/lib/store";
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

    for (let i = 0; i < maxHints; i++) {
      const at = start + durationMs * (HINT_FIRST_AT + i * HINT_EVERY);
      const delay = at - Date.now();
      if (delay > durationMs) continue;
      timers.push(
        window.setTimeout(() => {
          void requestResolveDeadlines(roomId);
        }, Math.max(0, delay))
      );
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [roomId, active, turnEndTime, turnDurationSec, maxHints]);
}
