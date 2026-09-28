# Formal generator replacement set

These two transparent cutouts come from `机制切图01/方块生成器`. They are
the authored three-cell horizontal and vertical generator skins used by the
runtime rim-mounted generator. The source PNGs remain the replaceable master
files; `art:optimize` emits deterministic palette-encoded runtime PNGs at the
same dimensions, and the renderer selects the native orientation instead of
rotating a horizontal fallback.

| source cutout | runtime role | size |
| --- | --- | ---: |
| `横.png` | horizontal/top/bottom generator | 285×118 |
| `竖.png` | vertical/left/right generator | 112×299 |

Both skins include their own cyan counter cell. Runtime draws the remaining
cargo number directly in that cell and must not place an additional panel or
pill behind it. Horizontal mounts rotate the complete skin; vertical mounts
keep the counter above the preview and mirror only across the board edge.
The queued block preview is centred on the cyan outline of the large authored
window (`124,55` in the horizontal source and `55,161` in the vertical source),
not on the generator's abstract three-rail anchor.
