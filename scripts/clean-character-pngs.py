#!/usr/bin/env python3
"""Clean Stitch character PNGs: remove backgrounds and trim transparent padding."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "public/avatars/characters"

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


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    if r > 238 and g > 238 and b > 238:
        return True
    if r > 225 and g > 225 and b > 225 and max(r, g, b) - min(r, g, b) < 12:
        return True
    return False


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


def defringe(image: Image.Image) -> Image.Image:
    """Remove near-white halos left after background removal."""
    px = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 210 and g > 210 and b > 210:
                neighbors = 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height and px[nx, ny][3] == 0:
                        neighbors += 1
                if neighbors:
                    fade = max(0, min(255, int((240 - min(r, g, b)) * 6)))
                    px[x, y] = (r, g, b, 255 - fade if fade < 255 else 0)

    return image


def clean_file(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    image = flood_transparent(image)
    image = defringe(image)
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)

    width, height = image.size
    margin = max(4, int(max(width, height) * 0.04))
    canvas = Image.new(
        "RGBA",
        (width + margin * 2, height + margin * 2),
        (0, 0, 0, 0),
    )
    canvas.paste(image, (margin, margin), image)
    canvas.save(destination, "PNG")


def main() -> None:
    CHAR_DIR.mkdir(parents=True, exist_ok=True)

    sources = sorted(CHAR_DIR.glob("*.raw.png"))
    if not sources:
        raise SystemExit(
            f"No *.raw.png files in {CHAR_DIR}. Run fetch-stitch-characters.mjs first."
        )

    for index, source in enumerate(sources):
        if source.stem.endswith(".raw"):
            character_id = source.name.replace(".raw.png", "")
        elif source.stem in CHARACTER_IDS:
            character_id = source.stem
        else:
            character_id = CHARACTER_IDS[index] if index < len(CHARACTER_IDS) else source.stem

        destination = CHAR_DIR / f"{character_id}.png"
        clean_file(source, destination)
        print(f"Cleaned {source.name} -> {destination.name} ({destination.stat().st_size // 1024} KB)")

        raw_path = CHAR_DIR / f"{character_id}.raw.png"
        if raw_path.exists() and raw_path != destination:
            raw_path.unlink()


if __name__ == "__main__":
    main()
