"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import { nanoid } from "nanoid";
import type { CanvasAction, FillAction, Point, StrokeAction } from "@/lib/types";
import { sendAction } from "@/lib/store";
import type { Tool } from "./ToolPanel";

export interface CanvasHandle {
  undo: () => void;
}

interface CanvasProps {
  roomId: string;
  playerId: string;
  actions: CanvasAction[];
  isDrawer: boolean;
  color: string;
  size: number;
  tool: Tool;
  disabled?: boolean;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    roomId,
    playerId,
    actions,
    isDrawer,
    color,
    size,
    tool,
    disabled,
  },
  ref
) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStroke = useRef<Point[]>([]);
  const isDrawing = useRef(false);
  const pendingRemote = useRef<CanvasAction[]>([]);
  const rafId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const strokeBatch = useRef<StrokeAction[]>([]);
  const renderedCount = useRef(0);

  const getCtx = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const normPoint = (e: React.PointerEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: StrokeAction,
    w: number,
    h: number
  ) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
  };

  const floodFill = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fillColor: string,
    w: number,
    h: number
  ) => {
    const px = Math.floor(x * w);
    const py = Math.floor(y * h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const targetIdx = (py * w + px) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];

    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);

    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB
    ) {
      return;
    }

    const match = (idx: number) =>
      data[idx] === targetR &&
      data[idx + 1] === targetG &&
      data[idx + 2] === targetB &&
      data[idx + 3] === targetA;

    const stack: [number, number][] = [[px, py]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const idx = (cy * w + cx) * 4;
      if (!match(idx)) continue;
      visited.add(key);
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const renderAction = useCallback((action: CanvasAction) => {
    const bg = bgRef.current;
    const ctx = getCtx(bg);
    if (!bg || !ctx) return;
    const w = bg.width;
    const h = bg.height;

    if (action.type === "stroke") {
      drawStroke(ctx, action, w, h);
    } else if (action.type === "fill") {
      floodFill(ctx, action.x, action.y, action.color, w, h);
    }
  }, []);

  const redrawAll = useCallback(() => {
    const bg = bgRef.current;
    const ctx = getCtx(bg);
    if (!bg || !ctx) return;
    ctx.clearRect(0, 0, bg.width, bg.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, bg.width, bg.height);
    for (const action of actions) {
      renderAction(action);
    }
    renderedCount.current = actions.length;
  }, [actions, renderAction]);

  useEffect(() => {
    if (actions.length < renderedCount.current) {
      redrawAll();
    } else if (actions.length > renderedCount.current) {
      for (let i = renderedCount.current; i < actions.length; i++) {
        pendingRemote.current.push(actions[i]);
      }
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          while (pendingRemote.current.length > 0) {
            const action = pendingRemote.current.shift()!;
            renderAction(action);
          }
          renderedCount.current = actions.length;
          rafId.current = null;
        });
      }
    }
  }, [actions, renderAction, redrawAll]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const bg = bgRef.current;
    const active = activeRef.current;
    if (!container || !bg || !active) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w === 0 || h === 0) return;

    bg.width = w;
    bg.height = h;
    active.width = w;
    active.height = h;
    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const flushStrokes = useCallback(async () => {
    if (strokeBatch.current.length === 0) return;
    const batch = [...strokeBatch.current];
    strokeBatch.current = [];
    await sendAction({
      type: "draw_strokes",
      roomId,
      playerId,
      strokes: batch,
    });
  }, [roomId, playerId]);

  const sendFill = async (action: FillAction) => {
    renderAction(action);
    renderedCount.current++;
    await sendAction({ type: "fill", roomId, playerId, action });
  };

  const handleUndo = async () => {
    await sendAction({ type: "undo", roomId, playerId });
  };

  useImperativeHandle(ref, () => ({ undo: handleUndo }));

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isDrawer || disabled) return;
    const active = activeRef.current;
    if (!active) return;
    active.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    currentStroke.current = [normPoint(e, active)];

    if (tool === "fill") {
      isDrawing.current = false;
      const pt = normPoint(e, active);
      const action: FillAction = {
        id: nanoid(),
        type: "fill",
        x: pt.x,
        y: pt.y,
        color,
      };
      void sendFill(action);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || tool !== "brush" && tool !== "eraser") return;
    const active = activeRef.current;
    const ctx = getCtx(active);
    if (!active || !ctx) return;

    const pt = normPoint(e, active);
    const prev = currentStroke.current[currentStroke.current.length - 1];
    const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    if (dist < 0.003) return;

    currentStroke.current.push(pt);

    const w = active.width;
    const h = active.height;
    ctx.clearRect(0, 0, w, h);
    drawStroke(
      ctx,
      {
        id: "preview",
        type: "stroke",
        color: tool === "eraser" ? "#000" : color,
        size,
        points: currentStroke.current,
        isEraser: tool === "eraser",
      },
      w,
      h
    );
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const active = activeRef.current;
    const ctx = getCtx(active);
    if (active) active.releasePointerCapture(e.pointerId);
    if (ctx && active) ctx.clearRect(0, 0, active.width, active.height);

    if (currentStroke.current.length < 2) {
      currentStroke.current = [];
      return;
    }

    const stroke: StrokeAction = {
      id: nanoid(),
      type: "stroke",
      color: tool === "eraser" ? "#000000" : color,
      size,
      points: [...currentStroke.current],
      isEraser: tool === "eraser",
    };

    currentStroke.current = [];
    renderAction(stroke);
    renderedCount.current++;
    strokeBatch.current.push(stroke);

    const now = Date.now();
    if (now - lastSent.current >= 50) {
      lastSent.current = now;
      await flushStrokes();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      void flushStrokes();
    }, 100);
    return () => clearInterval(interval);
  }, [flushStrokes]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-[3px] border-doodle-ink bg-white shadow-sketch"
    >
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={activeRef}
        className={`absolute inset-0 h-full w-full ${isDrawer && !disabled ? "cursor-crosshair" : "pointer-events-none"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
});

export default Canvas;
