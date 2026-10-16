import { shutterHasPhysicalFootprint, type BlockColor, type LevelSpec, type Point, type Side } from "./types";
import {
  exitFrontierCells,
  exitPassingSpan,
  portalCoversPassingWidth,
  resolveMatchingGatePortal,
} from "./blockExitFrontier";
import { gatePortalMouthCells, gatePortals, portalCoversFrontier } from "./gatePortals";
import { footprintCrossesBoardSeam, translationCrossesBoardSeam } from "./boardSeams";

interface SolverBlock {
  id: string;
  x: number;
  y: number;
  shape: Point[];
  color: BlockColor;
  layers: BlockColor[];
  frozen: number;
  shutterId?: string;
  movementAxis?: "horizontal" | "vertical";
  keyId?: string;
  lockedBy?: string;
  lockCount?: number;
  star?: boolean;
}

interface SolverState {
  blocks: SolverBlock[];
  queuedBlocks: SolverBlock[];
  gates: Array<LevelSpec["gates"][number] & { frozen: number }>;
  flipDoors: Array<NonNullable<LevelSpec["flipDoors"]>[number] & { open: boolean; frozen: number }>;
  shutters: Array<NonNullable<LevelSpec["shutters"]>[number]>;
  generators: Array<NonNullable<LevelSpec["generators"]>[number] & {
    head: number;
    remaining: number;
    nextBlockId?: string;
    elapsed: number;
  }>;
}

export interface SolverDrag {
  blockId: string;
  path: Point[];
  exitSide?: Side;
}

export type LevelStaticUnsatReason = {
  code: "missing-compatible-exit";
  blockId: string;
  layerIndex: number;
  color: BlockColor;
  starRequired: boolean;
  movementAxis: "horizontal" | "vertical" | null;
  shapeWidth: number;
  shapeHeight: number;
  fixedPerpendicularRange: readonly [number, number] | null;
  message: string;
} | {
  code: "insufficient-keys";
  blockId: string;
  keyId: string;
  requiredKeys: number;
  availableKeys: number;
  message: string;
} | {
  code: "frozen-exit-deadlock";
  color: BlockColor;
  minimumFrozen: number;
  maximumPriorOtherClears: number;
  message: string;
};

export interface LevelSolveResult {
  solved: boolean;
  termination: "solved" | "exhausted" | "max_states" | "unsupported";
  unsupportedReasons: string[];
  staticUnsatReasons: LevelStaticUnsatReason[];
  minimumDrags: number;
  clearLoad: number;
  repositionOverhead: number;
  gridSteps: number;
  turns: number;
  exploredStates: number;
  drags: SolverDrag[];
}

interface SearchNode {
  state: SolverState;
  key: string;
  cost: number;
  score: number;
  remainingLayers: number;
  routeNodeId: number;
}

interface SolverTransition {
  drag: SolverDrag;
  state: SolverState;
  key: string;
}

const positionKey = (x: number, y: number): string => `${x},${y}`;

const staticBlockedCache = new WeakMap<LevelSpec, Set<string>>();

const staticBlockedFor = (level: LevelSpec): Set<string> => {
  const cached = staticBlockedCache.get(level);
  if (cached) return cached;
  const blocked = new Set((level.blocked ?? []).map(([cellX, cellY]) => positionKey(cellX, cellY)));
  if (level.playable) {
    const playable = new Set(level.playable.map(([cellX, cellY]) => positionKey(cellX, cellY)));
    for (let cellY = 0; cellY < level.height; cellY += 1) {
      for (let cellX = 0; cellX < level.width; cellX += 1) {
        if (!playable.has(positionKey(cellX, cellY))) blocked.add(positionKey(cellX, cellY));
      }
    }
  }
  staticBlockedCache.set(level, blocked);
  return blocked;
};

const identitySensitiveBlockIdsCache = new WeakMap<LevelSpec, Set<string>>();

const identitySensitiveBlockIdsFor = (level: LevelSpec): Set<string> => {
  const cached = identitySensitiveBlockIdsCache.get(level);
  if (cached) return cached;
  const ids = new Set<string>([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
    ...(level.shutters ?? []).flatMap((shutter) => shutter.triggerBlockIds ?? []),
  ]);
  identitySensitiveBlockIdsCache.set(level, ids);
  return ids;
};

const normalizedShapeKey = (shape: readonly Point[]): string => (
  shape.map(([x, y]) => `${x},${y}`).sort().join(";")
);

const blockStateToken = (level: LevelSpec, block: SolverBlock): string => {
  const identity = identitySensitiveBlockIdsFor(level).has(block.id)
    ? `id=${block.id}`
    : [
      `eq=${normalizedShapeKey(block.shape)}`,
      `axis=${block.movementAxis ?? "-"}`,
      `shutter=${block.shutterId ?? "-"}`,
      `key=${block.keyId ?? "-"}`,
      `star=${block.star ? 1 : 0}`,
    ].join(":");
  return `${identity}@${block.x},${block.y}:${block.layers.join(",")}:${block.frozen}:${block.lockedBy ?? "-"}:${block.lockCount ?? 0}`;
};

