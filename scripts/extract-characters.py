#!/usr/bin/env python3
"""Extract transparent character PNGs from public/avatars/characters.png."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/avatars/characters.png"
OUT_DIR = ROOT / "public/avatars/characters"

CHARACTER_IDS = [
    "beep",
    "whiskers",
    "zorg",
    "chaos",
    "explorer",
    "cool-cat",
    "sprout",
    "rocker",
    "intern",
    "diva",
]

COLS = 5
ROWS = 2
INSET = 6
LABEL_CROP = 0.82


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 10:
        return True
    return r > 235 and g > 235 and b > 235


def flood_transparent(image: Image.Image) -> Image.Image:
    px = image.load()
    width, height = image.size
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= width or y >= height:
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if is_background(r, g, b, a):
            px[x, y] = (r, g, b, 0)
            queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return image


def main() -> None:
    source = Image.open(SRC).convert("RGBA")
    width, height = source.size
    cell_w, cell_h = width // COLS, height // ROWS
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for index, character_id in enumerate(CHARACTER_IDS):
        col = index % COLS
        row = index // COLS
        x0 = col * cell_w + INSET
        y0 = row * cell_h + INSET
        x1 = (col + 1) * cell_w - INSET
        y1 = y0 + int((row * cell_h + cell_h - INSET - y0) * LABEL_CROP)

        cell = source.crop((x0, y0, x1, y1))
        cell = flood_transparent(cell)
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)

        output = OUT_DIR / f"{character_id}.png"
        cell.save(output, "PNG")
        print(f"Wrote {output.name} ({cell.size[0]}x{cell.size[1]})")


if __name__ == "__main__":
    main()
