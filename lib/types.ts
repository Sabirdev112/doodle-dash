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
  /** Max letter hints to reveal (short words are capped further). */
  maxHints: 1 | 2 | 3 | 4;
  wordMode: WordMode;
}

/** Default options used for quick-create and as the /create form starting values. */
export const DEFAULT_ROOM_CREATE_OPTIONS = {
  rounds: 3,
  maxPlayers: 8,
  wordChoiceCount: 3 as const,
  turnDuration: 90 as TurnDuration,
  hintsEnabled: true,
  maxHints: 3 as const,
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
  /** Index of points[0] in the full stroke — set on live chunks for out-of-order merge. */
  startIndex?: number;
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
  | "chat"
  | "reaction";

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
  /** Bumped on every persist so instances can merge Redis vs memory safely. */
  updatedAt: number;
  settings: RoomSettings;
  players: Map<string, Player>;
  playerOrder: string[];
  phase: GamePhase;
  currentRound: number;
  currentTurnIndex: number;
  /** Unique id for the in-progress word_select → drawing → turn_end cycle. */
  turnId: string;
  /** Last stroke-batch sequence number for the current turn. */
  strokeSeq: number;
  drawerId: string | null;
  secretWord: string | null;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  /** When to auto-advance from turn_end → next word_select (serverless-safe). */
  phaseDeadline: number | null;
  turnStartTime: number | null;
  turnEndTime: number | null;
  canvasActions: CanvasAction[];
  correctGuessers: string[];
  /** Points awarded to each correct guesser this turn (same order as correctGuessers). */
  correctGuessPoints: number[];
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
  turnId?: string;
  strokeSeq?: number;
  drawerId: string | null;
  wordLength: number;
  wordDisplay: string;
  secretWord?: string;
  wordChoices?: string[];
  wordChoiceDeadline?: number;
  phaseDeadline?: number | null;
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
  /** Server room revision — ignore stale snapshots with a lower value. */
  updatedAt?: number;
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
/** How long the turn-end score popup stays up before the next word pick. */
export const TURN_END_HOLD_MS = 2_000;
/** Brief pause after everyone has guessed before ending the turn. */
export const ALL_GUESSED_HOLD_MS = 1_500;
/** Live client-event interval. Pusher free-tier caps client events at ~10/sec. */
export const STROKE_FLUSH_INTERVAL_MS = 100;
/** HTTP persist interval — slower than live so Vercel/IP limits don't drop ink. */
export const STROKE_PERSIST_INTERVAL_MS = 220;
/** How long guessers wait for a missing stroke seq before skipping the gap. */
export const STROKE_REORDER_STALL_MS = 200;
/** First letter hint at this fraction of the turn. */
export const HINT_FIRST_AT = 0.3;
/** Additional letter hints every this fraction after the first. */
export const HINT_EVERY = 0.1;
/** First-place points at t=0; halved for 2nd, halved again for 3rd. */
export const FIRST_GUESS_POINTS = 300;
/** At 50% elapsed, first place is reduced by this fraction (0.3 = 30%). */
export const FIRST_PLACE_HALF_TIME_REDUCTION = 0.3;
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
