import { shutterHasPhysicalFootprint, type BlockColor, type LevelSpec, type Point, type Side } from "./types";
import { gateCoversExitFrontier } from "./blockExitFrontier";

// Lv1–10 are exact observed competitor block-count targets. Lv11–100 retain the
// authored campaign floors; a generated level that already contains more keeps it.
export const COMPETITOR_VISIBLE_BLOCK_TARGETS = [
  3, 9, 8, 18, 20, 21, 16, 25, 10, 25,
  7, 9, 8, 10, 5, 8, 9, 10, 13, 13,
  5, 7, 8, 9, 5, 8, 9, 10, 8, 10,
  6, 8, 9, 10, 4, 9, 8, 10, 8, 11,
  6, 8, 9, 10, 6, 9, 8, 10, 9, 6,
  7, 9, 10, 11, 7, 10, 9, 11, 10, 11,
  7, 8, 10, 11, 7, 10, 9, 9, 10, 5,
  8, 10, 11, 9, 8, 11, 10, 12, 8, 12,
  8, 10, 11, 12, 8, 11, 10, 12, 8, 12,
  9, 11, 12, 13, 9, 12, 11, 12, 12, 14,
] as const;

// Executable-route calibration. Lv1–10 are exact solver routes for the
// competitor-composition redesign; later chapters retain the Round 54 budgets.
export const VALIDATED_ROUTE_PAR_MOVES = [
  3, 10, 9, 21, 20, 21, 16, 25, 10, 25,
  8, 11, 10, 12, 6, 9, 10, 14, 14, 12,
  7, 8, 10, 10, 7, 11, 11, 12, 12, 10,
  11, 13, 12, 10, 7, 10, 15, 12, 11, 13,
  10, 10, 15, 15, 12, 11, 15, 14, 15, 9,
  11, 19, 19, 23, 12, 21, 13, 18, 14, 16,
  13, 14, 22, 17, 11, 18, 13, 16, 17, 10,
  12, 19, 20, 21, 15, 22, 16, 27, 26, 25,
  17, 18, 23, 19, 17, 29, 18, 23, 27, 17,
  16, 24, 33, 23, 21, 35, 21, 36, 24, 31,
] as const;

// buildExtendedLevels still constructs the legacy generated Lv1–10 before
// levels.ts replaces that slice with CHAPTER_ONE_COMPETITOR_LEVELS. Keeping the
// pre-overlay values stable preserves difficulty-override hashes for Lv11–100.
const GENERATED_PILOT_VISIBLE_BLOCK_TARGETS = [2, 6, 5, 8, 10, 8, 9, 11, 11, 7] as const;
const GENERATED_PILOT_PAR_MOVES = [2, 11, 13, 11, 13, 11, 12, 14, 14, 12] as const;

const key = (x: number, y: number): string => `${x},${y}`;

// A few late silhouettes need one deliberate parking alcove so a gate guard
// can step aside without becoming trapped in the mouth it just opened.
const STRATEGY_PLAYABLE_ADDITIONS: Partial<Record<number, Point[]>> = {
  62: [[6, 2], [7, 2], [8, 2], [9, 2]],
  68: [[5, 7]],
  79: [[6, 2], [7, 2], [8, 2], [9, 2]],
};

const addStrategyParkingCells = (input: LevelSpec): LevelSpec => {
  const additions = STRATEGY_PLAYABLE_ADDITIONS[input.id];
  if (!additions?.length) return input;
  const playable = new Map((input.playable ?? []).map(([x, y]) => [key(x, y), [x, y] as Point]));
  for (const [x, y] of additions) playable.set(key(x, y), [x, y]);
  return { ...input, playable: [...playable.values()] };
};

const COMPACT_SHAPES: readonly Point[][] = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
];

// The first coordinate axis runs toward the exit, so all pieces still fit a
// two-cell gate while introducing bars, hooks, T pieces and zigzags.
const VERTICAL_EXIT_SHAPES: readonly Point[][] = [
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
];

