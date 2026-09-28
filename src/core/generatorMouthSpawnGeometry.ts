import type { GeneratorSpec, Point } from "./types";

export interface GeneratorMouthSpawnBoard {
  width: number;
  height: number;
  /** Omit for a full rectangular board. */
  playable?: readonly Point[];
  /** Cells removed from the playable mask. */
  blocked?: readonly Point[];
}

export interface GeneratorMouthTemplateBounds {
  x: number;
  y: number;
  width: 3;
  height: 3;
}

export interface GeneratorMouthTemplateGeometry {
  rimAnchor: NonNullable<GeneratorSpec["rimAnchor"]>;
  /** Three first-ring cells, ordered along the machine's clockwise tangent. */
  mouthCells: Point[];
  /** Top-left cell of the axis-aligned 3x3 inward staging template. */
  templateOrigin: Point;
  templateBounds: GeneratorMouthTemplateBounds;
}

export type GeneratorMouthTemplateResult =
  | ({ status: "ok" } & GeneratorMouthTemplateGeometry)
  | { status: "invalid"; reason: string };

interface CheckedGeneratorMouthSpawn extends GeneratorMouthTemplateGeometry {
  spawn: Point;
  /** The authored relative shape translated by spawn, without normalization. */
  footprint: Point[];
  /** Whether the footprint contains mouthCells[1], the center-axis entry cell. */
  touchesCenterMouth: boolean;
}

export type GeneratorMouthSpawnValidation =
  | ({ status: "ok" } & CheckedGeneratorMouthSpawn)
  | ({
    status: "blocked";
    rejectedCells: Point[];
    reason: string;
  } & CheckedGeneratorMouthSpawn)
  | ({
    status: "invalid";
    reason: string;
  } & Partial<CheckedGeneratorMouthSpawn>);

type QuarterTurn = 0 | 1 | 2 | 3;

interface DirectionVectors {
  tangent: Point;
  inward: Point;
  outward: Point;
}

const vectorsFor = (quarterTurns: QuarterTurn): DirectionVectors => {
  if (quarterTurns === 0) {
    return { tangent: [1, 0], inward: [0, 1], outward: [0, -1] };
  }
  if (quarterTurns === 1) {
    return { tangent: [0, 1], inward: [-1, 0], outward: [1, 0] };
  }
  if (quarterTurns === 2) {
    return { tangent: [-1, 0], inward: [0, -1], outward: [0, 1] };
  }
  return { tangent: [0, -1], inward: [1, 0], outward: [-1, 0] };
};

const pointKey = ([x, y]: Point): string => `${x},${y}`;

const isIntegerPoint = (point: Point): boolean => (
  point.length === 2 && point.every((coordinate) => Number.isInteger(coordinate))
);

const effectiveRimAnchor = (
  generator: Pick<GeneratorSpec, "side" | "offset" | "rimAnchor">,
  board: Pick<GeneratorMouthSpawnBoard, "width" | "height">,
): NonNullable<GeneratorSpec["rimAnchor"]> | undefined => {
  if (generator.rimAnchor) return { ...generator.rimAnchor };
  if (!Number.isInteger(generator.offset)) return undefined;
  if (generator.side === "top") {
    return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
  }
  if (generator.side === "right") {
    return { x: board.width, y: generator.offset + 0.5, quarterTurns: 1 };
  }
  if (generator.side === "bottom") {
    return { x: generator.offset + 0.5, y: board.height, quarterTurns: 2 };
  }
  if (generator.side === "left") {
    return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
  }
  return undefined;
};

/**
 * Projects one grid-aligned rim anchor into its three mouth-adjacent cells and
 * the axis-aligned 3x3 staging template extending inward from those cells.
 */
