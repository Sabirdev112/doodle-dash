import { NextRequest, NextResponse } from "next/server";
import { ensureRoom, isPlayerInRoom } from "@/lib/rooms";
import { getPusher, roomChannel } from "@/lib/realtime";
import { requireSession } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function parseChannelAuthBody(
  req: NextRequest
): Promise<{ socketId: string; channelName: string } | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, string>;
    const socketId = body.socket_id;
    const channelName = body.channel_name;
    if (!socketId || !channelName) return null;
    return { socketId, channelName };
  }

  const form = await req.formData();
  const socketId = form.get("socket_id")?.toString();
  const channelName = form.get("channel_name")?.toString();
  if (!socketId || !channelName) return null;
  return { socketId, channelName };
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseChannelAuthBody(req);
    if (!parsed) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { socketId, channelName } = parsed;

    const match = channelName.match(/^private-room-(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
    }

    const roomId = match[1];
    const room = await ensureRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 403 });
    }

    const session = requireSession(req, roomId);
    if (!session || !isPlayerInRoom(room, session.playerId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (roomChannel(roomId) !== channelName) {
      return NextResponse.json({ error: "Channel mismatch" }, { status: 403 });
    }

    const pusher = getPusher();
    const auth = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
