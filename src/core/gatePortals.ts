import type { GatePortalSpec, GateSpec, LevelSpec, Point, Side } from "./types";
import { boardRailIsSeam } from "./boardSeams";

type BoardGeometry = Readonly<Pick<LevelSpec, "width" | "height" | "playable" | "blocked" | "seams">>;
export type GatePortalOwner = Readonly<Pick<GateSpec, "id" | "side" | "offset" | "size" | "portals">>;

export const outwardVector = (side: Side): Point => (
  side === "top" ? [0, -1]
    : side === "right" ? [1, 0]
      : side === "bottom" ? [0, 1]
        : [-1, 0]
);

export const portalTangentOffset = (portal: GatePortalSpec): number => (
  portal.side === "top" || portal.side === "bottom" ? portal.origin[0] : portal.origin[1]
);

export const legacyOuterPortal = (
  board: Readonly<Pick<LevelSpec, "width" | "height">>,
  gate: Readonly<Pick<GateSpec, "side" | "offset" | "size">>,
): GatePortalSpec => ({
  side: gate.side,
  origin: gate.side === "top" ? [gate.offset, 0]
    : gate.side === "right" ? [board.width - 1, gate.offset]
      : gate.side === "bottom" ? [gate.offset, board.height - 1]
        : [0, gate.offset],
  size: gate.size,
});

/** Expands both legacy and portal-authored gates to physical apertures. */
export const gatePortals = (
  board: Readonly<Pick<LevelSpec, "width" | "height">>,
  gate: Readonly<Pick<GateSpec, "side" | "offset" | "size" | "portals">>,
): readonly GatePortalSpec[] => (gate.portals?.length
  ? gate.portals
  : [legacyOuterPortal(board, gate)]
);

export const portalMouthCells = (portal: GatePortalSpec): Point[] => {
  const [originX, originY] = portal.origin;
  return Array.from({ length: portal.size }, (_, index) => (
    portal.side === "top" || portal.side === "bottom"
      ? [originX + index, originY] as Point
      : [originX, originY + index] as Point
  ));
};

export const portalOutwardCells = (portal: GatePortalSpec): Point[] => {
  const [dx, dy] = outwardVector(portal.side);
  return portalMouthCells(portal).map(([x, y]) => [x + dx, y + dy] as Point);
};

export const directedRailKey = ([x, y]: Point, side: Side): string => `${x},${y}:${side}`;

export const portalRailKeys = (portal: GatePortalSpec): string[] => (
  portalMouthCells(portal).map((cell) => directedRailKey(cell, portal.side))
);

export const gatePortalMouthCells = (
  board: Readonly<Pick<LevelSpec, "width" | "height">>,
  gate: Readonly<Pick<GateSpec, "side" | "offset" | "size" | "portals">>,
): Point[] => gatePortals(board, gate).flatMap(portalMouthCells);

export interface PortalBoardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cell-space rectangle occupied by the playable mouth cells. */
export const portalBoardRect = (portal: GatePortalSpec): PortalBoardRect => ({
  x: portal.origin[0],
  y: portal.origin[1],
  width: portal.side === "top" || portal.side === "bottom" ? portal.size : 1,
  height: portal.side === "left" || portal.side === "right" ? portal.size : 1,
});

/** Midpoint of the physical boundary rail in board-cell coordinates. */
export const portalBoundaryAnchor = (portal: GatePortalSpec): Point => {
  const half = portal.size / 2;
  const [x, y] = portal.origin;
  if (portal.side === "top") return [x + half, y];
  if (portal.side === "bottom") return [x + half, y + 1];
  if (portal.side === "left") return [x, y + half];
  return [x + 1, y + half];
};

const buildPlayableCells = (board: BoardGeometry): Set<string> => {
  const result = board.playable
    ? new Set(board.playable.map(([x, y]) => `${x},${y}`))
    : new Set<string>();
  if (!board.playable) {
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) result.add(`${x},${y}`);
    }
  }
  for (const [x, y] of board.blocked ?? []) result.delete(`${x},${y}`);
  return result;
};

const playableCellsCache = new WeakMap<object, Set<string>>();

const cachedPlayableCells = (board: BoardGeometry): Set<string> => {
  const cacheKey = board as object;
  const cached = playableCellsCache.get(cacheKey);
  if (cached) return cached;
  const cells = buildPlayableCells(board);
  playableCellsCache.set(cacheKey, cells);
  return cells;
};

/** True when every frontier cell faces local void/outside in the given direction. */
export const frontierFacesExposedBoundary = (
  board: BoardGeometry,
  frontier: readonly Point[],
  side: Side,
): boolean => {
  if (!frontier.length) return false;
  const playable = cachedPlayableCells(board);
  const [dx, dy] = outwardVector(side);
  return frontier.every(([x, y]) => (
    boardRailIsSeam(board, [x, y], side)
    || !playable.has(`${x + dx},${y + dy}`)
  ));
};

