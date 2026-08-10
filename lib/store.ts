"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  AvatarId,
  CanvasAction,
  ChatMessage,
  GamePhase,
  PublicPlayer,
  RoomSettings,
  SessionPlayer,
} from "@/lib/types";

interface GameStore {
  player: SessionPlayer | null;
  roomId: string | null;
  phase: GamePhase;
  settings: RoomSettings | null;
  players: PublicPlayer[];
  currentRound: number;
  totalRounds: number;
  drawerId: string | null;
  secretWord: string | null;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  wordLength: number;
  turnEndTime: number | null;
  canvasActions: CanvasAction[];
  chatMessages: ChatMessage[];
  correctGuessers: string[];
  crownHolderId: string | null;
  revealedWord: string | null;
  finalStandings: PublicPlayer[] | null;
  connectionState: "connected" | "connecting" | "disconnected";
  drawerName: string;

  initPlayer: (name: string, avatar: AvatarId) => void;
  setRoomId: (roomId: string) => void;
  setConnectionState: (state: GameStore["connectionState"]) => void;
  applySnapshot: (snapshot: Partial<GameStore>) => void;
  addPlayer: (player: PublicPlayer) => void;
  removePlayer: (playerId: string) => void;
  setOwner: (newOwnerId: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addCanvasActions: (actions: CanvasAction[]) => void;
  removeCanvasAction: (actionId: string) => void;
  clearCanvas: () => void;
  updateScore: (playerId: string, score: number, crownHolderId: string | null) => void;
  reset: () => void;
}

const initialState = {
  player: null as SessionPlayer | null,
  roomId: null as string | null,
  phase: "waiting" as GamePhase,
  settings: null as RoomSettings | null,
  players: [] as PublicPlayer[],
  currentRound: 0,
  totalRounds: 0,
  drawerId: null as string | null,
  secretWord: null as string | null,
  wordChoices: [] as string[],
  wordChoiceDeadline: null as number | null,
  wordLength: 0,
  turnEndTime: null as number | null,
  canvasActions: [] as CanvasAction[],
  chatMessages: [] as ChatMessage[],
  correctGuessers: [] as string[],
  crownHolderId: null as string | null,
  revealedWord: null as string | null,
  finalStandings: null as PublicPlayer[] | null,
  connectionState: "connecting" as const,
  drawerName: "",
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initPlayer: (name, avatar) => {
        const existing = get().player;
        set({
          player: existing ?? { id: nanoid(), name, avatar },
        });
      },

      setRoomId: (roomId) => set({ roomId }),

      setConnectionState: (connectionState) => set({ connectionState }),

      applySnapshot: (snapshot) =>
        set((state) => ({
          ...state,
          ...snapshot,
          players: snapshot.players ?? state.players,
        })),

      addPlayer: (player) =>
        set((state) => ({
          players: [...state.players.filter((p) => p.id !== player.id), player],
        })),

      removePlayer: (playerId) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
        })),

      setOwner: (newOwnerId) =>
        set((state) => ({
          players: state.players.map((p) => ({
            ...p,
            isOwner: p.id === newOwnerId,
          })),
        })),

      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, msg],
        })),

      addCanvasActions: (actions) =>
        set((state) => ({
          canvasActions: [...state.canvasActions, ...actions],
        })),

      removeCanvasAction: (actionId) =>
        set((state) => ({
          canvasActions: state.canvasActions.filter((a) => a.id !== actionId),
        })),

      clearCanvas: () => set({ canvasActions: [] }),

      updateScore: (playerId, score, crownHolderId) =>
        set((state) => ({
          crownHolderId,
          players: state.players.map((p) => ({
            ...p,
            score: p.id === playerId ? score : p.score,
            hasCrown: p.id === crownHolderId,
          })),
        })),

      reset: () => set({ ...initialState, player: get().player }),
    }),
    {
      name: "doodle-dash-session",
      partialize: (state) => ({ player: state.player }),
    }
  )
);

export async function sendAction(
  action: Record<string, unknown>
): Promise<Response> {
  return fetch("/api/room/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
}
