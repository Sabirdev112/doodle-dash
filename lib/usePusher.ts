"use client";

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { useGameStore } from "@/lib/store";
import type {
  CanvasAction,
  ChatMessage,
  PublicPlayer,
  ReactionEvent,
  RoomSnapshot,
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

    channel.bind("pusher:subscription_succeeded", () => {
      storeRef.current.setConnectionState("connected");
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
      }) => {
        const s = storeRef.current;
        s.applySnapshot({
          phase: "word_select",
          drawerId: data.drawerId,
          wordChoiceDeadline: data.deadline,
          wordChoices: data.choices ?? s.wordChoices,
          chatMessages: [],
          canvasActions: [],
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
      }) => {
        const s = storeRef.current;
        s.applySnapshot({
          phase: "drawing",
          drawerId: data.drawerId,
          wordLength: data.wordLength,
          wordDisplay: data.wordDisplay,
          drawingStarted: data.drawingStarted ?? false,
          secretWord: null,
          revealedWord: null,
          turnPointAwards: [],
          turnEndTime: data.turnEndTime,
          wordChoices: [],
          players: s.players.map((p) => ({
            ...p,
            isDrawer: p.id === data.drawerId,
            hasGuessedCorrectly: false,
          })),
        });
        if (data.drawerId === playerId) {
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

    channel.bind("draw_strokes", (data: { strokes: CanvasAction[] }) => {
      const strokes = data.strokes.filter(
        (stroke): stroke is Extract<CanvasAction, { type: "stroke" }> =>
          stroke.type === "stroke"
      );
      if (strokes.length > 0) {
        storeRef.current.mergeCanvasStrokes(strokes);
      }
    });

    channel.bind("fill", (data: { action: CanvasAction }) => {
      const s = storeRef.current;
      if (s.canvasActions.some((action) => action.id === data.action.id)) return;
      s.addCanvasActions([data.action]);
    });

    channel.bind("undo", (data: { actionId: string }) => {
      storeRef.current.removeCanvasAction(data.actionId);
    });

    channel.bind("canvas_cleared", () => {
      storeRef.current.clearCanvas();
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
        revealedWord: string;
        turnPointAwards?: TurnPointAward[];
        players: RoomSnapshot["players"];
      }) => {
        storeRef.current.applySnapshot({
          phase: "turn_end",
          revealedWord: data.revealedWord,
          secretWord: data.revealedWord,
          turnPointAwards: data.turnPointAwards ?? [],
          players: data.players ?? [],
          crownHolderId: data.players?.find((p) => p.hasCrown)?.id ?? null,
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
      const s = storeRef.current;
      s.applyRoomSnapshot(data);
      const isDrawer = data.drawerId === playerId;
      if (isDrawer && data.phase === "drawing" && !data.secretWord) {
        void requestResync(roomId);
      }
      if (isDrawer && data.phase === "word_select" && !data.wordChoices?.length) {
        void requestResync(roomId);
      }
    });

    pusherRef.current = pusher;

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-room-${roomId}`);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [roomId, playerId, sessionToken]);
}
