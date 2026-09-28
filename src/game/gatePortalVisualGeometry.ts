import { portalBoundaryAnchor } from "../core/gatePortals";
import { exitFrontierCells } from "../core/blockExitFrontier";
import type { GatePortalSpec, Point } from "../core/types";

export interface GatePortalVisualBoard {
  innerX: number;
  innerY: number;
  cell: number;
}

export interface GatePortalVisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GatePortalLaneCenter {
  x: number;
  y: number;
}

interface GatePortalTangentOverlap {
  center: number;
  span: number;
}

const cellsBounds = (cells: readonly Point[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} => {
  if (cells.length === 0) throw new RangeError("Portal exit geometry needs at least one block cell");
  return {
    minX: Math.min(...cells.map(([x]) => x)),
    maxX: Math.max(...cells.map(([x]) => x)),
    minY: Math.min(...cells.map(([, y]) => y)),
    maxY: Math.max(...cells.map(([, y]) => y)),
  };
};

const gatePortalTangentOverlap = (
  portal: Readonly<GatePortalSpec>,
  blockCells: readonly Point[],
): GatePortalTangentOverlap => {
  if (blockCells.length === 0) {
    throw new RangeError("Portal exit geometry needs at least one block cell");
  }
  const frontier = exitFrontierCells(blockCells, portal.side);
  const tangents = frontier.map(([x, y]) => (
    portal.side === "top" || portal.side === "bottom" ? x : y
  ));
  const frontierStart = Math.min(...tangents);
  const frontierEnd = Math.max(...tangents) + 1;
  const mouthStart = portal.side === "top" || portal.side === "bottom"
    ? portal.origin[0]
    : portal.origin[1];
  const mouthEnd = mouthStart + portal.size;
  const overlapStart = Math.max(frontierStart, mouthStart);
  const overlapEnd = Math.min(frontierEnd, mouthEnd);
  const span = Math.max(0, overlapEnd - overlapStart);
  return {
    center: span > 0 ? (overlapStart + overlapEnd) / 2 : mouthStart + portal.size / 2,
    span: Math.max(1, span),
  };
};

/**
 * Returns the outward gate-strip rectangle for one physical portal.
 *
 * The portal origin is a playable mouth cell, so local/concave apertures use
 * that cell's directed boundary rather than the outer rectangular board edge.
 */
export const gatePortalVisualRect = (
  portal: Readonly<GatePortalSpec>,
  board: Readonly<GatePortalVisualBoard>,
  thickness = board.cell * 58 / 95,
): GatePortalVisualRect => {
  const [anchorX, anchorY] = portalBoundaryAnchor(portal);
  if (portal.side === "top" || portal.side === "bottom") {
    const width = portal.size * board.cell;
    const boundaryX = board.innerX + anchorX * board.cell;
    const boundaryY = board.innerY + anchorY * board.cell;
    return {
      x: boundaryX - width / 2,
      y: portal.side === "top" ? boundaryY - thickness : boundaryY,
      width,
      height: thickness,
    };
  }

  const height = portal.size * board.cell;
  const boundaryX = board.innerX + anchorX * board.cell;
  const boundaryY = board.innerY + anchorY * board.cell;
  return {
    x: portal.side === "left" ? boundaryX - thickness : boundaryX,
    y: boundaryY - height / 2,
    width: thickness,
    height,
  };
};

/** Returns a tangent slice while retaining the portal's local normal rail. */
export const sliceGatePortal = (
  portal: Readonly<GatePortalSpec>,
  consumed: number,
  size: number,
): GatePortalSpec => {
  if (!Number.isInteger(consumed) || consumed < 0
    || !Number.isInteger(size) || size < 1
    || consumed + size > portal.size) {
    throw new RangeError(
      `Portal slice must be a positive in-range integer span, received ${consumed}+${size} of ${portal.size}`,
    );
  }
  const [x, y] = portal.origin;
  return {
    side: portal.side,
    origin: portal.side === "top" || portal.side === "bottom"
      ? [x + consumed, y]
      : [x, y + consumed],
    size,
  };
};

/**
 * Visual/feedback anchor for the actual lane occupied by the departing block.
 * A narrow block in a wide portal deliberately does not snap to portal centre.
 */
export const gatePortalExitLaneCenter = (
  portal: Readonly<GatePortalSpec>,
  blockCells: readonly Point[],
  board: Readonly<GatePortalVisualBoard>,
  thickness = board.cell * 58 / 95,
): GatePortalLaneCenter => {
  const rect = gatePortalVisualRect(portal, board, thickness);
  const tangentCenter = gatePortalTangentOverlap(portal, blockCells).center;
  return portal.side === "top" || portal.side === "bottom"
    ? {
        x: board.innerX + tangentCenter * board.cell,
        y: rect.y + rect.height / 2,
      }
    : {
        x: rect.x + rect.width / 2,
        y: board.innerY + tangentCenter * board.cell,
      };
};

/** Tangential lane width occupied by the real leading edge inside this mouth. */
export const gatePortalExitTangentSpanCells = (
  portal: Readonly<GatePortalSpec>,
  blockCells: readonly Point[],
): number => gatePortalTangentOverlap(portal, blockCells).span;

/**
 * Grid-cell distance needed to move the whole block beyond this local portal.
 * This is the local-boundary counterpart of the former outer-board formulas.
 */
export const gatePortalExitTravelCells = (
  portal: Readonly<GatePortalSpec>,
  blockCells: readonly Point[],
): number => {
  const { minX, maxX, minY, maxY } = cellsBounds(blockCells);
  if (portal.side === "top") return maxY + 1 - portal.origin[1];
  if (portal.side === "bottom") return portal.origin[1] + 1 - minY;
  if (portal.side === "left") return maxX + 1 - portal.origin[0];
  return portal.origin[0] + 1 - minX;
};
