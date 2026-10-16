import { matchingPortalForExitFrontier } from "../core/blockExitFrontier";
import { portalBoundaryAnchor } from "../core/gatePortals";
import { usesRevisedMechanisms } from "../core/mechanismRules";
import { isMechanismBlockVisible, isMechanismRegionBlocking } from "./revisedMechanismPresentation";
import {
  type BlockState,
  type GatePortalSpec,
  type Point,
  type PuzzleSnapshot,
  type Side,
} from "../core/types";

export interface ContinuousPose {
  x: number;
  y: number;
}

export interface GridStep extends ContinuousPose {
  axis: "x" | "y";
}

export interface SweepResult extends ContinuousPose {
  blockedX: boolean;
  blockedY: boolean;
  /** Chronological sub-cell poses visited by this pointer sample. */
  path: ContinuousPose[];
}

export interface TurnAssistInput {
  grid: ContinuousPose;
  pointerDelta: ContinuousPose;
}

export interface ReleaseBoardBounds {
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
}

export interface PortalReleaseBoardBounds extends ReleaseBoardBounds {
  cell: number;
}

export interface ContinuousExitPortalMatch {
  gateId: string;
  gateKind: "fixed" | "flipDoor";
  portalIndex: number;
  portal: GatePortalSpec;
  /** False only for a side/offset/size gate normalized to its outer portal. */
  authoredPortal: boolean;
}

export interface PortalReleaseCandidate {
  portal: GatePortalSpec;
  /** Lets normalized legacy candidates preserve the old side chooser exactly. */
  authoredPortal?: boolean;
}

export interface ReachableGridSnap extends ContinuousPose {
  path: ContinuousPose[];
}

export type ContinuousPoseValidator = (anchorX: number, anchorY: number) => boolean;

// Pointer-to-logical coordinate conversion can leave ~1e-4 cell residue at an
// exact grid line. A 1e-3 collision skin is still far below one rendered pixel.
const CONTACT_EPSILON = 1e-3;

const overlapsUnitCell = (x: number, y: number, cellX: number, cellY: number): boolean => (
  x < cellX + 1 - CONTACT_EPSILON
  && x + 1 > cellX + CONTACT_EPSILON
  && y < cellY + 1 - CONTACT_EPSILON
  && y + 1 > cellY + CONTACT_EPSILON
);

/**
 * Tests the renderer's floating-point block pose against the exact union of
 * playable cells. The simulation remains integer based; this function exists
 * only for swept pointer movement between those integer states.
 */
