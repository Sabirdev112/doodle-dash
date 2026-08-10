import { customAlphabet } from "nanoid";
import { nanoid } from "nanoid";
import { triggerRoomEvent, triggerRoomEvents } from "./realtime";
import {
  getDrawerPoints,
  getGuesserPoints,
  updateCrownHolder,
} from "./scoring";
import { sanitizeCustomWords } from "./sanitize";
import {
  isCloseGuess,
  isExactMatch,
} from "./wordMatch";
import type {
  CanvasAction,
  ChatMessage,
  FillAction,
  Player,
  PublicPlayer,
  Room,
  RoomSettings,
  RoomSnapshot,
  StrokeAction,
} from "./types";
import {
  DEFAULT_WORDS,
  ROOM_TTL_MS,
  WORD_CHOICE_TIMEOUT_MS,
} from "./types";

const generateRoomId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  8
);

const rooms = new Map<string, Room>();

setInterval(() => {
  cleanupExpiredRooms();
}, 60_000);

function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      clearRoomTimers(room);
      rooms.delete(id);
    }
  }
}

function clearRoomTimers(room: Room): void {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.wordChoiceTimer) clearTimeout(room.wordChoiceTimer);
  room.turnTimer = null;
  room.wordChoiceTimer = null;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWords(pool: string[], count: number, exclude: string[] = []): string[] {
  const available = pool.filter((w) => !exclude.includes(w.toLowerCase()));
  return shuffle(available).slice(0, count);
}

function toPublicPlayer(room: Room, player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    score: player.score,
    isOwner: player.isOwner,
    hasGuessedCorrectly: player.hasGuessedCorrectly,
    isDrawer: room.drawerId === player.id,
    hasCrown: room.crownHolderId === player.id,
  };
}

function getPlayersList(room: Room): PublicPlayer[] {
  return room.playerOrder
    .map((id) => room.players.get(id))
    .filter((p): p is Player => !!p)
    .map((p) => toPublicPlayer(room, p));
}

function updateCrown(room: Room): void {
  const players = room.playerOrder
    .map((id) => room.players.get(id))
    .filter((p): p is Player => !!p);

  const newCrown = updateCrownHolder(players, room.crownHolderId);
  if (newCrown && newCrown !== room.crownHolderId) {
    const holder = room.players.get(newCrown);
    if (holder && !holder.crownReachedAt) {
      holder.crownReachedAt = Date.now();
    }
  }
  room.crownHolderId = newCrown;
}

export function createRoom(
  settings: Omit<RoomSettings, "customWords"> & { customWords?: string | string[] },
  ownerId: string,
  ownerName: string,
  ownerAvatar: string
): Room {
  const id = generateRoomId();
  const customWords = settings.customWords
    ? sanitizeCustomWords(
        Array.isArray(settings.customWords)
          ? settings.customWords.join("\n")
          : settings.customWords
      )
    : [];

  const room: Room = {
    id,
    createdAt: Date.now(),
    settings: {
      rounds: settings.rounds,
      maxPlayers: settings.maxPlayers,
      wordChoiceCount: settings.wordChoiceCount,
      turnDuration: settings.turnDuration,
      customWords,
    },
    players: new Map(),
    playerOrder: [],
    phase: "waiting",
    currentRound: 0,
    currentTurnIndex: 0,
    drawerId: null,
    secretWord: null,
    wordChoices: [],
    wordChoiceDeadline: null,
    turnStartTime: null,
    turnEndTime: null,
    canvasActions: [],
    correctGuessers: [],
    chatMessages: [],
    crownHolderId: null,
    turnTimer: null,
    wordChoiceTimer: null,
    wordPool:
      customWords.length > 0
        ? customWords
        : [...DEFAULT_WORDS],
  };

  addPlayerToRoom(room, ownerId, ownerName, ownerAvatar, true);
  rooms.set(id, room);
  return room;
}

