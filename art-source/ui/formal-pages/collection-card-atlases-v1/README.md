# Collection card illustration atlases

These ten ImageGen source atlases provide one independent illustration for
every live Collection card while keeping the runtime package small.

- `level-01.png` through `level-08.png` map to levels 001–200 in consecutive
  groups of 25.
- `masterpiece-01.png` maps to masterpieces 01–25.
- `masterpiece-02.png` maps to masterpieces 26–50; the live catalog currently
  uses cells 26–40 and leaves ten cells ready for future expansion.
- Every atlas is an exact 5×5 grid. Cells are read left-to-right, then
  top-to-bottom.
- The source masters stay at 1254×1254. `tools/optimize-assets.mjs` produces
  deterministic 1000×1000 q60 JPEG runtime atlases, so do not edit the generated
  files under `public/` directly.

Replacement art should preserve the 5×5 grid, square cells, narrow gutters,
and the shared polished fantasy-casual illustration language. Keep text,
numbers, stars, locks, badges, and card frames out of the scene cells because
the game draws those interface states independently.

The generation template was: “Production sprite atlas for a premium mobile
puzzle game's collection cards. EXACTLY a 5 columns by 5 rows grid: 25 equal
square illustration tiles, perfectly aligned to a uniform grid, narrow clean
gutters, no outer frame. Each tile is a different whimsical fantasy
destination rendered in the SAME cohesive polished 3D casual-game style:
bright saturated colors, soft global illumination, chunky toy-like forms,
readable central landmark, gentle depth. No text, letters, numbers, labels,
stars, locks, badges, card borders, UI chrome, or overlap across cells.”
