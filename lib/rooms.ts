import { customAlphabet } from "nanoid";
import { nanoid } from "nanoid";
import { triggerRoomEvent, triggerRoomEvents } from "./realtime";
import { prepareStrokeUploadBatch } from "./strokeUpload";
import {
  getDrawerPoints,
  getGuesserPoints,
  updateCrownHolder,
} from "./scoring";
import { sanitizeCustomWords } from "./sanitize";
import {
  isCloseGuess,
  isExactMatch,
  buildWordDisplay,
} from "./wordMatch";
import type {
  CanvasAction,
  ChatMessage,
  FillAction,
  Player,
  PublicPlayer,
  ReactionEvent,
  Room,
  RoomSettings,
  RoomSnapshot,
  StrokeAction,
} from "./types";
import {
  ROOM_TTL_MS,
  PLAYER_IDLE_MS,
  WORD_CHOICE_TIMEOUT_MS,
  REACTION_EMOJIS,
  MAX_CHAT_MESSAGES,
  MAX_CANVAS_ACTIONS_PER_TURN,
} from "./types";
import { buildWordPool, DEFAULT_WORDS } from "./words";

const generateRoomId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  8
);

/** Persist across Next.js dev hot reloads so invite links keep working. */
const globalForRooms = globalThis as typeof globalThis & {
  __doodleDashRooms?: Map<string, Room>;
};

const rooms = globalForRooms.__doodleDashRooms ?? new Map<string, Room>();
globalForRooms.__doodleDashRooms = rooms;

