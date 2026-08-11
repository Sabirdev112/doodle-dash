export type Tool = "pencil" | "pen" | "eraser" | "fill";

export interface ToolConfig {
  label: string;
  emoji: string;
  opacity: number;
  sizeScale: number;
  minDist: number;
  softEraser: boolean;
  smoothing: boolean;
}

export const TOOL_CONFIG: Record<Tool, ToolConfig> = {
  pencil: {
    label: "Pencil",
    emoji: "✏️",
    opacity: 0.68,
    sizeScale: 0.82,
    minDist: 0.002,
    softEraser: false,
    smoothing: true,
  },
  pen: {
    label: "Pen",
    emoji: "🖊️",
    opacity: 1,
    sizeScale: 1,
    minDist: 0.0012,
    softEraser: false,
    smoothing: true,
  },
  eraser: {
    label: "Eraser",
    emoji: "🧽",
    opacity: 1,
    sizeScale: 1.15,
    minDist: 0.0008,
    softEraser: true,
    smoothing: true,
  },
  fill: {
    label: "Fill",
    emoji: "🪣",
    opacity: 1,
    sizeScale: 1,
    minDist: 0,
    softEraser: false,
    smoothing: false,
  },
};

export const DRAWING_TOOLS: Tool[] = ["pencil", "pen", "eraser", "fill"];

export function effectiveStrokeSize(tool: Tool, size: number): number {
  return Math.max(2, Math.round(size * TOOL_CONFIG[tool].sizeScale));
}

export function strokeOpacityForTool(tool: Tool): number | undefined {
  const opacity = TOOL_CONFIG[tool].opacity;
  return opacity < 1 ? opacity : undefined;
}

export function isStrokeTool(tool: Tool): boolean {
  return tool === "pencil" || tool === "pen" || tool === "eraser";
}