export const createContinuousCollisionValidator = (
  snapshot: PuzzleSnapshot,
  blockId: string,
): ContinuousPoseValidator => {
  const block = snapshot.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return () => false;

  const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
  const blocked = new Set(snapshot.blocked.map(([x, y]) => `${x},${y}`));
  const obstacleCells: Array<readonly [number, number]> = [];

  for (let y = 0; y < snapshot.height; y += 1) {
    for (let x = 0; x < snapshot.width; x += 1) {
      if (!playable.has(`${x},${y}`) || blocked.has(`${x},${y}`)) obstacleCells.push([x, y]);
    }
  }

  for (const other of snapshot.blocks) {
    if (other.id === blockId) continue;
    if (!isMechanismBlockVisible(snapshot, other)) continue;
    for (const [dx, dy] of other.shape) obstacleCells.push([other.x + dx, other.y + dy]);
  }

  for (const shutter of snapshot.shutters) {
    if (!isMechanismRegionBlocking(snapshot, shutter)) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) obstacleCells.push([x, y]);
    }
  }

  return (anchorX: number, anchorY: number): boolean => {
    if (usesRevisedMechanisms(snapshot)) {
      if (block.movementAxis === "horizontal" && Math.abs(anchorY - block.y) > CONTACT_EPSILON) return false;
      if (block.movementAxis === "vertical" && Math.abs(anchorX - block.x) > CONTACT_EPSILON) return false;
      if (snapshot.coloredGrids.some((grid) => grid.color !== block.layers[0]
        && grid.cells.some(([gx, gy]) => block.shape.some(([dx, dy]) => (
          overlapsUnitCell(anchorX + dx, anchorY + dy, gx, gy)
        ))))) return false;
    }
    const crossesSeam = (snapshot.seams ?? []).some((seam) => block.shape.some(([dx, dy]) => {
      const cellX = anchorX + dx;
      const cellY = anchorY + dy;
      if (seam.orientation === "horizontal") {
        const crossesNormal = cellY < seam.offset - CONTACT_EPSILON
          && cellY + 1 > seam.offset + CONTACT_EPSILON;
        const overlapsTangent = cellX < seam.start + seam.size - CONTACT_EPSILON
          && cellX + 1 > seam.start + CONTACT_EPSILON;
        return crossesNormal && overlapsTangent;
      }
      const crossesNormal = cellX < seam.offset - CONTACT_EPSILON
        && cellX + 1 > seam.offset + CONTACT_EPSILON;
      const overlapsTangent = cellY < seam.start + seam.size - CONTACT_EPSILON
        && cellY + 1 > seam.start + CONTACT_EPSILON;
      return crossesNormal && overlapsTangent;
    }));
    if (crossesSeam) return false;
    for (const [dx, dy] of block.shape) {
      const x = anchorX + dx;
      const y = anchorY + dy;
      if (x < -CONTACT_EPSILON || y < -CONTACT_EPSILON
        || x + 1 > snapshot.width + CONTACT_EPSILON
        || y + 1 > snapshot.height + CONTACT_EPSILON) return false;
      if (obstacleCells.some(([cellX, cellY]) => overlapsUnitCell(x, y, cellX, cellY))) return false;
    }
    return true;
  };
};

export const isContinuousPoseValid = (
  snapshot: PuzzleSnapshot,
  blockId: string,
  anchorX: number,
  anchorY: number,
): boolean => createContinuousCollisionValidator(snapshot, blockId)(anchorX, anchorY);

/**
 * Sweeps in sub-cell increments to prevent tunnelling. When a diagonal sample
 * collides, each axis is attempted independently so the block naturally slides
 * along the contacted wall instead of snapping to a dominant axis.
 */
export const sweepContinuousPose = (
  start: ContinuousPose,
  target: ContinuousPose,
  isValid: (x: number, y: number) => boolean,
  maxStep = 0.08,
): SweepResult => {
  const deltaX = target.x - start.x;
  const deltaY = target.y - start.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / maxStep));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;
  let x = start.x;
  let y = start.y;
  let blockedX = false;
  let blockedY = false;
  const path: ContinuousPose[] = [];

  const recordPose = (): void => {
    const previous = path[path.length - 1];
    if (!previous || Math.abs(previous.x - x) > 1e-9 || Math.abs(previous.y - y) > 1e-9) {
      path.push({ x, y });
    }
  };

  const advanceAxisToContact = (axis: "x" | "y", delta: number): void => {
    if (delta === 0) return;
    const originX = x;
    const originY = y;
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const fraction = (low + high) / 2;
      const candidateX = axis === "x" ? originX + delta * fraction : originX;
      const candidateY = axis === "y" ? originY + delta * fraction : originY;
      if (isValid(candidateX, candidateY)) low = fraction;
      else high = fraction;
    }
    if (axis === "x") x = originX + delta * low;
    else y = originY + delta * low;
  };

  for (let index = 0; index < steps; index += 1) {
    const nextX = x + stepX;
    const nextY = y + stepY;
    if (isValid(nextX, nextY)) {
      x = nextX;
      y = nextY;
      recordPose();
      continue;
    }

    const axes: Array<"x" | "y"> = Math.abs(stepX) >= Math.abs(stepY) ? ["x", "y"] : ["y", "x"];
    for (const axis of axes) {
      if (axis === "x" && stepX !== 0) {
        if (isValid(x + stepX, y)) x += stepX;
        else {
          advanceAxisToContact("x", stepX);
          blockedX = true;
        }
      } else if (axis === "y" && stepY !== 0) {
        if (isValid(x, y + stepY)) y += stepY;
        else {
          advanceAxisToContact("y", stepY);
          blockedY = true;
        }
      }
    }
    recordPose();
  }

  return { x, y, blockedX, blockedY, path };
};

