import { Redis } from "@upstash/redis";
import type { Player, Room } from "./types";

const ROOM_KEY_PREFIX = "doodle-dash:room:";
const ROOM_TTL_SECONDS = 2 * 60 * 60;

type StoredPlayer = Player;

interface StoredRoom {
  id: string;
  createdAt: number;
  updatedAt?: number;
  settings: Room["settings"];
  players: StoredPlayer[];
  playerOrder: string[];
  phase: Room["phase"];
  currentRound: number;
  currentTurnIndex: number;
  drawerId: string | null;
  secretWord: string | null;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  phaseDeadline?: number | null;
  turnStartTime: number | null;
  turnEndTime: number | null;
  canvasActions: Room["canvasActions"];
  correctGuessers: string[];
  chatMessages: Room["chatMessages"];
  crownHolderId: string | null;
  wordPool: string[];
  usedWords: string[];
  hintRevealed: boolean[];
  drawingStarted: boolean;
  lastGuessTime: number | null;
  lastTurnPointAwards: Room["lastTurnPointAwards"];
  votekickTargetId: string | null;
  votekickVotes: string[];
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url =
    process.env.KV_REST_API_URL?.trim() ??
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ??
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function isRoomPersistenceEnabled(): boolean {
  return getRedis() !== null;
}

function roomKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`;
}

export function serializeRoom(room: Room): StoredRoom {
  return {
    id: room.id,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    settings: room.settings,
    players: Array.from(room.players.values()),
    playerOrder: room.playerOrder,
    phase: room.phase,
    currentRound: room.currentRound,
    currentTurnIndex: room.currentTurnIndex,
    drawerId: room.drawerId,
    secretWord: room.secretWord,
    wordChoices: room.wordChoices,
    wordChoiceDeadline: room.wordChoiceDeadline,
    phaseDeadline: room.phaseDeadline,
    turnStartTime: room.turnStartTime,
    turnEndTime: room.turnEndTime,
    canvasActions: room.canvasActions,
    correctGuessers: room.correctGuessers,
    chatMessages: room.chatMessages,
    crownHolderId: room.crownHolderId,
    wordPool: room.wordPool,
    usedWords: room.usedWords,
    hintRevealed: room.hintRevealed,
    drawingStarted: room.drawingStarted,
    lastGuessTime: room.lastGuessTime,
    lastTurnPointAwards: room.lastTurnPointAwards,
    votekickTargetId: room.votekickTargetId,
    votekickVotes: Array.from(room.votekickVotes),
  };
}

export function deserializeRoom(stored: StoredRoom): Room {
  return {
    ...stored,
    updatedAt: stored.updatedAt ?? stored.createdAt,
    phaseDeadline: stored.phaseDeadline ?? null,
    players: new Map(stored.players.map((player) => [player.id, player])),
    votekickVotes: new Set(stored.votekickVotes),
    turnTimer: null,
    wordChoiceTimer: null,
    hintTimer: null,
  };
}

export async function loadPersistedRoom(roomId: string): Promise<Room | null> {
  const redis = getRedis();
  if (!redis) return null;

  const stored = await redis.get<StoredRoom>(roomKey(roomId));
  if (!stored) return null;
  return deserializeRoom(stored);
}

export async function savePersistedRoom(room: Room): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(roomKey(room.id), serializeRoom(room), {
    ex: ROOM_TTL_SECONDS,
  });
}

export async function deletePersistedRoom(roomId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(roomKey(roomId));
}
