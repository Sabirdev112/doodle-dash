"use client";

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { useGameStore } from "@/lib/store";
import type { RoomSnapshot } from "@/lib/types";

export function usePusher(roomId: string, playerId: string) {
  const pusherRef = useRef<PusherClient | null>(null);
  const {
    setConnectionState,
    applySnapshot,
    addPlayer,
    removePlayer,
    setOwner,
    addChatMessage,
    addCanvasActions,
    removeCanvasAction,
    clearCanvas,
    updateScore,
  } = useGameStore();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      auth: {
        headers: { "x-player-id": playerId },
      },
    });

    pusher.connection.bind("state_change", (states: { current: string }) => {
      if (states.current === "connected") setConnectionState("connected");
      else if (states.current === "connecting") setConnectionState("connecting");
      else setConnectionState("disconnected");
    });

    pusher.connection.bind("connected", () => {
      void fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resync", roomId, playerId }),
      });
    });

    const channel = pusher.subscribe(`private-room-${roomId}`);

    channel.bind("player_joined", (data: { player: Parameters<typeof addPlayer>[0] }) => {
      addPlayer(data.player);
    });

    channel.bind("player_left", (data: { playerId: string; newOwnerId?: string }) => {
      removePlayer(data.playerId);
      if (data.newOwnerId) setOwner(data.newOwnerId);
    });

    channel.bind("owner_changed", (data: { newOwnerId: string }) => {
      setOwner(data.newOwnerId);
    });

    channel.bind("room_disbanded", () => {
      window.location.href = "/?disbanded=1";
    });

    channel.bind("game_started", (data: { currentRound: number }) => {
      applySnapshot({ phase: "word_select", currentRound: data.currentRound });
    });

    channel.bind(
      "round_info",
      (data: { currentRound: number; totalRounds: number; drawerName: string }) => {
        applySnapshot({
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          drawerName: data.drawerName,
        });
      }
    );

    channel.bind(
      "word_choices",
      (data: { drawerId: string; deadline: number }) => {
        applySnapshot({
          phase: "word_select",
          drawerId: data.drawerId,
          wordChoiceDeadline: data.deadline,
          chatMessages: [],
          canvasActions: [],
          secretWord: null,
          wordChoices: [],
        });
        if (data.drawerId === playerId) {
          void fetch("/api/room/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "resync", roomId, playerId }),
          });
        }
      }
    );

    channel.bind(
      "turn_started",
      (data: {
        drawerId: string;
        wordLength: number;
        turnEndTime: number;
      }) => {
        applySnapshot({
          phase: "drawing",
          drawerId: data.drawerId,
          wordLength: data.wordLength,
          secretWord: null,
          turnEndTime: data.turnEndTime,
          wordChoices: [],
        });
        if (data.drawerId === playerId) {
          void fetch("/api/room/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "resync", roomId, playerId }),
          });
        }
      }
    );

    channel.bind("draw_strokes", (data: { strokes: Parameters<typeof addCanvasActions>[0] }) => {
      addCanvasActions(data.strokes);
    });

    channel.bind("fill", (data: { action: Parameters<typeof addCanvasActions>[0][0] }) => {
      addCanvasActions([data.action]);
    });

    channel.bind("undo", (data: { actionId: string }) => {
      removeCanvasAction(data.actionId);
    });

    channel.bind("canvas_cleared", () => {
      clearCanvas();
    });

    channel.bind("guess_result", (data: Parameters<typeof addChatMessage>[0]) => {
      addChatMessage(data);
    });

    channel.bind(
      "score_update",
      (data: { playerId: string; score: number; crownHolderId: string | null }) => {
        updateScore(data.playerId, data.score, data.crownHolderId);
      }
    );

    channel.bind(
      "turn_ended",
      (data: { revealedWord: string; players: Parameters<typeof applySnapshot>[0]["players"] }) => {
        applySnapshot({
          phase: "turn_end",
          revealedWord: data.revealedWord,
          secretWord: data.revealedWord,
          players: data.players ?? [],
          crownHolderId: data.players?.find((p) => p.hasCrown)?.id ?? null,
        });
      }
    );

    channel.bind(
      "game_ended",
      (data: { finalStandings: RoomSnapshot["finalStandings"] }) => {
        applySnapshot({
          phase: "ended",
          finalStandings: data.finalStandings ?? null,
        });
      }
    );

    channel.bind("state_sync", (data: RoomSnapshot) => {
      applySnapshot({
        phase: data.phase,
        settings: data.settings,
        players: data.players,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        drawerId: data.drawerId,
        wordLength: data.wordLength,
        secretWord: data.secretWord ?? null,
        wordChoices: data.wordChoices ?? [],
        wordChoiceDeadline: data.wordChoiceDeadline ?? null,
        turnEndTime: data.turnEndTime,
        canvasActions: data.canvasActions,
        chatMessages: data.chatMessages,
        correctGuessers: data.correctGuessers,
        finalStandings: data.finalStandings ?? null,
        crownHolderId: data.players.find((p) => p.hasCrown)?.id ?? null,
      });
    });

    pusherRef.current = pusher;

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-room-${roomId}`);
      pusher.disconnect();
    };
  }, [
    roomId,
    playerId,
    setConnectionState,
    applySnapshot,
    addPlayer,
    removePlayer,
    setOwner,
    addChatMessage,
    addCanvasActions,
    removeCanvasAction,
    clearCanvas,
    updateScore,
  ]);
}
