import type { PuzzleModel } from "../core/PuzzleModel";
import { type BlockState, type Point, type PuzzleSnapshot, type Side } from "../core/types";
import { usesRevisedMechanisms } from "../core/mechanismRules";
import { isMechanismBlockVisible, isMechanismRegionBlocking } from "./revisedMechanismPresentation";

const DIRECTIONS: readonly Point[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];
const pointKey = (x: number, y: number): string => `${x},${y}`;

interface ReachableDrag {
  path: Point[];
  exits: boolean;
}

export interface LocalBreakthroughFocus {
  blockId: string;
  kind: "direct" | "setup";
  followupBlockId?: string;
  dragCountToClear: 1 | 2;
  gridStepsToClear: number;
}

export interface LocalBreakthroughAction {
  blockId: string;
  kind: "setup";
  path: Point[];
  dragCountToClear: 2;
  gridStepsToClear: number;
}

const blockActive = (snapshot: PuzzleSnapshot, block: BlockState): boolean => {
  if (block.frozen > 0) return false;
  return isMechanismBlockVisible(snapshot, block);
};

const cellsAt = (block: BlockState, x = block.x, y = block.y): Point[] => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy] as const)
);

const placementSets = (
  snapshot: PuzzleSnapshot,
  movingId: string,
  ignoredOccupantId?: string,
): { playable: Set<string>; blocked: Set<string>; occupied: Set<string> } => {
  const playable = new Set(snapshot.playable.map(([x, y]) => pointKey(x, y)));
  const blocked = new Set(snapshot.blocked.map(([x, y]) => pointKey(x, y)));
  const occupied = new Set<string>();
  for (const other of snapshot.blocks) {
    if (other.id === movingId || other.id === ignoredOccupantId) continue;
    if (!isMechanismBlockVisible(snapshot, other)) continue;
    for (const [x, y] of cellsAt(other)) occupied.add(pointKey(x, y));
  }
  for (const shutter of snapshot.shutters) {
    if (!isMechanismRegionBlocking(snapshot, shutter)) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(pointKey(x, y));
    }
  }
  return { playable, blocked, occupied };
};

const canPlace = (
  block: BlockState,
  x: number,
  y: number,
  sets: ReturnType<typeof placementSets>,
): boolean => cellsAt(block, x, y).every(([cellX, cellY]) => {
  const key = pointKey(cellX, cellY);
  return sets.playable.has(key) && !sets.blocked.has(key) && !sets.occupied.has(key);
});

const exitSidesAt = (
  snapshot: PuzzleSnapshot,
  block: BlockState,
  x: number,
  y: number,
): Side[] => {
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const activeColor = block.layers[0] ?? block.color;
  return SIDES.filter((side) => {
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === snapshot.height - 1
        : side === "left" ? minX === 0
          : maxX === snapshot.width - 1;
    if (!atEdge) return false;
    return snapshot.gates.some((gate) => {
      if (gate.side !== side || gate.frozen > 0 || gate.color !== activeColor) return false;
      if (block.star && !gate.star) return false;
      return side === "top" || side === "bottom"
        ? minX >= gate.offset && maxX < gate.offset + gate.size
        : minY >= gate.offset && maxY < gate.offset + gate.size;
    });
  });
};

const reachableDrags = (
  snapshot: PuzzleSnapshot,
  block: BlockState,
  maximumSteps: number,
  ignoredOccupantId?: string,
): ReachableDrag[] => {
  const start: Point = [block.x, block.y];
  const queue: Array<{ point: Point; path: Point[] }> = [{ point: start, path: [] }];
  const visited = new Set([pointKey(...start)]);
  const sets = placementSets(snapshot, block.id, ignoredOccupantId);
  const result: ReachableDrag[] = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.path.length >= maximumSteps) continue;
    for (const [dx, dy] of DIRECTIONS) {
      const next: Point = [current.point[0] + dx, current.point[1] + dy];
      const key = pointKey(...next);
      if (visited.has(key) || !canPlace(block, next[0], next[1], sets)) continue;
      visited.add(key);
      const path = [...current.path, next];
      const exits = exitSidesAt(snapshot, block, next[0], next[1]).length > 0;
      result.push({ path, exits });
      // Gameplay resolves a matching edge alignment immediately, so a drag
      // cannot continue through that pose to reach cells beyond the gate.
      if (!exits) queue.push({ point: next, path });
    }
  }
  return result;
};

interface DirectClear {
  blockId: string;
  gridSteps: number;
  path: Point[];
}

const shortestClearForBlock = (
  snapshot: PuzzleSnapshot,
  block: BlockState,
  ignoredOccupantId?: string,
): DirectClear | undefined => {
  if (!blockActive(snapshot, block)) return undefined;
  if (exitSidesAt(snapshot, block, block.x, block.y).length) {
    return { blockId: block.id, gridSteps: 0, path: [] };
  }
  const clear = reachableDrags(
    snapshot,
    block,
    snapshot.width + snapshot.height,
    ignoredOccupantId,
  ).find((drag) => drag.exits);
  return clear ? { blockId: block.id, gridSteps: clear.path.length, path: clear.path } : undefined;
};

