# Block Out! mechanism rules v1.66.0

- Rule ID: `blockout-rules-v1.66.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.65.0.md`; this document is a rendering-only correction for Level 111.

## User-authorized scope

The user reported that Level 111's green exit is visually overlapped by the board wall. Keep the Level 111 board, blocks, gate directions, counters, portal coordinates, mechanics, difficulty, time, reward, save/runtime semantics and all other levels unchanged.

## Rendering correction

Local portal layers now receive a sub-pixel painter-depth tie-break (`+0.001` in the rim depth key). When a portal terminates at a concave/convex corner, its gate artwork is painted after the equal-depth corner cap, so the corner wall cannot cover the exit frame. This affects painter ordering only; it does not move the gate, alter collision, change exit direction, or change the board rim topology.

The correction is implemented by `boardPortalVisualDepthTop()` in `src/game/boardRim.ts` and used for fixed portals, flip-door portals and exit-pulse layers in `src/game/ColorEscapeGame.ts`.

## Evidence boundary

The board-rim and portal geometry tests pass, including a same-depth local portal/corner case matching Level 111's bottom green mouth. This is a render-order verification, not a mobile screenshot, natural-clock, Pointer/animation or package-upload certification.

## Release boundary

This change is integrated into the TypeScript renderer only. It does not rebuild, upload or publish the WeChat package.