/**
 * Advances by the pointer's newly delivered delta instead of targeting the
 * original absolute grab offset. Any distance rejected by a wall is consumed
 * on that sample, so a later reverse or orthogonal turn responds immediately
 * instead of paying back a large hidden pointer/brick gap.
 */
export const advanceContinuousDragPose = (
  start: ContinuousPose,
  input: TurnAssistInput,
  isValid: (x: number, y: number) => boolean,
  maxStep = 0.08,
): SweepResult => sweepContinuousPoseWithTurnAssist(
  start,
  { x: start.x + input.pointerDelta.x, y: start.y + input.pointerDelta.y },
  input,
  isValid,
  maxStep,
);

/**
 * Retries a strongly orthogonal pointer turn on the current integer rail when
 * the raw floating pose snags on the trailing corner of an obstacle. Crossing
 * the grid hysteresis can leave up to 0.42 cell of visual overlap behind the
 * committed cell; without this assist, a right-then-up gesture can be unable
 * to enter a lane that is legal for the integer simulation. Open-space drags
 * keep their exact pixel pose because the retry is only considered when the
 * newly requested axis was actually blocked.
 */
export const sweepContinuousPoseWithTurnAssist = (
  start: ContinuousPose,
  target: ContinuousPose,
  input: TurnAssistInput,
  isValid: (x: number, y: number) => boolean,
  maxStep = 0.08,
  railLimit = 0.48,
): SweepResult => {
  const raw = sweepContinuousPose(start, target, isValid, maxStep);
  const pointerX = Math.abs(input.pointerDelta.x);
  const pointerY = Math.abs(input.pointerDelta.y);
  const verticalTurn = pointerY > 0.01 && pointerY > pointerX * 1.15;
  const horizontalTurn = pointerX > 0.01 && pointerX > pointerY * 1.15;

  let requestedAxis: "x" | "y" | undefined;
  if (verticalTurn && raw.blockedY && Math.abs(target.x - input.grid.x) <= railLimit) {
    requestedAxis = "y";
  } else if (horizontalTurn && raw.blockedX && Math.abs(target.y - input.grid.y) <= railLimit) {
    requestedAxis = "x";
  }
  if (!requestedAxis) return raw;

  const railCoordinate = requestedAxis === "y" ? "x" : "y";
  const desiredRail = input.grid[railCoordinate];
  const railDelta = desiredRail - start[railCoordinate];
  const railDistance = Math.abs(railDelta);
  const inputBudget = Math.hypot(target.x - start.x, target.y - start.y);
  if (inputBudget <= CONTACT_EPSILON || railDistance > railLimit + CONTACT_EPSILON) return raw;
  const railTravel = Math.min(railDistance, inputBudget);
  const railTarget: ContinuousPose = requestedAxis === "y"
    ? { x: start.x + Math.sign(railDelta) * railTravel, y: start.y }
    : { x: start.x, y: start.y + Math.sign(railDelta) * railTravel };
  const rail = sweepContinuousPose(start, railTarget, isValid, maxStep);
  if (Math.abs(rail[railCoordinate] - railTarget[railCoordinate]) > CONTACT_EPSILON) return raw;
  const remainingBudget = Math.max(0, inputBudget - railTravel);
  const requestedDelta = target[requestedAxis] - start[requestedAxis];
  const requestedTravel = Math.min(Math.abs(requestedDelta), remainingBudget);
  const boundedTarget: ContinuousPose = requestedAxis === "y"
    ? { x: rail.x, y: start.y + Math.sign(requestedDelta) * requestedTravel }
    : { x: start.x + Math.sign(requestedDelta) * requestedTravel, y: rail.y };
  const turn = sweepContinuousPose(rail, boundedTarget, isValid, maxStep);
  const assisted: SweepResult = {
    ...turn,
    blockedX: rail.blockedX || turn.blockedX,
    blockedY: rail.blockedY || turn.blockedY,
    path: [...rail.path, ...turn.path],
  };
  const rawRemaining = Math.abs(raw[requestedAxis] - target[requestedAxis]);
  const assistedRemaining = Math.abs(assisted[requestedAxis] - target[requestedAxis]);
  if (assistedRemaining + CONTACT_EPSILON < rawRemaining) return assisted;
  // Merely getting closer to the integer rail is not a useful turn when the
  // requested axis remains blocked and the finger is intentionally diagonal:
  // that would eat the free component of a wall-slide. A nearly pure 90-degree
  // turn is different; allow successive small samples to spend their bounded
  // budget returning the trailing corner to its committed integer rail.
  const rawRailRemaining = Math.abs(raw[railCoordinate] - desiredRail);
  const assistedRailRemaining = Math.abs(assisted[railCoordinate] - desiredRail);
  const railInput = Math.abs(input.pointerDelta[railCoordinate]);
  const requestedInput = Math.abs(input.pointerDelta[requestedAxis]);
  const isOrthogonalTurn = railInput <= Math.max(0.02, requestedInput * 0.15);
  return isOrthogonalTurn && assistedRailRemaining + CONTACT_EPSILON < rawRailRemaining ? assisted : raw;
};

