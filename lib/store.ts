"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  CanvasAction,
  ChatMessage,
  GamePhase,
  PublicPlayer,
  ReactionEvent,
  RoomSettings,
  RoomSnapshot,
  SessionPlayer,
  StrokeAction,
  TurnPointAward,
} from "@/lib/types";
import { applyCanvasStrokeUpdates } from "./canvasStrokes";

interface GameStore {
  player: SessionPlayer | null;
  sessionToken: string | null;
  joinedRoomId: string | null;
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
  wordDisplay: string;
  drawingStarted: boolean;
  turnEndTime: number | null;
  canvasActions: CanvasAction[];
  chatMessages: ChatMessage[];
  reactions: ReactionEvent[];
  crownHolderId: string | null;
  revealedWord: string | null;
  turnPointAwards: TurnPointAward[];
  finalStandings: PublicPlayer[] | null;
  connectionState: "connected" | "connecting" | "disconnected";
  drawerName: string;

  initPlayer: (name: string, avatar: string) => void;
  setSessionToken: (token: string | null) => void;
  setJoinedRoom: (roomId: string | null) => void;
  setConnectionState: (state: GameStore["connectionState"]) => void;
  applySnapshot: (snapshot: Partial<GameStore>) => void;
  addPlayer: (player: PublicPlayer) => void;
  removePlayer: (playerId: string) => void;
  setOwner: (newOwnerId: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addReaction: (reaction: ReactionEvent) => void;
  addCanvasActions: (actions: CanvasAction[]) => void;
  mergeCanvasStrokes: (strokes: StrokeAction[]) => void;
  popCanvasAction: () => CanvasAction | null;
  removeCanvasAction: (actionId: string) => void;
  clearCanvas: () => void;
  updateScore: (
    playerId: string,
    score: number,
    crownHolderId: string | null
  ) => void;
  resetRoom: () => void;
  applyRoomSnapshot: (snapshot: RoomSnapshot) => void;
  /** Drop all session + room state (nothing persisted locally). */
  clearSession: () => void;
}

const roomState = {
  sessionToken: null as string | null,
  joinedRoomId: null as string | null,
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
  wordDisplay: "",
  drawingStarted: false,
  turnEndTime: null as number | null,
  canvasActions: [] as CanvasAction[],
  chatMessages: [] as ChatMessage[],
  reactions: [] as ReactionEvent[],
  crownHolderId: null as string | null,
  revealedWord: null as string | null,
  turnPointAwards: [] as TurnPointAward[],
  finalStandings: null as PublicPlayer[] | null,
  connectionState: "connecting" as const,
  drawerName: "",
};

export const useGameStore = create<GameStore>()((set, get) => ({
  player: null,
  ...roomState,

  initPlayer: (name, avatar) => {
    set({ player: { id: nanoid(), name, avatar }, sessionToken: null });
  },

  setSessionToken: (sessionToken) => set({ sessionToken }),

  setJoinedRoom: (joinedRoomId) => set({ joinedRoomId }),

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
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  addReaction: (reaction) =>
    set((state) => ({
      reactions: [...state.reactions.slice(-20), reaction],
    })),

  addCanvasActions: (actions) =>
    set((state) => ({
      canvasActions: [...state.canvasActions, ...actions],
    })),

  mergeCanvasStrokes: (strokes) =>
    set((state) => {
      const next = applyCanvasStrokeUpdates(state.canvasActions, strokes);
      const changed =
        next.length !== state.canvasActions.length ||
        next.some((action, index) => {
          const prev = state.canvasActions[index];
          if (action !== prev) return true;
          if (
            action.type === "stroke" &&
            prev?.type === "stroke" &&
            action.points.length !== prev.points.length
          ) {
            return true;
          }
          return false;
        });
      return changed ? { canvasActions: next } : state;
    }),

  popCanvasAction: () => {
    const { canvasActions } = get();
    if (canvasActions.length === 0) return null;
    const removed = canvasActions[canvasActions.length - 1];
    set({ canvasActions: canvasActions.slice(0, -1) });
    return removed;
  },

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

  resetRoom: () => set({ ...roomState, player: get().player }),

  clearSession: () => set({ player: null, ...roomState }),

  applyRoomSnapshot: (snapshot) =>
    set((state) => ({
      ...state,
      phase: snapshot.phase,
      settings: snapshot.settings,
      players: snapshot.players,
      currentRound: snapshot.currentRound,
      totalRounds: snapshot.totalRounds,
      drawerId: snapshot.drawerId,
      wordLength: snapshot.wordLength,
      wordDisplay: snapshot.wordDisplay,
      drawingStarted: snapshot.drawingStarted,
      secretWord:
        snapshot.secretWord ??
        snapshot.revealedWord ??
        (snapshot.phase === "turn_end" || snapshot.phase === "word_select"
          ? state.secretWord ?? state.revealedWord
          : null),
      revealedWord:
        snapshot.revealedWord ??
        (snapshot.phase === "turn_end" || snapshot.phase === "word_select"
          ? state.revealedWord
          : null),
      turnPointAwards:
        snapshot.turnPointAwards ??
        (snapshot.phase === "turn_end" || snapshot.phase === "word_select"
          ? state.turnPointAwards
          : []),
      wordChoices: snapshot.wordChoices ?? state.wordChoices,
      wordChoiceDeadline: snapshot.wordChoiceDeadline ?? state.wordChoiceDeadline,
      turnEndTime: snapshot.turnEndTime,
      canvasActions:
        snapshot.canvasActions !== undefined
          ? snapshot.canvasActions
          : state.canvasActions,
      chatMessages:
        snapshot.chatMessages !== undefined
          ? snapshot.chatMessages
          : snapshot.phase === "word_select" && snapshot.phase !== state.phase
            ? []
            : state.chatMessages,
      finalStandings: snapshot.finalStandings ?? null,
      crownHolderId: snapshot.players.find((p) => p.hasCrown)?.id ?? null,
      drawerName:
        snapshot.players.find((p) => p.id === snapshot.drawerId)?.name ??
        state.drawerName,
    })),
}));

/** Remove any legacy persisted session from older builds. */
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("doodle-dash-v3");
  } catch {
    /* ignore */
  }
}

