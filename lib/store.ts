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
import {
  clearPersistedSession,
  loadPersistedSession,
  savePersistedSession,
} from "./persistedSession";

interface GameStore {
  player: SessionPlayer | null;
  sessionToken: string | null;
  joinedRoomId: string | null;
  phase: GamePhase;
  settings: RoomSettings | null;
  players: PublicPlayer[];
  currentRound: number;
  totalRounds: number;
  turnId: string;
  drawerId: string | null;
  secretWord: string | null;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  phaseDeadline: number | null;
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
  /** Last applied server room revision (for stale snapshot guard). */
  roomUpdatedAt: number;

  initPlayer: (name: string, avatar: string) => void;
  restorePlayer: (player: SessionPlayer) => void;
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
  turnId: "",
  drawerId: null as string | null,
  secretWord: null as string | null,
  wordChoices: [] as string[],
  wordChoiceDeadline: null as number | null,
  phaseDeadline: null as number | null,
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
  roomUpdatedAt: 0,
};

export const useGameStore = create<GameStore>()((set, get) => ({
  player: null,
  ...roomState,

  initPlayer: (name, avatar) => {
    set({ player: { id: nanoid(), name, avatar }, sessionToken: null });
  },

  restorePlayer: (player) => set({ player }),

  setSessionToken: (sessionToken) => {
    set({ sessionToken });
    const { player, joinedRoomId } = get();
    if (player && joinedRoomId && sessionToken) {
      savePersistedSession({
        ...player,
        sessionToken,
        joinedRoomId,
      });
    }
  },

  setJoinedRoom: (joinedRoomId) => {
    set({ joinedRoomId });
    const { player, sessionToken } = get();
    if (player && joinedRoomId && sessionToken) {
      savePersistedSession({
        ...player,
        sessionToken,
        joinedRoomId,
      });
    }
  },

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

  clearSession: () => {
    clearPersistedSession();
    set({ player: null, ...roomState });
  },

  applyRoomSnapshot: (snapshot) =>
    set((state) => {
      if (
        snapshot.updatedAt !== undefined &&
        snapshot.updatedAt < state.roomUpdatedAt
      ) {
        return state;
      }

      // Never regress from an active drawing turn back to the same turn's word pick.
      if (
        state.phase === "drawing" &&
        snapshot.phase === "word_select" &&
        (!snapshot.turnId || snapshot.turnId === state.turnId)
      ) {
        return state;
      }

      const nextPhase = snapshot.phase;
      const keepTurnEndUi = nextPhase === "turn_end";
      const nextTurnId = snapshot.turnId ?? state.turnId;
      const newTurn = Boolean(snapshot.turnId && snapshot.turnId !== state.turnId);

      return {
        ...state,
        roomUpdatedAt: snapshot.updatedAt ?? state.roomUpdatedAt,
        phase: nextPhase,
        settings: snapshot.settings,
        players: snapshot.players,
        currentRound: snapshot.currentRound,
        totalRounds: snapshot.totalRounds,
        turnId: nextTurnId,
        drawerId: snapshot.drawerId,
        wordLength: snapshot.wordLength,
        wordDisplay: snapshot.wordDisplay,
        drawingStarted: snapshot.drawingStarted,
        secretWord:
          nextPhase === "drawing"
            ? (snapshot.secretWord ?? state.secretWord)
            : nextPhase === "turn_end"
              ? (snapshot.secretWord ?? snapshot.revealedWord ?? state.secretWord)
              : nextPhase === "word_select"
                ? null
                : (snapshot.secretWord ?? null),
        revealedWord: keepTurnEndUi
          ? (snapshot.revealedWord ?? state.revealedWord)
          : null,
        turnPointAwards: keepTurnEndUi
          ? (snapshot.turnPointAwards ?? state.turnPointAwards)
          : [],
        wordChoices:
          nextPhase === "word_select"
            ? (snapshot.wordChoices ?? (newTurn ? [] : state.wordChoices))
            : [],
        wordChoiceDeadline:
          nextPhase === "word_select"
            ? (snapshot.wordChoiceDeadline ??
              (newTurn ? null : state.wordChoiceDeadline))
            : null,
        phaseDeadline:
          nextPhase === "turn_end"
            ? (snapshot.phaseDeadline ?? state.phaseDeadline)
            : null,
        turnEndTime: snapshot.turnEndTime,
        canvasActions:
          snapshot.canvasActions !== undefined
            ? snapshot.canvasActions
            : nextPhase === "drawing" && state.phase !== "drawing"
              ? []
              : state.canvasActions,
        chatMessages:
          snapshot.chatMessages !== undefined
            ? snapshot.chatMessages
            : nextPhase === "word_select" && nextPhase !== state.phase
              ? []
              : state.chatMessages,
        finalStandings: snapshot.finalStandings ?? null,
        crownHolderId: snapshot.players.find((p) => p.hasCrown)?.id ?? null,
        drawerName:
          snapshot.players.find((p) => p.id === snapshot.drawerId)?.name ??
          state.drawerName,
      };
    }),
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
  useGameStore.getState().setJoinedRoom(roomId);
  const state = useGameStore.getState();
  if (state.player && state.sessionToken) {
    savePersistedSession({
      ...state.player,
      sessionToken: state.sessionToken,
      joinedRoomId: roomId,
    });
  }

  return { ok: true, data };
}

export async function requestRoomResync(roomId: string): Promise<void> {
  try {
    const res = await sendAction({ type: "resync", roomId });
    const data = (await res.json()) as { ok?: boolean; snapshot?: RoomSnapshot };
    if (res.ok && data.ok && data.snapshot) {
      useGameStore.getState().applyRoomSnapshot(data.snapshot);
    }
  } catch {
    /* best-effort */
  }
}

export async function tryReconnectRoom(
  roomId: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const stored = loadPersistedSession();
  if (!stored || stored.joinedRoomId !== roomId) {
    return { ok: false, error: "No saved session" };
  }

  useGameStore.setState({
    player: { id: stored.id, name: stored.name, avatar: stored.avatar },
    sessionToken: stored.sessionToken,
    joinedRoomId: stored.joinedRoomId,
  });

  const player = { id: stored.id, name: stored.name, avatar: stored.avatar };
  const result = await apiJoinRoom(roomId, player);
  if (!result.ok) {
    const { checkRoomExists } = await import("@/lib/roomInvite");
    const exists = await checkRoomExists(roomId);
    if (!exists) {
      clearPersistedSession();
      useGameStore.getState().clearSession();
    } else {
      const current = useGameStore.getState().player;
      useGameStore.setState({
        player: current ?? {
          id: stored.id,
          name: stored.name,
          avatar: stored.avatar,
        },
        sessionToken: null,
        joinedRoomId: null,
      });
    }
  } else {
    const state = useGameStore.getState();
    if (state.player && state.sessionToken && state.joinedRoomId) {
      savePersistedSession({
        ...state.player,
        sessionToken: state.sessionToken,
        joinedRoomId: state.joinedRoomId,
      });
    }
  }
  return result;
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
  const roomId = data.roomId as string;
  useGameStore.getState().setJoinedRoom(roomId);
  const state = useGameStore.getState();
  if (state.player && state.sessionToken) {
    savePersistedSession({
      ...state.player,
      sessionToken: state.sessionToken,
      joinedRoomId: roomId,
    });
  }
  return { ok: true, data };
}
