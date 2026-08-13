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
  points: Point[],
  startIndex = 0
): StrokeAction {
  return {
    ...existing,
    color: incoming.color ?? existing.color,
    size: incoming.size ?? existing.size,
    isEraser: incoming.isEraser,
    opacity: incoming.opacity ?? existing.opacity,
    points,
    startIndex: startIndex > 0 ? startIndex : undefined,
  };
}

function mergeByStartIndex(
  existing: StrokeAction,
  incoming: StrokeAction
): StrokeAction | null {
  const e0 = existing.startIndex ?? 0;
  const i0 = incoming.startIndex ?? 0;
  const e1 = e0 + existing.points.length;
  const i1 = i0 + incoming.points.length;
  const origin = Math.min(e0, i0);
  const end = Math.max(e1, i1);
  const slots: Array<Point | undefined> = new Array(end - origin);

  for (let i = 0; i < existing.points.length; i++) {
    slots[e0 - origin + i] = existing.points[i];
  }
  for (let i = 0; i < incoming.points.length; i++) {
    slots[i0 - origin + i] = incoming.points[i];
  }

  if (slots.some((point) => point == null)) return null;
  return withMergedPoints(existing, incoming, slots as Point[], origin);
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

  const indexed = mergeByStartIndex(existing, incoming);
  if (indexed) return indexed;

  const ePts = existing.points;
  const iPts = incoming.points;
  const eFirst = ePts[0];
  const eLast = ePts[ePts.length - 1];
  const iFirst = iPts[0];
  const iLast = iPts[iPts.length - 1];

  if (pointsNear(eLast, iFirst)) {
    return withMergedPoints(existing, incoming, [...ePts, ...iPts.slice(1)]);
  }

  if (pointsNear(iLast, eFirst)) {
    return withMergedPoints(existing, incoming, [...iPts, ...ePts.slice(1)]);
  }

  const overlapAt = findPointIndex(ePts, iFirst);
  if (overlapAt !== -1) {
    if (overlapAt + iPts.length <= ePts.length) return existing;
    return withMergedPoints(existing, incoming, [
      ...ePts.slice(0, overlapAt),
      ...iPts,
    ]);
  }

  const existingAt = findPointIndex(iPts, eFirst);
  if (existingAt !== -1) {
    const head = iPts.slice(0, existingAt);
    const tailStart = existingAt + ePts.length;
    const tail = tailStart < iPts.length ? iPts.slice(tailStart) : [];
    return withMergedPoints(existing, incoming, [...head, ...ePts, ...tail]);
  }

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
