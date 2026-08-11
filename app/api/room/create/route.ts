import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRoom, getPlayersList } from "@/lib/rooms";
import { checkIpRateLimit } from "@/lib/rateLimit";
import { sanitizePlayerName } from "@/lib/sanitize";
import { isValidAvatar } from "@/lib/avatars";
import { createSessionToken } from "@/lib/sessionToken";

const createSchema = z.object({
  playerId: z.string().min(1).max(36),
  name: z.string().min(1).max(20),
  avatar: z.string().max(64).refine(isValidAvatar, "Invalid avatar"),
  rounds: z.number().int().min(1).max(10),
  maxPlayers: z.number().int().min(2).max(12),
  wordChoiceCount: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  turnDuration: z.union([
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(150),
  ]),
  customWords: z.string().max(5000).optional(),
  hintsEnabled: z.boolean().optional(),
  wordMode: z.enum(["normal", "hidden"]).optional(),
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
    if (!checkIpRateLimit(ip, "create", 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const {
      playerId,
      name,
      avatar,
      rounds,
      maxPlayers,
      wordChoiceCount,
      turnDuration,
      customWords,
      hintsEnabled,
      wordMode,
    } = parsed.data;

    const sanitizedName = sanitizePlayerName(name);
    if (sanitizedName.length < 1) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const room = createRoom(
      {
        rounds,
        maxPlayers,
        wordChoiceCount,
        turnDuration,
        customWords: customWords || undefined,
        hintsEnabled: hintsEnabled ?? true,
        wordMode: wordMode ?? "normal",
      },
      playerId,
      sanitizedName,
      avatar
    );

    return NextResponse.json({
      roomId: room.id,
      playerId,
      sessionToken: createSessionToken(room.id, playerId),
      settings: room.settings,
      phase: room.phase,
      players: getPlayersList(room),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
