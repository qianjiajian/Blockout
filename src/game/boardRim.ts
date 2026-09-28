import { boardCellsSeparatedBySeam, boardRailIsSeam } from "../core/boardSeams";
import { gatePortals, portalMouthCells } from "../core/gatePortals";
import type { BoardSeamSpec, GatePortalSpec, GateSpec, Point, Side } from "../core/types";

export type QuarterTurn = 0 | 1 | 2 | 3;

export interface BoardRimRail {
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export interface BoardRimCorner {
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export interface BoardRimRun {
  x: number;
  y: number;
  length: number;
  quarterTurns: QuarterTurn;
  startConcave: boolean;
  endConcave: boolean;
}

/** Neutral backing for one real aperture, including inset/concave portals. */
export const boardPortalRimRun = (portal: Readonly<GatePortalSpec>): BoardRimRun => {
  const [x, y] = portal.origin;
  const start = portal.side === "top" ? { x, y, quarterTurns: 0 as const }
    : portal.side === "right" ? { x: x + 1, y, quarterTurns: 1 as const }
      : portal.side === "bottom" ? { x: x + portal.size, y: y + 1, quarterTurns: 2 as const }
        : { x, y: y + portal.size, quarterTurns: 3 as const };
  return { ...start, length: portal.size, startConcave: false, endConcave: false };
};

export interface BoardRimLayout {
  /** Exposed neutral edges after supplied gate and device spans are removed. */
  rails: BoardRimRail[];
  runs: BoardRimRun[];
  /** Exposed edges owned by a gate instead of a neutral rail. */
  gateRails: BoardRimRail[];
  /** Exposed edges owned by a rim-mounted device instead of a neutral rail. */
  deviceRails: BoardRimRail[];
  convexCorners: BoardRimCorner[];
  concaveCorners: BoardRimCorner[];
}

export interface BoardRimInterval {
  start: number;
  end: number;
}

export interface BoardRimRunRenderPlan {
  /** Cell-aligned center interval filled by the one/two-cell neutral rails. */
  plain?: BoardRimInterval;
  /** Visible interval of a whole, mirrored corner-adjacent bitmap. */
  startBridge?: BoardRimInterval;
  /** Visible interval of a whole corner-adjacent bitmap. */
  endBridge?: BoardRimInterval;
  /** One-cell concave-to-concave spans split their full corners at the midpoint. */
  splitInnerCorners: boolean;
}

export interface BoardRimDepthLayer {
  /** Painter-depth anchor in authored-board pixels, independent of placement. */
  paintY: number;
}

const key = (x: number, y: number): string => `${x},${y}`;
const railKey = (rail: BoardRimRail): string => `${rail.quarterTurns}:${key(rail.x, rail.y)}`;

const portalMouthRail = ([x, y]: Point, side: GateSpec["side"]): BoardRimRail => (
  side === "top" ? { x: x + 0.5, y, quarterTurns: 0 }
    : side === "right" ? { x: x + 1, y: y + 0.5, quarterTurns: 1 }
      : side === "bottom" ? { x: x + 0.5, y: y + 1, quarterTurns: 2 }
        : { x, y: y + 0.5, quarterTurns: 3 }
);

const gateRailKeys = (
  gates: readonly Pick<GateSpec, "side" | "offset" | "size" | "portals">[],
  width: number,
  height: number,
): Set<string> => {
  const covered = new Set<string>();
  for (const gate of gates) {
    const authoredPortals = gate.portals?.length ? gate.portals : undefined;
    for (const portal of gatePortals({ width, height }, gate)) {
      // Keep the former tolerant rounding for legacy side/offset/size input.
      // Authored portals are validated as positive integer cell geometry and
      // remain authoritative, including their normal coordinate inside a
      // concave/notched board boundary.
      const normalizedPortal = authoredPortals
        ? portal
        : {
            ...portal,
            origin: (portal.side === "top" || portal.side === "bottom"
              ? [Math.round(portal.origin[0]), portal.origin[1]]
              : [portal.origin[0], Math.round(portal.origin[1])]) as Point,
            size: Math.max(1, Math.round(portal.size)),
          };
      for (const mouth of portalMouthCells(normalizedPortal)) {
        covered.add(railKey(portalMouthRail(mouth, normalizedPortal.side)));
      }
    }
  }
  return covered;
};

/**
 * Stable painter order for formal board resources. Canvas draws later entries
 * above earlier ones, so resources positioned farther down the screen must be
 * painted later. Source order explicitly breaks equal-Y ties for deterministic
 * behavior in older WeChat JavaScript runtimes.
 */
export const orderBoardRimLayersByDepth = <T extends BoardRimDepthLayer>(
  layers: readonly T[],
): T[] => layers
  .map((layer, sourceIndex) => ({ layer, sourceIndex }))
  .sort((left, right) => left.layer.paintY - right.layer.paintY || left.sourceIndex - right.sourceIndex)
  .map(({ layer }) => layer);

export const boardRimRunVisualTop = (
  run: Pick<BoardRimRun, "y" | "length" | "quarterTurns">,
  spriteHeight: number,
  authoredCell = 95,
): number => {
  if (run.quarterTurns === 0) return run.y * authoredCell - spriteHeight;
  if (run.quarterTurns === 2) return run.y * authoredCell;
  const minY = run.quarterTurns === 1 ? run.y : run.y - run.length;
  return minY * authoredCell;
};

export const boardRimCornerVisualTop = (
  corner: Pick<BoardRimCorner, "y" | "quarterTurns">,
  spriteHeight: number,
  inner: boolean,
  authoredCell = 95,
): number => {
  const extendsAboveAnchor = inner
    ? corner.quarterTurns === 0 || corner.quarterTurns === 3
    : corner.quarterTurns === 1 || corner.quarterTurns === 2;
  return corner.y * authoredCell - (extendsAboveAnchor ? spriteHeight : 0);
};

export const boardGateVisualTop = (
  gate: Pick<GateSpec, "side" | "offset" | "size">,
  boardHeight: number,
  spriteHeight: number,
  authoredCell = 95,
): number => {
  if (gate.side === "top") return -spriteHeight;
  if (gate.side === "bottom") return boardHeight * authoredCell;
  return gate.offset * authoredCell;
};

/**
 * Portal-aware equivalent of boardGateVisualTop. Unlike a legacy gate, a
 * portal may sit on a locally exposed edge, so its normal coordinate comes
 * from the playable mouth cell rather than the outer board rectangle.
 */
export const boardPortalVisualTop = (
  portal: Pick<GatePortalSpec, "side" | "origin">,
  spriteHeight: number,
  authoredCell = 95,
): number => {
  const mouthY = portal.origin[1] * authoredCell;
  if (portal.side === "top") return mouthY - spriteHeight;
  if (portal.side === "bottom") return mouthY + authoredCell;
  return mouthY;
};

/**
 * Vertical portals own their entire mouth, including a concave cap overlapping
 * the last cell (Lv72). Paint them just before the next row so the following
 * rim segment still covers the gate bitmap's lower shadow. Horizontal portals
 * retain the same-depth corner tie-break used by Lv111. These are sort keys
 * only; boardPortalVisualTop and all destination geometry remain unchanged.
 */
export const boardPortalVisualDepthTop = (
  portal: Pick<GatePortalSpec, "side" | "origin" | "size">,
  spriteHeight: number,
  authoredCell = 95,
): number => portal.side === "left" || portal.side === "right"
  ? (portal.origin[1] + portal.size) * authoredCell - 0.001
  : boardPortalVisualTop(portal, spriteHeight, authoredCell) + 0.001;

/**
 * Splits a directed straight run into the native one/two/three-cell spans used
 * by the formal rim art. Three-cell spans are emitted greedily from the run's
 * authored start, so four cells become 3+1 and five become 3+2. Only the two
 * real endpoints inherit the source run's concave-corner markers.
 */
export const splitBoardRimRunIntoSegments = (
  run: Readonly<BoardRimRun>,
): BoardRimRun[] => {
  if (!Number.isInteger(run.length) || run.length < 1) {
    throw new RangeError(`Board rim run length must be a positive integer, received ${run.length}`);
  }

  const [stepX, stepY]: readonly [number, number] = run.quarterTurns === 0
    ? [1, 0]
    : run.quarterTurns === 1
      ? [0, 1]
      : run.quarterTurns === 2
        ? [-1, 0]
        : [0, -1];
  const segments: BoardRimRun[] = [];
  let consumed = 0;
  while (consumed < run.length) {
    const length = Math.min(3, run.length - consumed);
    const reachesEnd = consumed + length === run.length;
    segments.push({
      x: run.x + stepX * consumed,
      y: run.y + stepY * consumed,
      length,
      quarterTurns: run.quarterTurns,
      startConcave: consumed === 0 && run.startConcave,
      endConcave: reachesEnd && run.endConcave,
    });
    consumed += length;
  }
  return segments;
};

/**
 * Plans the three native rim slices along one straight run. A concave end owns
 * two cells: 60px of the full inner-corner bitmap plus the 130px adjacent
 * bridge. When two ends are closer than four cells, whole bridge images are
 * clipped at one deterministic seam; ordinary rails are never painted below
 * either corner.
 */
export const planBoardRimRun = (
  run: Pick<BoardRimRun, "length" | "startConcave" | "endConcave">,
  authoredCell = 95,
  innerCornerSpan = 60,
): BoardRimRunRenderPlan => {
  const width = Math.max(0, run.length) * authoredCell;
  const bridgeWidth = authoredCell * 2 - innerCornerSpan;
  const startReserved = run.startConcave ? Math.min(width, authoredCell * 2) : 0;
  const endReserved = run.endConcave ? Math.min(width, authoredCell * 2) : 0;
  const plainStart = startReserved;
  const plainEnd = Math.max(plainStart, width - endReserved);
  const plain = plainEnd > plainStart ? { start: plainStart, end: plainEnd } : undefined;

  let startBridge: BoardRimInterval | undefined;
  let endBridge: BoardRimInterval | undefined;
  if (run.startConcave && run.endConcave) {
    // Use an integer seam so adjacent canvas clips cannot leave a half-pixel gap.
    const seam = Math.floor(width / 2);
    const startEnd = Math.min(innerCornerSpan + bridgeWidth, seam);
    if (startEnd > innerCornerSpan) startBridge = { start: innerCornerSpan, end: startEnd };
    const endStart = Math.max(width - innerCornerSpan - bridgeWidth, seam);
    const endEnd = width - innerCornerSpan;
    if (endEnd > endStart) endBridge = { start: endStart, end: endEnd };
  } else if (run.startConcave) {
    const end = Math.min(width, innerCornerSpan + bridgeWidth);
    if (end > innerCornerSpan) startBridge = { start: innerCornerSpan, end };
  } else if (run.endConcave) {
    const start = Math.max(0, width - innerCornerSpan - bridgeWidth);
    const end = width - innerCornerSpan;
    if (end > start) endBridge = { start, end };
  }

  return {
    plain,
    startBridge,
    endBridge,
    splitInnerCorners: run.startConcave && run.endConcave && width < innerCornerSpan * 2,
  };
};

export const buildBoardRimLayout = (
  playable: readonly Point[],
  blocked: readonly Point[],
  width: number,
  height: number,
  gates: readonly Pick<GateSpec, "side" | "offset" | "size" | "portals">[] = [],
  reservedDeviceRails: readonly BoardRimRail[] = [],
  seams: readonly BoardSeamSpec[] = [],
): BoardRimLayout => {
  const active = new Set(playable.map(([x, y]) => key(x, y)));
  for (const [x, y] of blocked) active.delete(key(x, y));
  const isFloor = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && active.has(key(x, y));
  const seamBoard = { width, height, seams: [...seams] };
  const adjacentCell = (x: number, y: number, side: Side): Point => (
    side === "top" ? [x, y - 1]
      : side === "right" ? [x + 1, y]
        : side === "bottom" ? [x, y + 1]
          : [x - 1, y]
  );
  const edgeIsSeam = (x: number, y: number, side: Side): boolean => (
    boardRailIsSeam(seamBoard, [x, y], side)
  );
  const edgeIsExposed = (x: number, y: number, side: Side): boolean => {
    const [nextX, nextY] = adjacentCell(x, y, side);
    return !isFloor(nextX, nextY) || edgeIsSeam(x, y, side);
  };
  const exposedRails: BoardRimRail[] = [];
  const convexCorners: BoardRimCorner[] = [];
  const concaveCorners: BoardRimCorner[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isFloor(x, y)) continue;
      if (edgeIsExposed(x, y, "top")) exposedRails.push({ x: x + 0.5, y, quarterTurns: 0 });
      if (edgeIsExposed(x, y, "right")) exposedRails.push({ x: x + 1, y: y + 0.5, quarterTurns: 1 });
      if (edgeIsExposed(x, y, "bottom")) exposedRails.push({ x: x + 0.5, y: y + 1, quarterTurns: 2 });
      if (edgeIsExposed(x, y, "left")) exposedRails.push({ x, y: y + 0.5, quarterTurns: 3 });
    }
  }

