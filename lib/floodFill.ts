/** Sum of absolute channel differences used for flood-fill matching. */
const COLOR_TOLERANCE = 52;

/** Pixels at or below this luminance are treated as pencil/pen ink barriers. */
const INK_LUMINANCE = 195;

/** Gray anti-aliased stroke edges (low saturation, not near white). */
const EDGE_LUMINANCE = 242;

export interface FloodFillResult {
  /** Number of pixels filled; 0 means no-op. */
  filled: number;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Hard stop for drawn lines — keeps fill inside pencil/pen boundaries. */
export function isInkBarrier(r: number, g: number, b: number, a: number): boolean {
  if (a < 60) return false;

  const lum = luminance(r, g, b);
  if (lum <= INK_LUMINANCE) return true;

  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (lum <= EDGE_LUMINANCE && spread <= 28) return true;

  return false;
}

function colorDistance(
  idx: number,
  data: Uint8ClampedArray,
  tr: number,
  tg: number,
  tb: number,
  ta: number
): number {
  return (
    Math.abs(data[idx] - tr) +
    Math.abs(data[idx + 1] - tg) +
    Math.abs(data[idx + 2] - tb) +
    Math.abs(data[idx + 3] - ta)
  );
}

function matchesTarget(
  idx: number,
  data: Uint8ClampedArray,
  tr: number,
  tg: number,
  tb: number,
  ta: number
): boolean {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];
  if (isInkBarrier(r, g, b, a)) return false;
  return colorDistance(idx, data, tr, tg, tb, ta) <= COLOR_TOLERANCE;
}

function parseHexColor(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Scanline flood fill. Respects pencil/pen lines as barriers; with no lines,
 * fills the entire connected region (typically the whole canvas).
 */
export function floodFillImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: string
): FloodFillResult {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return { filled: 0 };
  }

  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  if (isInkBarrier(targetR, targetG, targetB, targetA)) {
    return { filled: 0 };
  }

  const [fillR, fillG, fillB] = parseHexColor(fillColor);
  if (
    Math.abs(targetR - fillR) +
      Math.abs(targetG - fillG) +
      Math.abs(targetB - fillB) <=
    3
  ) {
    return { filled: 0 };
  }

  const stack: number[] = [startX, startY];
  let filled = 0;

  while (stack.length > 0) {
    const y = stack.pop()!;
    let x = stack.pop()!;

    if (y < 0 || y >= height) continue;

    let xLeft = x;
    let leftIdx = (y * width + xLeft) * 4;
    while (xLeft >= 0 && matchesTarget(leftIdx, data, targetR, targetG, targetB, targetA)) {
      xLeft--;
      leftIdx -= 4;
    }
    xLeft++;

    let spanAbove = false;
    let spanBelow = false;
    x = xLeft;

    while (x < width) {
      const idx = (y * width + x) * 4;
      if (!matchesTarget(idx, data, targetR, targetG, targetB, targetA)) break;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;
      filled++;

      if (y > 0) {
        const aboveIdx = idx - width * 4;
        const aboveMatches = matchesTarget(
          aboveIdx,
          data,
          targetR,
          targetG,
          targetB,
          targetA
        );
        if (!spanAbove && aboveMatches) {
          stack.push(x, y - 1);
          spanAbove = true;
        } else if (spanAbove && !aboveMatches) {
          spanAbove = false;
        }
      }

      if (y < height - 1) {
        const belowIdx = idx + width * 4;
        const belowMatches = matchesTarget(
          belowIdx,
          data,
          targetR,
          targetG,
          targetB,
          targetA
        );
        if (!spanBelow && belowMatches) {
          stack.push(x, y + 1);
          spanBelow = true;
        } else if (spanBelow && !belowMatches) {
          spanBelow = false;
        }
      }

      x++;
    }
  }

  return { filled };
}

/** Yields to the browser during very large fills so the UI stays responsive. */
export async function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColor: string,
  width: number,
  height: number
): Promise<FloodFillResult> {
  const px = Math.floor(x * width);
  const py = Math.floor(y * height);

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const imageData = ctx.getImageData(0, 0, width, height);
  const result = floodFillImageData(imageData.data, width, height, px, py, fillColor);

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  if (result.filled > 0) {
    ctx.putImageData(imageData, 0, 0);
  }

  return result;
}
