import type { BlockColor, BlockSpec, GateSpec, LevelSpec, Point } from "./types";

interface MechanismPatch {
  frozen?: number;
  layers?: BlockColor[];
}

interface GatePatch extends MechanismPatch {
  offset?: number;
  size?: number;
}

interface BlockPatch extends MechanismPatch {
  x?: number;
  y?: number;
}

interface DifficultyBandOverride {
  /** FNV-1a fingerprint of the fully composed level before this final pass. */
  baselineHash: string;
  targetScore: number;
  removedCells?: Point[];
  gates?: Record<string, GatePatch>;
  blocks?: Record<string, BlockPatch>;
  addedBlocks?: BlockSpec[];
  parMoves?: number;
}

/**
 * Final, solver-verified difficulty pass for levels that fell below the new
 * 45-point entry floor. Geometry edits are deliberately small; most pressure
 * comes from already introduced countdown mechanics. Lv21 adds one legal
 * inner color because route-safe counters alone could not reach the floor.
 */
export const DIFFICULTY_BAND_OVERRIDES: Partial<Record<number, DifficultyBandOverride>> = {
  11: {
    baselineHash: "c8249310",
    targetScore: 45.25,
    blocks: {
      "red-target": { frozen: 3 },
      "blue-load": { frozen: 2 },
      "composition-11-2": { frozen: 1 },
      "composition-11-3": { frozen: 4 },
    },
  },
  13: {
    baselineHash: "49bee17f",
    targetScore: 45.25,
    gates: {
      "blue-bottom": { frozen: 4 },
      "yellow-left": { frozen: 3 },
    },
  },
  15: {
    baselineHash: "581693d6",
    targetScore: 45.25,
    blocks: {
      "layer-a": { frozen: 2 },
      "composition-15-1": { frozen: 3 },
      "composition-15-2": { frozen: 1 },
    },
  },
  16: {
    baselineHash: "4d550168",
    targetScore: 45.25,
    removedCells: [[0, 0]],
    gates: {
      "blue-bottom": { frozen: 4 },
      "orange-right": { frozen: 3 },
    },
  },
  17: {
    baselineHash: "63b5acbd",
    targetScore: 45.25,
    gates: {
      "blue-bottom": { frozen: 5 },
      "yellow-left": { frozen: 3 },
    },
  },
  21: {
    baselineHash: "c39e2a49",
    targetScore: 45.25,
    parMoves: 10,
    gates: {
      "blue-bottom": { frozen: 4 },
      "green-right": { frozen: 1 },
      "yellow-left": { frozen: 3 },
    },
    blocks: {
      "red-target": { layers: ["blue", "purple"] },
      "blue-load": { frozen: 4, layers: ["green", "blue"] },
      "yellow-load": { frozen: 1 },
      "composition-21-1": { frozen: 1 },
    },
  },
  22: {
    baselineHash: "651eefbc",
    targetScore: 45.25,
    removedCells: [[2, 0], [6, 0], [0, 2], [0, 3], [8, 3]],
    gates: {
      "yellow-left": { frozen: 1 },
      "red-top": { frozen: 5 },
      "blue-bottom": { frozen: 4 },
    },
  },
  24: {
    baselineHash: "7b0fbb0a",
    targetScore: 45.25,
    gates: {
      "cyan-left": { frozen: 4 },
      "green-right": { frozen: 2 },
      "blue-bottom": { frozen: 7 },
      "yellow-bottom": { frozen: 8 },
    },
  },
  25: {
    baselineHash: "713e0e69",
    targetScore: 45.25,
    gates: {
      "red-top": { frozen: 2 },
      "blue-bottom": { frozen: 4 },
    },
    blocks: {
      "composition-25-2": { frozen: 1 },
    },
  },
  26: {
    baselineHash: "18f82b6c",
    targetScore: 45,
    removedCells: [[3, 0], [1, 1], [2, 1], [3, 1], [1, 2], [0, 6], [9, 6], [5, 9], [6, 9]],
  },
  28: {
    baselineHash: "4bb10cab",
    targetScore: 45.25,
    gates: {
      "cyan-left": { frozen: 4 },
      "blue-bottom": { frozen: 7 },
    },
  },
  30: {
    baselineHash: "1b8b3111",
    targetScore: 45.25,
    gates: {
      "green-right": { frozen: 2 },
      "blue-bottom": { frozen: 9 },
      "yellow-bottom": { frozen: 8 },
    },
  },
  34: {
    baselineHash: "0a8e39c1",
    targetScore: 45.25,
    gates: {
      "blue-bottom": { frozen: 8 },
      "yellow-bottom": { frozen: 9 },
    },
  },
  65: {
    baselineHash: "9164ea5d",
    targetScore: 45.25,
    gates: {
      "blue-bottom": { frozen: 6 },
      "yellow-left": { frozen: 8 },
    },
  },
  70: {
    baselineHash: "c8188cf7",
    targetScore: 45.25,
    gates: {
      "blue-bottom": { frozen: 4 },
      "yellow-bottom": { frozen: 5 },
    },
  },
};

