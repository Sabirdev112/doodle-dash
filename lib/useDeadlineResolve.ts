"use client";

import { useEffect } from "react";
import { requestResolveDeadlines, useGameStore } from "@/lib/store";

/**
 * When a KV-stored deadline elapses, hit the API so the serverless
 * instance can resolve it (auto-pick / end turn / advance). Retries
 * until the deadline prop changes (i.e. the phase actually moved on).
 */
export function useDeadlineResolve(
  roomId: string,
  active: boolean,
  deadline: number | null
) {
  useEffect(() => {
    if (!active || !roomId || deadline == null) return;

    let cancelled = false;
    let timer: number | undefined;

    const schedule = (delay: number) => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void (async () => {
          if (cancelled) return;
          if (Date.now() < deadline) {
            schedule(Math.max(0, deadline - Date.now()) + 30);
            return;
          }
          const { sessionToken, joinedRoomId } = useGameStore.getState();
          if (!sessionToken || joinedRoomId !== roomId) return;
          await requestResolveDeadlines(roomId);
          if (cancelled) return;
          schedule(1000);
        })();
      }, delay);
    };

    schedule(Math.max(0, deadline - Date.now()) + 30);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [roomId, active, deadline]);
}