setInterval(() => {
  cleanupExpiredRooms();
  for (const room of rooms.values()) {
    pruneInactivePlayers(room);
  }
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
  if (room.hintTimer) clearInterval(room.hintTimer);
  room.turnTimer = null;
  room.wordChoiceTimer = null;
  room.hintTimer = null;
}

function touchPlayer(room: Room, playerId: string): void {
  const player = room.players.get(playerId);
  if (player) player.lastSeenAt = Date.now();
}

export function touchPlayerActivity(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (room) touchPlayer(room, playerId);
}

function pruneInactivePlayers(room: Room): void {
  const now = Date.now();
  const staleIds = room.playerOrder.filter((id) => {
    const player = room.players.get(id);
    if (!player) return false;
    const lastSeen = player.lastSeenAt ?? player.joinedAt;
    return now - lastSeen > PLAYER_IDLE_MS;
  });

  for (const id of staleIds) {
    leaveRoom(room.id, id);
  }
}

function trimChatMessages(room: Room): void {
  if (room.chatMessages.length > MAX_CHAT_MESSAGES) {
    room.chatMessages = room.chatMessages.slice(-MAX_CHAT_MESSAGES);
  }
}

function isPlayerIdle(player: Player): boolean {
  const lastSeen = player.lastSeenAt ?? player.joinedAt;
  return Date.now() - lastSeen > PLAYER_IDLE_MS;
}

function findReclaimablePlayerByName(room: Room, name: string): Player | undefined {
  const key = name.trim().toLowerCase();
  const matches = room.playerOrder
    .map((id) => room.players.get(id))
    .filter(
      (player): player is Player =>
        !!player &&
        player.name.trim().toLowerCase() === key &&
        isPlayerIdle(player)
    );
  return matches.length === 1 ? matches[0] : undefined;
}

function isNameTaken(room: Room, name: string): boolean {
  const key = name.trim().toLowerCase();
  return [...room.players.values()].some(
    (player) => player.name.trim().toLowerCase() === key
  );
}

async function advanceAfterDrawerRemoved(room: Room): Promise<void> {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.hintTimer) {
    clearInterval(room.hintTimer);
    room.hintTimer = null;
  }
  if (room.wordChoiceTimer) {
    clearTimeout(room.wordChoiceTimer);
    room.wordChoiceTimer = null;
  }

  if (room.playerOrder.length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.id);
    return;
  }

  if (room.currentTurnIndex >= room.playerOrder.length) {
    room.currentTurnIndex = 0;
    room.currentRound++;
    if (room.currentRound > room.settings.rounds) {
      room.phase = "ended";
      await broadcastRoomState(room.id);
      return;
    }
    await triggerRoomEvent(room.id, {
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
    isMuted: player.isMuted,
  };
}

export function getPlayersList(room: Room): PublicPlayer[] {
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
  settings: Omit<RoomSettings, "customWords"> & {
    customWords?: string | string[];
    hintsEnabled?: boolean;
    wordMode?: RoomSettings["wordMode"];
  },
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
      hintsEnabled: settings.hintsEnabled ?? true,
      wordMode: settings.wordMode ?? "normal",
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
    hintTimer: null,
    wordPool: buildWordPool(customWords),
    usedWords: [],
    hintRevealed: [],
    drawingStarted: false,
    lastGuessTime: null,
    lastTurnPointAwards: [],
    votekickTargetId: null,
    votekickVotes: new Set(),
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
    lastSeenAt: Date.now(),
    isOwner,
    hasGuessedCorrectly: false,
    isMuted: false,
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
):
  | { ok: true; room: Room; reconnected: boolean; playerId: string }
  | { ok: false; error: string } {
  const room = getRoom(roomId);
  if (!room) return { ok: false, error: "Room not found or expired" };

  pruneInactivePlayers(room);
  if (!rooms.has(roomId)) {
    return { ok: false, error: "Room not found or expired" };
  }

  if (room.players.has(playerId)) {
    const existing = room.players.get(playerId)!;
    existing.name = name;
    existing.avatar = avatar;
    touchPlayer(room, playerId);
    return { ok: true, room, reconnected: true, playerId };
  }

  if (room.phase !== "waiting") {
    const reclaim = findReclaimablePlayerByName(room, name);
    if (reclaim) {
      reclaim.name = name;
      reclaim.avatar = avatar;
      touchPlayer(room, reclaim.id);
      void triggerRoomEvent(roomId, {
        event: "player_joined",
        payload: { player: toPublicPlayer(room, reclaim) },
      });
      return { ok: true, room, reconnected: true, playerId: reclaim.id };
    }
    return {
      ok: false,
      error:
        "Game already in progress — use the same name you played with to rejoin.",
    };
  }

  if (room.players.size >= room.settings.maxPlayers) {
    return { ok: false, error: "Room is full" };
  }

  if (isNameTaken(room, name)) {
    return { ok: false, error: "That name is taken — pick another." };
  }

  const player = addPlayerToRoom(room, playerId, name, avatar, false);
  void triggerRoomEvent(roomId, {
    event: "player_joined",
    payload: { player: toPublicPlayer(room, player) },
  });

  return { ok: true, room, reconnected: false, playerId };
}

export function leaveRoom(
  roomId: string,
  playerId: string
): { disbanded: boolean } {
  const room = getRoom(roomId);
  if (!room) return { disbanded: true };

  const wasOwner = room.players.get(playerId)?.isOwner;
  const wasDrawer =
    room.drawerId === playerId &&
    (room.phase === "drawing" || room.phase === "word_select");

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

  if (wasDrawer && room.phase !== "waiting" && room.phase !== "ended") {
    void advanceAfterDrawerRemoved(room);
  }

  return { disbanded: false };
}

export function updateRoomSettings(
  roomId: string,
  playerId: string,
  settings: Partial<Omit<RoomSettings, "customWords">> & {
    customWords?: string | string[];
  }
): { ok: true; settings: RoomSettings } | { ok: false; error: string } {
  const room = getRoom(roomId);
  if (!room) return { ok: false, error: "Room not found or expired" };
  const player = room.players.get(playerId);
  if (!player?.isOwner) return { ok: false, error: "Only the host can change settings" };
  if (room.phase !== "waiting") {
    return { ok: false, error: "Settings are locked once the game starts" };
  }

  if (settings.rounds !== undefined) {
    room.settings.rounds = Math.min(10, Math.max(1, settings.rounds));
  }
  if (settings.maxPlayers !== undefined) {
    const max = Math.min(12, Math.max(2, settings.maxPlayers));
    if (max < room.players.size) {
      return { ok: false, error: "Max players cannot be below current player count" };
    }
    room.settings.maxPlayers = max;
  }
  if (settings.wordChoiceCount !== undefined) {
    room.settings.wordChoiceCount = settings.wordChoiceCount;
  }
  if (settings.turnDuration !== undefined) {
    room.settings.turnDuration = settings.turnDuration;
  }
  if (settings.customWords !== undefined) {
    const words = sanitizeCustomWords(
      Array.isArray(settings.customWords)
        ? settings.customWords.join("\n")
        : settings.customWords
    );
    room.settings.customWords = words;
    room.wordPool = buildWordPool(words);
  }
  if (settings.hintsEnabled !== undefined) {
    room.settings.hintsEnabled = settings.hintsEnabled;
  }
  if (settings.wordMode !== undefined) {
    room.settings.wordMode = settings.wordMode;
  }

  return { ok: true, settings: room.settings };
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
  const isDrawer = room.drawerId === playerId;
  const { wordLength, wordDisplay } = buildWordDisplay(
    room.secretWord,
    room.hintRevealed,
    room.settings.wordMode,
    room.drawingStarted
  );

  const snapshot: RoomSnapshot = {
    roomId: room.id,
    phase: room.phase,
    settings: room.settings,
    players: getPlayersList(room),
    currentRound: room.currentRound,
    totalRounds: room.settings.rounds,
    drawerId: room.drawerId,
    wordLength,
    wordDisplay,
    turnEndTime: room.turnEndTime,
    turnStartTime: room.turnStartTime,
    canvasActions: room.canvasActions,
    chatMessages: room.chatMessages,
    correctGuessers: room.correctGuessers,
    drawingStarted: room.drawingStarted,
  };

  if (isDrawer && room.secretWord) {
    snapshot.secretWord = room.secretWord;
  }
  if (isDrawer && room.phase === "word_select") {
    snapshot.wordChoices = room.wordChoices;
    snapshot.wordChoiceDeadline = room.wordChoiceDeadline ?? undefined;
  }
  if (room.phase === "turn_end" && room.secretWord) {
    snapshot.revealedWord = room.secretWord;
    snapshot.secretWord = room.secretWord;
    snapshot.turnPointAwards = room.lastTurnPointAwards;
  }
  if (room.phase === "ended") {
    snapshot.finalStandings = getPlayersList(room).sort(
      (a, b) => b.score - a.score
    );
  }

  return snapshot;
}

/** Room snapshot safe to broadcast — no secret word (drawer resyncs for that). */
export function getBroadcastSnapshot(room: Room): RoomSnapshot {
  const { wordLength, wordDisplay } = buildWordDisplay(
    room.secretWord,
    room.hintRevealed,
    room.settings.wordMode,
    room.drawingStarted
  );

  const snapshot: RoomSnapshot = {
    roomId: room.id,
    phase: room.phase,
    settings: room.settings,
    players: getPlayersList(room),
    currentRound: room.currentRound,
    totalRounds: room.settings.rounds,
    drawerId: room.drawerId,
    wordLength,
    wordDisplay,
    turnEndTime: room.turnEndTime,
    turnStartTime: room.turnStartTime,
    correctGuessers: room.correctGuessers,
    drawingStarted: room.drawingStarted,
  };

  if (room.phase === "turn_end" && room.secretWord) {
    snapshot.revealedWord = room.secretWord;
    snapshot.secretWord = room.secretWord;
    snapshot.turnPointAwards = room.lastTurnPointAwards;
  }
  if (room.phase === "ended") {
    snapshot.finalStandings = getPlayersList(room).sort(
      (a, b) => b.score - a.score
    );
  }

  return snapshot;
}

export async function broadcastRoomState(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;
  await triggerRoomEvent(roomId, {
    event: "state_sync",
    payload: getBroadcastSnapshot(room),
  });
}

async function startWordSelection(room: Room): Promise<void> {
  const drawerId = room.drawerId!;
  room.phase = "word_select";
  room.secretWord = null;
  room.correctGuessers = [];
  room.chatMessages = [];
  room.turnStartTime = null;
  room.turnEndTime = null;
  room.drawingStarted = false;
  room.hintRevealed = [];
  room.lastGuessTime = null;

  for (const id of room.playerOrder) {
    const p = room.players.get(id);
    if (p) p.hasGuessedCorrectly = false;
  }

  room.wordChoices = pickWords(
    room.wordPool,
    room.settings.wordChoiceCount,
    room.usedWords
  );

  if (room.wordChoices.length === 0) {
    room.wordChoices = pickWords(DEFAULT_WORDS, room.settings.wordChoiceCount);
  }

  room.wordChoiceDeadline = Date.now() + WORD_CHOICE_TIMEOUT_MS;

  await broadcastRoomState(room.id);

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
  room.currentTurnIndex = Math.floor(Math.random() * room.playerOrder.length);
  room.drawerId = room.playerOrder[room.currentTurnIndex];

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
  room.usedWords.push(chosen.toLowerCase());
  room.phase = "drawing";
  room.turnStartTime = Date.now();
  room.turnEndTime = Date.now() + room.settings.turnDuration * 1000;
  room.canvasActions = [];
  room.drawingStarted = false;
  room.hintRevealed = new Array(chosen.length).fill(false);
  room.lastGuessTime = null;

  const { wordLength, wordDisplay } = buildWordDisplay(
    chosen,
    room.hintRevealed,
    room.settings.wordMode,
    room.drawingStarted
  );

  await triggerRoomEvents(roomId, [
    { event: "canvas_cleared", payload: {} },
    {
      event: "turn_started",
      payload: {
        drawerId: playerId,
        wordLength,
        wordDisplay,
        turnEndTime: room.turnEndTime,
        drawingStarted: room.drawingStarted,
      },
    },
  ]);

  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => {
    void endTurn(roomId);
  }, room.settings.turnDuration * 1000);

  if (room.settings.hintsEnabled) {
    startHintTimer(room);
  }

  await broadcastRoomState(roomId);
  return true;
}

