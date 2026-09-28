import type { LevelSpec } from "./types";

/**
 * v1.65 targeted regeneration for the three user-reported deadlocks.
 * Lv66 changes only three hidden lift cargo colours (same native shapes and
 * anchors); Lv93 recolours two outer opening blocks to yellow so the existing
 * bottom yellow release chain is live; Lv97 swaps two single-cell opening
 * cargo anchors.
 */
export const applyLevel66Repair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 66) return source;
  const colours: Record<string, LevelSpec["blocks"][number]["color"]> = {
    "v146-66-lift2-3": "blue",
    "v146-66-lift2-2": "green",
    "v146-66-lift2-4": "cyan",
  };
  return {
    ...source,
    blocks: source.blocks.map((block) => {
      const color = colours[block.id];
      return color ? { ...block, color } : { ...block };
    }),
  };
};

export const applyLevel93Repair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 93) return source;
  const recolor = new Set(["r147-93-o-red-h2-adapt", "r147-93-o-blue-s"]);
  return {
    ...source,
    blocks: source.blocks.map((block) => recolor.has(block.id)
      ? { ...block, color: "yellow" }
      : { ...block }),
  };
};

export const applyLevel97Repair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 97) return source;
  const firstId = "r147-97-openingUpper-0";
  const secondId = "r147-97-openingLower-0";
  const first = source.blocks.find((block) => block.id === firstId);
  const second = source.blocks.find((block) => block.id === secondId);
  if (!first || !second) throw new Error("Lv97 regeneration source singles are missing");
  return {
    ...source,
    blocks: source.blocks.map((block) => {
      if (block.id === firstId) return { ...block, x: second.x, y: second.y };
      if (block.id === secondId) return { ...block, x: first.x, y: first.y };
      return { ...block };
    }),
  };
};
