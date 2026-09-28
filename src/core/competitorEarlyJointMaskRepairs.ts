import type { GateSpec, LevelSpec, Point } from "./types";

export const COMPETITOR_EARLY_JOINT_MASK_REPAIR_VERSION = "competitor-early-joint-mask-r1" as const;

export const COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS = [16, 27] as const;

type Position = readonly [number, number];
type GateGeometry = Readonly<Pick<GateSpec, "side" | "offset" | "size">>;

interface JointMaskContract {
  sourceMask: readonly string[];
  targetMask: readonly string[];
  blockCount: number;
  gateCount: number;
  sourceBlockPositions: Readonly<Record<string, Position>>;
  blockPositions: Readonly<Record<string, Position>>;
  sourceGateGeometry: Readonly<Record<string, GateGeometry>>;
  gateGeometry: Readonly<Record<string, GateGeometry>>;
}

const CONTRACTS: Readonly<Record<number, JointMaskContract>> = {
  16: {
    sourceMask: [
      "##....",
      "##....",
      "##....",
      "###...",
      "######",
      "######",
      "######",
    ],
    targetMask: [
      ".....#",
      "....##",
      "...###",
      "..####",
      ".#####",
      "######",
      "######",
    ],
    blockCount: 20,
    gateCount: 5,
    sourceBlockPositions: {
      "cc-016-b1-03": [0, 3],
      "cc-016-b1-04": [0, 0],
      "cc-016-b1-09": [0, 1],
      "cc-016-b1-11": [1, 3],
      "cc-016-b1-12": [0, 4],
      "cc-016-b1-14": [1, 0],
      "cc-016-b1-18": [0, 2],
    },
    blockPositions: {
      "cc-016-b1-03": [3, 3],
      "cc-016-b1-04": [3, 2],
      "cc-016-b1-09": [4, 3],
      "cc-016-b1-11": [4, 1],
      "cc-016-b1-12": [5, 3],
      "cc-016-b1-14": [5, 0],
      "cc-016-b1-18": [4, 2],
    },
    sourceGateGeometry: {
      "vp-016-gate-01": { side: "left", offset: 0, size: 3 },
      "vp-016-gate-02": { side: "left", offset: 3, size: 3 },
    },
    gateGeometry: {
      "vp-016-gate-01": { side: "top", offset: 5, size: 1 },
      "vp-016-gate-02": { side: "right", offset: 0, size: 3 },
    },
  },
  27: {
    // competitorBoardOutlineRepair removes the single 5,3 notch first. This
    // repair deliberately supersedes that provisional outline with the exact
    // competitor mask while retaining the certified 3x9 shutter contract.
    sourceMask: [
      "######",
      "######",
      "######",
      "#####.",
      "######",
      "######",
      "######",
      "######",
      "######",
    ],
    targetMask: [
      "###...",
      "###...",
      "###...",
      "######",
      "######",
      "######",
      "###...",
      "###...",
      "###...",
    ],
    blockCount: 18,
    gateCount: 5,
    sourceBlockPositions: {
      "cc-027-b1-01": [3, 0],
      "cc-027-b1-02": [5, 2],
      "cc-027-b1-03": [3, 6],
      "cc-027-b1-04": [5, 0],
      "cc-027-b1-05": [3, 8],
      "cc-027-b1-06": [3, 2],
      "cc-027-b1-07": [4, 1],
      "cc-027-b1-08": [4, 7],
    },
    blockPositions: {
      "cc-027-b1-01": [5, 3],
      "cc-027-b1-02": [3, 4],
      "cc-027-b1-03": [3, 3],
      "cc-027-b1-04": [5, 4],
      "cc-027-b1-05": [4, 4],
      "cc-027-b1-06": [4, 5],
      "cc-027-b1-07": [3, 5],
      "cc-027-b1-08": [5, 5],
    },
    sourceGateGeometry: {
      "sr-gate-27-green": { side: "top", offset: 3, size: 3 },
      "sr-gate-27-blue": { side: "right", offset: 2, size: 1 },
      "sr-gate-27-cyan": { side: "bottom", offset: 3, size: 3 },
      "sr-gate-27-pink": { side: "right", offset: 0, size: 1 },
      "sr-gate-27-purple": { side: "right", offset: 1, size: 1 },
    },
    gateGeometry: {
      "sr-gate-27-green": { side: "right", offset: 3, size: 1 },
      "sr-gate-27-blue": { side: "right", offset: 4, size: 1 },
      "sr-gate-27-cyan": { side: "right", offset: 5, size: 1 },
      "sr-gate-27-pink": { side: "left", offset: 0, size: 1 },
      "sr-gate-27-purple": { side: "left", offset: 1, size: 1 },
    },
  },
};

