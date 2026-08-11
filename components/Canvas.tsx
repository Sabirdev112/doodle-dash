"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { nanoid } from "nanoid";
import type { CanvasAction, FillAction, Point, StrokeAction } from "@/lib/types";
import {
  effectiveStrokeSize,
  isStrokeTool,
  strokeOpacityForTool,
  TOOL_CONFIG,
  type Tool,
} from "@/lib/drawingTools";
import { sendAction, useGameStore } from "@/lib/store";
import CanvasCursor from "@/components/CanvasCursor";
import { prepareStrokeUploadBatch } from "@/lib/strokeUpload";
import { floodFillCanvas, floodFillImageData } from "@/lib/floodFill";

export interface CanvasHandle {
  undo: () => Promise<void>;
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

function interpolatePoints(prev: Point, next: Point, maxStep: number): Point[] {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep) return [next];

  const steps = Math.ceil(dist / maxStep);
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: prev.x + dx * t, y: prev.y + dy * t });
  }
  return points;
}

function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  w: number,
  h: number
) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.lineTo(points[0].x * w, points[0].y * h);
    return;
  }
  if (points.length === 2) {
    ctx.lineTo(points[1].x * w, points[1].y * h);
    return;
  }

  ctx.moveTo(points[0].x * w, points[0].y * h);
  for (let i = 1; i < points.length - 1; i++) {
    const xc = ((points[i].x + points[i + 1].x) / 2) * w;
    const yc = ((points[i].y + points[i + 1].y) / 2) * h;
    ctx.quadraticCurveTo(points[i].x * w, points[i].y * h, xc, yc);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x * w, last.y * h);
}

