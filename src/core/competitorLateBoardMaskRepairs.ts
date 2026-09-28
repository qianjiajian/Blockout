import type { GateSpec, GeneratorSpec, LevelSpec, Point, ShutterSpec } from "./types";

export const COMPETITOR_LATE_BOARD_MASK_REPAIR_VERSION = "competitor-late-board-mask-r1" as const;

export const COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS = [76, 84, 85, 88, 90, 94, 96, 99] as const;

interface LateBoardMaskContract {
  mask: readonly string[];
  /** Two base-36 characters (x, y) per source-order block. */
  blockPositions: string;
  /** Side code (top/right/bottom/left = 0/1/2/3) plus base-36 offset per source-order gate. */
  gatePositions: string;
}

const CONTRACTS: Readonly<Record<number, LateBoardMaskContract>> = {
  76: {
    mask: [
      ".#####.",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      ".#####.",
    ],
    blockPositions: "233048583703052832454240612024011018",
    gatePositions: "35151203",
  },
  84: {
    mask: [
      "#####..",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
    ],
    blockPositions: "0909035909071901180308584944486863675453060806090102",
    gatePositions: "20243613311811",
  },
  85: {
    mask: [
      "######",
      "######",
      "######",
      "##..##",
      "##..##",
      "##..##",
      "######",
      "######",
      "######",
    ],
    blockPositions: "212226422045160247120045270305434007",
    gatePositions: "24133002152136",
  },
  88: {
    mask: [
      "#######",
      "#######",
      "#######",
      "..###..",
      "..###..",
      "..###..",
      "..###..",
      "#######",
      "#######",
      "#######",
    ],
    blockPositions: "240057230711592538422043354832583608194760275001301845356352",
    gatePositions: "103724301700",
  },
  90: {
    mask: [
      "######",
      "######",
      ".####.",
      "######",
      "######",
      "######",
      "######",
      "######",
      "######",
      "######",
      "######",
    ],
    blockPositions: "4606034303004003000040400340030303030043",
    gatePositions: "22300014",
  },
  94: {
    mask: [
      "#######",
      "#######",
      "#######",
      "#######",
      "######.",
      "######.",
      "#######",
      "#######",
      "#######",
      "#######",
    ],
    blockPositions: "630917553518052738260104190446060305680858020656280449660448",
    gatePositions: "162420363134",
  },
  96: {
    mask: [
      "###..###",
      "###..###",
      "########",
      "########",
      "########",
      "########",
      "########",
      "###..###",
      "###..###",
    ],
    blockPositions: "2653154214525546503260432713450566127761630307611064445724003316",
    gatePositions: "3425161220060100",
  },
  99: {
    mask: [
      ".#####.",
      "#######",
      "#######",
      "#######",
      ".#####.",
      "#######",
      "#######",
      "#######",
      "#######",
      "#######",
    ],
    blockPositions: "2528651438160853486955585956480559653918675966690706",
    gatePositions: "1226323723181521",
  },
};

const SIDES = ["top", "right", "bottom", "left"] as const;

const pointsFromMask = (mask: readonly string[]): Point[] => mask.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const decode = (value: string): number => Number.parseInt(value, 36);

const patchGenerators = (levelId: number, generators: LevelSpec["generators"]): LevelSpec["generators"] => {
  if (levelId !== 88) return generators;
  let found = false;
  const repaired = generators?.map((generator): GeneratorSpec => {
    if (generator.id !== "vp-088-generator-2") return generator;
    found = true;
    return {
      ...generator,
      side: "left",
      offset: 4,
      spawn: [2, 3],
      rimAnchor: { x: 2, y: 4.5, quarterTurns: 3 },
    };
  });
  if (!found) throw new Error("Lv88 late board mask repair source drift at generator-2");
  return repaired;
};

const patchShutters = (levelId: number, shutters: LevelSpec["shutters"]): LevelSpec["shutters"] => {
  if (levelId === 94) {
    let found = false;
    const repaired = shutters?.map((shutter): ShutterSpec => {
      if (shutter.id !== "vp-094-cover-4") return shutter;
      found = true;
      return { ...shutter, y: 6 };
    });
    if (!found) throw new Error("Lv94 late board mask repair source drift at cover-4");
    return repaired;
  }
  if (levelId === 99) {
    return shutters?.map((shutter): ShutterSpec => (
      shutter.skin === "staging" ? { ...shutter, x: 1, y: 0 } : shutter
    ));
  }
  return shutters;
};

const patchContract = (source: LevelSpec, contract: LateBoardMaskContract): LevelSpec => {
  if (contract.blockPositions.length !== source.blocks.length * 2) {
    throw new Error(`Lv${source.id} late board mask repair block-count drift`);
  }
  if (contract.gatePositions.length !== source.gates.length * 2) {
    throw new Error(`Lv${source.id} late board mask repair gate-count drift`);
  }
  const blocks = source.blocks.map((block, index) => ({
    ...block,
    x: decode(contract.blockPositions[index * 2]!),
    y: decode(contract.blockPositions[index * 2 + 1]!),
  }));
  const gates = source.gates.map((gate, index): GateSpec => ({
    ...gate,
    side: SIDES[decode(contract.gatePositions[index * 2]!)]!,
    offset: decode(contract.gatePositions[index * 2 + 1]!),
  }));
  const candidate: LevelSpec = {
    ...source,
    width: contract.mask[0]!.length,
    height: contract.mask.length,
    playable: pointsFromMask(contract.mask),
    blocked: undefined,
    blocks,
    gates,
    generators: patchGenerators(source.id, source.generators),
    shutters: patchShutters(source.id, source.shutters),
  };
  const same = source.width === candidate.width
    && source.height === candidate.height
    && source.blocked === undefined
    && JSON.stringify(source.playable) === JSON.stringify(candidate.playable)
    && JSON.stringify(source.blocks) === JSON.stringify(candidate.blocks)
    && JSON.stringify(source.gates) === JSON.stringify(candidate.gates)
    && JSON.stringify(source.generators) === JSON.stringify(candidate.generators)
    && JSON.stringify(source.shutters) === JSON.stringify(candidate.shutters);
  return same ? source : candidate;
};

/**
 * Applies solver- and replay-certified exact competitor masks for the late
 * campaign batch. The table changes coordinates only: block/gate payloads,
 * opening cohorts and every player-facing mechanism count remain unchanged.
 */
export const applyCompetitorLateBoardMaskRepair = (source: LevelSpec): LevelSpec => {
  const contract = CONTRACTS[source.id];
  return contract ? patchContract(source, contract) : source;
};
