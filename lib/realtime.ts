import Pusher from "pusher";
import type { RealtimeEvent } from "./types";
import { getServerEnv } from "./env";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher {
  if (!pusherInstance) {
    const env = getServerEnv();
    pusherInstance = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
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
