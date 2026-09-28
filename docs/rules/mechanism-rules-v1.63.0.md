# Block Out! mechanism rules v1.63.0

- Rule ID: `blockout-rules-v1.63.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.62.0.md`; this document is an additive Lv43 repair only.

## User-authorized scope

The user requested “调整43关” after the v1.62 verification found a structural opening deadlock. This version authorizes a production-only redesign of Level 43. No other level, save data, reward system, timer semantics, UI, asset pipeline or WeChat package is changed.

## Lv43 contract

- Preserve the 6×8 playable board, the four existing exits and their colors/positions, level name, normal difficulty, 95-second clock, reward 110, parMoves 23 and preservedMoveTarget 23.
- Preserve the six generator instances and queue IDs (`43-q1` through `43-q6`), while allowing their rim side/offset, spawn anchor, queue color and non-rotated horizontal footprint to be re-authored so the machines form a valid release chain.
- Preserve all authored block IDs. The active board is fully covered without overlaps at the opening; queue pieces remain outside the active board until their generator releases them.
- The replacement uses only axis-aligned horizontal native footprints (3-cell and 2-cell bars). No texture is rotated or mirrored, and no runtime rotation is introduced.
- The final object must pass `validateLevel`, generator mouth/rim geometry checks, full opening coverage, and a fresh revised search plus independent route replay. A witness proves spatial feasibility only; it does not certify a minimum-move lower bound, natural-clock timing, or real Pointer/animation replay.

## Evidence boundary

The v1.63 candidate was searched from the final `LEVELS` object with a 120-second budget and found a complete 24-drag witness: 24 clears, 0 non-clearing drags, 622 discovered states and 4,740 attempted transitions. This is a spatial witness and not a difficulty certificate. The old v1.62 deadlock report remains immutable.

## Release boundary

This change is integrated into the TypeScript level pipeline only. It does not rebuild, upload or publish the WeChat package.