const stateKey = (level: LevelSpec, state: SolverState): string => (
  `b:${state.blocks.map((block) => blockStateToken(level, block)).sort().join("|")}`
  + `;q:${state.queuedBlocks.map((block) => `${block.id}:${block.layers.join(",")}:${block.frozen}:${block.lockedBy ?? "-"}:${block.lockCount ?? 0}`).join("|")}`
  + `;g:${state.gates.map((gate) => gate.frozen).join(",")}`
  + `;d:${state.flipDoors.map((door) => `${door.open ? 1 : 0}:${door.frozen}`).join(",")}`
  + `;s:${state.shutters.map((shutter) => shutter.count).join(",")}`
  + `;r:${state.generators.map((generator) => `${generator.id}@${generator.head}`).join(",")}`
);

const cloneState = (state: SolverState): SolverState => ({
  blocks: state.blocks.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as const), layers: [...block.layers] })),
  queuedBlocks: state.queuedBlocks.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as const), layers: [...block.layers] })),
  gates: state.gates.map((gate) => ({
    ...gate,
    portals: gate.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })),
  })),
  flipDoors: state.flipDoors.map((door) => ({
    ...door,
    portals: door.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })),
  })),
  shutters: state.shutters.map((shutter) => ({
    ...shutter,
    triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
  })),
  generators: state.generators.map((generator) => ({
    ...generator,
    spawn: [...generator.spawn] as Point,
    queueBlockIds: [...generator.queueBlockIds],
  })),
});

const initialState = (level: LevelSpec): SolverState => {
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const blocks = level.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y] as const),
    layers: block.layers ? [...block.layers] : [block.color],
    frozen: block.frozen ?? 0,
  }));
  const state: SolverState = {
    blocks: blocks.filter((block) => !queuedIds.has(block.id)),
    queuedBlocks: blocks.filter((block) => queuedIds.has(block.id)),
    gates: level.gates.map((gate) => ({
      ...gate,
      portals: gate.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })),
      frozen: gate.frozen ?? 0,
    })),
    flipDoors: (level.flipDoors ?? []).map((door) => ({
      ...door,
      portals: door.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })),
      open: door.initiallyOpen,
      frozen: door.frozen ?? 0,
    })),
    shutters: (level.shutters ?? []).map((shutter) => ({
      ...shutter,
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
    })),
    generators: (level.generators ?? []).map((generator) => ({
      ...generator,
      spawn: [...generator.spawn] as Point,
      queueBlockIds: [...generator.queueBlockIds],
      head: 0,
      remaining: generator.queueBlockIds.length,
      nextBlockId: generator.queueBlockIds[0],
      elapsed: 0,
    })),
  };
  // Timed feeders share the puzzle start boundary and remain dormant before
  // the first successful player operation. Later waits cost zero drags, so
  // applyDrag materializes a currently unblocked timed head after that action.
  return state;
};

const blockLayers = (block: LevelSpec["blocks"][number]): BlockColor[] => (
  block.layers ? [...block.layers] : [block.color]
);

/**
 * Finds only necessary-condition failures. Each emitted reason is sufficient
 * to prove that no move ordering can clear the level; spatial reachability is
 * deliberately left to the graph search so this pass cannot reject a level
 * merely because its opening layout looks blocked.
 */