function addPlayerToRoom(
  room: Room,
  playerId: string,
  name: string,
  avatar: string,
  isOwner: boolean
): Player {
  const player: Player = {
    id: playerId,
    name,
    avatar,
    score: 0,
    joinedAt: Date.now(),
    isOwner,
    hasGuessedCorrectly: false,
  };
  room.players.set(playerId, player);
  room.playerOrder.push(playerId);
  if (isOwner) {
    player.crownReachedAt = Date.now();
    room.crownHolderId = playerId;
  }
  return player;
}

export function getRoom(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  if (Date.now() - room.createdAt > ROOM_TTL_MS) {
    clearRoomTimers(room);
    rooms.delete(roomId);
    return undefined;
  }
  return room;
}

export function isPlayerInRoom(room: Room, playerId: string): boolean {
  return room.players.has(playerId);
}

export function joinRoom(
  roomId: string,
  playerId: string,
  name: string,
  avatar: string
): { ok: true; room: Room } | { ok: false; error: string } {
  const room = getRoom(roomId);
  if (!room) return { ok: false, error: "Room not found or expired" };
  if (room.phase !== "waiting") {
    return { ok: false, error: "Game already in progress" };
  }
  if (room.players.size >= room.settings.maxPlayers) {
    return { ok: false, error: "Room is full" };
  }
  if (room.players.has(playerId)) {
    return { ok: true, room };
  }

  const player = addPlayerToRoom(room, playerId, name, avatar, false);
  void triggerRoomEvent(roomId, {
    event: "player_joined",
    payload: { player: toPublicPlayer(room, player) },
  });

  return { ok: true, room };
}

export function leaveRoom(
  roomId: string,
  playerId: string
): { disbanded: boolean } {
  const room = getRoom(roomId);
  if (!room) return { disbanded: true };

  const wasOwner = room.players.get(playerId)?.isOwner;
  room.players.delete(playerId);
  room.playerOrder = room.playerOrder.filter((id) => id !== playerId);

  if (room.players.size === 0) {
    clearRoomTimers(room);
    rooms.delete(roomId);
    return { disbanded: true };
  }

  let newOwnerId: string | undefined;
  if (wasOwner) {
    const nextOwner = room.playerOrder[0];
    if (nextOwner) {
      const p = room.players.get(nextOwner);
      if (p) {
        p.isOwner = true;
        newOwnerId = nextOwner;
        void triggerRoomEvent(roomId, {
          event: "owner_changed",
          payload: { newOwnerId: nextOwner },
        });
      }
    }
  }

  void triggerRoomEvent(roomId, {
    event: "player_left",
    payload: { playerId, newOwnerId },
  });

  updateCrown(room);
  return { disbanded: false };
}

export async function disbandRoom(
  roomId: string,
  playerId: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player?.isOwner || room.phase !== "waiting") return false;

  clearRoomTimers(room);
  await triggerRoomEvent(roomId, {
    event: "room_disbanded",
    payload: {},
  });
  rooms.delete(roomId);
  return true;
}

export function getRoomSnapshot(room: Room, playerId: string): RoomSnapshot {
  const player = room.players.get(playerId);
  const isDrawer = room.drawerId === playerId;

  const snapshot: RoomSnapshot = {
    roomId: room.id,
    phase: room.phase,
    settings: room.settings,
    players: getPlayersList(room),
    currentRound: room.currentRound,
    totalRounds: room.settings.rounds,
    drawerId: room.drawerId,
    wordLength: room.secretWord?.length ?? 0,
    turnEndTime: room.turnEndTime,
    turnStartTime: room.turnStartTime,
    canvasActions: room.canvasActions,
    chatMessages: room.chatMessages,
    correctGuessers: room.correctGuessers,
  };

  if (isDrawer && room.secretWord) {
    snapshot.secretWord = room.secretWord;
  }
  if (isDrawer && room.phase === "word_select") {
    snapshot.wordChoices = room.wordChoices;
    snapshot.wordChoiceDeadline = room.wordChoiceDeadline ?? undefined;
  }
  if (room.phase === "ended") {
    snapshot.finalStandings = getPlayersList(room).sort(
      (a, b) => b.score - a.score
    );
  }

  return snapshot;
}

