import type { BlockColor, LevelSpec, Point, Side } from "./types";

interface SolverBlock {
  id: string;
  x: number;
  y: number;
  shape: Point[];
  color: BlockColor;
  layers: BlockColor[];
  frozen: number;
  shutterId?: string;
  star?: boolean;
}

interface SolverState {
  blocks: SolverBlock[];
  gates: Array<LevelSpec["gates"][number] & { frozen: number }>;
  shutters: Array<NonNullable<LevelSpec["shutters"]>[number]>;
}

export interface SolverDrag {
  blockId: string;
  path: Point[];
  exitSide?: Side;
}

export interface LevelSolveResult {
  solved: boolean;
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

const stateKey = (state: SolverState): string => (
  `b:${state.blocks.map((block) => `${block.id}@${block.x},${block.y}:${block.layers.join(",")}:${block.frozen}`).join("|")}`
  + `;g:${state.gates.map((gate) => gate.frozen).join(",")}`
  + `;s:${state.shutters.map((shutter) => shutter.count).join(",")}`
);

const cloneState = (state: SolverState): SolverState => ({
  blocks: state.blocks.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as const), layers: [...block.layers] })),
  gates: state.gates.map((gate) => ({ ...gate })),
  shutters: state.shutters.map((shutter) => ({ ...shutter })),
});

const initialState = (level: LevelSpec): SolverState => ({
  blocks: level.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y] as const),
    layers: block.layers ? [...block.layers] : [block.color],
    frozen: block.frozen ?? 0,
  })),
  gates: level.gates.map((gate) => ({ ...gate, frozen: gate.frozen ?? 0 })),
  shutters: (level.shutters ?? []).map((shutter) => ({ ...shutter })),
});

const active = (state: SolverState, block: SolverBlock): boolean => {
  if (block.frozen > 0) return false;
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
    if (shutter.count <= 0) continue;
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
  return cellsAt(block, x, y).every(([cellX, cellY]) => (
    cellX >= 0 && cellY >= 0 && cellX < level.width && cellY < level.height
    && !constraints.blocked.has(positionKey(cellX, cellY))
    && !constraints.occupied.has(positionKey(cellX, cellY))
  ));
};

const reachablePositions = (
  level: LevelSpec,
  state: SolverState,
  block: SolverBlock,
): Map<string, { point: Point; parent?: string }> => {
  const start = positionKey(block.x, block.y);
  const reached = new Map<string, { point: Point; parent?: string }>([[start, { point: [block.x, block.y] }]]);
  const queue: Point[] = [[block.x, block.y]];
  const directions: Point[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
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
      if (reached.has(key) || !canPlace(level, block, nextX, nextY, constraints)) continue;
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
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const atEdge = side === "top" ? minY === 0
    : side === "bottom" ? maxY === level.height - 1
      : side === "left" ? minX === 0
        : maxX === level.width - 1;
  if (!atEdge) return false;
  return state.gates.some((gate) => {
    if (gate.side !== side || gate.frozen > 0 || gate.color !== block.layers[0]) return false;
    if (block.star && !gate.star) return false;
    return side === "top" || side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
  });
};

const gateBoundaryCells = (level: LevelSpec, gate: SolverState["gates"][number]): Set<string> => {
  const cells = new Set<string>();
  for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
    if (gate.side === "top") cells.add(positionKey(offset, 0));
    else if (gate.side === "bottom") cells.add(positionKey(offset, level.height - 1));
    else if (gate.side === "left") cells.add(positionKey(0, offset));
    else cells.add(positionKey(level.width - 1, offset));
  }
  return cells;
};

const vacatesForeignGate = (level: LevelSpec, state: SolverState, drag: SolverDrag): boolean => {
  if (drag.exitSide) return false;
  const block = state.blocks.find((candidate) => candidate.id === drag.blockId);
  const destination = drag.path.at(-1);
  if (!block || !destination) return false;
  const before = new Set(cellsAt(block).map(([x, y]) => positionKey(x, y)));
  const after = new Set(cellsAt(block, destination[0], destination[1]).map(([x, y]) => positionKey(x, y)));
  return state.gates.some((gate) => {
    if (gate.frozen > 0 || gate.color === block.layers[0]) return false;
    const boundary = gateBoundaryCells(level, gate);
    return [...boundary].some((cell) => before.has(cell)) && ![...boundary].some((cell) => after.has(cell));
  });
};

