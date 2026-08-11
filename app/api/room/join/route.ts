import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlayersList, getRoomSnapshot, joinRoom } from "@/lib/rooms";
import { checkIpRateLimit } from "@/lib/rateLimit";
import { sanitizePlayerName } from "@/lib/sanitize";
import { isValidAvatar } from "@/lib/avatars";
import { createSessionToken } from "@/lib/sessionToken";

const joinSchema = z.object({
  roomId: z.string().min(6).max(12),
  playerId: z.string().min(1).max(36),
  name: z.string().min(1).max(20),
  avatar: z.string().max(64).refine(isValidAvatar, "Invalid avatar"),
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
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      const message =
        field === "playerId"
          ? "Session error — refresh the page and try again."
          : field === "avatar"
            ? "Pick an avatar before joining."
            : field === "name"
              ? "Enter a name before joining."
              : field === "roomId"
                ? "That invite link looks invalid."
                : "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
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

    const effectivePlayerId = result.playerId;
    const sessionToken = createSessionToken(result.room.id, effectivePlayerId);

    return NextResponse.json({
      roomId: result.room.id,
      playerId: effectivePlayerId,
      sessionToken,
      settings: result.room.settings,
      phase: result.room.phase,
      players: getPlayersList(result.room),
      reconnected: result.reconnected,
      snapshot: result.reconnected
        ? getRoomSnapshot(result.room, effectivePlayerId)
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