  const coveredByGate = gateRailKeys(gates, width, height);
  const reservedByDevice = new Set(reservedDeviceRails.map(railKey));
  const gateRails = exposedRails.filter((rail) => coveredByGate.has(railKey(rail)));
  // A gate remains authoritative if malformed input asks a device to reserve
  // the same exposed rail. This keeps every perimeter unit in exactly one
  // render family without changing the long-standing gate behavior.
  const deviceRails = exposedRails.filter((rail) => (
    !coveredByGate.has(railKey(rail)) && reservedByDevice.has(railKey(rail))
  ));
  const rails = exposedRails.filter((rail) => (
    !coveredByGate.has(railKey(rail)) && !reservedByDevice.has(railKey(rail))
  ));

  for (let y = 0; y <= height; y += 1) {
    for (let x = 0; x <= width; x += 1) {
      const northWest = isFloor(x - 1, y - 1);
      const northEast = isFloor(x, y - 1);
      const southWest = isFloor(x - 1, y);
      const southEast = isFloor(x, y);
      const count = Number(northWest) + Number(northEast) + Number(southWest) + Number(southEast);
      if (count === 1) {
        // Both supplied corner slices have their rounded quadrant at bottom-left.
        // A zero-turn outer corner therefore surrounds a north-east floor cell.
        const quarterTurns: QuarterTurn = northEast ? 0 : southEast ? 1 : southWest ? 2 : 3;
        convexCorners.push({ x, y, quarterTurns });
      } else if (count === 3) {
        // The supplied zero-turn inner corner occupies the missing north-east
        // quadrant; rotations cover the remaining three concave orientations.
        const quarterTurns: QuarterTurn = !northEast ? 0 : !southEast ? 1 : !southWest ? 2 : 3;
        concaveCorners.push({ x, y, quarterTurns });
      }
    }
  }

