import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  disbandRoom,
  getRoom,
  getRoomSnapshot,
  handleDrawStrokes,
  handleFill,
  handleGuess,
  handleUndo,
  isPlayerInRoom,
  leaveRoom,
  pickWord,
  resyncRoom,
  startGame,
  updateRoomSettings,
  handleReaction,
  handleMutePlayer,
  handleKickPlayer,
  touchPlayerActivity,
} from "@/lib/rooms";
import { requireSession } from "@/lib/apiAuth";
import {
  checkActionIpRateLimit,
  checkDrawRateLimit,
  checkGuessCooldown,
  checkGuessRateLimit,
  checkRateLimit,
  checkResyncRateLimit,
  checkUndoRateLimit,
} from "@/lib/rateLimit";
import { REACTION_EMOJIS } from "@/lib/types";
import { sanitizeGuess } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const strokeSchema = z.object({
  id: z.string().max(30),
  type: z.literal("stroke"),
  color: z.string().max(20),
  size: z.number().min(1).max(50),
  points: z.array(pointSchema).min(1).max(100),
  isEraser: z.boolean(),
  opacity: z.number().min(0.1).max(1).optional(),
});

const fillSchema = z.object({
  id: z.string().max(30),
  type: z.literal("fill"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  color: z.string().max(20),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start_game"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({ type: z.literal("disband_room"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({
    type: z.literal("update_settings"),
    roomId: z.string(),
    playerId: z.string().optional(),
    rounds: z.number().int().min(1).max(10).optional(),
    maxPlayers: z.number().int().min(2).max(12).optional(),
    wordChoiceCount: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional(),
    turnDuration: z
      .union([z.literal(60), z.literal(90), z.literal(120), z.literal(150)])
      .optional(),
    customWords: z.string().max(5000).optional(),
    hintsEnabled: z.boolean().optional(),
    wordMode: z.enum(["normal", "hidden"]).optional(),
  }),
  z.object({
    type: z.literal("pick_word"),
    roomId: z.string(),
    playerId: z.string().optional(),
    word: z.string().max(50),
  }),
  z.object({
    type: z.literal("draw_strokes"),
    roomId: z.string(),
    playerId: z.string().optional(),
    strokes: z.array(strokeSchema).min(1).max(10),
  }),
  z.object({
    type: z.literal("fill"),
    roomId: z.string(),
    playerId: z.string().optional(),
    action: fillSchema,
  }),
  z.object({ type: z.literal("undo"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({
    type: z.literal("guess"),
    roomId: z.string(),
    playerId: z.string().optional(),
    text: z.string().max(50),
  }),
  z.object({ type: z.literal("resync"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({ type: z.literal("ping"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({ type: z.literal("leave"), roomId: z.string(), playerId: z.string().optional() }),
  z.object({
    type: z.literal("reaction"),
    roomId: z.string(),
    playerId: z.string().optional(),
    emoji: z.enum(REACTION_EMOJIS),
  }),
  z.object({
    type: z.literal("mute_player"),
    roomId: z.string(),
    playerId: z.string().optional(),
    targetId: z.string(),
  }),
  z.object({
    type: z.literal("kick_player"),
    roomId: z.string(),
    playerId: z.string().optional(),
    targetId: z.string(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkActionIpRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const action = parsed.data;
    const session = requireSession(req, action.roomId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const playerId = session.playerId;

    const room = getRoom(action.roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!isPlayerInRoom(room, playerId)) {
      return NextResponse.json({ error: "Not a room member" }, { status: 403 });
    }

    if (action.type !== "leave") {
      touchPlayerActivity(action.roomId, playerId);
    }

    switch (action.type) {
      case "start_game": {
        const ok = await startGame(action.roomId, playerId);
        if (!ok) return NextResponse.json({ ok: false });
        const updatedRoom = getRoom(action.roomId);
        return NextResponse.json({
          ok: true,
          snapshot: updatedRoom ? getRoomSnapshot(updatedRoom, playerId) : undefined,
        });
      }
      case "disband_room": {
        const ok = await disbandRoom(action.roomId, playerId);
        return NextResponse.json({ ok });
      }
      case "update_settings": {
        const { type: _t, roomId, playerId: _p, ...settings } = action;
        const result = updateRoomSettings(roomId, playerId, settings);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true, settings: result.settings });
      }
      case "pick_word": {
        const ok = await pickWord(action.roomId, playerId, action.word);
        if (!ok) return NextResponse.json({ ok: false });
        const updatedRoom = getRoom(action.roomId);
        return NextResponse.json({
          ok: true,
          snapshot: updatedRoom ? getRoomSnapshot(updatedRoom, playerId) : undefined,
        });
      }
      case "draw_strokes": {
        if (!checkDrawRateLimit(playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleDrawStrokes(action.roomId, playerId, action.strokes);
        return NextResponse.json({ ok });
      }
      case "fill": {
        if (!checkDrawRateLimit(playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleFill(action.roomId, playerId, action.action);
        return NextResponse.json({ ok });
      }
      case "undo": {
        if (!checkUndoRateLimit(playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleUndo(action.roomId, playerId);
        return NextResponse.json({ ok });
      }
      case "guess": {
        if (!checkGuessCooldown(playerId) || !checkGuessRateLimit(playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const text = sanitizeGuess(action.text);
        if (!text) return NextResponse.json({ ok: false });
        const ok = await handleGuess(action.roomId, playerId, text);
        return NextResponse.json({ ok });
      }
      case "resync": {
        if (!checkResyncRateLimit(playerId)) {
          return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        const snapshot = await resyncRoom(action.roomId, playerId);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "ping": {
        return NextResponse.json({ ok: true });
      }
      case "leave": {
        leaveRoom(action.roomId, playerId);
        return NextResponse.json({ ok: true });
      }
      case "reaction": {
        if (!checkRateLimit(`reaction:${playerId}`, 3, 3, 1)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleReaction(action.roomId, playerId, action.emoji);
        return NextResponse.json({ ok });
      }
      case "mute_player": {
        const ok = await handleMutePlayer(action.roomId, playerId, action.targetId);
        return NextResponse.json({ ok });
      }
      case "kick_player": {
        const ok = await handleKickPlayer(action.roomId, playerId, action.targetId);
        return NextResponse.json({ ok });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
