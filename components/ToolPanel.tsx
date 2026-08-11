"use client";

export type Tool = "brush" | "eraser" | "fill";

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
  onUndo: () => void;
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
  if (disabled) {
    return (
      <div className="doodle-card p-4 opacity-60">
        <p className="text-center font-sketch text-doodle-muted">
          Sit tight — only the drawer can scribble
        </p>
      </div>
    );
  }

  return (
    <div className="doodle-card space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        {(["brush", "eraser", "fill"] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onToolChange(t)}
            className={`rounded-md border-2 px-3 py-1 font-sketch text-base capitalize ${
              tool === t
                ? "border-doodle-ink bg-doodle-yellow shadow-sketch-sm"
                : "border-doodle-ink/30 bg-white hover:border-doodle-ink"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={onUndo}
          className="ml-auto rounded-md border-2 border-doodle-ink/30 bg-white px-3 py-1 font-sketch hover:border-doodle-ink"
        >
          undo
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            style={{ backgroundColor: c }}
            className={`h-7 w-7 rounded-full border-2 ${
              color === c ? "border-doodle-ink scale-110 shadow-sketch-sm" : "border-doodle-ink/40"
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

      <div>
        <label className="font-sketch text-sm text-doodle-muted">
          Thickness: {size}px
        </label>
        <input
          type="range"
          min={2}
          max={30}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="mt-1 w-full accent-doodle-grape"
        />
      </div>
    </div>
  );
}
