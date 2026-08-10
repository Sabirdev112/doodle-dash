import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { joinRoom } from "@/lib/rooms";
import { checkIpRateLimit } from "@/lib/rateLimit";
import { sanitizePlayerName } from "@/lib/sanitize";
import { AVATARS } from "@/lib/types";

const joinSchema = z.object({
  roomId: z.string().min(6).max(12),
  playerId: z.string().min(1).max(30),
  name: z.string().min(1).max(20),
  avatar: z.enum(AVATARS),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkIpRateLimit(ip, "join", 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { roomId, playerId, name, avatar } = parsed.data;
    const sanitizedName = sanitizePlayerName(name);
    if (sanitizedName.length < 1) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const result = joinRoom(roomId, playerId, sanitizedName, avatar);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      roomId: result.room.id,
      playerId,
      settings: result.room.settings,
      phase: result.room.phase,
      players: result.room.playerOrder
        .map((id) => result.room.players.get(id))
        .filter(Boolean)
        .map((p) => ({
          id: p!.id,
          name: p!.name,
          avatar: p!.avatar,
          score: p!.score,
          isOwner: p!.isOwner,
          hasGuessedCorrectly: p!.hasGuessedCorrectly,
          isDrawer: result.room.drawerId === p!.id,
          hasCrown: result.room.crownHolderId === p!.id,
        })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
