"use client";

export type Tool = "brush" | "eraser" | "fill";

export const COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 opacity-50">
        <p className="text-center text-sm text-slate-500">
          Drawing tools (drawer only)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap gap-2">
        {(["brush", "eraser", "fill"] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onToolChange(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              tool === t
                ? "bg-brand-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={onUndo}
          className="ml-auto rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Undo
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
              color === c ? "border-brand-400 scale-110" : "border-slate-600"
            }`}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
          title="Custom color"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">
          Brush size: {size}px
        </label>
        <input
          type="range"
          min={2}
          max={30}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>
    </div>
  );
}
