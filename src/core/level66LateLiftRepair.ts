import type { BlockSpec, LevelSpec } from "./types";

/**
 * The former lift cargo needed five clears after revelation, but its only
 * independent sources supplied three: a cyan square and a two-layer carrier.
 * The remaining single was enclosed by both frozen bodies. Reflow the same
 * 15 cells and split the ordinary square into native horizontal/vertical bars.
 * Four unfrozen bodies now supply five clears/peels without outside cargo.
 * Keep both ice counters at 5 and leave the entire opening and every gate alone.
 */
export const applyLevel66LateLiftRepair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 66) return level;
  const liftId = "v146-66-lift2";
  const hidden = level.blocks.filter((block) => block.shutterId === liftId);
  const expectedIds = [0, 1, 2, 3, 4].map((index) => `v146-66-lift2-${index}`);
  if (hidden.length !== expectedIds.length || expectedIds.some((id) => !hidden.some((block) => block.id === id))) {
    throw new Error("Lv66 late-lift repair requires the original five cargo bodies");
  }
  const lift = level.shutters?.find((item) => item.id === liftId);
  if (!lift || lift.skin !== "lift" || lift.x !== 0 || lift.y !== 0 || lift.width !== 5 || lift.height !== 3) {
    throw new Error("Lv66 late-lift repair requires the existing 5x3 lift at (0, 0)");
  }
  const patches: Record<string, Partial<BlockSpec>> = {
    "v146-66-lift2-0": { x: 1, y: 1 },
    "v146-66-lift2-3": { x: 0, y: 0 },
    "v146-66-lift2-2": { x: 2, y: 1 },
    "v146-66-lift2-4": { x: 0, y: 2, shape: [[0, 0], [1, 0]] },
  };
  const blocks = level.blocks.map((block) => {
    const patch = patches[block.id];
    if (!patch) return block;
    if ((block.id === "v146-66-lift2-3" || block.id === "v146-66-lift2-2") && block.frozen !== 5) {
      throw new Error("Lv66 late-lift repair must preserve both original ice-5 bodies");
    }
    const updated = { ...block, ...patch };
    return updated;
  });
  blocks.push({
    id: "v146-66-lift2-5", x: 3, y: 0, shape: [[0, 0], [0, 1]], color: "cyan", shutterId: liftId,
  });
  return { ...level, blocks };
};