const staticUnsatReasonsFor = (level: LevelSpec): LevelStaticUnsatReason[] => {
  const reasons: LevelStaticUnsatReason[] = [];
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  const dynamicallyRelocatedBlockIds = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
  ]);
  const shapeBounds = (block: LevelSpec["blocks"][number]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  } => {
    const xs = block.shape.map(([x]) => x);
    const ys = block.shape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  };
  const exitCompatible = (
    block: LevelSpec["blocks"][number],
    exit: (typeof exits)[number],
    color: BlockColor,
  ): boolean => {
    if (exit.color !== color || (block.star && !exit.star)) return false;
    const bounds = shapeBounds(block);
    return gatePortals(level, exit).some((portal) => {
      if (block.movementAxis === "horizontal" && portal.side !== "left" && portal.side !== "right") return false;
      if (block.movementAxis === "vertical" && portal.side !== "top" && portal.side !== "bottom") return false;
      if (portal.size < exitPassingSpan(block.shape, portal.side)) return false;
      const axisFixesOffset = portal.side === "top" || portal.side === "bottom"
        ? block.movementAxis === "vertical"
        : block.movementAxis === "horizontal";
      if (!axisFixesOffset || dynamicallyRelocatedBlockIds.has(block.id)) return true;
      const x = portal.side === "left" ? portal.origin[0] - bounds.minX
        : portal.side === "right" ? portal.origin[0] - bounds.maxX
          : block.x;
      const y = portal.side === "top" ? portal.origin[1] - bounds.minY
        : portal.side === "bottom" ? portal.origin[1] - bounds.maxY
          : block.y;
      const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy] as Point);
      const frontier = exitFrontierCells(cells, portal.side);
      return portalCoversFrontier(frontier, portal) && portalCoversPassingWidth(cells, portal);
    });
  };

  for (const block of level.blocks) {
    const bounds = shapeBounds(block);
    const { width: shapeWidth, height: shapeHeight } = bounds;
    const fixedPerpendicularRange: readonly [number, number] | null = dynamicallyRelocatedBlockIds.has(block.id)
      ? null
      : block.movementAxis === "horizontal"
        ? [block.y + bounds.minY, block.y + bounds.maxY]
        : block.movementAxis === "vertical"
          ? [block.x + bounds.minX, block.x + bounds.maxX]
          : null;

    blockLayers(block).forEach((color, layerIndex) => {
      if (exits.some((exit) => exitCompatible(block, exit, color))) return;
      reasons.push({
        code: "missing-compatible-exit",
        blockId: block.id,
        layerIndex,
        color,
        starRequired: Boolean(block.star),
        movementAxis: block.movementAxis ?? null,
        shapeWidth,
        shapeHeight,
        fixedPerpendicularRange,
        message: `Block ${block.id} layer ${layerIndex + 1} (${color}) has no colour/star/axis/span/fixed-offset-compatible exit`,
      });
    });
  }

  const availableKeys = new Map<string, number>();
  for (const block of level.blocks) {
    if (block.keyId) availableKeys.set(block.keyId, (availableKeys.get(block.keyId) ?? 0) + 1);
  }
  for (const block of level.blocks) {
    if (!block.lockedBy) continue;
    const requiredKeys = block.lockCount ?? 1;
    const matchingKeys = availableKeys.get(block.lockedBy) ?? 0;
    if (requiredKeys <= matchingKeys) continue;
    reasons.push({
      code: "insufficient-keys",
      blockId: block.id,
      keyId: block.lockedBy,
      requiredKeys,
      availableKeys: matchingKeys,
      message: `Block ${block.id} needs ${requiredKeys} key(s) ${block.lockedBy}, but only ${matchingKeys} matching key block(s) exist`,
    });
  }

  const allLayers = level.blocks.flatMap((block) => blockLayers(block));
  const layerColors = new Set(allLayers);
  for (const color of layerColors) {
    const blocksWithColor = level.blocks.filter((block) => blockLayers(block).includes(color));
    const compatibleColorExits = exits.filter((exit) => (
      blocksWithColor.some((block) => exitCompatible(block, exit, color))
    ));
    if (!compatibleColorExits.length || compatibleColorExits.some((exit) => (exit.frozen ?? 0) <= 0)) continue;
    const minimumFrozen = Math.min(...compatibleColorExits.map((exit) => exit.frozen ?? 0));
    const colorLayerCount = allLayers.filter((layerColor) => layerColor === color).length;
    const maximumPriorOtherClears = allLayers.length - colorLayerCount;
    if (minimumFrozen <= maximumPriorOtherClears) continue;
    reasons.push({
      code: "frozen-exit-deadlock",
      color,
      minimumFrozen,
      maximumPriorOtherClears,
      message: `All ${color} exits need at least ${minimumFrozen} prior clear(s), but at most ${maximumPriorOtherClears} non-${color} layer(s) can clear first`,
    });
  }

  return reasons;
};

const remainingLayerCount = (state: SolverState): number => (
  [...state.blocks, ...state.queuedBlocks].reduce((sum, block) => sum + block.layers.length, 0)
);

const active = (state: SolverState, block: SolverBlock): boolean => {
  if (block.frozen > 0) return false;
  if (block.lockedBy) return false;
  if (!block.shutterId) return true;
  return (state.shutters.find((shutter) => shutter.id === block.shutterId)?.count ?? 0) <= 0;
};

const cellsAt = (block: SolverBlock, x = block.x, y = block.y): Point[] => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy] as const)
);

const placementConstraints = (level: LevelSpec, state: SolverState, block: SolverBlock): { blocked: Set<string>; occupied: Set<string> } => {
  const blocked = staticBlockedFor(level);
  const occupied = new Set<string>();
  for (const other of state.blocks) {
    if (other.id === block.id) continue;
    const hidden = other.shutterId
      ? state.shutters.some((shutter) => shutter.id === other.shutterId && shutter.count > 0)
      : false;
    if (hidden) continue;
    for (const [cellX, cellY] of cellsAt(other)) occupied.add(positionKey(cellX, cellY));
  }
  for (const shutter of state.shutters) {
    if (!shutterHasPhysicalFootprint(shutter)) continue;
    for (let cellY = shutter.y; cellY < shutter.y + shutter.height; cellY += 1) {
      for (let cellX = shutter.x; cellX < shutter.x + shutter.width; cellX += 1) occupied.add(positionKey(cellX, cellY));
    }
  }
  return { blocked, occupied };
};

