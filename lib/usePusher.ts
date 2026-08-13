"use client";

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { useGameStore } from "@/lib/store";
import { setLiveDrawChannel } from "@/lib/liveDrawing";
import { createStrokeOrderBuffer } from "@/lib/strokeOrder";
import type {
  CanvasAction,
  ChatMessage,
  PublicPlayer,
  ReactionEvent,
  RoomSnapshot,
  StrokeAction,
  TurnPointAward,
} from "@/lib/types";

async function requestResync(roomId: string) {
  try {
    const { sessionToken } = useGameStore.getState();
    if (!sessionToken) return;

    const res = await fetch("/api/room/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ type: "resync", roomId }),
    });
    const data = (await res.json()) as { ok?: boolean; snapshot?: RoomSnapshot };
    if (res.ok && data.ok && data.snapshot) {
      useGameStore.getState().applyRoomSnapshot(data.snapshot);
    }
  } catch {
    /* best-effort */
  }
}

export function usePusher(
  roomId: string,
  playerId: string,
  sessionToken: string
) {
  const pusherRef = useRef<PusherClient | null>(null);
  const storeRef = useRef(useGameStore.getState());
  const pendingStrokeBatch = useRef<Extract<CanvasAction, { type: "stroke" }>[]>([]);
  const strokeFlushRaf = useRef<number | null>(null);
  const strokeOrderRef = useRef<ReturnType<typeof createStrokeOrderBuffer> | null>(
    null
  );

  useEffect(() => {
    storeRef.current = useGameStore.getState();
  });

  useEffect(() => {
    if (!roomId || !playerId || !sessionToken) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const store = storeRef.current;
    store.setConnectionState("connecting");

    const pusher = new PusherClient(key, {
      cluster,
      channelAuthorization: {
        transport: "ajax",
        endpoint: "/api/pusher/auth",
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    });

    pusher.connection.bind("state_change", (states: { current: string }) => {
      const s = storeRef.current;
      if (states.current === "connected") {
        s.setConnectionState("connected");
      } else if (
        states.current === "connecting" ||
        states.current === "unavailable"
      ) {
        s.setConnectionState("connecting");
      } else {
        s.setConnectionState("disconnected");
      }
    });

    pusher.connection.bind("connected", () => {
      requestResync(roomId);
    });

    const channel = pusher.subscribe(`private-room-${roomId}`);

    const flushPendingStrokes = (strokes: StrokeAction[]) => {
      if (strokes.length === 0) return;
      pendingStrokeBatch.current.push(...strokes);
      if (strokeFlushRaf.current !== null) return;

      strokeFlushRaf.current = requestAnimationFrame(() => {
        strokeFlushRaf.current = null;
        const batch = pendingStrokeBatch.current.splice(0);
        if (batch.length > 0) {
          storeRef.current.mergeCanvasStrokes(batch);
        }
      });
    };

    const strokeOrder = createStrokeOrderBuffer(flushPendingStrokes);
    strokeOrderRef.current = strokeOrder;
    strokeOrder.reset(0);

    channel.bind("pusher:subscription_succeeded", () => {
      storeRef.current.setConnectionState("connected");
      setLiveDrawChannel(channel);
      requestResync(roomId);
    });

    channel.bind("pusher:subscription_error", () => {
      storeRef.current.setConnectionState("disconnected");
    });

    channel.bind("player_joined", (data: { player: PublicPlayer }) => {
      storeRef.current.addPlayer(data.player);
    });

    channel.bind("player_left", (data: { playerId: string; newOwnerId?: string }) => {
      const s = storeRef.current;
      s.removePlayer(data.playerId);
      if (data.newOwnerId) s.setOwner(data.newOwnerId);
    });

    channel.bind("owner_changed", (data: { newOwnerId: string }) => {
      storeRef.current.setOwner(data.newOwnerId);
    });

    channel.bind("player_muted", (data: { playerId: string }) => {
      const s = storeRef.current;
      s.applySnapshot({
        players: s.players.map((p) =>
          p.id === data.playerId ? { ...p, isMuted: true } : p
        ),
      });
    });

    channel.bind("room_disbanded", () => {
      window.location.href = "/?disbanded=1";
    });

    channel.bind("game_started", (data: { currentRound: number }) => {
      storeRef.current.applySnapshot({
        phase: "word_select",
        currentRound: data.currentRound,
      });
    });

    channel.bind(
      "round_info",
      (data: { currentRound: number; totalRounds: number; drawerName: string }) => {
        storeRef.current.applySnapshot({
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          drawerName: data.drawerName,
        });
      }
    );

    channel.bind(
      "word_choices",
      (data: {
        drawerId: string;
        deadline: number;
        choices?: string[];
        turnId?: string;
      }) => {
        const s = storeRef.current;
        if (s.phase === "drawing") return;
        strokeOrderRef.current?.reset(0);
        s.applySnapshot({
          phase: "word_select",
          turnId: data.turnId ?? s.turnId,
          drawerId: data.drawerId,
          wordChoiceDeadline: data.deadline,
          wordChoices: data.choices ?? s.wordChoices,
          canvasActions: [],
          reactions: [],
          secretWord: null,
          wordDisplay: "",
          drawingStarted: false,
          players: s.players.map((p) => ({
            ...p,
            isDrawer: p.id === data.drawerId,
            hasGuessedCorrectly: false,
          })),
        });
      }
    );

    channel.bind(
      "turn_started",
      (data: {
        drawerId: string;
        wordLength: number;
        wordDisplay: string;
        turnEndTime: number;
        drawingStarted?: boolean;
        turnId?: string;
      }) => {
        const s = storeRef.current;
        if (
          data.turnId &&
          s.turnId === data.turnId &&
          s.phase === "drawing"
        ) {
          return;
        }
        strokeOrderRef.current?.reset(0);
        s.applySnapshot({
          phase: "drawing",
          turnId: data.turnId ?? s.turnId,
          drawerId: data.drawerId,
          wordLength: data.wordLength,
          wordDisplay: data.wordDisplay,
          drawingStarted: data.drawingStarted ?? false,
          secretWord: data.drawerId === playerId ? s.secretWord : null,
          revealedWord: null,
          turnPointAwards: [],
          turnEndTime: data.turnEndTime,
          wordChoices: [],
          wordChoiceDeadline: null,
          phaseDeadline: null,
          canvasActions: [],
          reactions: [],
          players: s.players.map((p) => ({
            ...p,
            isDrawer: p.id === data.drawerId,
            hasGuessedCorrectly: false,
          })),
        });
        if (data.drawerId === playerId && !useGameStore.getState().secretWord) {
          requestResync(roomId);
        }
      }
    );

    channel.bind(
      "hint_update",
      (data: {
        wordLength: number;
        wordDisplay: string;
        drawingStarted?: boolean;
      }) => {
        const s = storeRef.current;
        s.applySnapshot({
          wordLength: data.wordLength,
          wordDisplay: data.wordDisplay,
          drawingStarted: data.drawingStarted ?? s.drawingStarted,
        });
      }
    );

    channel.bind("reaction", (data: ReactionEvent) => {
      storeRef.current.addReaction(data);
    });

    const applyIncomingStrokes = (
      seq: number | undefined,
      strokes: StrokeAction[]
    ) => {
      if (strokes.length === 0) return;
      // Drawer already paints locally — applying echoes causes flicker + extra redraws.
      if (storeRef.current.drawerId === playerId) return;
      strokeOrder.push(seq, strokes);
    };

    channel.bind(
      "draw_strokes",
      (data: { strokes: CanvasAction[]; seq?: number }) => {
        const strokes = data.strokes.filter(
          (stroke): stroke is StrokeAction => stroke.type === "stroke"
        );
        applyIncomingStrokes(data.seq, strokes);
      }
    );

    channel.bind(
      "client-draw_strokes",
      (data: { strokes: StrokeAction[]; seq?: number }) => {
        applyIncomingStrokes(data.seq, data.strokes ?? []);
      }
    );

    channel.bind("fill", (data: { action: CanvasAction }) => {
      const s = storeRef.current;
      if (s.canvasActions.some((action) => action.id === data.action.id)) return;
      s.addCanvasActions([data.action]);
    });

    channel.bind("undo", (data: { actionId: string }) => {
      storeRef.current.removeCanvasAction(data.actionId);
    });

    channel.bind("canvas_cleared", () => {
      const s = storeRef.current;
      if (s.phase === "drawing" && s.canvasActions.length > 0) return;
      strokeOrder.reset(0);
      s.clearCanvas();
    });

    channel.bind("guess_result", (data: ChatMessage) => {
      const s = storeRef.current;
      s.addChatMessage(data);
      if (data.kind === "correct") {
        s.applySnapshot({
          players: s.players.map((p) =>
            p.id === data.playerId ? { ...p, hasGuessedCorrectly: true } : p
          ),
        });
      }
    });

    channel.bind(
      "score_update",
      (data: { playerId: string; score: number; crownHolderId: string | null }) => {
        storeRef.current.updateScore(data.playerId, data.score, data.crownHolderId);
      }
    );

    channel.bind(
      "turn_ended",
      (data: {
        turnId?: string;
        revealedWord: string;
        turnPointAwards?: TurnPointAward[];
        players: RoomSnapshot["players"];
        phaseDeadline?: number | null;
      }) => {
        const s = storeRef.current;
        if (data.turnId && s.turnId && data.turnId !== s.turnId) return;
        if (s.phase === "word_select" || s.phase === "ended") return;
        s.applySnapshot({
          phase: "turn_end",
          revealedWord: data.revealedWord,
          secretWord: data.revealedWord,
          turnPointAwards: data.turnPointAwards ?? [],
          players: data.players ?? [],
          crownHolderId: data.players?.find((p) => p.hasCrown)?.id ?? null,
          phaseDeadline: data.phaseDeadline ?? s.phaseDeadline,
          canvasActions: [],
          reactions: [],
        });
      }
    );

    channel.bind(
      "game_ended",
      (data: { finalStandings: RoomSnapshot["finalStandings"] }) => {
        storeRef.current.applySnapshot({
          phase: "ended",
          finalStandings: data.finalStandings ?? null,
        });
      }
    );

    channel.bind("state_sync", (data: RoomSnapshot) => {
      if (data.phase !== "drawing") {
        strokeOrder.reset(0);
      } else if (data.strokeSeq !== undefined) {
        strokeOrder.reset(data.strokeSeq);
      }
      storeRef.current.applyRoomSnapshot(data);
      const s = storeRef.current;
      if (
        data.phase === "word_select" &&
        data.drawerId === playerId &&
        s.wordChoices.length === 0
      ) {
        requestResync(roomId);
      }
    });

    pusherRef.current = pusher;

    const heartbeat = window.setInterval(() => {
      void fetch("/api/room/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ type: "ping", roomId }),
      });
    }, 15_000);

    return () => {
      if (strokeFlushRaf.current !== null) {
        cancelAnimationFrame(strokeFlushRaf.current);
        strokeFlushRaf.current = null;
      }
      pendingStrokeBatch.current = [];
      strokeOrder.dispose();
      strokeOrderRef.current = null;
      setLiveDrawChannel(null);
      window.clearInterval(heartbeat);
      channel.unbind_all();
      pusher.unsubscribe(`private-room-${roomId}`);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [roomId, playerId, sessionToken]);
}