const pointsFromMask = (mask: readonly string[]): Point[] => mask.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const maskRows = (level: Pick<LevelSpec, "width" | "height" | "playable">): string[] => {
  const playable = new Set((level.playable ?? pointsFromMask(
    Array.from({ length: level.height }, () => "#".repeat(level.width)),
  )).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};

const positionMatches = (x: number, y: number, expected: Position): boolean => (
  x === expected[0] && y === expected[1]
);

const gateMatches = (gate: GateSpec, expected: GateGeometry): boolean => (
  gate.side === expected.side && gate.offset === expected.offset && gate.size === expected.size
);

const assertSourceOrTarget = (source: LevelSpec, contract: JointMaskContract): void => {
  if (source.blocks.length !== contract.blockCount) {
    throw new Error(`Lv${source.id} early joint mask repair block-count drift`);
  }
  if (source.gates.length !== contract.gateCount) {
    throw new Error(`Lv${source.id} early joint mask repair gate-count drift`);
  }
  const currentMask = maskRows(source);
  if (JSON.stringify(currentMask) !== JSON.stringify(contract.sourceMask)
    && JSON.stringify(currentMask) !== JSON.stringify(contract.targetMask)) {
    throw new Error(`Lv${source.id} early joint mask repair playable-mask drift`);
  }
  for (const [id, target] of Object.entries(contract.blockPositions)) {
    const block = source.blocks.find((candidate) => candidate.id === id);
    const before = contract.sourceBlockPositions[id];
    if (!block || !before || !positionMatches(block.x, block.y, before) && !positionMatches(block.x, block.y, target)) {
      throw new Error(`Lv${source.id} early joint mask repair source drift at block ${id}`);
    }
  }
  for (const [id, target] of Object.entries(contract.gateGeometry)) {
    const gate = source.gates.find((candidate) => candidate.id === id);
    const before = contract.sourceGateGeometry[id];
    if (!gate || !before || !gateMatches(gate, before) && !gateMatches(gate, target)) {
      throw new Error(`Lv${source.id} early joint mask repair source drift at gate ${id}`);
    }
  }
  if (source.id === 27) {
    const shutter = source.shutters?.find(({ id }) => id === "vp-027-cover-1");
    if (!shutter || shutter.x !== 0 || shutter.y !== 0 || shutter.width !== 3 || shutter.height !== 9
      || shutter.count !== 9 || shutter.skin !== "shutter") {
      throw new Error("Lv27 early joint mask repair source drift at 3x9 shutter");
    }
    for (let index = 1; index <= 9; index += 1) {
      const id = `cc-027-b2-${String(index).padStart(2, "0")}`;
      const block = source.blocks.find((candidate) => candidate.id === id);
      if (!block || block.x !== 0 || block.y !== index - 1 || block.shutterId !== shutter.id) {
        throw new Error(`Lv27 early joint mask repair source drift at H3 cohort ${id}`);
      }
    }
  }
};

const patchContract = (source: LevelSpec, contract: JointMaskContract): LevelSpec => {
  assertSourceOrTarget(source, contract);
  const blocks = source.blocks.map((block) => {
    const target = contract.blockPositions[block.id];
    return target && !positionMatches(block.x, block.y, target)
      ? { ...block, x: target[0], y: target[1] }
      : block;
  });
  const gates = source.gates.map((gate): GateSpec => {
    const target = contract.gateGeometry[gate.id];
    return target && !gateMatches(gate, target) ? { ...gate, ...target } : gate;
  });
  const playable = pointsFromMask(contract.targetMask);
  const unchanged = source.width === contract.targetMask[0]!.length
    && source.height === contract.targetMask.length
    && source.blocked === undefined
    && JSON.stringify(source.playable) === JSON.stringify(playable)
    && blocks.every((block, index) => block === source.blocks[index])
    && gates.every((gate, index) => gate === source.gates[index]);
  if (unchanged) return source;
  return {
    ...source,
    width: contract.targetMask[0]!.length,
    height: contract.targetMask.length,
    playable,
    blocked: undefined,
    blocks,
    gates,
  };
};

/**
 * Applies the two solver-certified early exact masks after the provisional
 * outline pass and before the late-mask batch. Only forced block coordinates
 * and boundary-exit geometry change; all mechanism payloads and cohorts stay
 * byte-for-byte identical.
 */
export const applyCompetitorEarlyJointMaskRepair = (source: LevelSpec): LevelSpec => {
  const contract = CONTRACTS[source.id];
  return contract ? patchContract(source, contract) : source;
};
