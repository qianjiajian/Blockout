import type { BoardRimRail, QuarterTurn } from "./boardRim";

export interface GeneratorRimAnchor {
  /** Center of the middle rail, in board-cell coordinates. */
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export interface GeneratorRimPoint {
  x: number;
  y: number;
}

export interface GeneratorRimBounds extends GeneratorRimPoint {
  width: number;
  height: number;
}

export interface GeneratorRimGeometry {
  anchor: GeneratorRimAnchor;
  /** Clockwise Canvas rotation from the canonical top-facing bitmap. */
  rotation: number;
  /** The three exposed rails replaced by the generator body. */
  reservedRails: BoardRimRail[];
  /** Axis-aligned visual envelope in board-cell coordinates. */
  visualBounds: GeneratorRimBounds;
  /** World-space anchors for upright overlay content. */
  previewAnchor: GeneratorRimPoint;
  countAnchor: GeneratorRimPoint;
}

export interface GeneratorRimPixelProjection {
  innerX: number;
  innerY: number;
  cell: number;
}

export interface GeneratorRimPixelGeometry {
  anchor: GeneratorRimPoint;
  rotation: number;
  visualBounds: GeneratorRimBounds;
  previewAnchor: GeneratorRimPoint;
  countAnchor: GeneratorRimPoint;
  reservedRailCenters: GeneratorRimPoint[];
}

/**
 * Geometry shared by the formal side-generator sprite and board-rim planner.
 * Local `outward` coordinates point away from the playable floor. The bitmap
 * crosses the board seam slightly so it can replace, rather than float beside,
 * the three neutral rail cells it owns.
 */
export const GENERATOR_RIM_METRICS = {
  span: 3,
  halfSpan: 1.5,
  outwardDepth: 1,
  inwardDepth: 0.35,
  totalDepth: 1.35,
  /**
   * Preview-window and counter-slot centres measured from the authored
   * 285x118 horizontal and 112x299 vertical generator cut-outs. The
   * horizontal skin is rotated for bottom mounts; the vertical skin is kept
   * upright and mirrored for left mounts, so both vertical windows retain
   * their screen-space up/down ordering.
   */
  horizontalPreviewTangent: -1.5 + (124 / 285) * 3,
  horizontalPreviewOutward: (3 * 118 / 285) * (1 - 55 / 118),
  verticalPreviewScreenDown: -1.5 + (161 / 299) * 3,
  verticalPreviewOutward: (55 / 299) * 3,
  horizontalCountTangent: -1.5 + (246 / 285) * 3,
  horizontalCountOutward: (3 * 118 / 285) * (1 - 55 / 118),
  verticalCountScreenUp: 1.5 - (39 / 299) * 3,
  verticalCountOutward: (55 / 299) * 3,
} as const;

interface DirectionVectors {
  tangentX: number;
  tangentY: number;
  outwardX: number;
  outwardY: number;
  rotation: number;
}

const directionVectors = (quarterTurns: QuarterTurn): DirectionVectors => {
  if (quarterTurns === 0) {
    return { tangentX: 1, tangentY: 0, outwardX: 0, outwardY: -1, rotation: 0 };
  }
  if (quarterTurns === 1) {
    return { tangentX: 0, tangentY: 1, outwardX: 1, outwardY: 0, rotation: Math.PI / 2 };
  }
  if (quarterTurns === 2) {
    return { tangentX: -1, tangentY: 0, outwardX: 0, outwardY: 1, rotation: Math.PI };
  }
  return { tangentX: 0, tangentY: -1, outwardX: -1, outwardY: 0, rotation: -Math.PI / 2 };
};

const offsetPoint = (
  anchor: Pick<GeneratorRimAnchor, "x" | "y">,
  vectors: DirectionVectors,
  tangent: number,
  outward: number,
): GeneratorRimPoint => ({
  x: anchor.x + vectors.tangentX * tangent + vectors.outwardX * outward,
  y: anchor.y + vectors.tangentY * tangent + vectors.outwardY * outward,
});

const boundsOf = (points: readonly GeneratorRimPoint[]): GeneratorRimBounds => {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
};

/**
 * Builds one three-rail generator envelope from the center rail it replaces.
 * The result stays in board-cell coordinates so it can be used before the
 * final board scale and viewport transform are known.
 */
export const buildGeneratorRimGeometry = (
  anchor: Readonly<GeneratorRimAnchor>,
): GeneratorRimGeometry => {
  const vectors = directionVectors(anchor.quarterTurns);
  const reservedRails = [-1, 0, 1].map((tangentOffset): BoardRimRail => ({
    x: anchor.x + vectors.tangentX * tangentOffset,
    y: anchor.y + vectors.tangentY * tangentOffset,
    quarterTurns: anchor.quarterTurns,
  }));
  const corners = [
    offsetPoint(anchor, vectors, -GENERATOR_RIM_METRICS.halfSpan, -GENERATOR_RIM_METRICS.inwardDepth),
    offsetPoint(anchor, vectors, GENERATOR_RIM_METRICS.halfSpan, -GENERATOR_RIM_METRICS.inwardDepth),
    offsetPoint(anchor, vectors, -GENERATOR_RIM_METRICS.halfSpan, GENERATOR_RIM_METRICS.outwardDepth),
    offsetPoint(anchor, vectors, GENERATOR_RIM_METRICS.halfSpan, GENERATOR_RIM_METRICS.outwardDepth),
  ];
  const vertical = anchor.quarterTurns === 1 || anchor.quarterTurns === 3;
  const countTangent = anchor.quarterTurns === 1
    ? -GENERATOR_RIM_METRICS.verticalCountScreenUp
    : anchor.quarterTurns === 3
      ? GENERATOR_RIM_METRICS.verticalCountScreenUp
      : GENERATOR_RIM_METRICS.horizontalCountTangent;
  const countOutward = vertical
    ? GENERATOR_RIM_METRICS.verticalCountOutward
    : GENERATOR_RIM_METRICS.horizontalCountOutward;
  const previewTangent = anchor.quarterTurns === 1
    ? GENERATOR_RIM_METRICS.verticalPreviewScreenDown
    : anchor.quarterTurns === 3
      ? -GENERATOR_RIM_METRICS.verticalPreviewScreenDown
      : GENERATOR_RIM_METRICS.horizontalPreviewTangent;
  const previewOutward = vertical
    ? GENERATOR_RIM_METRICS.verticalPreviewOutward
    : GENERATOR_RIM_METRICS.horizontalPreviewOutward;

  return {
    anchor: { ...anchor },
    rotation: vectors.rotation,
    reservedRails,
    visualBounds: boundsOf(corners),
    previewAnchor: offsetPoint(anchor, vectors, previewTangent, previewOutward),
    countAnchor: offsetPoint(anchor, vectors, countTangent, countOutward),
  };
};

const projectPoint = (
  point: Readonly<GeneratorRimPoint>,
  projection: Readonly<GeneratorRimPixelProjection>,
): GeneratorRimPoint => ({
  x: projection.innerX + point.x * projection.cell,
  y: projection.innerY + point.y * projection.cell,
});

/** Projects board-cell generator geometry into the logical Canvas pixel space. */
export const projectGeneratorRimGeometry = (
  geometry: Readonly<GeneratorRimGeometry>,
  projection: Readonly<GeneratorRimPixelProjection>,
): GeneratorRimPixelGeometry => ({
  anchor: projectPoint(geometry.anchor, projection),
  rotation: geometry.rotation,
  visualBounds: {
    ...projectPoint(geometry.visualBounds, projection),
    width: geometry.visualBounds.width * projection.cell,
    height: geometry.visualBounds.height * projection.cell,
  },
  previewAnchor: projectPoint(geometry.previewAnchor, projection),
  countAnchor: projectPoint(geometry.countAnchor, projection),
  reservedRailCenters: geometry.reservedRails.map((rail) => projectPoint(rail, projection)),
});