// Gate-mouth guards replace the last generic filler on five broad layouts.
// They are ordinary movable/clearable cargo of another color, so the player
// must park them before using the previously unobstructed bypass.
const STRATEGY_GATE_GUARDS: Partial<Record<number, Array<{
  id: string;
  x: number;
  y: number;
  shape: Point[];
  color: BlockColor;
}>>> = {
  42: [{ id: "strategy-guard-a", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "purple" }],
  62: [{ id: "strategy-guard-a", x: 8, y: 1, shape: [[0, 0], [1, 0]], color: "cyan" }],
  74: [{ id: "strategy-guard-a", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "red" }],
  79: [{ id: "strategy-guard-a", x: 8, y: 1, shape: [[0, 0], [1, 0]], color: "purple" }],
  89: [
    { id: "strategy-guard-a", x: 0, y: 8, shape: [[0, 0], [1, 0]], color: "purple" },
    { id: "strategy-guard-b", x: 9, y: 7, shape: [[0, 0], [0, 1]], color: "red" },
  ],
};

const transpose = (shape: readonly Point[]): Point[] => shape.map(([x, y]) => [y, x]);

const shapeForGate = (side: Side, index: number): Point[] => {
  const vertical = VERTICAL_EXIT_SHAPES[index % VERTICAL_EXIT_SHAPES.length];
  return (side === "top" || side === "bottom" ? vertical : transpose(vertical)).map(([x, y]) => [x, y]);
};

const isTwoByTwoSquare = (shape: readonly Point[]): boolean => {
  const cells = new Set(shape.map(([x, y]) => key(x, y)));
  return cells.size === 4 && [key(0, 0), key(1, 0), key(0, 1), key(1, 1)].every((cell) => cells.has(cell));
};

const closedShutterCells = (level: LevelSpec): Set<string> => {
  const cells = new Set<string>();
  for (const shutter of level.shutters ?? []) {
    if (!shutterHasPhysicalFootprint(shutter)) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.add(key(x, y));
    }
  }
  return cells;
};

const addStrategyGateGuards = (input: LevelSpec): LevelSpec => {
  const guards = STRATEGY_GATE_GUARDS[input.id];
  if (!guards?.length) return input;
  const playable = new Set((input.playable ?? []).map(([x, y]) => key(x, y)));
  const occupied = new Set(input.blocks.flatMap((block) => block.shape.map(([dx, dy]) => key(block.x + dx, block.y + dy))));
  const blocks = [...input.blocks];
  for (const guard of guards) {
    const cell = key(guard.x, guard.y);
    if (!playable.has(cell) || occupied.has(cell)) continue;
    const cells = guard.shape.map(([dx, dy]) => key(guard.x + dx, guard.y + dy));
    if (!cells.every((candidate) => playable.has(candidate) && !occupied.has(candidate))) continue;
    blocks.push({ ...guard, shape: guard.shape.map(([x, y]) => [x, y]) });
    for (const candidate of cells) occupied.add(candidate);
  }
  return { ...input, blocks };
};

const placementTouchesGate = (
  level: LevelSpec,
  shape: readonly Point[],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => shape.some(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  if (gate.side === "top") return cellY === 0 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "bottom") return cellY === level.height - 1 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "left") return cellX === 0 && cellY >= gate.offset && cellY < gate.offset + gate.size;
  return cellX === level.width - 1 && cellY >= gate.offset && cellY < gate.offset + gate.size;
});

const placementFitsGate = (
  level: LevelSpec,
  shape: readonly Point[],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => {
  const cells = shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  return gateCoversExitFrontier(level, cells, gate);
};

const canReachGateIgnoringBlocks = (
  level: LevelSpec,
  shape: readonly Point[],
  gate: LevelSpec["gates"][number],
  startX: number,
  startY: number,
): boolean => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  const canPlace = (x: number, y: number): boolean => shape.every(([dx, dy]) => playable.has(key(x + dx, y + dy)));
  if (!canPlace(startX, startY)) return false;
  const queue: Point[] = [[startX, startY]];
  const visited = new Set([key(startX, startY)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (placementFitsGate(level, shape, gate, x, y)) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextX = x + dx;
      const nextY = y + dy;
      const cell = key(nextX, nextY);
      if (visited.has(cell) || !canPlace(nextX, nextY)) continue;
      visited.add(cell);
      queue.push([nextX, nextY]);
    }
  }
  return false;
};