  if (seams.length) {
    const convexKeys = new Set(convexCorners.map((corner) => (
      `${corner.quarterTurns}:${key(corner.x, corner.y)}`
    )));
    const addSeamEndpointCorner = (
      cornerX: number,
      cornerY: number,
      cellX: number,
      cellY: number,
      firstSide: Side,
      secondSide: Side,
      quarterTurns: QuarterTurn,
    ): void => {
      if (!isFloor(cellX, cellY)) return;
      const firstIsSeam = edgeIsSeam(cellX, cellY, firstSide);
      const secondIsSeam = edgeIsSeam(cellX, cellY, secondSide);
      if (!(firstIsSeam || secondIsSeam)
        || !edgeIsExposed(cellX, cellY, firstSide)
        || !edgeIsExposed(cellX, cellY, secondSide)) return;
      const cornerKey = `${quarterTurns}:${key(cornerX, cornerY)}`;
      if (convexKeys.has(cornerKey)) return;
      convexKeys.add(cornerKey);
      convexCorners.push({ x: cornerX, y: cornerY, quarterTurns });
    };

    for (let y = 0; y <= height; y += 1) {
      for (let x = 0; x <= width; x += 1) {
        // Each occupied quadrant owns a convex corner only when both of its
        // incident rails are exposed and at least one is a seam. This adds the
        // paired caps where a seam reaches another boundary without changing
        // any corner on a legacy/no-seam board.
        addSeamEndpointCorner(x, y, x, y - 1, "left", "bottom", 0);
        addSeamEndpointCorner(x, y, x, y, "left", "top", 1);
        addSeamEndpointCorner(x, y, x - 1, y, "right", "top", 2);
        addSeamEndpointCorner(x, y, x - 1, y - 1, "right", "bottom", 3);
      }
    }
  }

