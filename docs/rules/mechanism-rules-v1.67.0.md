# Block Out! mechanism rules v1.67.0

- Rule ID: `blockout-rules-v1.67.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.66.0.md`; this document records the user-authorized Level 72 deadlock repair.

## User-authorized scope

The user reported that Level 72 is a deadlock and requested a new adjustment. Only the final Level 72 object is changed. Levels 1–71 and 73–200, the Level 111 render correction, saves, rewards, difficulty labels, time limits, and runtime behavior remain unchanged.

## Level 72 repair

Keep the Level 72 board width/height, playable cells, blocked cells, seams, block IDs, positions, shapes, hidden shutter region, shutter count, gates, portal coordinates/directions, counters, and all level metadata unchanged. Recolor exactly two authored blocks so existing routes can be used:

- `r147-72-o4`: outer red → yellow; if a `layers` array is present, its first entry is synchronized to yellow.
- `r147-72-h2`: outer orange → cyan; if a `layers` array is present, its first entry is synchronized to cyan.

No geometry, rotation, mirror, collision footprint, gate capacity, shutter geometry, or mechanism count is changed by this repair.

## Evidence boundary

A fresh replay under the revised model reaches `complete=true` with all 19 Level 72 blocks cleared after the two recolors. This is a spatial complete-route witness only. It does not certify a minimum necessary-move lower bound, natural-clock timing, real Pointer input, mobile WeChat behavior, or package build/upload.

## Release boundary

The repair is integrated into the TypeScript formal level pipeline. It does not rebuild, upload, or publish the WeChat package unless the user separately requests that operation.
