from pathlib import Path
import colorsys
import json

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "deliverables" / "competitor-screenshots" / "BlockOut-competitor-levels-001-100-2026-06" / "levels"

# Hue intervals are deliberately limited to the clearly saturated gameplay palette.
# The permanent indigo board frame is excluded from the purple interval.
RANGES = {
    "red": [(0, 14), (346, 360)],
    "orange": [(15, 36)],
    "yellow": [(37, 72)],
    "green": [(73, 165)],
    "cyan": [(166, 202)],
    "blue": [(203, 248)],
    "purple": [(292, 345)],
}


def rgb_to_hsv(rgb: np.ndarray):
    rgb = rgb.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    delta = mx - mn
    hue = np.zeros_like(mx)
    nz = delta > 1e-6
    mask = nz & (mx == r)
    hue[mask] = (60 * ((g[mask] - b[mask]) / delta[mask]) + 360) % 360
    mask = nz & (mx == g)
    hue[mask] = 60 * ((b[mask] - r[mask]) / delta[mask]) + 120
    mask = nz & (mx == b)
    hue[mask] = 60 * ((r[mask] - g[mask]) / delta[mask]) + 240
    sat = np.zeros_like(mx)
    positive = mx > 1e-6
    sat[positive] = delta[positive] / mx[positive]
    return hue, sat, mx


records = []
for level in range(1, 101):
    path = IMAGE_DIR / f"competitor-level-{level:03d}.jpg"
    image = np.asarray(Image.open(path).convert("RGB"))
    # Board and its edge gates. Top HUD and bottom booster row are excluded.
    roi = image[115:590, 70:470]
    hue, sat, val = rgb_to_hsv(roi)
    vivid = (sat >= 0.55) & (val >= 0.62)
    counts = {}
    for name, intervals in RANGES.items():
        color_mask = np.zeros_like(vivid)
        for low, high in intervals:
            color_mask |= (hue >= low) & (hue <= high)
        counts[name] = int(np.count_nonzero(vivid & color_mask))
    records.append({"level": level, "pixels": counts})

print(json.dumps(records, ensure_ascii=False))
