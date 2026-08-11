import type { CanvasAction, StrokeAction } from "@/lib/types";

const POINT_EPSILON = 0.0005;

function pointsNear(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < POINT_EPSILON;
}

/** Merge an uploaded stroke chunk into an existing stroke when they share an id. */
export function mergeStrokeActions(
  existing: StrokeAction,
  incoming: StrokeAction
): StrokeAction {
  if (existing.id !== incoming.id) return incoming;
  if (incoming.points.length === 0) return existing;

  if (incoming.points.length <= existing.points.length) {
    const lastIncoming = incoming.points[incoming.points.length - 1];
    const lastExisting = existing.points[existing.points.length - 1];
    if (
      incoming.points.length === existing.points.length &&
      pointsNear(lastIncoming, lastExisting)
    ) {
      return existing;
    }
    if (incoming.points.length < existing.points.length) {
      return existing;
    }
  }

  if (existing.points.length === 0) {
    return { ...incoming, points: [...incoming.points] };
  }

  const lastExisting = existing.points[existing.points.length - 1];
  const firstIncoming = incoming.points[0];

  if (pointsNear(lastExisting, firstIncoming)) {
    return {
      ...existing,
      points: [...existing.points, ...incoming.points.slice(1)],
    };
  }

  if (incoming.points.length >= existing.points.length) {
    return { ...existing, points: [...incoming.points] };
  }

  return existing;
}

export function applyCanvasStrokeUpdates(
  actions: CanvasAction[],
  incoming: StrokeAction[]
): CanvasAction[] {
  const next = [...actions];

  for (const stroke of incoming) {
    const index = next.findIndex((action) => action.id === stroke.id);
    if (index === -1) {
      next.push({ ...stroke, points: [...stroke.points] });
      continue;
    }

    const existing = next[index];
    if (existing.type !== "stroke") continue;
    next[index] = mergeStrokeActions(existing, stroke);
  }

  return next;
}