const advanceConveyors = (level: LevelSpec, state: SolverState): void => {
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
    if (canPlace(level, block, block.x + dx, block.y + dy, placementConstraints(level, state, block))) {
      block.x += dx;
      block.y += dy;
    }
  }
};

const advanceCounters = (level: LevelSpec, state: SolverState, clearedId: string): void => {
  for (const gate of state.gates) gate.frozen = Math.max(0, gate.frozen - 1);
  for (const block of state.blocks) {
    if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
  }
  for (const shutter of state.shutters) shutter.count = Math.max(0, shutter.count - 1);
  advanceConveyors(level, state);
};

const applyDrag = (level: LevelSpec, state: SolverState, drag: SolverDrag): SolverState => {
  const next = cloneState(state);
  const block = next.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) return next;
  const destination = drag.path.at(-1);
  if (destination) [block.x, block.y] = destination;
  if (!drag.exitSide) return next;
  if (block.layers.length > 1) {
    block.layers.shift();
    block.color = block.layers[0];
  } else {
    next.blocks = next.blocks.filter((candidate) => candidate.id !== block.id);
  }
  advanceCounters(level, next, block.id);
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
    const key = stateKey(next);
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
  const relaxedKey = (state: RelaxedState): string => `${stateKey(state.board)}|p:${JSON.stringify(
    state.parked.map((block) => [block.id, block.layers, block.frozen]),
  )}`;
  const cloneRelaxed = (state: RelaxedState): RelaxedState => ({
    board: cloneState(state.board),
    parked: state.parked.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as const), layers: [...block.layers] })),
  });
  const advanceRelaxedCounters = (state: RelaxedState, clearedId: string): void => {
    advanceCounters(level, state.board, clearedId);
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
  const buckets: RelaxedState[][] = Array.from({ length: start.blocks.length + 1 }, () => []);
  buckets[0].push(initial);
  for (let cost = 0; cost < buckets.length; cost += 1) {
    while (buckets[cost].length) {
      const stateAtCost = buckets[cost].pop()!;
      const nodeKey = relaxedKey(stateAtCost);
      if (cost !== best.get(nodeKey)) continue;
      if (!stateAtCost.board.blocks.length && !stateAtCost.parked.length) return cost;

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
        if (exiting.layers.length > 1) {
          exiting.layers.shift();
          exiting.color = exiting.layers[0];
        } else {
          state.parked = state.parked.filter((block) => block.id !== exiting.id);
        }
        advanceRelaxedCounters(state, exiting.id);
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

const nextDrags = (level: LevelSpec, state: SolverState): SolverDrag[] => {
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
  const unique = new Map<string, SolverDrag>();
  for (const drag of candidates) {
    const next = applyDrag(level, state, drag);
    const key = stateKey(next);
    const previous = unique.get(key);
    if (!previous || drag.path.length < previous.path.length) unique.set(key, drag);
  }
  return [...unique.values()].sort((a, b) => (
    Number(Boolean(b.exitSide)) - Number(Boolean(a.exitSide))
    || Number(vacatesForeignGate(level, state, b)) - Number(vacatesForeignGate(level, state, a))
    || a.path.length - b.path.length
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

export const solveLevelOptimally = (level: LevelSpec, maxStates = 500_000): LevelSolveResult => {
  const start = initialState(level);
  const clearLoad = start.blocks.reduce((sum, block) => sum + block.layers.length, 0);
  // Dense 10–14 block boards make the subset-based relaxed parking pass more
  // expensive than the real search. The remaining-layer bound is still
  // admissible and exact; starting at zero trades a little breadth for bounded
  // memory and removes the exponential preprocessing spike.
  const parkingLowerBound = 0;
  const startKey = stateKey(start);
  const queue = new MinHeap();
  queue.push({ state: start, key: startKey, cost: 0, score: clearLoad + parkingLowerBound, remainingLayers: clearLoad });
  const best = new Map<string, number>([[startKey, 0]]);
  const recordKey = (key: string, cost: number): string => `${cost}#${key}`;
  const startRecord = recordKey(startKey, 0);
  const cameFrom = new Map<string, { parent: string; drag: SolverDrag }>();
  let exploredStates = 0;

  while (queue.size && exploredStates < maxStates) {
    const node = queue.pop()!;
    if (node.cost !== best.get(node.key)) continue;
    exploredStates += 1;
    if (!node.state.blocks.length) {
      const drags: SolverDrag[] = [];
      let cursor = recordKey(node.key, node.cost);
      while (cursor !== startRecord) {
        const entry = cameFrom.get(cursor);
        if (!entry) break;
        drags.push(entry.drag);
        cursor = entry.parent;
      }
      drags.reverse();
      const gridSteps = drags.reduce((sum, drag) => sum + drag.path.length, 0);
      return {
        solved: true,
        minimumDrags: node.cost,
        clearLoad,
        repositionOverhead: node.cost - clearLoad,
        gridSteps,
        turns: drags.reduce((sum, drag) => sum + countTurns(drag.path), 0),
        exploredStates,
        drags,
      };
    }
    for (const drag of nextDrags(level, node.state)) {
      const state = applyDrag(level, node.state, drag);
      const key = stateKey(state);
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(key, cost);
      cameFrom.set(recordKey(key, cost), { parent: recordKey(node.key, node.cost), drag });
      const remainingLayers = state.blocks.reduce((sum, block) => sum + block.layers.length, 0);
      const clearedLayers = clearLoad - remainingLayers;
      const repositionDrags = cost - clearedLayers;
      const remainingParking = Math.max(0, parkingLowerBound - repositionDrags);
      queue.push({
        state,
        key,
        cost,
        score: cost + remainingLayers + remainingParking,
        remainingLayers,
      });
    }
  }

  return {
    solved: false,
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
  const start = initialState(level);
  const prioritizeGateGuards = level.blocks.some((block) => block.id.startsWith("strategy-guard"));
  const clearLoad = start.blocks.reduce((sum, block) => sum + block.layers.length, 0);
  const startKey = stateKey(start);
  const queue = new MinHeap();
  queue.push({ state: start, key: startKey, cost: 0, score: clearLoad * 100_000, remainingLayers: clearLoad });
  const best = new Map<string, number>([[startKey, 0]]);
  const recordKey = (key: string, cost: number): string => `${cost}#${key}`;
  const startRecord = recordKey(startKey, 0);
  const cameFrom = new Map<string, { parent: string; drag: SolverDrag }>();
  let exploredStates = 0;

  while (queue.size && exploredStates < maxStates) {
    const node = queue.pop()!;
    if (node.cost !== best.get(node.key)) continue;
    exploredStates += 1;
    if (!node.state.blocks.length) {
      const drags: SolverDrag[] = [];
      let cursor = recordKey(node.key, node.cost);
      while (cursor !== startRecord) {
        const entry = cameFrom.get(cursor);
        if (!entry) break;
        drags.push(entry.drag);
        cursor = entry.parent;
      }
      drags.reverse();
      return {
        solved: true,
        minimumDrags: drags.length,
        clearLoad,
        repositionOverhead: drags.length - clearLoad,
        gridSteps: drags.reduce((sum, drag) => sum + drag.path.length, 0),
        turns: drags.reduce((sum, drag) => sum + countTurns(drag.path), 0),
        exploredStates,
        drags,
      };
    }

    for (const drag of nextDrags(level, node.state)) {
      const state = applyDrag(level, node.state, drag);
      const key = stateKey(state);
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(key, cost);
      cameFrom.set(recordKey(key, cost), { parent: recordKey(node.key, node.cost), drag });
      const remainingLayers = state.blocks.reduce((sum, block) => sum + block.layers.length, 0);
      const freesGate = prioritizeGateGuards
        && drag.blockId.startsWith("strategy-guard")
        && vacatesForeignGate(level, node.state, drag);
      queue.push({
        state,
        key,
        cost,
        score: remainingLayers * 100_000 - (freesGate ? 50_000 : 0) + cost * 100 + drag.path.length,
        remainingLayers,
      });
    }
  }

  return {
    solved: false,
    minimumDrags: Number.POSITIVE_INFINITY,
    clearLoad,
    repositionOverhead: Number.POSITIVE_INFINITY,
    gridSteps: 0,
    turns: 0,
    exploredStates,
    drags: [],
  };
};
