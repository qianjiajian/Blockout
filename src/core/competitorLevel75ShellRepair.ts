import type { BlockColor, BlockSpec, LevelSpec, Point } from "./types";

export const COMPETITOR_LEVEL_75_SHELL_REPAIR_VERSION = "competitor-level-75-shell-r1" as const;
export const COMPETITOR_LEVEL_75_SHELL_REPAIR_LEVEL_IDS = [75] as const;

interface ShellContract {
  id: string;
  x: number;
  y: number;
  shape: readonly Point[];
  layers: readonly [BlockColor, BlockColor];
}

/**
 * Source evidence: 71-80.mp4 at 540.50-541.50s (untouched Lv75 opening).
 * The lower room contains two gold-framed, opening-visible shell blocks:
 * - left L3: purple outer shell -> blue core;
 * - right 2x2: blue outer shell -> yellow core.
 */
export const COMPETITOR_LEVEL_75_SHELL_CONTRACTS: readonly ShellContract[] = [
  {
    id: "cc-piece-s1-19",
    x: 0,
    y: 9,
    shape: [[0, 0], [0, 1], [1, 1]],
    layers: ["purple", "blue"],
  },
  {
    id: "cc-piece-s1-18",
    x: 5,
    y: 9,
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    layers: ["blue", "yellow"],
  },
] as const;

const contractById = new Map(COMPETITOR_LEVEL_75_SHELL_CONTRACTS.map((contract) => [contract.id, contract]));

const sameShape = (left: readonly Point[], right: readonly Point[]): boolean => (
  left.length === right.length
  && left.every(([x, y], index) => x === right[index]?.[0] && y === right[index]?.[1])
);

const blockMatches = (block: BlockSpec, contract: ShellContract): boolean => (
  block.x === contract.x
  && block.y === contract.y
  && sameShape(block.shape, contract.shape)
  && block.color === contract.layers[0]
  && block.layers?.length === 2
  && block.layers[0] === contract.layers[0]
  && block.layers[1] === contract.layers[1]
);

const alreadyApplied = (level: LevelSpec): boolean => COMPETITOR_LEVEL_75_SHELL_CONTRACTS.every((contract) => {
  const block = level.blocks.find(({ id }) => id === contract.id);
  return block !== undefined && blockMatches(block, contract);
});

/** Restore the two source-visible Lv75 nested shells without changing geometry. */
export const applyCompetitorLevel75ShellRepair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 75 || alreadyApplied(level)) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const contract = contractById.get(block.id);
      if (!contract) return block;
      if (block.x !== contract.x || block.y !== contract.y || !sameShape(block.shape, contract.shape)) {
        throw new Error(`Lv75 shell carrier ${block.id} no longer matches the source-backed opening geometry`);
      }
      return {
        ...block,
        color: contract.layers[0],
        layers: [...contract.layers],
      };
    }),
  };
};
