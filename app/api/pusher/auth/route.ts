import { NextRequest, NextResponse } from "next/server";
import { getRoom, isPlayerInRoom } from "@/lib/rooms";
import { getPusher, roomChannel } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const socketId = body.socket_id as string;
    const channelName = body.channel_name as string;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const match = channelName.match(/^private-room-(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
    }

    const roomId = match[1];
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 403 });
    }

    const playerId = req.headers.get("x-player-id");
    if (!playerId || !isPlayerInRoom(room, playerId)) {
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