function drawSoftEraserDabs(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  radius: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  for (const pt of points) {
    const x = pt.x * w;
    const y = pt.y * h;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0.95)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.75)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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
  const fillInProgress = useRef(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cursorVisible, setCursorVisible] = useState(false);

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

  const updateCursor = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container || !isDrawer || disabled) return;
    const rect = container.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setCursorVisible(true);
  };

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: StrokeAction,
    w: number,
    h: number
  ) => {
    if (stroke.points.length === 0) return;

    const lineSize = effectiveStrokeSize(
      stroke.isEraser ? "eraser" : stroke.opacity && stroke.opacity < 1 ? "pencil" : "pen",
      stroke.size
    );

    if (stroke.isEraser) {
      const radius = lineSize / 2;
      const step = Math.max(radius * 0.35, 2);
      const dabPoints: Point[] = [stroke.points[0]];
      for (let i = 1; i < stroke.points.length; i++) {
        dabPoints.push(
          ...interpolatePoints(stroke.points[i - 1], stroke.points[i], step / Math.max(w, h))
        );
      }
      drawSoftEraserDabs(ctx, dabPoints, radius, w, h);
      return;
    }

    if (stroke.points.length < 2) {
      ctx.save();
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(stroke.points[0].x * w, stroke.points[0].y * h, lineSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = lineSize;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.strokeStyle = stroke.color;

    ctx.beginPath();
    drawSmoothPath(ctx, stroke.points, w, h);
    ctx.stroke();

    if ((stroke.opacity ?? 1) < 1) {
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.45;
      ctx.lineWidth = Math.max(1, lineSize * 0.55);
      ctx.beginPath();
      drawSmoothPath(ctx, stroke.points, w, h);
      ctx.stroke();
    }

    ctx.restore();
  };

  const applyFillSync = (
    ctx: CanvasRenderingContext2D,
    action: FillAction,
    w: number,
    h: number
  ) => {
    const px = Math.floor(action.x * w);
    const py = Math.floor(action.y * h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const { filled } = floodFillImageData(
      imageData.data,
      w,
      h,
      px,
      py,
      action.color
    );
    if (filled > 0) {
      ctx.putImageData(imageData, 0, 0);
    }
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
      applyFillSync(ctx, action, w, h);
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

    const pending = [...strokeBatch.current];
    strokeBatch.current = [];
    const chunks = prepareStrokeUploadBatch(pending);
    const failed: StrokeAction[] = [];

    for (const chunk of chunks) {
      try {
        const res = await sendAction({
          type: "draw_strokes",
          roomId,
          playerId,
          strokes: chunk,
        });
        const data = (await res.json()) as { ok?: boolean; dropped?: boolean };
        if (!res.ok || (!data.ok && !data.dropped)) {
          failed.push(...chunk);
        }
      } catch {
        failed.push(...chunk);
      }
    }

    if (failed.length > 0) {
      strokeBatch.current.push(...failed);
    }
  }, [roomId, playerId]);

  const sendFill = async (action: FillAction) => {
    if (fillInProgress.current) return;
    const bg = bgRef.current;
    const ctx = getCtx(bg);
    if (!bg || !ctx) return;

    fillInProgress.current = true;
    try {
      await floodFillCanvas(ctx, action.x, action.y, action.color, bg.width, bg.height);
      renderedCount.current++;
      useGameStore.getState().addCanvasActions([action]);
      await sendAction({ type: "fill", roomId, playerId, action });
    } finally {
      fillInProgress.current = false;
    }
  };

  const handleUndo = async () => {
    await sendAction({ type: "undo", roomId, playerId });
  };

  useImperativeHandle(ref, () => ({ undo: handleUndo }));

  const previewStroke = useCallback(
    (points: Point[]) => {
      const active = activeRef.current;
      const ctx = getCtx(active);
      if (!active || !ctx) return;

      const w = active.width;
      const h = active.height;
      ctx.clearRect(0, 0, w, h);

      const strokeSize = effectiveStrokeSize(tool, size);
      const preview: StrokeAction = {
        id: "preview",
        type: "stroke",
        color: tool === "eraser" ? "#000" : color,
        size,
        points,
        isEraser: tool === "eraser",
        opacity: strokeOpacityForTool(tool),
      };

      drawStroke(ctx, preview, w, h);
    },
    [color, size, tool]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isDrawer || disabled) return;
    const active = activeRef.current;
    if (!active) return;
    active.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    updateCursor(e);
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
    updateCursor(e);
    if (!isDrawing.current || !isStrokeTool(tool)) return;

    const active = activeRef.current;
    if (!active) return;

    const pt = normPoint(e, active);
    const prev = currentStroke.current[currentStroke.current.length - 1];
    const config = TOOL_CONFIG[tool];
    const minDist = config.minDist;

    const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    if (dist < minDist) return;

    const newPoints = interpolatePoints(prev, pt, minDist * 0.65);
    currentStroke.current.push(...newPoints);
    previewStroke(currentStroke.current);
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    updateCursor(e);
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const active = activeRef.current;
    const ctx = getCtx(active);
    if (active) active.releasePointerCapture(e.pointerId);
    if (ctx && active) ctx.clearRect(0, 0, active.width, active.height);

    if (currentStroke.current.length < 1) {
      currentStroke.current = [];
      return;
    }

    if (currentStroke.current.length === 1) {
      currentStroke.current.push({ ...currentStroke.current[0] });
    }

    const stroke: StrokeAction = {
      id: nanoid(),
      type: "stroke",
      color: tool === "eraser" ? "#000000" : color,
      size,
      points: [...currentStroke.current],
      isEraser: tool === "eraser",
      opacity: strokeOpacityForTool(tool),
    };

    currentStroke.current = [];
    renderAction(stroke);
    renderedCount.current++;
    useGameStore.getState().addCanvasActions([stroke]);
    strokeBatch.current.push(stroke);

    const now = Date.now();
    if (now - lastSent.current >= 50) {
      lastSent.current = now;
      await flushStrokes();
    }
  };

  const onPointerLeave = (e: React.PointerEvent) => {
    setCursorVisible(false);
    void onPointerUp(e);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      void flushStrokes();
    }, 100);
    return () => clearInterval(interval);
  }, [flushStrokes]);

  const canDraw = isDrawer && !disabled;

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-[3px] border-doodle-ink bg-white shadow-sketch"
      onPointerLeave={() => setCursorVisible(false)}
    >
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={activeRef}
        className={`absolute inset-0 h-full w-full touch-none ${
          canDraw ? "cursor-none" : "pointer-events-none"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerEnter={updateCursor}
      />
      {canDraw && cursorPos && (
        <CanvasCursor
          tool={tool}
          size={size}
          color={color}
          x={cursorPos.x}
          y={cursorPos.y}
          visible={cursorVisible}
        />
      )}
    </div>
  );
});

export default Canvas;