/**
 * Returns strict one-cell simulation transitions once the floating pose has
 * crossed a candidate boundary. The extra margin is hysteresis: after moving
 * into a new grid cell, the pointer must cross back past the opposite margin
 * before the candidate reverses.
 */
export const candidateGridSteps = (
  pose: ContinuousPose,
  grid: ContinuousPose,
  hysteresis = 0.08,
): GridStep[] => {
  const threshold = 0.5 + hysteresis;
  const candidates: GridStep[] = [];
  const dx = pose.x - grid.x;
  const dy = pose.y - grid.y;
  if (Math.abs(dx) >= threshold) candidates.push({ x: grid.x + Math.sign(dx), y: grid.y, axis: "x" });
  if (Math.abs(dy) >= threshold) candidates.push({ x: grid.x, y: grid.y + Math.sign(dy), axis: "y" });
  return candidates.sort((a, b) => (
    (b.axis === "x" ? Math.abs(dx) : Math.abs(dy)) - (a.axis === "x" ? Math.abs(dx) : Math.abs(dy))
  ));
};

/** Selects the closest integer pose reachable through at most two legal steps. */
export const chooseNearestReachableSnap = (
  pose: ContinuousPose,
  grid: ContinuousPose,
  isGridValid: (x: number, y: number) => boolean,
  lastIntentAxis?: "x" | "y",
): ReachableGridSnap => {
  const queue: ReachableGridSnap[] = [{ x: grid.x, y: grid.y, path: [] }];
  const seen = new Set([`${grid.x},${grid.y}`]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.path.length >= 2) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || !isGridValid(x, y)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...current.path, { x, y }] });
    }
  }

  const score = (candidate: ReachableGridSnap): number => (
    (candidate.x - pose.x) ** 2 + (candidate.y - pose.y) ** 2
  );
  return queue.sort((a, b) => {
    const distance = score(a) - score(b);
    if (Math.abs(distance) > 1e-9) return distance;
    if (lastIntentAxis) {
      const aLast = a.path.length > 0 ? a.path[a.path.length - 1]! : grid;
      const aBefore = a.path.length > 1 ? a.path[a.path.length - 2]! : grid;
      const bLast = b.path.length > 0 ? b.path[b.path.length - 1]! : grid;
      const bBefore = b.path.length > 1 ? b.path[b.path.length - 2]! : grid;
      const aAxis = aLast.x !== aBefore.x ? "x" : aLast.y !== aBefore.y ? "y" : undefined;
      const bAxis = bLast.x !== bBefore.x ? "x" : bLast.y !== bBefore.y ? "y" : undefined;
      if (aAxis === lastIntentAxis && bAxis !== lastIntentAxis) return -1;
      if (bAxis === lastIntentAxis && aAxis !== lastIntentAxis) return 1;
    }
    return a.path.length - b.path.length;
  })[0];
};

