import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  disbandRoom,
  getRoom,
  handleDrawStrokes,
  handleFill,
  handleGuess,
  handleUndo,
  isPlayerInRoom,
  leaveRoom,
  pickWord,
  resyncRoom,
  startGame,
} from "@/lib/rooms";
import {
  checkDrawRateLimit,
  checkGuessRateLimit,
} from "@/lib/rateLimit";
import { sanitizeGuess } from "@/lib/sanitize";

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
});

const fillSchema = z.object({
  id: z.string().max(30),
  type: z.literal("fill"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  color: z.string().max(20),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start_game"), roomId: z.string(), playerId: z.string() }),
  z.object({ type: z.literal("disband_room"), roomId: z.string(), playerId: z.string() }),
  z.object({
    type: z.literal("pick_word"),
    roomId: z.string(),
    playerId: z.string(),
    word: z.string().max(50),
  }),
  z.object({
    type: z.literal("draw_strokes"),
    roomId: z.string(),
    playerId: z.string(),
    strokes: z.array(strokeSchema).min(1).max(10),
  }),
  z.object({
    type: z.literal("fill"),
    roomId: z.string(),
    playerId: z.string(),
    action: fillSchema,
  }),
  z.object({ type: z.literal("undo"), roomId: z.string(), playerId: z.string() }),
  z.object({
    type: z.literal("guess"),
    roomId: z.string(),
    playerId: z.string(),
    text: z.string().max(50),
  }),
  z.object({ type: z.literal("resync"), roomId: z.string(), playerId: z.string() }),
  z.object({ type: z.literal("leave"), roomId: z.string(), playerId: z.string() }),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const action = parsed.data;
    const room = getRoom(action.roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!isPlayerInRoom(room, action.playerId)) {
      return NextResponse.json({ error: "Not a room member" }, { status: 403 });
    }

    switch (action.type) {
      case "start_game": {
        const ok = await startGame(action.roomId, action.playerId);
        return NextResponse.json({ ok });
      }
      case "disband_room": {
        const ok = await disbandRoom(action.roomId, action.playerId);
        return NextResponse.json({ ok });
      }
      case "pick_word": {
        const ok = await pickWord(action.roomId, action.playerId, action.word);
        return NextResponse.json({ ok });
      }
      case "draw_strokes": {
        if (!checkDrawRateLimit(action.playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleDrawStrokes(
          action.roomId,
          action.playerId,
          action.strokes
        );
        return NextResponse.json({ ok });
      }
      case "fill": {
        if (!checkDrawRateLimit(action.playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const ok = await handleFill(action.roomId, action.playerId, action.action);
        return NextResponse.json({ ok });
      }
      case "undo": {
        const ok = await handleUndo(action.roomId, action.playerId);
        return NextResponse.json({ ok });
      }
      case "guess": {
        if (!checkGuessRateLimit(action.playerId)) {
          return NextResponse.json({ ok: false, dropped: true });
        }
        const text = sanitizeGuess(action.text);
        if (!text) return NextResponse.json({ ok: false });
        const ok = await handleGuess(action.roomId, action.playerId, text);
        return NextResponse.json({ ok });
      }
      case "resync": {
        await resyncRoom(action.roomId, action.playerId);
        return NextResponse.json({ ok: true });
      }
      case "leave": {
        leaveRoom(action.roomId, action.playerId);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