const reservedOpeningCorridor = (level: LevelSpec): Set<string> => {
  const closedIds = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const active = level.blocks.filter((block) => !block.shutterId || !closedIds.has(block.shutterId));
  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  const shutterCells = closedShutterCells(level);
  let best: { distance: number; cells: Set<string> } | undefined;

  for (const block of active) {
    if ((block.frozen ?? 0) > 0) continue;
    const color = block.layers?.[0] ?? block.color;
    const gates = level.gates.filter((gate) => (
      gate.color === color && (gate.frozen ?? 0) === 0 && (!block.star || gate.star)
    ));
    if (!gates.length) continue;
    const obstacles = new Set(shutterCells);
    for (const other of active) {
      if (other.id === block.id) continue;
      for (const [dx, dy] of other.shape) obstacles.add(key(other.x + dx, other.y + dy));
    }
    const canPlace = (x: number, y: number): boolean => block.shape.every(([dx, dy]) => {
      const cell = key(x + dx, y + dy);
      return playable.has(cell) && !obstacles.has(cell);
    });
    if (!canPlace(block.x, block.y)) continue;
    const start = key(block.x, block.y);
    const queue: Point[] = [[block.x, block.y]];
    const parent = new Map<string, string | undefined>([[start, undefined]]);
    let destination: string | undefined;
    for (let cursor = 0; cursor < queue.length && !destination; cursor += 1) {
      const [x, y] = queue[cursor];
      if (gates.some((gate) => placementFitsGate(level, block.shape, gate, x, y))) {
        destination = key(x, y);
        break;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nextX = x + dx;
        const nextY = y + dy;
        const next = key(nextX, nextY);
        if (parent.has(next) || !canPlace(nextX, nextY)) continue;
        parent.set(next, key(x, y));
        queue.push([nextX, nextY]);
      }
    }
    if (!destination) continue;
    const cells = new Set<string>();
    let cursor: string | undefined = destination;
    let distance = -1;
    while (cursor) {
      const [x, y] = cursor.split(",").map(Number);
      for (const [dx, dy] of block.shape) cells.add(key(x + dx, y + dy));
      cursor = parent.get(cursor);
      distance += 1;
    }
    if (!best || distance < best.distance) best = { distance, cells };
  }
  return best?.cells ?? new Set();
};