  const concaveKeys = new Set(concaveCorners.map((corner) => key(corner.x, corner.y)));
  const endpoints = (rail: BoardRimRail): { start: [number, number]; end: [number, number] } => {
    if (rail.quarterTurns === 0) return { start: [rail.x - 0.5, rail.y], end: [rail.x + 0.5, rail.y] };
    if (rail.quarterTurns === 1) return { start: [rail.x, rail.y - 0.5], end: [rail.x, rail.y + 0.5] };
    if (rail.quarterTurns === 2) return { start: [rail.x + 0.5, rail.y], end: [rail.x - 0.5, rail.y] };
    return { start: [rail.x, rail.y + 0.5], end: [rail.x, rail.y - 0.5] };
  };
  const railMouthCell = (rail: BoardRimRail): Point => (
    rail.quarterTurns === 0 ? [rail.x - 0.5, rail.y]
      : rail.quarterTurns === 1 ? [rail.x - 1, rail.y - 0.5]
        : rail.quarterTurns === 2 ? [rail.x - 0.5, rail.y - 1]
          : [rail.x, rail.y - 0.5]
  );
  const railsCanShareRun = (first: BoardRimRail, second: BoardRimRail): boolean => (
    !boardCellsSeparatedBySeam(seamBoard, railMouthCell(first), railMouthCell(second))
  );
  const startMap = new Map<string, BoardRimRail>();
  const endMap = new Map<string, BoardRimRail>();
  for (const rail of rails) {
    const { start, end } = endpoints(rail);
    startMap.set(`${rail.quarterTurns}:${key(...start)}`, rail);
    endMap.set(`${rail.quarterTurns}:${key(...end)}`, rail);
  }
  const visited = new Set<BoardRimRail>();
  const runs: BoardRimRun[] = [];
  const appendRun = (first: BoardRimRail): void => {
    if (visited.has(first)) return;
    const firstEndpoints = endpoints(first);
    let end = firstEndpoints.end;
    let length = 0;
    let current: BoardRimRail | undefined = first;
    while (current && !visited.has(current)) {
      visited.add(current);
      length += 1;
      end = endpoints(current).end;
      const next = startMap.get(`${first.quarterTurns}:${key(...end)}`);
      current = next && railsCanShareRun(current, next) ? next : undefined;
    }
    runs.push({
      x: firstEndpoints.start[0],
      y: firstEndpoints.start[1],
      length,
      quarterTurns: first.quarterTurns,
      startConcave: concaveKeys.has(key(...firstEndpoints.start)),
      endConcave: concaveKeys.has(key(...end)),
    });
  };
  for (const rail of rails) {
    const { start } = endpoints(rail);
    const previous = endMap.get(`${rail.quarterTurns}:${key(...start)}`);
    if (!previous || !railsCanShareRun(previous, rail)) appendRun(rail);
  }
  for (const rail of rails) appendRun(rail);

  return { rails, runs, gateRails, deviceRails, convexCorners, concaveCorners };
};
