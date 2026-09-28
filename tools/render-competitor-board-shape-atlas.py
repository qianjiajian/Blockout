from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "deliverables" / "competitor-board-shapes" / "blockout-lv001-lv100-board-shapes.json"
OUT = ROOT / "deliverables" / "competitor-board-shapes"
FONT_PATH = Path("C:/Windows/Fonts/msyh.ttc")


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


TITLE_FONT = font(22)
LABEL_FONT = font(16)
SMALL_FONT = font(13)


def ellipsize(draw: ImageDraw.ImageDraw, text: str, max_width: int) -> str:
    if draw.textbbox((0, 0), text, font=LABEL_FONT)[2] <= max_width:
        return text
    suffix = "…"
    candidate = text
    while candidate and draw.textbbox((0, 0), candidate + suffix, font=LABEL_FONT)[2] > max_width:
        candidate = candidate[:-1]
    return candidate + suffix


def draw_level(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], level: dict) -> None:
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=14, fill="#171630", outline="#3e3975", width=2)
    level_number = level["level_id"].replace("Level ", "")
    draw.text((left + 14, top + 10), f"Lv{level_number}", font=TITLE_FONT, fill="#ffffff")
    shape = str(level.get("shape_type", "unclear"))
    shape_label = ellipsize(draw, shape, right - left - 92)
    draw.text((left + 75, top + 14), shape_label, font=LABEL_FONT, fill="#c9c4ff")

    mask = level.get("playable_mask")
    grid_top = top + 48
    grid_bottom = bottom - 52
    grid_left = left + 14
    grid_right = right - 14
    if not isinstance(mask, list) or not mask:
        draw.text((left + 14, grid_top + 35), "掩码 unclear", font=LABEL_FONT, fill="#ffb257")
    else:
        rows = len(mask)
        cols = max(len(row) for row in mask)
        cell = max(5, min(22, (grid_right - grid_left) // max(cols, 1), (grid_bottom - grid_top) // max(rows, 1)))
        width = cols * cell
        height = rows * cell
        origin_x = grid_left + (grid_right - grid_left - width) // 2
        origin_y = grid_top + (grid_bottom - grid_top - height) // 2
        for row_index, row in enumerate(mask):
            for col_index, marker in enumerate(row):
                x0 = origin_x + col_index * cell
                y0 = origin_y + row_index * cell
                x1 = x0 + cell - 1
                y1 = y0 + cell - 1
                if marker == "#":
                    draw.rounded_rectangle((x0, y0, x1, y1), radius=max(1, cell // 5), fill="#7069e8", outline="#aca8ff")
                elif marker == "?":
                    draw.rounded_rectangle((x0, y0, x1, y1), radius=max(1, cell // 5), fill="#bb6d2b", outline="#ffd090")
                else:
                    draw.rectangle((x0, y0, x1, y1), fill="#0d0c21")

    dims = level.get("board", {})
    components = level.get("component_count", "unclear")
    confidence = level.get("confidence", "low")
    footer = f"{dims.get('rows', 'unclear')}×{dims.get('cols', 'unclear')}  分区:{components}  {confidence}"
    draw.text((left + 14, bottom - 39), footer, font=SMALL_FONT, fill="#aaa5d6")


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    levels = payload["levels"]
    OUT.mkdir(parents=True, exist_ok=True)
    tile_w, tile_h = 290, 310
    cols, rows = 5, 5
    margin = 18
    for sheet_index in range(math.ceil(len(levels) / 25)):
        start = sheet_index * 25
        subset = levels[start : start + 25]
        canvas = Image.new("RGB", (cols * tile_w + margin * 2, rows * tile_h + margin * 2 + 54), "#0b0a1d")
        draw = ImageDraw.Draw(canvas)
        draw.text(
            (margin, 12),
            f"Block Out! 竞品棋盘造型  Lv{start + 1:03d}–Lv{start + len(subset):03d}",
            font=TITLE_FONT,
            fill="#ffffff",
        )
        for index, level in enumerate(subset):
            row, col = divmod(index, cols)
            left = margin + col * tile_w
            top = margin + 48 + row * tile_h
            draw_level(draw, (left, top, left + tile_w - 10, top + tile_h - 10), level)
        output = OUT / f"blockout-board-shape-atlas-{start + 1:03d}-{start + len(subset):03d}.png"
        canvas.save(output, optimize=True)
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