/**
 * Approved chapter-one ramp. The fixed blockout-d1 calibration is not changed:
 * each value is produced by a solver-verified board/mechanism configuration.
 */
export const CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS = {
  6: 70,
  7: 72,
  8: 74,
  9: 75.5,
  10: 77,
} as const;

export const CHAPTER_ONE_DIFFICULTY_RAMP_OVERRIDES: Partial<Record<number, DifficultyBandOverride>> = {
  6: {
    baselineHash: "b2c877ec",
    targetScore: CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[6],
    parMoves: 12,
    gates: {
      "blue-right": { frozen: 4 },
    },
    blocks: {
      "red-a": { frozen: 7 },
      "green-a": { frozen: 7 },
      "composition-6-1": { layers: ["green", "blue"] },
      "composition-6-2": { frozen: 3 },
    },
  },
  7: {
    baselineHash: "993372e8",
    targetScore: CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[7],
    parMoves: 15,
    removedCells: [[6, 0]],
    gates: {
      "target-top": { frozen: 1 },
    },
    blocks: {
      "red-target": { frozen: 2, layers: ["blue", "green"] },
      "composition-7-2": { frozen: 4 },
      "composition-7-4": { frozen: 1 },
      "composition-7-6": { frozen: 1, layers: ["blue", "green"] },
      "composition-7-7": { frozen: 9, layers: ["green", "blue"] },
    },
  },
  8: {
    baselineHash: "3697f425",
    targetScore: CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[8],
    parMoves: 26,
    gates: {
      "yellow-left": { frozen: 7 },
    },
    blocks: {
      "red-target": { layers: ["blue", "green"] },
      "blue-load": { layers: ["green", "blue"] },
      "green-target": { frozen: 9 },
      "composition-8-3": { layers: ["yellow", "blue"] },
      "composition-8-4": { layers: ["purple", "green"] },
    },
    addedBlocks: [{
      id: "ramp-load-8-1",
      x: 4,
      y: 5,
      shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
      color: "blue",
    }],
  },
  9: {
    baselineHash: "45f0e780",
    targetScore: CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[9],
    parMoves: 24,
    gates: {
      "red-top": { frozen: 1 },
      "green-right": { frozen: 9 },
    },
    blocks: {
      "red-target": { layers: ["blue", "green"] },
      "composition-9-1": { layers: ["green", "blue"] },
      "green-target": { layers: ["yellow", "blue"] },
      "yellow-load": { layers: ["purple", "green"] },
      "composition-9-5": { frozen: 2 },
      "composition-9-6": { layers: ["yellow", "green"] },
    },
    addedBlocks: [{
      id: "ramp-load-9-1",
      x: 1,
      y: 1,
      shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
      color: "blue",
      frozen: 2,
    }],
  },
  10: {
    baselineHash: "1dfb9aba",
    targetScore: CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[10],
    parMoves: 19,
    removedCells: [[3, 0], [4, 0], [6, 0], [2, 5], [5, 5], [6, 5], [0, 6], [1, 6], [2, 6], [6, 6]],
    gates: {
      "red-top": { size: 2, frozen: 1 },
      "blue-right": { size: 2, frozen: 1 },
      "green-bottom": { size: 2, frozen: 2 },
    },
    blocks: {
      "yellow-a": { frozen: 4 },
      "red-ice": { x: 3, y: 3, layers: ["blue", "purple"] },
      "blue-ice": { y: 5, frozen: 5, layers: ["green", "blue"] },
      "green-ice": { x: 5, y: 1, layers: ["yellow", "green"] },
      "composition-10-1": { y: 4 },
      "composition-10-2": { x: 0 },
      "composition-10-3": { x: 2, y: 1 },
    },
    addedBlocks: [{
      id: "peak-purple-load",
      x: 2,
      y: 2,
      shape: [[0, 0], [1, 0]],
      color: "purple",
    }],
  },
};

const pointKey = ([x, y]: Point): string => `${x},${y}`;

