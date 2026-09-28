"""Prepare the generated three-cell side-generator sprite for runtime use.

The image generator returned a flattened checkerboard preview.  This script
isolates the single connected machine silhouette, restores a real alpha
channel, and places it on the authored 3 x 1.35-cell canvas without stretching
the generated artwork.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


OUTPUT_SIZE = (285, 128)
PADDING = 5


def isolate_machine(source: Image.Image) -> Image.Image:
    rgb = np.asarray(source.convert("RGB"), dtype=np.int16)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    chroma = maximum - minimum

    # The flattened preview background is bright neutral gray.  The machine is
    # either strongly chromatic or dark.  Restricting to the central artwork
    # region also rejects the faint warped checkerboard near the canvas edges.
    seed = (chroma >= 22) | (maximum <= 145)
    height, width = seed.shape
    roi = np.zeros_like(seed)
    roi[max(0, int(height * 0.08)):min(height, int(height * 0.86)),
        max(0, int(width * 0.02)):min(width, int(width * 0.98))] = True
    seed &= roi

    # The sprite has an opaque cabinet/screen and no intended cut-outs.  Fill
    # each well-supported scanline between its first and last foreground pixel;
    # this preserves the curved dome/feet while restoring white highlights that
    # are neutral and therefore absent from the chroma seed.
    mask = np.zeros_like(seed, dtype=np.uint8)
    for y in range(height):
        xs = np.flatnonzero(seed[y])
        if xs.size >= 18:
            mask[y, xs[0]:xs[-1] + 1] = 255

    ys, xs = np.nonzero(mask)
    if xs.size == 0:
        raise RuntimeError("No generator silhouette found in the generated image")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1

    # A light alpha feather removes the hard checkerboard seam after downscale.
    alpha = Image.fromarray(mask, mode="L").filter(ImageFilter.GaussianBlur(1.15))
    rgba = source.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba.crop((x0, y0, x1, y1))


def fit_authored_canvas(sprite: Image.Image) -> Image.Image:
    max_width = OUTPUT_SIZE[0] - PADDING * 2
    max_height = OUTPUT_SIZE[1] - PADDING * 2
    scale = min(max_width / sprite.width, max_height / sprite.height)
    resized = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((OUTPUT_SIZE[0] - resized.width) // 2, (OUTPUT_SIZE[1] - resized.height) // 2),
    )
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("outputs", nargs="+", type=Path)
    args = parser.parse_args()

    source = Image.open(args.source)
    prepared = fit_authored_canvas(isolate_machine(source))
    for output in args.outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(output, optimize=True)


if __name__ == "__main__":
    main()