export async function sendAction(
  action: Record<string, unknown>
): Promise<Response> {
  const { sessionToken } = useGameStore.getState();
  return fetch("/api/room/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(action),
  });
}

/** Leave the current room server-side and wipe local session. */
export async function leaveSession(): Promise<void> {
  const { player, joinedRoomId, clearSession } = useGameStore.getState();
  if (player && joinedRoomId) {
    try {
      await sendAction({
        type: "leave",
        roomId: joinedRoomId,
        playerId: player.id,
      });
    } catch {
      /* best-effort */
    }
  }
  clearSession();
}

export async function apiJoinRoom(
  roomId: string,
  player: SessionPlayer
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const res = await fetch("/api/room/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? "Could not join room" };

  const effectivePlayerId = data.playerId as string | undefined;
  const sessionToken = data.sessionToken as string | undefined;
  if (effectivePlayerId && effectivePlayerId !== player.id) {
    useGameStore.setState({
      player: { ...player, id: effectivePlayerId },
    });
  }
  if (sessionToken) {
    useGameStore.getState().setSessionToken(sessionToken);
  }

  return { ok: true, data };
}

export async function apiCreateRoom(
  player: SessionPlayer,
  settings: Record<string, unknown>
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const res = await fetch("/api/room/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
      ...settings,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? "Could not create room" };
  const sessionToken = data.sessionToken as string | undefined;
  if (sessionToken) {
    useGameStore.getState().setSessionToken(sessionToken);
  }
  return { ok: true, data };
}