export const difficultyBaselineHash = (level: LevelSpec): string => {
  const payload = JSON.stringify({
    id: level.id,
    width: level.width,
    height: level.height,
    playable: level.playable,
    blocked: level.blocked,
    gates: level.gates,
    blocks: level.blocks,
    shutters: level.shutters,
    elevators: level.elevators,
    conveyors: level.conveyors,
    onboardingHint: level.onboardingHint,
    strategyNudge: level.strategyNudge,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const assertPatchIds = (
  levelId: number,
  kind: "gate" | "block",
  entries: ReadonlyArray<{ id: string }>,
  patches: Record<string, MechanismPatch> | undefined,
): void => {
  if (!patches) return;
  const available = new Set(entries.map(({ id }) => id));
  for (const id of Object.keys(patches)) {
    if (!available.has(id)) throw new Error(`Lv${levelId} difficulty override references missing ${kind} ${id}`);
  }
};

const patchGates = (levelId: number, entries: GateSpec[], patches: Record<string, GatePatch> | undefined): GateSpec[] => {
  assertPatchIds(levelId, "gate", entries, patches);
  if (!patches) return entries;
  return entries.map((entry) => {
    const patch = patches[entry.id];
    if (!patch) return entry;
    const offset = patch.offset ?? entry.offset;
    const size = patch.size ?? entry.size;
    const portals = entry.portals?.map((portal, index) => {
      if (index !== 0) return { ...portal, origin: [...portal.origin] as Point };
      const tangentDelta = offset - entry.offset;
      const origin: Point = portal.side === "top" || portal.side === "bottom"
        ? [portal.origin[0] + tangentDelta, portal.origin[1]]
        : [portal.origin[0], portal.origin[1] + tangentDelta];
      return { ...portal, origin, size };
    });
    return {
      ...entry,
      ...(patch.frozen === undefined ? {} : { frozen: patch.frozen }),
      ...(patch.offset === undefined ? {} : { offset }),
      ...(patch.size === undefined ? {} : { size }),
      ...(portals === undefined ? {} : { portals }),
    };
  });
};

const patchBlocks = (levelId: number, entries: BlockSpec[], patches: Record<string, BlockPatch> | undefined): BlockSpec[] => {
  assertPatchIds(levelId, "block", entries, patches);
  if (!patches) return entries;
  return entries.map((entry) => {
    const patch = patches[entry.id];
    if (!patch) return entry;
    return {
      ...entry,
      ...(patch.frozen === undefined ? {} : { frozen: patch.frozen }),
      ...(patch.layers === undefined ? {} : { layers: [...patch.layers] }),
      ...(patch.x === undefined ? {} : { x: patch.x }),
      ...(patch.y === undefined ? {} : { y: patch.y }),
    };
  });
};

const applyOverride = (level: LevelSpec, override: DifficultyBandOverride | undefined): LevelSpec => {
  if (!override) return level;
  const actualHash = difficultyBaselineHash(level);
  if (actualHash !== override.baselineHash) {
    throw new Error(
      `Lv${level.id} difficulty override baseline mismatch: expected ${override.baselineHash}, received ${actualHash}`,
    );
  }

  const removed = new Set((override.removedCells ?? []).map(pointKey));
  const playable = (level.playable ?? []).filter((point) => !removed.has(pointKey(point)));
  if (playable.length !== (level.playable?.length ?? 0) - removed.size) {
    throw new Error(`Lv${level.id} difficulty override references a missing playable cell`);
  }

  const existingIds = new Set(level.blocks.map(({ id }) => id));
  for (const block of override.addedBlocks ?? []) {
    if (existingIds.has(block.id)) throw new Error(`Lv${level.id} difficulty override duplicates block ${block.id}`);
    existingIds.add(block.id);
  }

  return {
    ...level,
    ...(override.parMoves === undefined ? {} : { parMoves: override.parMoves }),
    playable,
    gates: patchGates(level.id, level.gates, override.gates),
    blocks: [
      ...patchBlocks(level.id, level.blocks, override.blocks),
      ...(override.addedBlocks ?? []).map((block) => ({
        ...block,
        shape: [...block.shape],
        layers: block.layers ? [...block.layers] : undefined,
      })),
    ],
  };
};

export const applyDifficultyBandOverride = (level: LevelSpec): LevelSpec => {
  const floorAdjusted = applyOverride(level, DIFFICULTY_BAND_OVERRIDES[level.id]);
  return applyOverride(floorAdjusted, CHAPTER_ONE_DIFFICULTY_RAMP_OVERRIDES[level.id]);
};
