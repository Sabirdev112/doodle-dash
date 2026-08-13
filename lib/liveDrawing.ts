import type { Channel } from "pusher-js";
import type { StrokeAction } from "@/lib/types";

let drawChannel: Channel | null = null;

export function setLiveDrawChannel(channel: Channel | null): void {
  drawChannel = channel;
}

/** Instant fan-out to other players on the same room channel (requires Pusher client events). */
export function broadcastLiveStrokes(
  strokes: StrokeAction[],
  seq: number
): void {
  if (!drawChannel || strokes.length === 0) return;
  try {
    drawChannel.trigger("client-draw_strokes", { strokes, seq });
  } catch {
    /* client events disabled in Pusher dashboard — HTTP fallback still runs */
  }
}
