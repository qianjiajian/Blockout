import type { FlipDoorSpec, GatePortalSpec, GateSpec, Point, Side } from "./types";
import {
  frontierFacesExposedBoundary,
  gatePortals,
  legacyOuterPortal,
  portalCoversFrontier,
  portalTangentOffset,
} from "./gatePortals";

type BoardSize = Readonly<Pick<import("./types").LevelSpec, "width" | "height" | "playable" | "blocked" | "seams" | "mechanismRules">>;
type GateGeometry = Readonly<Pick<GateSpec, "side" | "offset" | "size"> & Partial<Pick<GateSpec, "portals">>>;

const directionalCoordinate = ([x, y]: Point, side: Side): number => (
  side === "top" || side === "bottom" ? y : x
);

const isForwardOf = (candidate: number, current: number, side: Side): boolean => (
  side === "top" || side === "left" ? candidate < current : candidate > current
);

/**
 * Returns the real cells at the leading edge of a shape for one exit
 * direction. This identifies contact with the boundary; aperture alignment
 * separately checks the complete shape, including any trailing arms or stem.
 */
export const exitFrontierCells = (cells: readonly Point[], side: Side): Point[] => {
  if (!cells.length) return [];
  let frontierCoordinate = directionalCoordinate(cells[0], side);
  for (let index = 1; index < cells.length; index += 1) {
    const coordinate = directionalCoordinate(cells[index], side);
    if (isForwardOf(coordinate, frontierCoordinate, side)) frontierCoordinate = coordinate;
  }
  return cells.filter((cell) => directionalCoordinate(cell, side) === frontierCoordinate)
    .map(([x, y]) => [x, y]);
};

/** Continuous gate span needed to cover every actual leading-edge cell. */
export const exitFrontierSpan = (cells: readonly Point[], side: Side): number => {
  const frontier = exitFrontierCells(cells, side);
  if (!frontier.length) return 0;
  const offsets = frontier.map(([x, y]) => side === "top" || side === "bottom" ? x : y);
  return Math.max(...offsets) - Math.min(...offsets) + 1;
};

/** Full perpendicular extent needed to pass a rigid, non-rotating shape. */
export const exitPassingSpan = (cells: readonly Point[], side: Side): number => {
  if (!cells.length) return 0;
  const offsets = cells.map(([x, y]) => side === "top" || side === "bottom" ? x : y);
  return Math.max(...offsets) - Math.min(...offsets) + 1;
};

/** Each aperture is checked independently; adjacent portals cannot combine. */
export const portalCoversPassingWidth = (cells: readonly Point[], portal: GatePortalSpec): boolean => {
  const start = portalTangentOffset(portal);
  const end = start + portal.size;
  return cells.length > 0 && cells.every(([x, y]) => {
    const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
    return tangent >= start && tangent < end;
  });
};

/** Tests whether an aperture covers every tangential coordinate of the frontier. */
export const gateCoversFrontier = (cells: readonly Point[], gate: GateGeometry): boolean => {
  const frontier = exitFrontierCells(cells, gate.side);
  return frontier.length > 0 && frontier.every(([x, y]) => {
    const tangent = gate.side === "top" || gate.side === "bottom" ? x : y;
    return tangent >= gate.offset && tangent < gate.offset + gate.size;
  });
};

/** Exact physical aperture within one logical gate, if any. */
export const matchingPortalForExitFrontier = (
  board: BoardSize,
  cells: readonly Point[],
  gate: GateGeometry,
  requestedSide?: Side,
): { portalIndex: number; portal: GatePortalSpec } | undefined => {
  if (requestedSide && !gate.portals?.length && gate.side !== requestedSide) return undefined;
  const frontierBySide = new Map<Side, Point[]>();
  const portals = gatePortals(board, gate);
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    if (requestedSide && portal.side !== requestedSide) continue;
    const frontier = frontierBySide.get(portal.side) ?? exitFrontierCells(cells, portal.side);
    frontierBySide.set(portal.side, frontier);
    if (portalCoversFrontier(frontier, portal)
      && portalCoversPassingWidth(cells, portal)
      && frontierFacesExposedBoundary(board, frontier, portal.side)) {
      return { portalIndex, portal };
    }
  }
  return undefined;
};

export interface MatchedGatePortal<T extends GateSpec = GateSpec> {
  gate: T;
  gateId: string;
  gateKind: "fixed" | "flipDoor";
  portalIndex: number;
  portal: GatePortalSpec;
}

/** Resolves a physical aperture while preserving independent logical state. */
export const resolveMatchingGatePortal = <TGate extends GateSpec, TDoor extends FlipDoorSpec>(
  board: BoardSize,
  cells: readonly Point[],
  side: Side,
  gates: readonly TGate[],
  flipDoors: readonly TDoor[] = [],
): MatchedGatePortal<TGate | TDoor> | undefined => {
  const frontier = exitFrontierCells(cells, side);
  const hasLocalPortals = gates.some((gate) => Boolean(gate.portals?.length))
    || flipDoors.some((gate) => Boolean(gate.portals?.length));
  const reachesBoundary = hasLocalPortals
    ? frontierFacesExposedBoundary(board, frontier, side)
    : frontier.every(([x, y]) => (
      side === "top" ? y === 0
        : side === "bottom" ? y === board.height - 1
          : side === "left" ? x === 0
            : x === board.width - 1
    ));
  if (!reachesBoundary) return undefined;
  const matchGate = <T extends GateSpec>(gate: T): { portalIndex: number; portal: GatePortalSpec } | undefined => {
    if (!gate.portals?.length) {
      if (gate.side !== side) return undefined;
      const tangentStart = gate.offset;
      const tangentEnd = tangentStart + gate.size;
      const normal = side === "top" ? 0
        : side === "bottom" ? board.height - 1
          : side === "left" ? 0
            : board.width - 1;
      const covered = frontier.every(([x, y]) => {
        const cellNormal = side === "top" || side === "bottom" ? y : x;
        const tangent = side === "top" || side === "bottom" ? x : y;
        return cellNormal === normal && tangent >= tangentStart && tangent < tangentEnd;
      });
      const portal = legacyOuterPortal(board, gate);
      return covered && portalCoversPassingWidth(cells, portal) ? { portalIndex: 0, portal } : undefined;
    }
    const portals = gatePortals(board, gate);
    for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
      const portal = portals[portalIndex];
      if (portal.side === side && portalCoversFrontier(frontier, portal)
        && portalCoversPassingWidth(cells, portal)) return { portalIndex, portal };
    }
    return undefined;
  };
  for (const gate of gates) {
    const match = matchGate(gate);
    if (match) {
      return { gate, gateId: gate.id, gateKind: "fixed", ...match };
    }
  }
  for (const gate of flipDoors) {
    const match = matchGate(gate);
    if (match) {
      return { gate, gateId: gate.id, gateKind: "flipDoor", ...match };
    }
  }
  return undefined;
};

export const exitFrontierFacesBoundary = (
  board: BoardSize,
  cells: readonly Point[],
  side: Side,
): boolean => frontierFacesExposedBoundary(board, exitFrontierCells(cells, side), side);

/**
 * Tests geometry only: the directional frontier must be on the requested board
 * edge and the whole shape's tangential extent must fit within the same gate
 * aperture. This spatial safety rule applies to legacy and revised levels.
 */
export const gateCoversExitFrontier = (
  board: BoardSize,
  cells: readonly Point[],
  gate: GateGeometry,
): boolean => {
  return matchingPortalForExitFrontier(board, cells, gate) !== undefined;
};