const addVisibleBlocks = (input: LevelSpec): LevelSpec => {
  const authoredTarget = input.id <= 10
    ? GENERATED_PILOT_VISIBLE_BLOCK_TARGETS[input.id - 1]
    : COMPETITOR_VISIBLE_BLOCK_TARGETS[input.id - 1];
  const target = Math.max(5, authoredTarget ?? input.blocks.length);
  const level: LevelSpec = { ...input, blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape] })) };
  const closedIds = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const visible = (): LevelSpec["blocks"] => level.blocks.filter((block) => !block.shutterId || !closedIds.has(block.shutterId));
  if (visible().length >= target) return level;

  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  const shutterCells = closedShutterCells(level);
  const occupied = new Set(visible().flatMap((block) => block.shape.map(([dx, dy]) => key(block.x + dx, block.y + dy))));
  // The previous campaign deliberately kept one complete opening lane clear.
  // That made many busy-looking boards solvable by repeatedly dragging the
  // obvious block straight out. The Lv3 benchmark is built around shared
  // space instead: added cargo may occupy every route, so the player must
  // create a lane before the first clear.
  const reservedCells = new Set<string>();
  const openGates = level.gates.filter((gate) => (gate.frozen ?? 0) === 0);
  const candidateGates = openGates.length ? openGates : level.gates;
  let added = 0;

  while (visible().length < target && candidateGates.length) {
    let placed: { x: number; y: number; shape: Point[]; gate: LevelSpec["gates"][number] } | undefined;
    for (let gateOffset = 0; gateOffset < candidateGates.length && !placed; gateOffset += 1) {
      const gate = candidateGates[(level.id + added + gateOffset) % candidateGates.length];
      const shapeCandidateCount = VERTICAL_EXIT_SHAPES.length;
      for (let shapeOffset = 0; shapeOffset < shapeCandidateCount && !placed; shapeOffset += 1) {
        const shape = shapeForGate(gate.side, level.id + added + shapeOffset);
        const destinations: Array<{ x: number; y: number; score: number }> = [];
        for (let y = 0; y < level.height; y += 1) {
          for (let x = 0; x < level.width; x += 1) {
            const ownCells = new Set(shape.map(([dx, dy]) => key(x + dx, y + dy)));
            if (![...ownCells].every((cell) => playable.has(cell) && !shutterCells.has(cell) && !occupied.has(cell) && !reservedCells.has(cell))) continue;
            if (placementTouchesGate(level, shape, gate, x, y)) continue;
            if (!canReachGateIgnoringBlocks(level, shape, gate, x, y)) continue;
            const canMove = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([moveX, moveY]) => (
              shape.every(([dx, dy]) => {
                const destination = key(x + moveX + dx, y + moveY + dy);
                return playable.has(destination)
                  && !shutterCells.has(destination)
                  && (!occupied.has(destination) || ownCells.has(destination));
              })
            ));
            if (!canMove) continue;
            let contacts = 0;
            for (const cell of ownCells) {
              const [cellX, cellY] = cell.split(",").map(Number);
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                if (occupied.has(key(cellX + dx, cellY + dy))) contacts += 1;
              }
            }
            const width = Math.max(...shape.map(([dx]) => dx)) + 1;
            const height = Math.max(...shape.map(([, dy]) => dy)) + 1;
            const centerDistance = Math.abs(x + width / 2 - level.width / 2) + Math.abs(y + height / 2 - level.height / 2);
            const gateDistance = gate.side === "top" ? y
              : gate.side === "bottom" ? level.height - y - height
                : gate.side === "left" ? x
                  : level.width - x - width;
            const noise = (x * 17 + y * 29 + level.id * 11 + added * 7) % 13;
            destinations.push({ x, y, score: contacts * 24 + gateDistance * 5 - centerDistance * 2 + noise });
          }
        }
        destinations.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
        if (destinations[0]) placed = { ...destinations[0], shape, gate };
      }
    }
    if (!placed) break;
    const color: BlockColor = placed.gate.color;
    const block = {
      id: `composition-${level.id}-${added + 1}`,
      x: placed.x,
      y: placed.y,
      shape: placed.shape,
      color,
    };
    level.blocks.push(block);
    for (const [dx, dy] of block.shape) occupied.add(key(block.x + dx, block.y + dy));
    added += 1;
  }

  if (added > 0) level.parMoves = (level.parMoves ?? input.blocks.length) + added;
  return level;
};

const diversifySquares = (input: LevelSpec): LevelSpec => ({
  ...input,
  blocks: input.blocks.map((block, index) => {
    // Lv10's ice tutorial uses the original 2×2 footprint as part of its thaw
    // dependency. Shrinking that blocker into an L creates a blue/green lock.
    if (input.id === 10 || !isTwoByTwoSquare(block.shape)) return { ...block, shape: [...block.shape] };
    const variant = COMPACT_SHAPES[(input.id + index * 5) % COMPACT_SHAPES.length];
    return { ...block, shape: variant.map(([x, y]) => [x, y] as Point) };
  }),
});

export const applyCompetitiveComposition = (input: LevelSpec): LevelSpec => {
  // Lv1 is a deliberate tutorial exception: two large, directly readable
  // pieces let the authored hand teach one continuous drag, then leave the
  // second color and opposite exit for the player to perform unaided.
  if (input.id === 1) {
    return {
      ...input,
      parMoves: GENERATED_PILOT_PAR_MOVES[0],
      blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape] })),
    };
  }
  const level = addVisibleBlocks(addStrategyGateGuards(diversifySquares(addStrategyParkingCells(input))));
  const parMoves = level.id <= 10
    ? GENERATED_PILOT_PAR_MOVES[level.id - 1]
    : VALIDATED_ROUTE_PAR_MOVES[level.id - 1];
  return { ...level, parMoves: parMoves ?? level.parMoves };
};
