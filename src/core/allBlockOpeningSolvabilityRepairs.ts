import type { LevelSpec } from "./types";

/**
 * Final, opening-preserving follow-up for the all-block colour repair.
 *
 * Lv93's shutter-region normalizer correctly separates the two visible 1×1
 * panels from their non-spatial cargo stages, but its first-fit panel anchors
 * land in the only lower-board route used by the recoloured blue pieces. Move
 * just those two physical panels to certified empty playable cells; countdowns,
 * cargo stages, opening blocks and every other mechanism remain unchanged.
 */
export const ALL_BLOCK_OPENING_SOLVABILITY_REPAIR_LEVEL_IDS = [93] as const;

const LV93_PANEL_POSITION = new Map<string, readonly [number, number]>([
  ["vp-093-cover-1", [1, 4]],
  ["vp-093-cover-2", [2, 4]],
]);

export const applyAllBlockOpeningSolvabilityRepair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 93) return level;
  return {
    ...level,
    shutters: level.shutters?.map((shutter) => {
      const position = LV93_PANEL_POSITION.get(shutter.id);
      return position ? { ...shutter, x: position[0], y: position[1] } : shutter;
    }),
  };
};