export const generatorMouthTemplateFromRimAnchor = (
  rimAnchor: Readonly<NonNullable<GeneratorSpec["rimAnchor"]>>,
): GeneratorMouthTemplateResult => {
  if (!Number.isFinite(rimAnchor.x)
    || !Number.isFinite(rimAnchor.y)
    || ![0, 1, 2, 3].includes(rimAnchor.quarterTurns)) {
    return { status: "invalid", reason: "Generator rim geometry is invalid." };
  }
  const vectors = vectorsFor(rimAnchor.quarterTurns);
  // Half a cell inward reaches the center of the first staging cell. Subtract
  // another half cell to express that center as an integer cell coordinate.
  const centerX = rimAnchor.x - vectors.outward[0] * 0.5 - 0.5;
  const centerY = rimAnchor.y - vectors.outward[1] * 0.5 - 0.5;
  if (!Number.isInteger(centerX) || !Number.isInteger(centerY)) {
    return { status: "invalid", reason: "Generator center rail is not aligned to the cell grid." };
  }

  const mouthCells = [-1, 0, 1].map((offset): Point => [
    centerX + vectors.tangent[0] * offset,
    centerY + vectors.tangent[1] * offset,
  ]);
  const templateCells = mouthCells.flatMap(([x, y]) => [0, 1, 2].map((depth): Point => [
    x + vectors.inward[0] * depth,
    y + vectors.inward[1] * depth,
  ]));
  const templateOrigin: Point = [
    Math.min(...templateCells.map(([x]) => x)),
    Math.min(...templateCells.map(([, y]) => y)),
  ];

  return {
    status: "ok",
    rimAnchor: { ...rimAnchor },
    mouthCells,
    templateOrigin,
    templateBounds: {
      x: templateOrigin[0],
      y: templateOrigin[1],
      width: 3,
      height: 3,
    },
  };
};

/** Resolves rimAnchor first, falling back to the legacy side/offset projection. */
export const resolveGeneratorMouthTemplate = (
  generator: Pick<GeneratorSpec, "side" | "offset" | "rimAnchor">,
  board: Pick<GeneratorMouthSpawnBoard, "width" | "height">,
): GeneratorMouthTemplateResult => {
  if (!Number.isInteger(board.width) || board.width <= 0
    || !Number.isInteger(board.height) || board.height <= 0) {
    return { status: "invalid", reason: "Board dimensions must be positive integers." };
  }
  const rimAnchor = effectiveRimAnchor(generator, board);
  if (!rimAnchor) return { status: "invalid", reason: "Generator rim geometry is invalid." };
  return generatorMouthTemplateFromRimAnchor(rimAnchor);
};

/**
 * Validates one authored spawn without moving, centering, rotating, normalizing,
 * or searching for the queued shape. A valid footprint must contain the center
 * first-ring mouth cell (mouthCells[1]) and every cell must remain playable.
 */
export const validateGeneratorMouthSpawn = (
  generator: Pick<GeneratorSpec, "side" | "offset" | "rimAnchor">,
  spawn: Point,
  shape: readonly Point[],
  board: Readonly<GeneratorMouthSpawnBoard>,
): GeneratorMouthSpawnValidation => {
  if (!isIntegerPoint(spawn)) {
    return { status: "invalid", reason: "Spawn must be an integer board anchor." };
  }
  if (!shape.length || shape.some((cell) => !isIntegerPoint(cell))) {
    return { status: "invalid", reason: "Shape must contain integer cell offsets." };
  }
  if (new Set(shape.map(pointKey)).size !== shape.length) {
    return { status: "invalid", reason: "Shape cell offsets must be unique." };
  }

  const template = resolveGeneratorMouthTemplate(generator, board);
  if (template.status === "invalid") return template;
  const { status: _templateStatus, ...geometry } = template;
  const footprint = shape.map(([dx, dy]): Point => [spawn[0] + dx, spawn[1] + dy]);
  const centerMouthKey = pointKey(geometry.mouthCells[1]!);
  const touchesCenterMouth = footprint.some((cell) => pointKey(cell) === centerMouthKey);
  const checked: CheckedGeneratorMouthSpawn = {
    ...geometry,
    spawn: [...spawn],
    footprint,
    touchesCenterMouth,
  };
  if (!touchesCenterMouth) {
    return {
      status: "invalid",
      ...checked,
      reason: "Spawn footprint does not contain the center mouth cell.",
    };
  }

  const playable = board.playable ? new Set(board.playable.map(pointKey)) : undefined;
  const blocked = new Set((board.blocked ?? []).map(pointKey));
  const rejectedCells = footprint.filter(([x, y]) => (
    x < 0 || x >= board.width || y < 0 || y >= board.height
      || (playable !== undefined && !playable.has(pointKey([x, y])))
      || blocked.has(pointKey([x, y]))
  ));
  if (rejectedCells.length) {
    return {
      status: "blocked",
      ...checked,
      rejectedCells,
      reason: "Spawn footprint is not fully playable.",
    };
  }
  return { status: "ok", ...checked };
};
