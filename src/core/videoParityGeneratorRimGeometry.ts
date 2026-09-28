/**
 * Visual placement contract for every side generator visible in the Lv1-100
 * competitor-video parity campaign.
 *
 * This data is intentionally separate from gameplay `GeneratorSpec`: it does
 * not alter spawning or queue semantics. `offset` uses the existing campaign
 * convention (the machine is centred on edge cell `offset`), while `rimSpan`
 * records the three-rail footprint visible in the competitor opening frames.
 *
 * Most records can be projected from `side` + `offset`. `anchor` overrides
 * that projection for an inset/local rim. Anchor coordinates are logical board
 * coordinates at the centre of the middle rail. Quarter turns are clockwise:
 * top=0, right=1, bottom=2, left=3.
 */

export type VideoParityGeneratorRimSide = "top" | "right" | "bottom" | "left";

export interface VideoParityGeneratorRimAnchor {
  readonly x: number;
  readonly y: number;
  readonly quarterTurns: 0 | 1 | 2 | 3;
}

export interface VideoParityGeneratorRimGeometry {
  readonly levelId: number;
  readonly generatorId: string;
  readonly side: VideoParityGeneratorRimSide;
  /** Zero-based edge-cell index at the visual centre of the machine. */
  readonly offset: number;
  /** Number of consecutive rim rails covered by the complete machine art. */
  readonly rimSpan: 3;
  readonly rimMount: "rim" | "outboard";
  readonly anchor?: VideoParityGeneratorRimAnchor;
}

const geometry = (
  levelId: number,
  generatorId: string,
  side: VideoParityGeneratorRimSide,
  offset: number,
  anchor?: VideoParityGeneratorRimAnchor,
  rimMount: "rim" | "outboard" = "rim",
): VideoParityGeneratorRimGeometry => Object.freeze({
  levelId,
  generatorId,
  side,
  offset,
  rimSpan: 3 as const,
  rimMount,
  ...(anchor ? { anchor: Object.freeze(anchor) } : {}),
});