async function startWordSelection(room: Room): Promise<void> {
  const drawerId = room.drawerId!;
  room.phase = "word_select";
  room.secretWord = null;
  room.canvasActions = [];
  room.correctGuessers = [];
  room.chatMessages = [];
  room.turnStartTime = null;
  room.turnEndTime = null;

  for (const id of room.playerOrder) {
    const p = room.players.get(id);
    if (p) p.hasGuessedCorrectly = false;
  }

  const usedWords = room.chatMessages.length > 0 ? [] : [];
  room.wordChoices = pickWords(
    room.wordPool,
    room.settings.wordChoiceCount,
    usedWords
  );

  if (room.wordChoices.length === 0) {
    room.wordChoices = pickWords(DEFAULT_WORDS, room.settings.wordChoiceCount);
  }

  room.wordChoiceDeadline = Date.now() + WORD_CHOICE_TIMEOUT_MS;

  await triggerRoomEvent(room.id, {
    event: "word_choices",
    payload: {
      drawerId,
      deadline: room.wordChoiceDeadline,
    },
  });

  if (room.wordChoiceTimer) clearTimeout(room.wordChoiceTimer);
  room.wordChoiceTimer = setTimeout(() => {
    const r = getRoom(room.id);
    if (r && r.phase === "word_select" && r.drawerId === drawerId) {
      void pickWord(room.id, drawerId, r.wordChoices[0]);
    }
  }, WORD_CHOICE_TIMEOUT_MS);
}

export async function startGame(
  roomId: string,
  playerId: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player?.isOwner || room.phase !== "waiting") return false;
  if (room.players.size < 2) return false;

  room.currentRound = 1;
  room.currentTurnIndex = 0;
  room.drawerId = room.playerOrder[0];

  const drawer = room.players.get(room.drawerId);
  await triggerRoomEvents(roomId, [
    {
      event: "game_started",
      payload: { currentRound: room.currentRound },
    },
    {
      event: "round_info",
      payload: {
        currentRound: room.currentRound,
        totalRounds: room.settings.rounds,
        drawerName: drawer?.name ?? "Unknown",
      },
    },
  ]);

  await startWordSelection(room);
  return true;
}

export async function pickWord(
  roomId: string,
  playerId: string,
  word: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "word_select" || room.drawerId !== playerId) return false;

  const chosen = room.wordChoices.find(
    (w) => w.toLowerCase() === word.toLowerCase()
  );
  if (!chosen) return false;

  if (room.wordChoiceTimer) {
    clearTimeout(room.wordChoiceTimer);
    room.wordChoiceTimer = null;
  }

  room.secretWord = chosen;
  room.phase = "drawing";
  room.turnStartTime = Date.now();
  room.turnEndTime = Date.now() + room.settings.turnDuration * 1000;
  room.canvasActions = [];

  await triggerRoomEvents(roomId, [
    {
      event: "canvas_cleared",
      payload: {},
    },
    {
      event: "turn_started",
      payload: {
        drawerId: playerId,
        wordLength: chosen.length,
        turnEndTime: room.turnEndTime,
      },
    },
  ]);

  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => {
    void endTurn(roomId);
  }, room.settings.turnDuration * 1000);

  return true;
}

export async function handleDrawStrokes(
  roomId: string,
  playerId: string,
  strokes: StrokeAction[]
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "drawing" || room.drawerId !== playerId) return false;

  for (const stroke of strokes) {
    if (
      stroke.points.length === 0 ||
      stroke.points.length > 100 ||
      stroke.size < 1 ||
      stroke.size > 50
    ) {
      continue;
    }
    room.canvasActions.push(stroke);
  }

  await triggerRoomEvent(roomId, {
    event: "draw_strokes",
    payload: { strokes },
  });
  return true;
}

export async function handleFill(
  roomId: string,
  playerId: string,
  action: FillAction
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "drawing" || room.drawerId !== playerId) return false;

  room.canvasActions.push(action);
  await triggerRoomEvent(roomId, {
    event: "fill",
    payload: { action },
  });
  return true;
}