export const isPoseAlignedToGrid = (
  pose: ContinuousPose,
  grid: ContinuousPose,
  tolerance = 0.04,
): boolean => Math.abs(pose.x - grid.x) <= tolerance && Math.abs(pose.y - grid.y) <= tolerance;

/** True only when the block itself—not merely the pointer—touches a board edge. */
export const isContinuousPoseAtEdge = (
  pose: ContinuousPose,
  shape: readonly Point[],
  width: number,
  height: number,
  side: Side,
  tolerance = 0.04,
): boolean => {
  const minX = pose.x + Math.min(...shape.map(([x]) => x));
  const maxX = pose.x + Math.max(...shape.map(([x]) => x)) + 1;
  const minY = pose.y + Math.min(...shape.map(([, y]) => y));
  const maxY = pose.y + Math.max(...shape.map(([, y]) => y)) + 1;
  if (side === "top") return Math.abs(minY) <= tolerance;
  if (side === "bottom") return Math.abs(height - maxY) <= tolerance;
  if (side === "left") return Math.abs(minX) <= tolerance;
  return Math.abs(width - maxX) <= tolerance;
};

/**
 * Tests contact at one physical portal rail and the full rigid shape's
 * tangential extent. A leading tip alone must never admit the wider rear.
 */
export const isContinuousPoseAtPortal = (
  pose: ContinuousPose,
  shape: readonly Point[],
  portal: GatePortalSpec,
  tolerance = 0.04,
  _mechanismRules?: PuzzleSnapshot["mechanismRules"],
): boolean => {
  if (shape.length === 0) return false;
  const [railX, railY] = portalBoundaryAnchor(portal);
  const extreme = portal.side === "top"
    ? Math.min(...shape.map(([, y]) => y))
    : portal.side === "bottom"
      ? Math.max(...shape.map(([, y]) => y))
      : portal.side === "left"
        ? Math.min(...shape.map(([x]) => x))
        : Math.max(...shape.map(([x]) => x));
  const blockRail = portal.side === "top"
    ? pose.y + extreme
    : portal.side === "bottom"
      ? pose.y + extreme + 1
      : portal.side === "left"
        ? pose.x + extreme
        : pose.x + extreme + 1;
  const portalRail = portal.side === "top" || portal.side === "bottom" ? railY : railX;
  if (Math.abs(blockRail - portalRail) > tolerance) return false;

  const tangentStart = portal.side === "top" || portal.side === "bottom"
    ? portal.origin[0]
    : portal.origin[1];
  const tangentEnd = tangentStart + portal.size;
  return shape.every(([x, y]) => {
    const blockStart = portal.side === "top" || portal.side === "bottom"
      ? pose.x + x
      : pose.y + y;
    return blockStart >= tangentStart - tolerance
      && blockStart + 1 <= tangentEnd + tolerance;
  });
};

/**
 * Resolves physical portal identities for a block at its committed grid pose.
 * Pass PuzzleModel.possibleExitSides(block) to keep model state (colour, ice,
 * star and flip-door openness) authoritative while retaining portal identity.
 */
