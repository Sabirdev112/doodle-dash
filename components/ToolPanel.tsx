"use client";

import { useState } from "react";
import ButtonSpinner from "./ButtonSpinner";
import { DRAWING_TOOLS, TOOL_CONFIG, type Tool } from "@/lib/drawingTools";

export type { Tool };

export const COLORS = [
  "#2c2416",
  "#ffffff",
  "#ff6b6b",
  "#ffd166",
  "#06d6a0",
  "#4cc9f0",
  "#9b5de5",
  "#f15bb5",
  "#8b7355",
];

interface ToolPanelProps {
  color: string;
  size: number;
  tool: Tool;
  disabled?: boolean;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void | Promise<void>;
}

export default function ToolPanel({
  color,
  size,
  tool,
  disabled,
  onColorChange,
  onSizeChange,
  onToolChange,
  onUndo,
}: ToolPanelProps) {
  const [undoing, setUndoing] = useState(false);

  const handleUndo = async () => {
    if (undoing) return;
    setUndoing(true);
    try {
      await onUndo();
    } finally {
      setUndoing(false);
    }
  };

  if (disabled) {
    return (
      <div className="doodle-card p-4 opacity-60">
        <p className="text-center font-sketch text-doodle-muted">
          Sit tight — only the drawer can scribble
        </p>
      </div>
    );
  }

  const sizeLabel =
    tool === "eraser"
      ? "Eraser size"
      : tool === "fill"
        ? "Fill tool"
        : "Thickness";

  return (
    <div className="doodle-card space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        {DRAWING_TOOLS.map((t) => {
          const config = TOOL_CONFIG[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToolChange(t)}
              title={config.label}
              className={`inline-flex items-center gap-1.5 rounded-md border-2 px-3 py-1 font-sketch text-base ${
                tool === t
                  ? "border-doodle-ink bg-doodle-yellow shadow-sketch-sm"
                  : "border-doodle-ink/30 bg-white hover:border-doodle-ink"
              }`}
            >
              <span aria-hidden>{config.emoji}</span>
              {config.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void handleUndo()}
          disabled={undoing}
          className="ml-auto rounded-md border-2 border-doodle-ink/30 bg-white px-3 py-1 font-sketch hover:border-doodle-ink disabled:opacity-50"
        >
          {undoing ? (
            <span className="inline-flex items-center gap-1.5">
              <ButtonSpinner className="h-3.5 w-3.5" />
              undo
            </span>
          ) : (
            "undo"
          )}
        </button>
      </div>

      {tool !== "eraser" && (
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full border-2 ${
                color === c
                  ? "border-doodle-ink scale-110 shadow-sketch-sm"
                  : "border-doodle-ink/40"
              }`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border-2 border-doodle-ink/30"
            title="Custom color"
          />
        </div>
      )}

      {tool !== "fill" && (
        <div>
          <label className="font-sketch text-sm text-doodle-muted">
            {sizeLabel}: {size}px
          </label>
          <input
            type="range"
            min={2}
            max={tool === "eraser" ? 48 : 30}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="mt-1 w-full accent-doodle-grape"
          />
        </div>
      )}
    </div>
  );
}