export async function handleUndo(
  roomId: string,
  playerId: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "drawing" || room.drawerId !== playerId) return false;
  if (room.canvasActions.length === 0) return false;

  const removed = room.canvasActions.pop()!;
  await triggerRoomEvent(roomId, {
    event: "undo",
    payload: { actionId: removed.id },
  });
  return true;
}

export async function handleGuess(
  roomId: string,
  playerId: string,
  text: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "drawing" || !room.secretWord) return false;
  if (playerId === room.drawerId) return false;

  const player = room.players.get(playerId);
  if (!player || player.hasGuessedCorrectly) return false;

  const word = room.secretWord;
  let message: ChatMessage;

  if (isExactMatch(text, word)) {
    player.hasGuessedCorrectly = true;
    room.correctGuessers.push(playerId);

    const place = room.correctGuessers.length;
    const pointsEarned = getGuesserPoints(place);
    player.score += pointsEarned;
    if (player.score > 0 && !player.crownReachedAt) {
      player.crownReachedAt = Date.now();
    }
    updateCrown(room);

    message = {
      id: nanoid(),
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      text: `${player.name} guessed the word!`,
      kind: "correct",
      timestamp: Date.now(),
    };

    room.chatMessages.push(message);

    await triggerRoomEvents(roomId, [
      { event: "guess_result", payload: message },
      {
        event: "score_update",
        payload: {
          playerId,
          score: player.score,
          crownHolderId: room.crownHolderId,
        },
      },
    ]);

    const allGuessed = room.playerOrder
      .filter((id) => id !== room.drawerId)
      .every((id) => room.players.get(id)?.hasGuessedCorrectly);

    if (allGuessed) {
      setTimeout(() => void endTurn(roomId), 1500);
    }
    return true;
  }

  if (isCloseGuess(text, word)) {
    message = {
      id: nanoid(),
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      text,
      kind: "close",
      timestamp: Date.now(),
    };
  } else {
    message = {
      id: nanoid(),
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      text,
      kind: "guess",
      timestamp: Date.now(),
    };
  }

  room.chatMessages.push(message);
  await triggerRoomEvent(roomId, {
    event: "guess_result",
    payload: message,
  });
  return true;
}

async function endTurn(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || room.phase !== "drawing") return;

  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }

  const revealedWord = room.secretWord ?? "???";
  const drawerPoints = getDrawerPoints(room.correctGuessers.length);
  const drawer = room.players.get(room.drawerId!);
  if (drawer) {
    drawer.score += drawerPoints;
  }

  updateCrown(room);

  await triggerRoomEvent(roomId, {
    event: "turn_ended",
    payload: {
      revealedWord,
      players: getPlayersList(room),
    },
  });

  room.phase = "turn_end";
  room.currentTurnIndex++;

  setTimeout(async () => {
    await advanceTurn(roomId);
  }, 5000);
}

async function advanceTurn(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;

  if (room.currentTurnIndex >= room.playerOrder.length) {
    room.currentTurnIndex = 0;
    room.currentRound++;

    if (room.currentRound > room.settings.rounds) {
      room.phase = "ended";
      const standings = getPlayersList(room).sort((a, b) => b.score - a.score);
      await triggerRoomEvent(roomId, {
        event: "game_ended",
        payload: { finalStandings: standings },
      });
      return;
    }

    await triggerRoomEvent(roomId, {
      event: "round_info",
      payload: {
        currentRound: room.currentRound,
        totalRounds: room.settings.rounds,
        drawerName:
          room.players.get(room.playerOrder[room.currentTurnIndex])?.name ??
          "Unknown",
      },
    });
  }

  room.drawerId = room.playerOrder[room.currentTurnIndex];
  await startWordSelection(room);
}

export async function resyncRoom(
  roomId: string,
  playerId: string
): Promise<void> {
  const room = getRoom(roomId);
  if (!room || !room.players.has(playerId)) return;

  const snapshot = getRoomSnapshot(room, playerId);
  await triggerRoomEvent(roomId, {
    event: "state_sync",
    payload: snapshot,
  });
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) clearRoomTimers(room);
  rooms.delete(roomId);
}
