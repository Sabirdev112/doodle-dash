import type { CanvasAction, Point, StrokeAction } from "@/lib/types";

const POINT_EPSILON = 0.0005;

export function pointsNear(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < POINT_EPSILON;
}

function findPointIndex(points: Point[], target: Point): number {
  for (let i = 0; i < points.length; i++) {
    if (pointsNear(points[i], target)) return i;
  }
  return -1;
}

function withMergedPoints(
  existing: StrokeAction,
  incoming: StrokeAction,
  points: Point[]
): StrokeAction {
  const start = Math.min(existing.startIndex ?? 0, incoming.startIndex ?? 0);
  return {
    ...existing,
    color: incoming.color ?? existing.color,
    size: incoming.size ?? existing.size,
    isEraser: incoming.isEraser,
    opacity: incoming.opacity ?? existing.opacity,
    points,
    startIndex: start > 0 ? start : undefined,
  };
}

/** Merge an uploaded stroke chunk into an existing stroke when they share an id. */
export function mergeStrokeActions(
  existing: StrokeAction,
  incoming: StrokeAction
): StrokeAction {
  if (existing.id !== incoming.id) return incoming;
  if (incoming.points.length === 0) return existing;
  if (existing.points.length === 0) {
    return { ...incoming, points: [...incoming.points] };
  }

  const ePts = existing.points;
  const iPts = incoming.points;
  const eFirst = ePts[0];
  const eLast = ePts[ePts.length - 1];
  const iFirst = iPts[0];
  const iLast = iPts[iPts.length - 1];

  // Incoming continues the current stroke (normal live case).
  if (pointsNear(eLast, iFirst)) {
    return withMergedPoints(existing, incoming, [...ePts, ...iPts.slice(1)]);
  }

  // Incoming is the earlier prefix (Vercel HTTP / Pusher arrived out of order).
  if (pointsNear(iLast, eFirst)) {
    return withMergedPoints(existing, incoming, [...iPts, ...ePts.slice(1)]);
  }

  // Incoming overlaps existing and may extend past the end.
  const overlapAt = findPointIndex(ePts, iFirst);
  if (overlapAt !== -1) {
    if (overlapAt + iPts.length <= ePts.length) {
      return existing;
    }
    return withMergedPoints(existing, incoming, [
      ...ePts.slice(0, overlapAt),
      ...iPts,
    ]);
  }

  // Existing starts inside incoming — prepend the missing head.
  const existingAt = findPointIndex(iPts, eFirst);
  if (existingAt !== -1) {
    const head = iPts.slice(0, existingAt);
    const tailStart = existingAt + ePts.length;
    const tail = tailStart < iPts.length ? iPts.slice(tailStart) : [];
    return withMergedPoints(existing, incoming, [...head, ...ePts, ...tail]);
  }

  if (
    typeof incoming.startIndex === "number" &&
    incoming.startIndex === ePts.length - 1
  ) {
    return withMergedPoints(existing, incoming, [...ePts, ...iPts.slice(1)]);
  }

  if (
    typeof incoming.startIndex === "number" &&
    incoming.startIndex + iPts.length - 1 === (existing.startIndex ?? 0)
  ) {
    return withMergedPoints(existing, incoming, [...iPts, ...ePts.slice(1)]);
  }

  // Never replace a longer stroke with a shorter out-of-order chunk.
  if (iPts.length > ePts.length) {
    return { ...incoming, points: [...iPts] };
  }
  return existing;
}

/** True when `next` only added points onto the end of `prev` (safe for incremental draw). */
export function isStrokeEndExtension(
  prev: StrokeAction,
  next: StrokeAction
): boolean {
  if (prev.id !== next.id) return false;
  if (next.points.length <= prev.points.length) return false;
  if (prev.points.length === 0) return true;
  if (!pointsNear(prev.points[0], next.points[0])) return false;
  const lastIdx = prev.points.length - 1;
  return pointsNear(prev.points[lastIdx], next.points[lastIdx]);
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