export const matchingContinuousExitPortals = (
  snapshot: Readonly<Pick<
    PuzzleSnapshot,
    "width" | "height" | "playable" | "blocked" | "seams" | "gates" | "flipDoors" | "mechanismRules"
  >>,
  block: Readonly<Pick<BlockState, "x" | "y" | "shape">>,
  sides: readonly Side[],
): ContinuousExitPortalMatch[] => {
  if (sides.length === 0) return [];
  const requestedSides = new Set(sides);
  const cells = block.shape.map(([x, y]) => [block.x + x, block.y + y] as Point);
  const owners = [
    ...snapshot.gates.map((gate) => ({ gate, gateKind: "fixed" as const })),
    ...snapshot.flipDoors.map((gate) => ({ gate, gateKind: "flipDoor" as const })),
  ];
  const matches: ContinuousExitPortalMatch[] = [];
  for (const side of ["top", "right", "bottom", "left"] as const) {
    if (!requestedSides.has(side)) continue;
    for (const { gate, gateKind } of owners) {
      const match = matchingPortalForExitFrontier(snapshot, cells, gate, side);
      if (!match) continue;
      matches.push({
        gateId: gate.id,
        gateKind,
        portalIndex: match.portalIndex,
        portal: match.portal,
        authoredPortal: Boolean(gate.portals?.length),
      });
    }
  }
  return matches;
};

/**
 * Chooses the matching edge that owns a release. Directional intent wins when
 * it names a valid edge; otherwise the closest matching board edge wins. This
 * makes a block released while moving along a gate disappear through that gate
 * without making corner releases ambiguous.
 */
export const chooseReleaseExitSide = (
  possible: readonly Side[],
  point: ContinuousPose,
  board: ReleaseBoardBounds,
  inferred?: Side,
): Side | undefined => {
  if (inferred && possible.includes(inferred)) return inferred;
  const distance: Record<Side, number> = {
    top: Math.abs(point.y - board.innerY),
    right: Math.abs(point.x - (board.innerX + board.innerWidth)),
    bottom: Math.abs(point.y - (board.innerY + board.innerHeight)),
    left: Math.abs(point.x - board.innerX),
  };
  return [...possible].sort((a, b) => distance[a] - distance[b])[0];
};

const portalReleaseDistanceSquared = (
  point: ContinuousPose,
  portal: GatePortalSpec,
  board: PortalReleaseBoardBounds,
): number => {
  const [anchorX, anchorY] = portalBoundaryAnchor(portal);
  const centerX = board.innerX + anchorX * board.cell;
  const centerY = board.innerY + anchorY * board.cell;
  const halfSpan = portal.size * board.cell / 2;
  if (portal.side === "top" || portal.side === "bottom") {
    const nearestX = Math.max(centerX - halfSpan, Math.min(centerX + halfSpan, point.x));
    return (point.x - nearestX) ** 2 + (point.y - centerY) ** 2;
  }
  const nearestY = Math.max(centerY - halfSpan, Math.min(centerY + halfSpan, point.y));
  return (point.x - centerX) ** 2 + (point.y - nearestY) ** 2;
};

/**
 * Chooses a physical portal, not just a side. Directional intent wins when it
 * identifies candidates; same-side portals are then disambiguated by distance
 * to their real rail segment. A purely normalized legacy set delegates to the
 * original side chooser so side/offset/size behavior remains byte-for-byte.
 */
export const choosePortalReleaseCandidate = <T extends PortalReleaseCandidate>(
  candidates: readonly T[],
  point: ContinuousPose,
  board: PortalReleaseBoardBounds,
  inferred?: Side,
): T | undefined => {
  if (candidates.length === 0) return undefined;
  if (candidates.every((candidate) => candidate.authoredPortal === false)) {
    const possible = [...new Set(candidates.map(({ portal }) => portal.side))];
    const side = chooseReleaseExitSide(possible, point, board, inferred);
    return candidates.find(({ portal }) => portal.side === side);
  }
  const inferredCandidates = inferred
    ? candidates.filter(({ portal }) => portal.side === inferred)
    : [];
  const eligible = inferredCandidates.length > 0 ? inferredCandidates : candidates;
  return [...eligible].sort((a, b) => (
    portalReleaseDistanceSquared(point, a.portal, board)
    - portalReleaseDistanceSquared(point, b.portal, board)
  ))[0];
};

export const easeOutCubic = (progress: number): number => {
  const clamped = Math.max(0, Math.min(1, progress));
  return 1 - (1 - clamped) ** 3;
};
