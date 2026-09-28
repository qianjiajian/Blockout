# Block Out! mechanism rules v1.65.0

- Rule ID: `blockout-rules-v1.65.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.64.0.md`; this document is an additive regeneration for Levels 66, 93 and 97 only.

## User-authorized scope

The user reported Levels 66, 93 and 97 as unsolvable and requested regeneration. Only these three final `LEVELS` objects are changed. Board dimensions, playable masks, block IDs, native unrotated footprints, shutter rectangles/count contracts, gate inventory, time, reward, difficulty and save/runtime semantics remain unchanged unless a listed block colour/anchor edit is required by the new layout. No other level, UI, asset, account, save or WeChat package is changed.

## Targeted layouts

- **Lv66:** recolour the three hidden `v146-66-lift2` cargo blocks without changing shape or anchor: `lift2-3` red→blue, `lift2-2` purple→green, `lift2-4` blue→cyan. This removes the reported same-colour deadlock pattern while retaining the lift and all portals.
- **Lv93:** recolour the two outer opening blocks `r147-93-o-red-h2-adapt` and `r147-93-o-blue-s` to yellow. Their native shapes and anchors remain unchanged; this opens a continuing bottom-yellow release chain while retaining both staged shutters, all gate counters and all block IDs.
- **Lv97:** swap only the anchors of the two single-cell opening blocks `r147-97-openingUpper-0` (red) and `r147-97-openingLower-0` (pink), moving them to each other's original positions. Shape, colour, ID, lift and all gates remain unchanged.

All three edits are implemented as the final post-remake overlay in `src/core/levels66_93_97Repair.ts`; historical stages remain available for regression fixtures.

## Evidence boundary

Fresh canonical revised-search witnesses were replayed against the final `LEVELS` object:

| Level | Effective drags | Non-clearing drags | Clear events | Search evidence |
|---|---:|---:|---:|---|
| 66 | 38 | 12 | 26 | 157 explored / 4,966 discovered / 69,187 transitions |
| 93 | 37 | 11 | 26 | 4,510 explored / 76,056 discovered / 2,579,601 transitions |
| 97 | 38 | 13 | 25 | 162 explored / 2,714 discovered / 37,849 transitions |

Each replay reports `valid=true` and `complete=true`; the witness establishes spatial feasibility only. It is not a minimum-move lower-bound, natural-clock, real Pointer/animation or three-star certification. The short fresh rerun for Lv93 can return `UNKNOWN` before finding the witness; the recorded 180-second witness and final-object replay are the authoritative route evidence for this change.

## Release boundary

This change is integrated into the TypeScript level pipeline only. It does not rebuild, upload or publish the WeChat package.