function startHintTimer(room: Room): void {
  if (room.hintTimer) clearInterval(room.hintTimer);
  const word = room.secretWord;
  if (!word) return;

  const durationMs = room.settings.turnDuration * 1000;
  const intervalMs = Math.max(5000, Math.floor(durationMs / 4));

  room.hintTimer = setInterval(() => {
    const r = getRoom(room.id);
    if (!r || r.phase !== "drawing" || !r.secretWord) return;

    const hidden = r.secretWord
      .split("")
      .map((ch, i) => ({ ch, i }))
      .filter(({ ch, i }) => ch !== " " && !r.hintRevealed[i]);

    if (hidden.length === 0) return;

    const pick = hidden[Math.floor(Math.random() * hidden.length)];
    r.hintRevealed[pick.i] = true;

    const { wordLength, wordDisplay } = buildWordDisplay(
      r.secretWord,
      r.hintRevealed,
      r.settings.wordMode,
      r.drawingStarted
    );

    void triggerRoomEvent(r.id, {
      event: "hint_update",
      payload: { wordLength, wordDisplay },
    });
  }, intervalMs);
}

async function broadcastWordDisplay(room: Room): Promise<void> {
  const { wordLength, wordDisplay } = buildWordDisplay(
    room.secretWord,
    room.hintRevealed,
    room.settings.wordMode,
    room.drawingStarted
  );
  await triggerRoomEvent(room.id, {
    event: "hint_update",
    payload: { wordLength, wordDisplay, drawingStarted: room.drawingStarted },
  });
}