const canPlace = (
  level: LevelSpec,
  block: SolverBlock,
  x: number,
  y: number,
  constraints: { blocked: Set<string>; occupied: Set<string> },
): boolean => {
  const activeColor = block.layers[0] ?? block.color;
  const cells = cellsAt(block, x, y);
  return !footprintCrossesBoardSeam(level, cells) && cells.every(([cellX, cellY]) => (
    cellX >= 0 && cellY >= 0 && cellX < level.width && cellY < level.height
    && !constraints.blocked.has(positionKey(cellX, cellY))
    && !constraints.occupied.has(positionKey(cellX, cellY))
    && !(level.coloredGrids ?? []).some((grid) => (
      grid.color !== activeColor && grid.cells.some(([gridX, gridY]) => gridX === cellX && gridY === cellY)
    ))
  ));
};

const releaseReadyGenerators = (
  level: LevelSpec,
  state: SolverState,
  trigger: "move" | "time",
): void => {
  for (const generator of state.generators) {
    if ((generator.trigger ?? "move") !== trigger) continue;
    if (generator.remaining <= 0 || !generator.nextBlockId) continue;
    const queuedIndex = state.queuedBlocks.findIndex((block) => block.id === generator.nextBlockId);
    if (queuedIndex < 0) continue;
    const queued = state.queuedBlocks[queuedIndex];
    const candidate: SolverBlock = {
      ...queued,
      x: generator.spawn[0],
      y: generator.spawn[1],
      shape: queued.shape.map(([x, y]) => [x, y] as const),
      layers: [...queued.layers],
    };
    if (!canPlace(level, candidate, candidate.x, candidate.y, placementConstraints(level, state, candidate))) continue;
    state.queuedBlocks.splice(queuedIndex, 1);
    state.blocks.push(candidate);
    generator.head += 1;
    generator.remaining = generator.queueBlockIds.length - generator.head;
    generator.nextBlockId = generator.queueBlockIds[generator.head];
  }
};

const reachablePositions = (
  level: LevelSpec,
  state: SolverState,
  block: SolverBlock,
): Map<string, { point: Point; parent?: string }> => {
  const start = positionKey(block.x, block.y);
  const reached = new Map<string, { point: Point; parent?: string }>([[start, { point: [block.x, block.y] }]]);
  const queue: Point[] = [[block.x, block.y]];
  const directions: Point[] = block.movementAxis === "horizontal"
    ? [[1, 0], [-1, 0]]
    : block.movementAxis === "vertical"
      ? [[0, 1], [0, -1]]
      : [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const constraints = placementConstraints(level, state, block);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const reachedByDragging = x !== block.x || y !== block.y;
    if (reachedByDragging && (["top", "right", "bottom", "left"] as Side[])
      .some((side) => exitSideAt(level, state, block, x, y, side))) continue;
    for (const [dx, dy] of directions) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = positionKey(nextX, nextY);
      if (reached.has(key)
        || translationCrossesBoardSeam(level, cellsAt(block, x, y), dx, dy)
        || !canPlace(level, block, nextX, nextY, constraints)) continue;
      reached.set(key, { point: [nextX, nextY], parent: positionKey(x, y) });
      queue.push([nextX, nextY]);
    }
  }
  return reached;
};

const pathTo = (reached: Map<string, { point: Point; parent?: string }>, target: Point): Point[] => {
  const path: Point[] = [];
  let cursor: string | undefined = positionKey(target[0], target[1]);
  while (cursor) {
    const node = reached.get(cursor);
    if (!node) break;
    path.push(node.point);
    cursor = node.parent;
  }
  path.reverse();
  return path.slice(1);
};

const exitSideAt = (level: LevelSpec, state: SolverState, block: SolverBlock, x: number, y: number, side: Side): boolean => {
  if (block.movementAxis === "horizontal" && side !== "left" && side !== "right") return false;
  if (block.movementAxis === "vertical" && side !== "top" && side !== "bottom") return false;
  const cells = cellsAt(block, x, y);
  const match = resolveMatchingGatePortal(level, cells, side, state.gates, state.flipDoors);
  if (!match || match.gate.frozen > 0 || match.gate.color !== block.layers[0]) return false;
  if (match.gateKind === "flipDoor" && !(match.gate as SolverState["flipDoors"][number]).open) return false;
  if (block.star && !match.gate.star) return false;
  return true;
};

const gateBoundaryCells = (level: LevelSpec, gate: SolverState["gates"][number]): Set<string> => {
  return new Set(gatePortalMouthCells(level, gate).map(([x, y]) => positionKey(x, y)));
};

const vacatesForeignGate = (level: LevelSpec, state: SolverState, drag: SolverDrag): boolean => {
  if (drag.exitSide) return false;
  const block = state.blocks.find((candidate) => candidate.id === drag.blockId);
  const destination = drag.path[drag.path.length - 1];
  if (!block || !destination) return false;
  const before = new Set(cellsAt(block).map(([x, y]) => positionKey(x, y)));
  const after = new Set(cellsAt(block, destination[0], destination[1]).map(([x, y]) => positionKey(x, y)));
  return state.gates.some((gate) => {
    if (gate.frozen > 0 || gate.color === block.layers[0]) return false;
    const boundary = gateBoundaryCells(level, gate);
    return [...boundary].some((cell) => before.has(cell)) && ![...boundary].some((cell) => after.has(cell));
  });
};

