# Block Out! mechanism rules v1.64.0

- Rule ID: `blockout-rules-v1.64.0`
- Runtime profile: `revised-2026-09-23-v1.4`
- Frozen on: 2026-09-26
- Inherits every rule in `mechanism-rules-v1.63.0.md`; this document is an additive Lv63 regeneration only.

## User-authorized scope

The user reported that the green piece shown at the opening of Level 63 must not be clearable after the exit/full-shape bug fix, and requested that Level 63 be regenerated and solved. This version changes only the production Level 63 object. Other levels, save data, reward values, timer semantics, UI, assets and the WeChat package remain unchanged.

## Lv63 contract

- Preserve the 6×8 board, all 48 playable cells, the eight existing portal colours/sides/sizes/offsets, all 18 block IDs, colours, block-count composition and native non-rotated footprints.
- The former green H3 opening piece is replaced by the native green L3 placement at `[0,1]`; neither green block touches the green top portal at the opening, so `possibleExitSides` returns no green opening clear.
- Pink, red and cyan portals are ordinary at the opening to provide the necessary non-green release chain. Their first clears thaw the remaining frozen counters; the green portal remains in its original top position and becomes usable only after the board has opened.
- The final opening is fully covered without overlaps. The layout must pass `validateLevel`, and a fresh revised search must replay to a complete state under the fixed full-shape exit contract.
- A search witness proves spatial feasibility only. It is not a minimum-move lower-bound, natural-clock, or real Pointer/animation certification.

## Evidence boundary

The regenerated final object produced a fresh witness with 22 drags, 19 clears and 3 non-clearing drags; the replay was valid and complete. The initial-state audit confirms no green block has a legal exit while the pink, red and cyan opening exits are legal. The prior v1.62 Level 63 UNKNOWN evidence remains immutable.

## Release boundary

This change is integrated into the TypeScript level pipeline only. It does not rebuild, upload or publish the WeChat package.