/** Exact directed-rail match; tangent-only overlap is intentionally insufficient. */
export const portalCoversFrontier = (
  frontier: readonly Point[],
  portal: GatePortalSpec,
): boolean => {
  if (!frontier.length) return false;
  const tangentStart = portalTangentOffset(portal);
  const tangentEnd = tangentStart + portal.size;
  const normal = portal.side === "top" || portal.side === "bottom" ? portal.origin[1] : portal.origin[0];
  return frontier.every(([x, y]) => {
    const cellNormal = portal.side === "top" || portal.side === "bottom" ? y : x;
    const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
    return cellNormal === normal && tangent >= tangentStart && tangent < tangentEnd;
  });
};

export interface GatePortalValidationOwner {
  gateId: string;
  gateKind: "gate" | "flip door";
}

/**
 * Validates one logical exit and reserves its directed physical rails.
 * The shared rail set makes fixed gates and flip doors collide consistently.
 */
export const validateGatePortalGeometry = (
  level: BoardGeometry & Readonly<Pick<LevelSpec, "id">>,
  gate: GatePortalOwner,
  owner: GatePortalValidationOwner,
  occupiedRails: Set<string>,
): void => {
  const label = `${owner.gateKind} ${owner.gateId}`;
  if (gate.portals !== undefined && !Array.isArray(gate.portals)) {
    throw new Error(`Level ${level.id}: ${label} portals must be an array`);
  }
  if (gate.portals && gate.portals.length === 0) {
    throw new Error(`Level ${level.id}: ${label} portals cannot be empty`);
  }
  const portals = gate.portals?.length ? gate.portals : [legacyOuterPortal(level, gate)];
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    if (!portal || !(portal.side === "top" || portal.side === "right" || portal.side === "bottom" || portal.side === "left")) {
      throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} has invalid side ${String(portal?.side)}`);
    }
    if (!Array.isArray(portal.origin) || portal.origin.length !== 2
      || !portal.origin.every(Number.isInteger) || !Number.isInteger(portal.size) || portal.size <= 0) {
      throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} needs an integer origin and positive integer size`);
    }
  }
  if (gate.portals) {
    const first = gate.portals[0];
    if (gate.side !== first.side || gate.offset !== portalTangentOffset(first) || gate.size !== first.size) {
      throw new Error(`Level ${level.id}: ${label} side/offset/size must mirror portal 0`);
    }
  }
  const playable = buildPlayableCells(level);
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    const mouth = portalMouthCells(portal);
    const outward = portalOutwardCells(portal);
    for (let index = 0; index < mouth.length; index += 1) {
      const [x, y] = mouth[index];
      const mouthKey = `${x},${y}`;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height
        || !playable.has(mouthKey) || blocked.has(mouthKey)) {
        throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} has invalid mouth cell ${mouthKey}`);
      }
      const [outX, outY] = outward[index];
      if (playable.has(`${outX},${outY}`) && !boardRailIsSeam(level, [x, y], portal.side)) {
        throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} rail ${directedRailKey([x, y], portal.side)} points into playable cell ${outX},${outY}`);
      }
      const rail = directedRailKey([x, y], portal.side);
      if (occupiedRails.has(rail)) {
        const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
        throw new Error(`Level ${level.id}: ${label} overlaps another ${portal.side} exit at ${tangent} (directed rail ${rail})`);
      }
      occupiedRails.add(rail);
    }
  }
};

export const gatePortalRailKeys = (
  board: Readonly<Pick<LevelSpec, "width" | "height">>,
  gate: Readonly<Pick<GateSpec, "side" | "offset" | "size" | "portals">>,
): string[] => gatePortals(board, gate).flatMap(portalRailKeys);

const portalFromTransformedCells = (side: Side, cells: Point[]): GatePortalSpec => {
  const ordered = [...cells].sort((a, b) => (
    side === "top" || side === "bottom" ? a[0] - b[0] : a[1] - b[1]
  ));
  return { side, origin: ordered[0], size: ordered.length };
};

/** Quarter-turn helper used by data transforms and editors. */
export const rotateGatePortalClockwise = (
  portal: GatePortalSpec,
  boardHeight: number,
): GatePortalSpec => portalFromTransformedCells(
  portal.side === "top" ? "right"
    : portal.side === "right" ? "bottom"
      : portal.side === "bottom" ? "left"
        : "top",
  portalMouthCells(portal).map(([x, y]) => [boardHeight - 1 - y, x]),
);

export const mirrorGatePortalHorizontally = (
  portal: GatePortalSpec,
  boardWidth: number,
): GatePortalSpec => portalFromTransformedCells(
  portal.side === "left" ? "right" : portal.side === "right" ? "left" : portal.side,
  portalMouthCells(portal).map(([x, y]) => [boardWidth - 1 - x, y]),
);

export const mirrorGatePortalVertically = (
  portal: GatePortalSpec,
  boardHeight: number,
): GatePortalSpec => portalFromTransformedCells(
  portal.side === "top" ? "bottom" : portal.side === "bottom" ? "top" : portal.side,
  portalMouthCells(portal).map(([x, y]) => [x, boardHeight - 1 - y]),
);