const advanceConveyors = (level: LevelSpec, state: SolverState): boolean => {
  let changed = false;
  const vectors: Record<Side, readonly [number, number]> = {
    top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0],
  };
  for (const conveyor of level.conveyors ?? []) {
    const block = state.blocks.find((candidate) => candidate.id === conveyor.blockId);
    if (!block || !active(state, block)) continue;
    const onBelt = cellsAt(block).every(([x, y]) => (
      x >= conveyor.x && x < conveyor.x + conveyor.width
      && y >= conveyor.y && y < conveyor.y + conveyor.height
    ));
    if (!onBelt) continue;
    const [dx, dy] = vectors[conveyor.direction];
    if (!translationCrossesBoardSeam(level, cellsAt(block), dx, dy)
      && canPlace(level, block, block.x + dx, block.y + dy, placementConstraints(level, state, block))) {
      block.x += dx;
      block.y += dy;
      changed = true;
    }
  }
  return changed;
};

const advanceCounters = (
  level: LevelSpec,
  state: SolverState,
  clearedId: string,
  blockRemoved: boolean,
): boolean => {
  for (const gate of state.gates) gate.frozen = Math.max(0, gate.frozen - 1);
  for (const door of state.flipDoors) door.frozen = Math.max(0, door.frozen - 1);
  for (const block of state.blocks) {
    if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
  }
  for (const shutter of state.shutters) {
    if ((shutter.skin === "staging" || shutter.skin === "lift" || shutter.skin === "staged-frame")
      && !blockRemoved) continue;
    if (shutter.triggerBlockIds && !shutter.triggerBlockIds.includes(clearedId)) continue;
    shutter.count = Math.max(0, shutter.count - 1);
  }
  return advanceConveyors(level, state);
};

const applyDrag = (level: LevelSpec, state: SolverState, drag: SolverDrag): SolverState => {
  const next = cloneState(state);
  const block = next.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) return next;
  const destination = drag.path[drag.path.length - 1];
  if (destination) [block.x, block.y] = destination;
  if (!drag.exitSide) {
    if (destination) releaseReadyGenerators(level, next, "move");
    releaseReadyGenerators(level, next, "time");
    return next;
  }
  const blockRemoved = block.layers.length <= 1;
  if (!blockRemoved) {
    block.layers.shift();
    block.color = block.layers[0];
  } else {
    next.blocks = next.blocks.filter((candidate) => candidate.id !== block.id);
    if (block.keyId) {
      for (const candidate of [...next.blocks, ...next.queuedBlocks]) {
        if (candidate.lockedBy !== block.keyId) continue;
        const remaining = Math.max(0, (candidate.lockCount ?? 1) - 1);
        if (remaining > 0) candidate.lockCount = remaining;
        else {
          candidate.lockedBy = undefined;
          candidate.lockCount = undefined;
        }
      }
    }
  }
  const conveyorMoved = advanceCounters(level, next, block.id, blockRemoved);
  if (blockRemoved) {
    for (const door of next.flipDoors) door.open = !door.open;
  }
  if (destination || blockRemoved || conveyorMoved) releaseReadyGenerators(level, next, "move");
  releaseReadyGenerators(level, next, "time");
  return next;
};

const exitDrags = (level: LevelSpec, state: SolverState): SolverDrag[] => {
  const candidates: SolverDrag[] = [];
  for (const block of state.blocks) {
    if (!active(state, block)) continue;
    const reached = reachablePositions(level, state, block);
    for (const { point } of reached.values()) {
      for (const side of ["top", "right", "bottom", "left"] as Side[]) {
        if (exitSideAt(level, state, block, point[0], point[1], side)) {
          candidates.push({ blockId: block.id, path: pathTo(reached, point), exitSide: side });
        }
      }
    }
  }
  const unique = new Map<string, SolverDrag>();
  for (const drag of candidates) {
    const next = applyDrag(level, state, drag);
    const key = stateKey(level, next);
    const previous = unique.get(key);
    if (!previous || drag.path.length < previous.path.length) unique.set(key, drag);
  }
  return [...unique.values()];
};