export const VIDEO_PARITY_GENERATOR_RIM_GEOMETRY: readonly VideoParityGeneratorRimGeometry[] = Object.freeze([
  geometry(35, "vp-035-generator-1", "left", 2, { x: 0, y: 1.5, quarterTurns: 3 }),
  geometry(35, "vp-035-generator-2", "right", 5, { x: 5, y: 2.5, quarterTurns: 1 }),

  // Lv36: upper-left, middle-right, lower-left, exactly as the opening frame.
  geometry(36, "vp-036-generator-1", "left", 2),
  geometry(36, "vp-036-generator-2", "right", 4, { x: 6, y: 7.5, quarterTurns: 1 }),
  geometry(36, "vp-036-generator-3", "left", 6),

  geometry(37, "vp-037-generator-1", "top", 3, { x: 5, y: 6.5, quarterTurns: 1 }),
  geometry(38, "vp-038-generator-1", "top", 1, { x: 0, y: 1.5, quarterTurns: 3 }),
  geometry(39, "vp-039-generator-1", "top", 3, { x: 0, y: 1.5, quarterTurns: 3 }),

  geometry(41, "vp-041-generator-1", "top", 1, { x: 0, y: 1.5, quarterTurns: 3 }),
  geometry(41, "vp-041-generator-2", "top", 5, { x: 0, y: 4.5, quarterTurns: 3 }),

  // Five machines own real free rails. The sixth stays on the reference right
  // edge but sits one cell outboard because both right rim bands are exits.
  geometry(43, "vp-043-generator-1", "left", 1),
  geometry(43, "vp-043-generator-2", "right", 1, { x: 0, y: 4.5, quarterTurns: 3 }),
  geometry(43, "vp-043-generator-3", "left", 4, { x: 0, y: 7.5, quarterTurns: 3 }),
  geometry(43, "vp-043-generator-4", "right", 4, { x: 2.5, y: 9, quarterTurns: 2 }),
  geometry(43, "vp-043-generator-5", "left", 7, { x: 7, y: 7.5, quarterTurns: 1 }),
  geometry(43, "vp-043-generator-6", "right", 7, { x: 7.98, y: 1.5, quarterTurns: 1 }, "outboard"),

  geometry(44, "vp-044-generator-1", "top", 3, { x: 3.5, y: -1, quarterTurns: 0 }, "outboard"),

  // The irregular mask has one real three-rail inner wall. The second machine
  // sits outside the occupied left exit instead of masking it or blocking
  // playable cells.
  geometry(46, "vp-046-generator-1", "right", 2, { x: 2, y: 6.5, quarterTurns: 3 }),
  geometry(46, "vp-046-generator-2", "left", 2, { x: -0.98, y: 2.5, quarterTurns: 3 }, "outboard"),

  geometry(47, "vp-047-generator-1", "right", 2, { x: 1, y: 2.5, quarterTurns: 1 }),
  geometry(47, "vp-047-generator-2", "right", 5, { x: 1, y: 5.5, quarterTurns: 1 }),

  geometry(49, "vp-049-generator-1", "left", 8),
  geometry(49, "vp-049-generator-2", "right", 8, { x: 0, y: 5.5, quarterTurns: 3 }),

  geometry(56, "vp-056-generator-1", "top", 2, { x: 5.5, y: 9, quarterTurns: 2 }),
  geometry(57, "vp-057-generator-1", "top", 3, { x: 0, y: 4.5, quarterTurns: 3 }),
  geometry(58, "vp-058-generator-1", "left", 3, { x: 2, y: 3.5, quarterTurns: 3 }),
  geometry(62, "vp-062-generator-1", "left", 3, { x: 0, y: 4.5, quarterTurns: 3 }),
  geometry(70, "vp-070-generator-1", "top", 2),
  geometry(71, "vp-071-generator-1", "left", 7, { x: 1.5, y: 4, quarterTurns: 0 }),

  geometry(77, "vp-077-generator-1", "top", 3, { x: 5.5, y: 3, quarterTurns: 0 }),

  // The original Lv87/Lv88 masks do not reproduce the competitor's symmetric
  // inner waist. Use the nearest paired, continuous three-rail outer segments;
  // this keeps both machines level and avoids drawing through playable cells.
  geometry(87, "vp-087-generator-1", "left", 4, { x: 0, y: 5.5, quarterTurns: 3 }),
  geometry(87, "vp-087-generator-2", "right", 4, { x: 5.5, y: 9, quarterTurns: 2 }),
  geometry(88, "vp-088-generator-1", "left", 5, { x: 5.5, y: 0, quarterTurns: 0 }),
  geometry(88, "vp-088-generator-2", "right", 5, { x: 7.98, y: 6.5, quarterTurns: 1 }, "outboard"),

  geometry(89, "vp-089-generator-1", "left", 8, { x: -0.98, y: 8.5, quarterTurns: 3 }, "outboard"),
  geometry(90, "vp-090-generator-1", "left", 9),
  geometry(90, "vp-090-generator-2", "right", 9, { x: 4.5, y: 11, quarterTurns: 2 }),
]);

export const videoParityGeneratorRimGeometryKey = (levelId: number, generatorId: string): string => (
  `${levelId}:${generatorId}`
);

const GEOMETRY_BY_KEY = new Map(
  VIDEO_PARITY_GENERATOR_RIM_GEOMETRY.map((entry) => [
    videoParityGeneratorRimGeometryKey(entry.levelId, entry.generatorId),
    entry,
  ]),
);

export const getVideoParityGeneratorRimGeometry = (
  levelId: number,
  generatorId: string,
): VideoParityGeneratorRimGeometry | undefined => (
  GEOMETRY_BY_KEY.get(videoParityGeneratorRimGeometryKey(levelId, generatorId))
);
