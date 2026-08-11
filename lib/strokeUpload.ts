import { nanoid } from "nanoid";
import type { StrokeAction } from "@/lib/types";

export const MAX_STROKE_POINTS = 100;
export const MAX_STROKES_PER_REQUEST = 10;

/** Split a long stroke into upload-sized segments with overlapping endpoints. */
export function splitStrokeForUpload(
  stroke: StrokeAction,
  maxPoints = MAX_STROKE_POINTS
): StrokeAction[] {
  if (stroke.points.length <= maxPoints) return [stroke];

  const segments: StrokeAction[] = [];
  let start = 0;

  while (start < stroke.points.length) {
    const end = Math.min(start + maxPoints, stroke.points.length);
    let slice = stroke.points.slice(start, end);

    if (slice.length === 1 && segments.length > 0) {
      break;
    }
    if (slice.length === 1) {
      slice = [slice[0], { ...slice[0] }];
    }

    segments.push({
      ...stroke,
      id: segments.length === 0 ? stroke.id : nanoid(),
      points: slice,
    });

    if (end >= stroke.points.length) break;
    start = end - 1;
  }

  return segments;
}

export function chunkStrokes<T>(items: T[], size = MAX_STROKES_PER_REQUEST): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function prepareStrokeUploadBatch(
  strokes: StrokeAction[]
): StrokeAction[][] {
  const expanded = strokes.flatMap((stroke) => splitStrokeForUpload(stroke));
  return chunkStrokes(expanded);
}