// Admissible lower bound for setup drags. The relaxed puzzle may remove any
// block in one parking action, immediately grant all of its future clears, and
// otherwise use only zero-cost exits. Every real solution maps to a relaxed one
// with no more parking actions, so this can tighten A* without excluding any
// legal internal resting position.
const relaxedParkingLowerBound = (level: LevelSpec, start: SolverState): number => {
  interface RelaxedState { board: SolverState; parked: SolverBlock[] }
  const relaxedKey = (state: RelaxedState): string => `${stateKey(level, state.board)}|p:${JSON.stringify(
    state.parked.map((block) => [block.id, block.layers, block.frozen]),
  )}`;
  const cloneRelaxed = (state: RelaxedState): RelaxedState => ({
    board: cloneState(state.board),
    parked: state.parked.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as const), layers: [...block.layers] })),
  });
  const advanceRelaxedCounters = (state: RelaxedState, clearedId: string, blockRemoved: boolean): void => {
    advanceCounters(level, state.board, clearedId, blockRemoved);
    for (const block of state.parked) {
      if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
    }
  };
  const canExitParked = (state: RelaxedState, block: SolverBlock): boolean => (
    block.frozen <= 0 && state.board.gates.some((gate) => gate.frozen <= 0 && gate.color === block.layers[0])
  );

  const initial: RelaxedState = { board: start, parked: [] };
  const startKey = relaxedKey(initial);
  const best = new Map<string, number>([[startKey, 0]]);
  const buckets: RelaxedState[][] = Array.from({ length: start.blocks.length + start.queuedBlocks.length + 1 }, () => []);
  buckets[0].push(initial);
  for (let cost = 0; cost < buckets.length; cost += 1) {
    while (buckets[cost].length) {
      const stateAtCost = buckets[cost].pop()!;
      const nodeKey = relaxedKey(stateAtCost);
      if (cost !== best.get(nodeKey)) continue;
      if (!stateAtCost.board.blocks.length && !stateAtCost.board.queuedBlocks.length && !stateAtCost.parked.length) return cost;

      for (const drag of exitDrags(level, stateAtCost.board)) {
        const state = cloneRelaxed(stateAtCost);
        state.board = applyDrag(level, state.board, drag);
        for (const parked of state.parked) parked.frozen = Math.max(0, parked.frozen - 1);
        const key = relaxedKey(state);
        if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        best.set(key, cost);
        buckets[cost].push(state);
      }
      for (const parked of stateAtCost.parked) {
        if (!canExitParked(stateAtCost, parked)) continue;
        const state = cloneRelaxed(stateAtCost);
        const exiting = state.parked.find((block) => block.id === parked.id)!;
        const blockRemoved = exiting.layers.length <= 1;
        if (!blockRemoved) {
          exiting.layers.shift();
          exiting.color = exiting.layers[0];
        } else {
          state.parked = state.parked.filter((block) => block.id !== exiting.id);
        }
        advanceRelaxedCounters(state, exiting.id, blockRemoved);
        const key = relaxedKey(state);
        if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        best.set(key, cost);
        buckets[cost].push(state);
      }
      if (cost + 1 >= buckets.length) continue;
      for (const block of stateAtCost.board.blocks) {
        const state = cloneRelaxed(stateAtCost);
        const parked = state.board.blocks.find((candidate) => candidate.id === block.id)!;
        state.board.blocks = state.board.blocks.filter((candidate) => candidate.id !== block.id);
        state.parked.push(parked);
        const key = relaxedKey(state);
        const nextCost = cost + 1;
        if (nextCost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        best.set(key, nextCost);
        buckets[nextCost].push(state);
      }
    }
  }
  return 0;
};

const nextTransitions = (level: LevelSpec, state: SolverState): SolverTransition[] => {
  const candidates: SolverDrag[] = [];
  for (const block of state.blocks) {
    if (!active(state, block)) continue;
    const reached = reachablePositions(level, state, block);
    for (const { point } of reached.values()) {
      const path = pathTo(reached, point);
      let hasAutomaticExit = false;
      for (const side of ["top", "right", "bottom", "left"] as Side[]) {
        if (exitSideAt(level, state, block, point[0], point[1], side)) {
          hasAutomaticExit = true;
          candidates.push({ blockId: block.id, path, exitSide: side });
        }
      }
      // Every reachable resting position is a legal one-drag action. Restricting
      // parking to an edge makes the search faster, but it misses levels whose
      // only optimal setup move ends inside the board and therefore cannot prove
      // global optimality.
      if (path.length && !hasAutomaticExit) {
        candidates.push({ blockId: block.id, path });
      }
    }
  }
  const unique = new Map<string, SolverTransition>();
  for (const drag of candidates) {
    const next = applyDrag(level, state, drag);
    const key = stateKey(level, next);
    const previous = unique.get(key);
    if (!previous || drag.path.length < previous.drag.path.length) {
      unique.set(key, { drag, state: next, key });
    }
  }
  return [...unique.values()].sort((a, b) => (
    Number(Boolean(b.drag.exitSide)) - Number(Boolean(a.drag.exitSide))
    || Number(vacatesForeignGate(level, state, b.drag)) - Number(vacatesForeignGate(level, state, a.drag))
    || a.drag.path.length - b.drag.path.length
  ));
};

class MinHeap {
  private values: SearchNode[] = [];

  private comesFirst(a: SearchNode, b: SearchNode): boolean {
    return a.score < b.score
      || (a.score === b.score && a.remainingLayers < b.remainingLayers)
      || (a.score === b.score && a.remainingLayers === b.remainingLayers && a.cost > b.cost);
  }

  push(value: SearchNode): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.comesFirst(value, this.values[parent])) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): SearchNode | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || !this.values.length) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      let child = left;
      if (right < this.values.length && this.comesFirst(this.values[right], this.values[left])) child = right;
      if (!this.comesFirst(this.values[child], last)) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }

  get size(): number { return this.values.length; }
}

