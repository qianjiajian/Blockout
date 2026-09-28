import type { BlockSpec, LevelSpec } from "./types";

/**
 * v1.60/v1.61/v1.62 repairs the axis-on-irregular blocks found by the audits.
 * The edits deliberately stay at block level: board geometry, exits, shutters,
 * counters, colours and mechanism semantics are untouched. Where an existing
 * rectangle follows the same route, its axis property is moved there; otherwise
 * the incompatible axis flag is removed rather than changing unrelated geometry.
 * Lv118 keeps its original L-shaped footprint and drops the incompatible axis;
 * Lv194 keeps its opening shape and drops the incompatible axis.
 */
const transferAxis = (level: LevelSpec, fromId: string, toId: string, targetAxis?: BlockSpec["movementAxis"]): LevelSpec => {
  let foundSource = false;
  let foundTarget = false;
  const blocks = level.blocks.map((block) => {
    if (block.id === fromId) {
      foundSource = true;
      const { movementAxis: _movementAxis, ...withoutAxis } = block;
      return withoutAxis;
    }
    if (block.id === toId) {
      foundTarget = true;
      return { ...block, movementAxis: targetAxis ?? level.blocks.find((candidate) => candidate.id === fromId)?.movementAxis };
    }
    return block;
  });
  if (!foundSource || !foundTarget) throw new Error(`Axis repair references missing blocks ${fromId} -> ${toId} in Lv${level.id}`);
  return { ...level, blocks };
};

const removeAxis = (level: LevelSpec, blockId: string): LevelSpec => {
  let found = false;
  const blocks = level.blocks.map((block) => {
    if (block.id !== blockId) return block;
    found = true;
    const { movementAxis: _movementAxis, ...withoutAxis } = block;
    return withoutAxis;
  });
  if (!found) throw new Error(`Axis repair references missing block ${blockId} in Lv${level.id}`);
  return { ...level, blocks };
};

const patchBlocks = (level: LevelSpec, patches: Record<string, Partial<BlockSpec>>): LevelSpec => {
  const ids = new Set(level.blocks.map((block) => block.id));
  for (const id of Object.keys(patches)) {
    if (!ids.has(id)) throw new Error(`Axis repair references missing block ${id} in Lv${level.id}`);
  }
  return { ...level, blocks: level.blocks.map((block) => patches[block.id] ? { ...block, ...patches[block.id] } : block) };
};

export const AXIS_RECTANGULAR_REPAIR_LEVEL_IDS = [54, 56, 63, 89, 101, 118, 135, 172, 194] as const;

export const applyAxisRectangularRepairs = (level: LevelSpec): LevelSpec => {
  switch (level.id) {
    // Move an axis only when the target rectangle remains compatible with the
    // existing fresh route; otherwise remove the unsafe flag locally.
    case 54: return removeAxis(level, "s54-13-blue-axis");
    case 56: return transferAxis(level, "s56-o2", "s56-o1");
    case 63: return patchBlocks(transferAxis(
      removeAxis(level, "v146-63-opening-18"),
      "v146-63-opening-17",
      "v146-63-opening-9",
    ), {
      "v146-63-opening-4": { x: 0, y: 0, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-13": { x: 2, y: 0, shape: [[0, 0], [1, 0], [2, 0]] },
      "v146-63-opening-2": { x: 5, y: 0, shape: [[0, 0]] },
      // Both pink/yellow three-cell pieces now use the q0-native L3 footprint;
      // the former horizontal pink H3 could never pass the two-cell top gate.
      "v146-63-opening-14": { x: 2, y: 3, shape: [[0, 0], [0, 1], [1, 1]] },
      "v146-63-opening-15": { x: 0, y: 5, shape: [[0, 0], [0, 1], [1, 1]] },
      "v146-63-opening-10": { x: 2, y: 5, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "v146-63-opening-17": { x: 0, y: 2, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "v146-63-opening-5": { x: 0, y: 1, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-6": { x: 4, y: 1, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-18": { x: 4, y: 4, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "v146-63-opening-9": { x: 2, y: 1, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "v146-63-opening-7": { x: 4, y: 2, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-8": { x: 0, y: 4, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-3": { x: 4, y: 6, shape: [[0, 0], [1, 0]] },
      "v146-63-opening-1": { x: 1, y: 5, shape: [[0, 0]] },
      "v146-63-opening-16": { x: 3, y: 3, shape: [[0, 0], [1, 0], [2, 0]] },
      "v146-63-opening-11": { x: 3, y: 7, shape: [[0, 0], [1, 0], [2, 0]] },
      "v146-63-opening-12": { x: 0, y: 7, shape: [[0, 0], [1, 0], [2, 0]] },
    });
    case 89: return removeAxis(level, "a89-s12-01");
    case 101: return patchBlocks(transferAxis(level, "r147-101-cover4-9", "r147-101-opening-5", "horizontal"), {
      // Retile the hidden 7×4 shutter with the original q0-native material.
      // The v1.61 T-like replacements were not formal assets and could render
      // as missing blocks. cover4-9 keeps its native shape and loses only the
      // incompatible axis; opening-5 remains the horizontal-axis rectangle.
      "r147-101-cover4-6": { x: 0, y: 6, shape: [[0, 0], [0, 1], [0, 2]] },
      "r147-101-cover4-2": { x: 1, y: 6, shape: [[0, 0], [1, 0]] },
      "r147-101-cover4-7": { x: 3, y: 6, shape: [[0, 0], [1, 0], [2, 0], [0, 1]] },
      "r147-101-cover4-4": { x: 6, y: 6, shape: [[0, 0], [0, 1], [0, 2]] },
      "r147-101-cover4-5": { x: 1, y: 7, shape: [[0, 0], [0, 1]] },
      "r147-101-cover4-8": { x: 2, y: 7, shape: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      "r147-101-cover4-0": { x: 4, y: 7, shape: [[0, 0], [1, 0]] },
      "r147-101-cover4-9": { x: 4, y: 8, shape: [[1, 0], [0, 1], [1, 1], [2, 1]] },
      "r147-101-cover4-3": { x: 0, y: 9, shape: [[0, 0], [1, 0]] },
      "r147-101-cover4-1": { x: 2, y: 9, shape: [[0, 0], [1, 0]] },
    });
    // Keep the original L footprint and remove the incompatible axis locally.
    // This avoids changing coverage or colliding with the neighbouring top-row
    // blocks while satisfying the rectangular-axis rule.
    case 118: {
      // The certified v1.69 remake replaces the legacy body IDs and already
      // gives its source axis body a complete 2x2 footprint. Keep that new
      // mechanism; the legacy removal still applies to the preceding map.
      const remadeAxis = level.blocks.find((block) => block.id === "r147-118-b21");
      if (remadeAxis) {
        const cells = new Set(remadeAxis.shape.map(([x, y]) => `${x},${y}`));
        if (remadeAxis.movementAxis !== "vertical" || cells.size !== 4
          || !["0,0", "1,0", "0,1", "1,1"].every((cell) => cells.has(cell))) {
          throw new Error("Remade Lv118 must retain its reviewed rectangular vertical axis");
        }
        return level;
      }
      return removeAxis(level, "v111-118-b6");
    }
    case 135: return removeAxis(level, "v190-135-b01");
    case 172: return removeAxis(level, "cover172-b8");
    // All blue rectangles in Lv194 sit outside the blue top gate span.  Removing
    // the incompatible axis is the only local repair that preserves every
    // opening/hidden cell and gate without moving unrelated blocks.
    case 194: return removeAxis(level, "open0");
    default: return level;
  }
};
