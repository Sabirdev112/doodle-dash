import type { StrokeAction } from "@/lib/types";
import { STROKE_REORDER_STALL_MS } from "@/lib/types";

/** Buffer out-of-order stroke batches and apply them in sequence. */
export function createStrokeOrderBuffer(
  apply: (strokes: StrokeAction[]) => void
) {
  let nextSeq = 1;
  const pending = new Map<number, StrokeAction[]>();
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  function clearStall() {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  }

  function drain() {
    while (pending.has(nextSeq)) {
      const strokes = pending.get(nextSeq)!;
      pending.delete(nextSeq);
      nextSeq += 1;
      if (strokes.length > 0) apply(strokes);
    }
  }

  function flushGap() {
    stallTimer = null;
    if (pending.size === 0) return;
    const oldest = Math.min(...pending.keys());
    if (oldest > nextSeq) nextSeq = oldest;
    drain();
    if (pending.size > 0) scheduleStall();
  }

  function scheduleStall() {
    if (stallTimer !== null) return;
    stallTimer = setTimeout(flushGap, STROKE_REORDER_STALL_MS);
  }

  return {
    push(seq: number | undefined, strokes: StrokeAction[]) {
      if (strokes.length === 0) return;

      if (seq == null || !Number.isFinite(seq) || seq < 1) {
        apply(strokes);
        return;
      }

      if (seq < nextSeq) return;

      pending.set(seq, strokes);
      drain();
      if (pending.size > 0) scheduleStall();
    },
    reset(lastAppliedSeq = 0) {
      clearStall();
      pending.clear();
      nextSeq = Math.max(0, lastAppliedSeq) + 1;
    },
    dispose() {
      clearStall();
      pending.clear();
    },
  };
}
