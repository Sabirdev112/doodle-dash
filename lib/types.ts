export type GamePhase = "waiting" | "word_select" | "drawing" | "turn_end" | "ended";
export type WordMode = "normal" | "hidden";
export type TurnDuration = 60 | 90 | 120 | 150;

export interface RoomSettings {
  rounds: number;
  maxPlayers: number;
  wordChoiceCount: 3 | 4 | 5;
  turnDuration: TurnDuration;
  customWords: string[];
  hintsEnabled: boolean;
  wordMode: WordMode;
}

/** Default options used for quick-create and as the /create form starting values. */
export const DEFAULT_ROOM_CREATE_OPTIONS = {
  rounds: 3,
  maxPlayers: 8,
  wordChoiceCount: 3 as const,
  turnDuration: 90 as TurnDuration,
  hintsEnabled: true,
  wordMode: "normal" as WordMode,
};

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
  isOwner: boolean;
  hasGuessedCorrectly: boolean;
  isMuted: boolean;
  crownReachedAt?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface StrokeAction {
  id: string;
  type: "stroke";
  color: string;
  size: number;
  points: Point[];
  isEraser: boolean;
  /** Pencil strokes use partial opacity; pen defaults to 1. */
  opacity?: number;
}

export interface FillAction {
  id: string;
  type: "fill";
  x: number;
  y: number;
  color: string;
}

export type CanvasAction = StrokeAction | FillAction;

export type ChatMessageKind =
  | "guess"
  | "correct"
  | "close"
  | "system"
  | "chat";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatar: string;
  text: string;
  kind: ChatMessageKind;
  timestamp: number;
}

export interface ReactionEvent {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
  timestamp: number;
}

export interface Room {
  id: string;
  createdAt: number;
  settings: RoomSettings;
  players: Map<string, Player>;
  playerOrder: string[];
  phase: GamePhase;
  currentRound: number;
  currentTurnIndex: number;
  drawerId: string | null;
  secretWord: string | null;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  turnStartTime: number | null;
  turnEndTime: number | null;
  canvasActions: CanvasAction[];
  correctGuessers: string[];
  chatMessages: ChatMessage[];
  crownHolderId: string | null;
  wordPool: string[];
  usedWords: string[];
  /** Which letter indices are revealed for hints (same length as secret word). */
  hintRevealed: boolean[];
  drawingStarted: boolean;
  lastGuessTime: number | null;
  /** Points earned on the last completed turn (shown in turn-end overlay). */
  lastTurnPointAwards: TurnPointAward[];
  turnTimer: ReturnType<typeof setTimeout> | null;
  wordChoiceTimer: ReturnType<typeof setTimeout> | null;
  hintTimer: ReturnType<typeof setInterval> | null;
  votekickTargetId: string | null;
  votekickVotes: Set<string>;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isOwner: boolean;
  hasGuessedCorrectly: boolean;
  isDrawer: boolean;
  hasCrown: boolean;
  isMuted: boolean;
}

export interface TurnPointAward {
  playerId: string;
  name: string;
  avatar: string;
  points: number;
}

export interface RoomSnapshot {
  roomId: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: PublicPlayer[];
  currentRound: number;
  totalRounds: number;
  drawerId: string | null;
  wordLength: number;
  wordDisplay: string;
  secretWord?: string;
  wordChoices?: string[];
  wordChoiceDeadline?: number;
  turnEndTime: number | null;
  turnStartTime: number | null;
  /** Omitted from lightweight Pusher broadcasts — use resync or stroke events. */
  canvasActions?: CanvasAction[];
  /** Omitted from lightweight Pusher broadcasts — use resync or guess events. */
  chatMessages?: ChatMessage[];
  correctGuessers: string[];
  drawingStarted: boolean;
  revealedWord?: string;
  turnPointAwards?: TurnPointAward[];
  finalStandings?: PublicPlayer[];
}

export interface SessionPlayer {
  id: string;
  name: string;
  avatar: string;
}

export const AVATARS = [
  "beep",
  "whiskers",
  "zorg",
  "chaos",
  "explorer",
  "cool-cat",
  "sprout",
  "rocker",
  "intern",
  "diva",
] as const;

export type AvatarId = (typeof AVATARS)[number];

export const TURN_DURATIONS: TurnDuration[] = [60, 90, 120, 150];
export const REACTION_EMOJIS = ["👍", "🎉", "😂", "🔥", "👏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
/** Treat a player as gone after this long without activity (tab closed, etc.). */
export const PLAYER_IDLE_MS = 5 * 60 * 1000;
/** Allow reclaiming a name after this long without heartbeat (page refresh). */
export const PLAYER_RECONNECT_GRACE_MS = 30 * 1000;
export const WORD_CHOICE_TIMEOUT_MS = 15_000;
/** Max chat lines kept server-side per room. */
export const MAX_CHAT_MESSAGES = 200;
/** Max canvas actions stored for the current turn. */
export const MAX_CANVAS_ACTIONS_PER_TURN = 3000;
/** Minimum ms between guesses from the same player. */
export const GUESS_COOLDOWN_MS = 800;

export type RealtimeEvent = {
  event: string;
  payload: unknown;
};
