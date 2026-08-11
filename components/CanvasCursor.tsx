"use client";

import type { Tool } from "@/lib/drawingTools";
import { effectiveStrokeSize } from "@/lib/drawingTools";

interface CanvasCursorProps {
  tool: Tool;
  size: number;
  color: string;
  x: number;
  y: number;
  visible: boolean;
}

export default function CanvasCursor({
  tool,
  size,
  color,
  x,
  y,
  visible,
}: CanvasCursorProps) {
  if (!visible) return null;

  const strokeSize = effectiveStrokeSize(tool, size);

  if (tool === "eraser") {
    const diameter = strokeSize;
    return (
      <div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: x, top: y }}
        aria-hidden
      >
        <div
          className="rounded-full border-2 border-doodle-ink/50 bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]"
          style={{
            width: diameter,
            height: diameter,
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.9), 0 0 0 1px rgba(44,36,22,0.15)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-doodle-ink/25"
          aria-hidden
        />
      </div>
    );
  }

  if (tool === "fill") {
    return (
      <div
        className="pointer-events-none absolute z-10"
        style={{ left: x, top: y, transform: "translate(-4px, -2px)" }}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M8 20c-2-3-1-6 2-8l8-8 6 6-8 8c-2 2-5 3-8 2z"
            fill={color}
            stroke="#2c2416"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M18 4l6 6"
            stroke="#2c2416"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <ellipse cx="9" cy="22" rx="5" ry="2" fill={color} opacity="0.5" />
        </svg>
      </div>
    );
  }

  const isPencil = tool === "pencil";
  const tipX = isPencil ? 2 : 3;
  const tipY = isPencil ? 22 : 24;

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: x,
        top: y,
        transform: `translate(-${tipX}px, -${tipY}px) rotate(${isPencil ? -35 : -42}deg)`,
      }}
      aria-hidden
    >
      <svg
        width={isPencil ? "22" : "24"}
        height={isPencil ? "22" : "24"}
        viewBox="0 0 24 24"
        fill="none"
      >
        {isPencil ? (
          <>
            <path
              d="M4 20l2-8 10-10 6 6-10 10-8 2z"
              fill="#ffd166"
              stroke="#2c2416"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M14 4l6 6"
              stroke="#2c2416"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M4 20l2-2"
              stroke="#2c2416"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M6 12l6 6"
              stroke="#c4a35a"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="4.5" cy="19.5" r="1.2" fill={color} stroke="#2c2416" strokeWidth="0.8" />
          </>
        ) : (
          <>
            <path
              d="M6 18l12-12 3 3-12 12-4 1 1-4z"
              fill="#4cc9f0"
              stroke="#2c2416"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M15 6l3 3"
              stroke="#2c2416"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M6 18l1-4"
              stroke="#2c2416"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="5.5" cy="18.5" r="1.3" fill={color} stroke="#2c2416" strokeWidth="0.8" />
          </>
        )}
      </svg>
    </div>
  );
}
