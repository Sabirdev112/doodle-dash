import Pusher from "pusher";
import type { RealtimeEvent } from "./types";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher {
  if (!pusherInstance) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      throw new Error("Missing Pusher environment variables");
    }

    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return pusherInstance;
}

export function roomChannel(roomId: string): string {
  return `private-room-${roomId}`;
}

export async function triggerRoomEvent(
  roomId: string,
  data: RealtimeEvent
): Promise<void> {
  try {
    const pusher = getPusher();
    await pusher.trigger(roomChannel(roomId), data.event, data.payload);
  } catch (err) {
    console.error("Pusher trigger error:", err);
  }
}

export async function triggerRoomEvents(
  roomId: string,
  events: RealtimeEvent[]
): Promise<void> {
  for (const event of events) {
    await triggerRoomEvent(roomId, event);
  }
}

export { getPusher };