export async function handleDrawStrokes(
  roomId: string,
  playerId: string,
  strokes: StrokeAction[]
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  if (room.phase !== "drawing" || room.drawerId !== playerId) return false;
  if (room.canvasActions.length >= MAX_CANVAS_ACTIONS_PER_TURN) return false;

  if (!room.drawingStarted && strokes.some((s) => s.points.length > 0)) {
    room.drawingStarted = true;
    await broadcastWordDisplay(room);
  }

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

  const strokeChunks = prepareStrokeUploadBatch(strokes);
  await triggerRoomEvents(
    roomId,
    strokeChunks.flatMap((chunk) =>
      chunk.map((stroke) => ({
        event: "draw_strokes",
        payload: { strokes: [stroke] },
      }))
    )
  );
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
  if (room.canvasActions.length >= MAX_CANVAS_ACTIONS_PER_TURN) return false;

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
  if (!player || player.hasGuessedCorrectly || player.isMuted) return false;

  const word = room.secretWord;
  let message: ChatMessage;

  if (isExactMatch(text, word)) {
    player.hasGuessedCorrectly = true;
    room.correctGuessers.push(playerId);
    room.lastGuessTime = Date.now();

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
    trimChatMessages(room);

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
  trimChatMessages(room);
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
  if (room.hintTimer) {
    clearInterval(room.hintTimer);
    room.hintTimer = null;
  }

  const revealedWord = room.secretWord ?? "???";
  const drawerPoints = getDrawerPoints(
    room.correctGuessers.length,
    room.settings.turnDuration,
    room.turnEndTime,
    room.lastGuessTime
  );
  const drawer = room.players.get(room.drawerId!);
  if (drawer) {
    drawer.score += drawerPoints;
  }

  updateCrown(room);

  const turnPointAwards = room.correctGuessers
    .map((playerId, index) => {
      const p = room.players.get(playerId);
      if (!p) return null;
      return {
        playerId,
        name: p.name,
        avatar: p.avatar,
        points: getGuesserPoints(index + 1),
      };
    })
    .filter((award): award is NonNullable<typeof award> => award !== null);

  if (drawer && drawerPoints > 0) {
    turnPointAwards.push({
      playerId: drawer.id,
      name: drawer.name,
      avatar: drawer.avatar,
      points: drawerPoints,
    });
  }

  turnPointAwards.sort((a, b) => b.points - a.points);
  room.lastTurnPointAwards = turnPointAwards;

  await triggerRoomEvent(roomId, {
    event: "turn_ended",
    payload: {
      revealedWord,
      turnPointAwards,
      players: getPlayersList(room),
    },
  });

  room.phase = "turn_end";
  room.currentTurnIndex++;

  await broadcastRoomState(roomId);

  setTimeout(async () => {
    await advanceTurn(roomId);
  }, 3000);
}

async function advanceTurn(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || room.phase !== "turn_end") return;

  if (room.currentTurnIndex >= room.playerOrder.length) {
    room.currentTurnIndex = 0;
    room.currentRound++;

    if (room.currentRound > room.settings.rounds) {
      room.phase = "ended";
      await broadcastRoomState(roomId);
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
): Promise<RoomSnapshot | null> {
  const room = getRoom(roomId);
  if (!room || !room.players.has(playerId)) return null;

  touchPlayer(room, playerId);
  return getRoomSnapshot(room, playerId);
}

export async function handleReaction(
  roomId: string,
  playerId: string,
  emoji: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room || !room.players.has(playerId)) return false;
  if (!REACTION_EMOJIS.includes(emoji as (typeof REACTION_EMOJIS)[number])) {
    return false;
  }

  const player = room.players.get(playerId)!;
  const reaction: ReactionEvent = {
    id: nanoid(),
    playerId,
    playerName: player.name,
    emoji,
    timestamp: Date.now(),
  };

  await triggerRoomEvent(roomId, {
    event: "reaction",
    payload: reaction,
  });
  return true;
}

export async function handleMutePlayer(
  roomId: string,
  ownerId: string,
  targetId: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  const owner = room.players.get(ownerId);
  if (!owner?.isOwner) return false;
  const target = room.players.get(targetId);
  if (!target) return false;

  target.isMuted = true;
  await triggerRoomEvent(roomId, {
    event: "player_muted",
    payload: { playerId: targetId },
  });
  return true;
}

export async function handleKickPlayer(
  roomId: string,
  actorId: string,
  targetId: string
): Promise<boolean> {
  const room = getRoom(roomId);
  if (!room) return false;
  const actor = room.players.get(actorId);
  if (!actor?.isOwner) return false;
  if (!room.players.has(targetId) || targetId === actorId) return false;

  leaveRoom(roomId, targetId);
  return true;
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) clearRoomTimers(room);
  rooms.delete(roomId);
}