const countTurns = (path: Point[]): number => {
  let turns = 0;
  for (let index = 2; index < path.length; index += 1) {
    const previousDirection = [path[index - 1][0] - path[index - 2][0], path[index - 1][1] - path[index - 2][1]];
    const direction = [path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]];
    if (previousDirection[0] !== direction[0] || previousDirection[1] !== direction[1]) turns += 1;
  }
  return turns;
};

// This search maintains its own historical counter/queue state. A successful
// route here must never masquerade as a proof for an opt-in revised model.
const unsupportedRuleProfile = (level: LevelSpec): LevelSolveResult | undefined => (
  level.mechanismRules === undefined ? undefined : {
    solved: false,
    termination: "unsupported",
    unsupportedReasons: [`rule profile ${level.mechanismRules} requires revised model-backed search and certification; legacy solver is not qualified`],
    staticUnsatReasons: [],
    minimumDrags: Number.POSITIVE_INFINITY,
    clearLoad: level.blocks.reduce((sum, block) => sum + Math.max(1, block.layers?.length ?? 1), 0),
    repositionOverhead: Number.POSITIVE_INFINITY,
    gridSteps: 0,
    turns: 0,
    exploredStates: 0,
    drags: [],
  }
);

export const solveLevelOptimally = (level: LevelSpec, maxStates = 500_000): LevelSolveResult => {
  const unsupportedProfile = unsupportedRuleProfile(level);
  if (unsupportedProfile) return unsupportedProfile;
  const start = initialState(level);
  const clearLoad = remainingLayerCount(start);
  const unsupportedReasons = level.elevators?.length ? ["wall-clock elevators require live-state solving"] : [];
  if (level.bombFailurePolicy === "fail") unsupportedReasons.push("bomb failure deadlines require elapsed-time search");
  if (unsupportedReasons.length) {
    return {
      solved: false,
      termination: "unsupported",
      unsupportedReasons,
      staticUnsatReasons: [],
      minimumDrags: Number.POSITIVE_INFINITY,
      clearLoad,
      repositionOverhead: Number.POSITIVE_INFINITY,
      gridSteps: 0,
      turns: 0,
      exploredStates: 0,
      drags: [],
    };
  }
  const staticUnsatReasons = staticUnsatReasonsFor(level);
  if (staticUnsatReasons.length) {
    return {
      solved: false,
      termination: "exhausted",
      unsupportedReasons: [],
      staticUnsatReasons,
      minimumDrags: Number.POSITIVE_INFINITY,
      clearLoad,
      repositionOverhead: Number.POSITIVE_INFINITY,
      gridSteps: 0,
      turns: 0,
      exploredStates: 0,
      drags: [],
    };
  }
  // Dense 10–14 block boards make the subset-based relaxed parking pass more
  // expensive than the real search. The remaining-layer bound is still
  // admissible and exact; starting at zero trades a little breadth for bounded
  // memory and removes the exponential preprocessing spike.
  const parkingLowerBound = 0;
  const startKey = stateKey(level, start);
  const queue = new MinHeap();
  queue.push({
    state: start,
    key: startKey,
    cost: 0,
    score: clearLoad + parkingLowerBound,
    remainingLayers: clearLoad,
    routeNodeId: 0,
  });
  const best = new Map<string, number>([[startKey, 0]]);
  const routeNodes: Array<{ parentId: number; drag: SolverDrag } | null> = [null];
  let exploredStates = 0;

  while (queue.size && exploredStates < maxStates) {
    const node = queue.pop()!;
    if (node.cost !== best.get(node.key)) continue;
    exploredStates += 1;
    if (!node.state.blocks.length && !node.state.queuedBlocks.length) {
      const drags: SolverDrag[] = [];
      let cursor = node.routeNodeId;
      while (cursor !== 0) {
        const entry = routeNodes[cursor];
        if (!entry) break;
        drags.push(entry.drag);
        cursor = entry.parentId;
      }
      drags.reverse();
      const gridSteps = drags.reduce((sum, drag) => sum + drag.path.length, 0);
      return {
        solved: true,
        termination: "solved",
        unsupportedReasons: [],
        staticUnsatReasons: [],
        minimumDrags: node.cost,
        clearLoad,
        repositionOverhead: node.cost - clearLoad,
        gridSteps,
        turns: drags.reduce((sum, drag) => sum + countTurns(drag.path), 0),
        exploredStates,
        drags,
      };
    }
    for (const transition of nextTransitions(level, node.state)) {
      const { drag, state, key } = transition;
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(key, cost);
      const routeNodeId = routeNodes.length;
      routeNodes.push({ parentId: node.routeNodeId, drag });
      const remainingLayers = remainingLayerCount(state);
      const clearedLayers = clearLoad - remainingLayers;
      const repositionDrags = cost - clearedLayers;
      const remainingParking = Math.max(0, parkingLowerBound - repositionDrags);
      queue.push({
        state,
        key,
        cost,
        score: cost + remainingLayers + remainingParking,
        remainingLayers,
        routeNodeId,
      });
    }
  }

  return {
    solved: false,
    termination: queue.size ? "max_states" : "exhausted",
    unsupportedReasons: [],
    staticUnsatReasons: [],
    minimumDrags: Number.POSITIVE_INFINITY,
    clearLoad,
    repositionOverhead: Number.POSITIVE_INFINITY,
    gridSteps: 0,
    turns: 0,
    exploredStates,
    drags: [],
  };
};

