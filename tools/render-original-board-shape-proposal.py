from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = (
    ROOT
    / "deliverables"
    / "original-board-shape-proposal"
    / "blockout-original-lv001-lv100-board-shape-proposal.json"
)
OUT = ROOT / "deliverables" / "original-board-shape-proposal"
FONT_PATH = Path("C:/Windows/Fonts/msyh.ttc")


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


TITLE_FONT = font(24)
LEVEL_FONT = font(22)
LABEL_FONT = font(15)
SMALL_FONT = font(12)
OVERVIEW_LEVEL_FONT = font(13)
OVERVIEW_SMALL_FONT = font(9)

COLORS = {
    "规整盘面": (55, 196, 159),
    "单区异形": (88, 151, 246),
    "多分区": (168, 85, 247),
}


def ellipsize(draw: ImageDraw.ImageDraw, text: str, max_width: int, used_font: ImageFont.ImageFont) -> str:
    if draw.textbbox((0, 0), text, font=used_font)[2] <= max_width:
        return text
    suffix = "…"
    candidate = text
    while candidate and draw.textbbox((0, 0), candidate + suffix, font=used_font)[2] > max_width:
        candidate = candidate[:-1]
    return candidate + suffix


def draw_mask(
    draw: ImageDraw.ImageDraw,
    mask: list[str],
    bounds: tuple[int, int, int, int],
    group: str,
    compact: bool = False,
) -> None:
    left, top, right, bottom = bounds
    rows = len(mask)
    cols = len(mask[0])
    gap = 1 if compact else 2
    cell = max(3, min((right - left) // cols, (bottom - top) // rows))
    grid_width = cols * cell
    grid_height = rows * cell
    origin_x = left + (right - left - grid_width) // 2
    origin_y = top + (bottom - top - grid_height) // 2
    color = COLORS[group]
    outline = tuple(min(255, channel + 55) for channel in color)
    for row_index, row in enumerate(mask):
        for col_index, marker in enumerate(row):
            x0 = origin_x + col_index * cell
            y0 = origin_y + row_index * cell
            x1 = x0 + cell - gap
            y1 = y0 + cell - gap
            if marker == "#":
                radius = 1 if compact else max(2, cell // 6)
                draw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=color, outline=outline)


def draw_detailed_level(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], level: dict) -> None:
    left, top, right, bottom = box
    shape = level["shape"]
    board = level["board"]
    is_milestone = bool(shape.get("milestone_role"))
    is_intro = bool(shape.get("mechanism_intro_reserved_for"))
    outline = "#f59e0b" if is_intro else "#ec4899" if is_milestone else "#3e5278"
    draw.rounded_rectangle(box, radius=15, fill="#131b2f", outline=outline, width=3 if is_intro or is_milestone else 2)
    draw.text((left + 14, top + 10), f"Lv{level['level_number']}", font=LEVEL_FONT, fill="#ffffff")
    label = ellipsize(draw, shape["name"], right - left - 93, LABEL_FONT)
    draw.text((left + 82, top + 16), label, font=LABEL_FONT, fill="#cbd5e1")

    badge_x = right - 62
    if is_intro:
        draw.rounded_rectangle((badge_x, top + 44, right - 12, top + 66), radius=8, fill="#92400e")
        draw.text((badge_x + 8, top + 47), "教学", font=SMALL_FONT, fill="#fef3c7")
    elif is_milestone:
        draw.rounded_rectangle((badge_x, top + 44, right - 12, top + 66), radius=8, fill="#831843")
        draw.text((badge_x + 8, top + 47), "节点", font=SMALL_FONT, fill="#fce7f3")

    draw_mask(
        draw,
        board["playable_mask"],
        (left + 18, top + 54, right - 18, bottom - 66),
        shape["family_group"],
    )
    footer = (
        f"{board['rows']}×{board['cols']} · {board['component_count']}区 · "
        f"{board['playable_cell_count']}格 · 造型P{shape['pressure']}"
    )
    draw.text((left + 14, bottom - 44), footer, font=SMALL_FONT, fill="#a9b4c8")
    family = ellipsize(draw, shape["family"], right - left - 28, SMALL_FONT)
    draw.text((left + 14, bottom - 24), family, font=SMALL_FONT, fill="#7dd3fc")


def render_detailed(levels: list[dict]) -> list[Path]:
    outputs: list[Path] = []
    tile_w, tile_h = 305, 300
    cols, rows = 5, 5
    margin = 20
    header = 72
    for sheet_index in range(math.ceil(len(levels) / 25)):
        start = sheet_index * 25
        subset = levels[start : start + 25]
        width = cols * tile_w + margin * 2
        height = rows * tile_h + margin * 2 + header
        canvas = Image.new("RGB", (width, height), "#080d19")
        draw = ImageDraw.Draw(canvas)
        draw.text(
            (margin, 16),
            f"Block Out 原创棋盘造型确认稿  Lv{start + 1:03d}–Lv{start + len(subset):03d}",
            font=TITLE_FONT,
            fill="#ffffff",
        )
        draw.text(
            (margin, 48),
            "绿色=规整  蓝色=单区异形  紫色=多分区  金框=机制教学位  粉框=五关节点",
            font=SMALL_FONT,
            fill="#94a3b8",
        )
        for index, level in enumerate(subset):
            row, col = divmod(index, cols)
            left = margin + col * tile_w
            top = margin + header + row * tile_h
            draw_detailed_level(draw, (left, top, left + tile_w - 12, top + tile_h - 12), level)
        output = OUT / f"blockout-original-board-shape-proposal-atlas-{start + 1:03d}-{start + len(subset):03d}.png"
        canvas.save(output, optimize=True)
        outputs.append(output)
    return outputs


def render_overview(levels: list[dict]) -> Path:
    tile_w, tile_h = 166, 158
    cols, rows = 10, 10
    margin = 18
    header = 84
    width = cols * tile_w + margin * 2
    height = rows * tile_h + margin * 2 + header
    canvas = Image.new("RGB", (width, height), "#080d19")
    draw = ImageDraw.Draw(canvas)
    draw.text((margin, 15), "Block Out 原创 Lv1–100 棋盘造型总览（待确认，未写入游戏）", font=TITLE_FONT, fill="#ffffff")
    draw.text(
        (margin, 49),
        "绿色=规整盘面 · 蓝色=单区异形 · 紫色=多分区 · ★=五关节点 · 教=机制教学位",
        font=LABEL_FONT,
        fill="#a9b4c8",
    )
    for index, level in enumerate(levels):
        row, col = divmod(index, cols)
        left = margin + col * tile_w
        top = margin + header + row * tile_h
        right = left + tile_w - 8
        bottom = top + tile_h - 8
        shape = level["shape"]
        board = level["board"]
        outline = "#f59e0b" if shape.get("mechanism_intro_reserved_for") else "#ec4899" if shape.get("milestone_role") else "#25334d"
        draw.rounded_rectangle((left, top, right, bottom), radius=10, fill="#131b2f", outline=outline, width=2)
        marker = "教" if shape.get("mechanism_intro_reserved_for") else "★" if shape.get("milestone_role") else ""
        draw.text((left + 9, top + 7), f"Lv{level['level_number']} {marker}", font=OVERVIEW_LEVEL_FONT, fill="#ffffff")
        draw_mask(
            draw,
            board["playable_mask"],
            (left + 8, top + 28, right - 8, bottom - 25),
            shape["family_group"],
            compact=True,
        )
        footer = f"{board['rows']}×{board['cols']} {board['component_count']}区 P{shape['pressure']}"
        draw.text((left + 9, bottom - 19), footer, font=OVERVIEW_SMALL_FONT, fill="#94a3b8")
    output = OUT / "blockout-original-board-shape-proposal-overview-001-100.png"
    canvas.save(output, optimize=True)
    return output


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    levels = payload["levels"]
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = [*render_detailed(levels), render_overview(levels)]
    for output in outputs:
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
