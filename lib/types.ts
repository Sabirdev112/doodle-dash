export type GamePhase = "waiting" | "word_select" | "drawing" | "turn_end" | "ended";

export interface RoomSettings {
  rounds: number;
  maxPlayers: number;
  wordChoiceCount: number;
  turnDuration: 60 | 90 | 120 | 150;
  customWords: string[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
  isOwner: boolean;
  hasGuessedCorrectly: boolean;
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
}

export interface FillAction {
  id: string;
  type: "fill";
  x: number;
  y: number;
  color: string;
}

export type CanvasAction = StrokeAction | FillAction;

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatar: string;
  text: string;
  kind: "guess" | "correct" | "close" | "system" | "chat";
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
  turnTimer: ReturnType<typeof setTimeout> | null;
  wordChoiceTimer: ReturnType<typeof setTimeout> | null;
  wordPool: string[];
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
  secretWord?: string;
  wordChoices?: string[];
  wordChoiceDeadline?: number;
  turnEndTime: number | null;
  turnStartTime: number | null;
  canvasActions: CanvasAction[];
  chatMessages: ChatMessage[];
  correctGuessers: string[];
  revealedWord?: string;
  finalStandings?: PublicPlayer[];
}

export type ClientAction =
  | { type: "start_game" }
  | { type: "disband_room" }
  | { type: "pick_word"; word: string }
  | { type: "draw_strokes"; strokes: StrokeAction[] }
  | { type: "fill"; action: FillAction }
  | { type: "undo" }
  | { type: "guess"; text: string }
  | { type: "resync" }
  | { type: "leave" };

export type RealtimeEvent =
  | { event: "player_joined"; payload: { player: PublicPlayer } }
  | { event: "player_left"; payload: { playerId: string; newOwnerId?: string } }
  | { event: "owner_changed"; payload: { newOwnerId: string } }
  | { event: "room_disbanded"; payload: Record<string, never> }
  | { event: "game_started"; payload: { currentRound: number } }
  | { event: "word_choices"; payload: { drawerId: string; deadline: number } }
  | { event: "turn_started"; payload: { drawerId: string; wordLength: number; turnEndTime: number } }
  | { event: "draw_strokes"; payload: { strokes: StrokeAction[] } }
  | { event: "fill"; payload: { action: FillAction } }
  | { event: "undo"; payload: { actionId: string } }
  | { event: "canvas_cleared"; payload: Record<string, never> }
  | { event: "guess_result"; payload: ChatMessage }
  | { event: "score_update"; payload: { playerId: string; score: number; crownHolderId: string | null } }
  | { event: "turn_ended"; payload: { revealedWord: string; players: PublicPlayer[] } }
  | { event: "game_ended"; payload: { finalStandings: PublicPlayer[] } }
  | { event: "state_sync"; payload: RoomSnapshot }
  | { event: "round_info"; payload: { currentRound: number; totalRounds: number; drawerName: string } };

export interface SessionPlayer {
  id: string;
  name: string;
  avatar: string;
}

export const AVATARS = [
  "cat",
  "dog",
  "fox",
  "owl",
  "panda",
  "robot",
  "alien",
  "ghost",
] as const;

export type AvatarId = (typeof AVATARS)[number];

export const DEFAULT_WORDS = [
  "apple", "banana", "car", "house", "tree", "sun", "moon", "star",
  "cat", "dog", "fish", "bird", "flower", "mountain", "river", "ocean",
  "pizza", "cake", "book", "phone", "computer", "guitar", "piano", "drum",
  "rainbow", "cloud", "snow", "fire", "water", "earth", "rocket", "planet",
  "castle", "dragon", "wizard", "pirate", "treasure", "island", "bridge", "train",
  "bicycle", "airplane", "helicopter", "submarine", "camera", "television", "clock", "lamp",
  "chair", "table", "window", "door", "garden", "forest", "desert", "volcano",
  "elephant", "giraffe", "monkey", "penguin", "dolphin", "whale", "shark", "octopus",
  "butterfly", "spider", "snake", "frog", "turtle", "rabbit", "horse", "cow",
  "sandwich", "hamburger", "noodles", "sushi", "taco", "cookie", "donut", "ice cream",
  "umbrella", "backpack", "glasses", "hat", "shoe", "sock", "jacket", "scarf",
  "hammer", "scissors", "paintbrush", "pencil", "notebook", "envelope", "balloon", "kite",
  "skateboard", "surfboard", "trophy", "medal", "crown", "diamond", "key", "lock",
  "microphone", "headphones", "speaker", "battery", "lightning", "tornado", "earthquake", "avalanche",
];

export const TURN_DURATIONS = [60, 90, 120, 150] as const;

export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const WORD_CHOICE_TIMEOUT_MS = 15_000;