const shortestDirectClear = (snapshot: PuzzleSnapshot): DirectClear | undefined => {
  const candidates: DirectClear[] = [];
  for (const block of snapshot.blocks) {
    const clear = shortestClearForBlock(snapshot, block);
    if (clear) candidates.push(clear);
  }
  return candidates.sort((left, right) => (
    left.gridSteps - right.gridSteps || left.blockId.localeCompare(right.blockId)
  ))[0];
};

const routeCells = (block: BlockState, path: readonly Point[]): Set<string> => {
  const result = new Set<string>();
  for (const [x, y] of [[block.x, block.y] as Point, ...path]) {
    for (const [cellX, cellY] of cellsAt(block, x, y)) result.add(pointKey(cellX, cellY));
  }
  return result;
};

const avoidsCells = (block: BlockState, destination: Point, forbidden: ReadonlySet<string>): boolean => (
  cellsAt(block, destination[0], destination[1]).every(([x, y]) => !forbidden.has(pointKey(x, y)))
);

/**
 * Finds only a near-term, visible-information breakthrough: either a block
 * that can clear in one drag, or a block whose single setup drag makes some
 * block clearable on the following drag. The returned contract deliberately
 * contains no path or gate, so rendering can only focus a block, never ship a
 * second move or a full solution.
 */
const findLocalBreakthrough = (
  model: PuzzleModel,
  preferredBlockId?: string,
  maximumSetupSteps = 4,
): (LocalBreakthroughFocus & { path?: Point[] }) | undefined => {
  const snapshot = model.snapshot();
  // This legacy heuristic freezes space while probing routes. Revised moves
  // can reveal lifts or dispatch cargo mid-gesture; do not advertise an
  // unverified hint until the authoritative revised planner is integrated.
  if (usesRevisedMechanisms(snapshot)) return undefined;
  const direct = shortestDirectClear(snapshot);
  if (direct) {
    return {
      blockId: direct.blockId,
      kind: "direct",
      dragCountToClear: 1,
      gridStepsToClear: direct.gridSteps,
    };
  }

  const active = snapshot.blocks.filter((block) => blockActive(snapshot, block));
  const setupDrags = new Map(active.map((block) => [
    block.id,
    reachableDrags(snapshot, block, maximumSetupSteps).filter((drag) => !drag.exits),
  ]));
  const candidates: Array<LocalBreakthroughAction & {
    followupBlockId: string;
    setupSteps: number;
    preferred: boolean;
  }> = [];
  for (const target of active) {
    for (const blocker of active) {
      if (blocker.id === target.id) continue;
      // Because the unmodified state has no direct clear, a route that exists
      // only while one block is ignored proves a local one-block dependency.
      const followup = shortestClearForBlock(snapshot, target, blocker.id);
      if (!followup) continue;
      const corridor = routeCells(target, followup.path);
      const blockerOccupiesCorridor = cellsAt(blocker).some(([x, y]) => corridor.has(pointKey(x, y)));
      if (!blockerOccupiesCorridor) continue;
      const setup = setupDrags.get(blocker.id)?.find((drag) => {
        const destination = drag.path.at(-1);
        return Boolean(destination && avoidsCells(blocker, destination, corridor));
      });
      if (!setup) continue;
      candidates.push({
        blockId: blocker.id,
        kind: "setup",
        followupBlockId: followup.blockId,
        dragCountToClear: 2,
        gridStepsToClear: setup.path.length + followup.gridSteps,
        path: setup.path,
        setupSteps: setup.path.length,
        preferred: blocker.id === preferredBlockId,
      });
    }
  }
  const best = candidates.sort((left, right) => (
    left.gridStepsToClear - right.gridStepsToClear
    || Number(right.preferred) - Number(left.preferred)
    || left.setupSteps - right.setupSteps
    || left.blockId.localeCompare(right.blockId)
  ))[0];
  if (!best) return undefined;
  const { setupSteps: _setupSteps, preferred: _preferred, ...focus } = best;
  return focus;
};

export const localBreakthroughFocus = (
  model: PuzzleModel,
  preferredBlockId?: string,
  maximumSetupSteps = 4,
): LocalBreakthroughFocus | undefined => {
  const breakthrough = findLocalBreakthrough(model, preferredBlockId, maximumSetupSteps);
  if (!breakthrough) return undefined;
  const { path: _path, ...focus } = breakthrough;
  return focus;
};

/**
 * Returns only the setup drag that opens a one-drag clear. It deliberately
 * omits the following clear route and gate so runtime assistance stops as soon
 * as the local corridor is open.
 */
export const localBreakthroughAction = (
  model: PuzzleModel,
  preferredBlockId?: string,
  maximumSetupSteps = 4,
): LocalBreakthroughAction | undefined => {
  const breakthrough = findLocalBreakthrough(model, preferredBlockId, maximumSetupSteps);
  if (!breakthrough || breakthrough.kind !== "setup" || !breakthrough.path?.length) return undefined;
  const { followupBlockId: _followupBlockId, ...action } = breakthrough;
  return { ...action, kind: "setup", dragCountToClear: 2, path: breakthrough.path };
};