/**
 * Finds a concrete completion route for dense release validation. It strongly
 * prefers clearing a layer over exploring every same-depth parking state, so it
 * is not an optimality proof; every returned step is still replayed through the
 * authoritative PuzzleModel by callers.
 */
export const solveLevelForValidation = (level: LevelSpec, maxStates = 120_000): LevelSolveResult => {
  const unsupportedProfile = unsupportedRuleProfile(level);
  if (unsupportedProfile) return unsupportedProfile;
  const start = initialState(level);
  const prioritizeGateGuards = level.blocks.some((block) => block.id.startsWith("strategy-guard"));
  const clearLoad = remainingLayerCount(start);
  const unsupportedReasons = level.elevators?.length ? ["wall-clock elevators require live-state solving"] : [];
  if (level.bombFailurePolicy === "fail") unsupportedReasons.push("bomb failure deadlines require elapsed-time search");
  if (unsupportedReasons.length) {
    return {
      solved: false,
      termination: "unsupported",
      unsupportedReasons,
      staticUnsatReasons: [],
      minimumDrags: Number.POSITIVE_INFINITY,
      clearLoad,
      repositionOverhead: Number.POSITIVE_INFINITY,
      gridSteps: 0,
      turns: 0,
      exploredStates: 0,
      drags: [],
    };
  }
  const staticUnsatReasons = staticUnsatReasonsFor(level);
  if (staticUnsatReasons.length) {
    return {
      solved: false,
      termination: "exhausted",
      unsupportedReasons: [],
      staticUnsatReasons,
      minimumDrags: Number.POSITIVE_INFINITY,
      clearLoad,
      repositionOverhead: Number.POSITIVE_INFINITY,
      gridSteps: 0,
      turns: 0,
      exploredStates: 0,
      drags: [],
    };
  }
  const startKey = stateKey(level, start);
  const queue = new MinHeap();
  queue.push({
    state: start,
    key: startKey,
    cost: 0,
    score: clearLoad * 100_000,
    remainingLayers: clearLoad,
    routeNodeId: 0,
  });
  const best = new Map<string, number>([[startKey, 0]]);
  const routeNodes: Array<{ parentId: number; drag: SolverDrag } | null> = [null];
  let exploredStates = 0;

  while (queue.size && exploredStates < maxStates) {
    const node = queue.pop()!;
    if (node.cost !== best.get(node.key)) continue;
    exploredStates += 1;
    if (!node.state.blocks.length && !node.state.queuedBlocks.length) {
      const drags: SolverDrag[] = [];
      let cursor = node.routeNodeId;
      while (cursor !== 0) {
        const entry = routeNodes[cursor];
        if (!entry) break;
        drags.push(entry.drag);
        cursor = entry.parentId;
      }
      drags.reverse();
      return {
        solved: true,
        termination: "solved",
        unsupportedReasons: [],
        staticUnsatReasons: [],
        minimumDrags: drags.length,
        clearLoad,
        repositionOverhead: drags.length - clearLoad,
        gridSteps: drags.reduce((sum, drag) => sum + drag.path.length, 0),
        turns: drags.reduce((sum, drag) => sum + countTurns(drag.path), 0),
        exploredStates,
        drags,
      };
    }

    for (const transition of nextTransitions(level, node.state)) {
      const { drag, state, key } = transition;
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(key, cost);
      const routeNodeId = routeNodes.length;
      routeNodes.push({ parentId: node.routeNodeId, drag });
      const remainingLayers = remainingLayerCount(state);
      // Generator queues are already counted in remainingLayers. Prefer a
      // state that has physically dispatched more of that same remaining
      // cargo, so validation does not spend its entire bound exploring
      // parking permutations that leave a legal mouth idle.
      const queuedCargo = state.queuedBlocks.length;
      const freesGate = prioritizeGateGuards
        && drag.blockId.startsWith("strategy-guard")
        && vacatesForeignGate(level, node.state, drag);
      queue.push({
        state,
        key,
        cost,
        score: remainingLayers * 100_000 + queuedCargo * 10_000
          - (freesGate ? 50_000 : 0) + cost * 100 + drag.path.length,
        remainingLayers,
        routeNodeId,
      });
    }
  }

  return {
    solved: false,
    termination: queue.size ? "max_states" : "exhausted",
    unsupportedReasons: [],
    staticUnsatReasons: [],
    minimumDrags: Number.POSITIVE_INFINITY,
    clearLoad,
    repositionOverhead: Number.POSITIVE_INFINITY,
    gridSteps: 0,
    turns: 0,
    exploredStates,
    drags: [],
  };
};
