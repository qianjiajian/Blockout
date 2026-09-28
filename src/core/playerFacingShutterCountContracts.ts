import type { LevelSpec } from "./types";

/**
 * Solver-certified repairs for competitor-exact player-facing shutter cargo.
 *
 * Every row stores block-index/x/y triples in base36. The source shutter
 * geometry and counter already match the competitor in these levels; only the
 * cargo had been detached into internal non-spatial staging. Keeping this
 * table separate lets the final pipeline opt in only after the joint freeze.
 */
export const PLAYER_FACING_SHUTTER_COUNT_CONTRACT_VERSION = "exact-player-shutter-cargo-r1" as const;

const REPAIRS: Readonly<Record<number, string>> = {
  27: "900a01b02c03d04e05f06g07h08",
  40: "e00i10b30c40f50g12d11h32",
  48: "c05d25f45i07h65e27g37j47",
  55: "g06h36i07",
  61: "h00b20c40d21e41f02g22i42",
  68: "d06f26h46a66b08c18e28g38i48",
  72: "h40i51e50f53g43",
};

export const PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS = Object.freeze(
  Object.keys(REPAIRS).map(Number),
);

const isPlayerFacing = (shutter: NonNullable<LevelSpec["shutters"]>[number]): boolean => (
  shutter.count > 0 && (shutter.skin === undefined || shutter.skin === "shutter")
);

export const applyPlayerFacingShutterCountContract = (level: LevelSpec): LevelSpec => {
  const packed = REPAIRS[level.id];
  if (!packed) return level;
  const shutters = (level.shutters ?? []).filter(isPlayerFacing);
  if (shutters.length !== 1 || packed.length % 3 !== 0) {
    throw new Error(`Lv${level.id} player-facing shutter contract source drifted`);
  }
  const positions = new Map<number, readonly [number, number]>();
  for (let at = 0; at < packed.length; at += 3) {
    const index = Number.parseInt(packed[at]!, 36);
    if (!level.blocks[index]?.shutterId || positions.has(index)) {
      throw new Error(`Lv${level.id} player-facing shutter cargo order drifted at block ${index}`);
    }
    positions.set(index, [Number.parseInt(packed[at + 1]!, 36), Number.parseInt(packed[at + 2]!, 36)]);
  }
  const shutterId = shutters[0]!.id;
  return {
    ...level,
    blocks: level.blocks.map((block, index) => {
      const position = positions.get(index);
      return position ? { ...block, x: position[0], y: position[1], shutterId } : block;
    }),
  };
};
