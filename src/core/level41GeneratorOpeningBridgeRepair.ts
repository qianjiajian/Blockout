import type { GateSpec, LevelSpec } from "./types";

export const LEVEL41_GENERATOR_OPENING_BRIDGE_VERSION = "lv41-opening-eleven-exact-staging-r1" as const;

const OPENING = new Map<string, readonly [number, number]>([
  ["cc-041-b1-01", [3, 4]],
  ["cc-041-b1-02", [0, 8]],
  ["cc-041-b1-03", [3, 5]],
  ["cc-041-b1-04", [0, 6]],
  ["cc-041-b1-05", [5, 5]],
  ["cc-041-b1-06", [0, 4]],
  ["cc-041-b1-07", [6, 7]],
  ["cc-041-b1-08", [1, 4]],
  ["cc-041-b1-09", [5, 4]],
  ["cc-041-b1-10", [6, 8]],
  ["cc-041-b1-11", [6, 6]],
]);

const CHAINS = new Map<string, {
  readonly at: readonly [number, number];
  readonly triggers: readonly string[];
}>([
  ["cc-041-b4-01", { at: [0, 0], triggers: ["cc-041-b2-01"] }],
  ["cc-041-b4-02", { at: [4, 4], triggers: ["cc-041-b1-09"] }],
  ["cc-041-b4-03", { at: [0, 6], triggers: ["cc-041-b1-07", "cc-041-b5-04"] }],
  ["cc-041-b5-01", { at: [0, 6], triggers: ["cc-041-b4-03"] }],
  ["cc-041-b5-02", { at: [3, 0], triggers: ["cc-041-b2-03"] }],
  ["cc-041-b5-03", { at: [0, 4], triggers: ["cc-041-b1-06", "cc-041-b1-08"] }],
  ["cc-041-b5-04", { at: [0, 8], triggers: ["cc-041-b1-02"] }],
  ["cc-041-b5-05", { at: [4, 4], triggers: ["cc-041-b4-02"] }],
  ["cc-041-b5-06", { at: [0, 0], triggers: ["cc-041-b4-01"] }],
]);

const repairGate = (gate: GateSpec): GateSpec => {
  if (gate.color === "yellow") return { ...gate, side: "right", offset: 7, size: 3 };
  if (gate.color === "purple") return { ...gate, side: "top", offset: 4, size: 3 };
  if (gate.color === "red") return { ...gate, side: "right", offset: 4, size: 3 };
  return gate;
};

/**
 * Lv41 has two physical shutters in front of its generator mouths. The video
 * opening contains all eleven b1 pieces; exposing only three creates a hard
 * deadlock before the first eight-count shutter can open. Keep both machines,
 * queues and visible 8/14 shutters untouched, expose the eleven-piece opening,
 * and make the remaining non-spatial staging releases exact predecessor
 * chains so a hidden piece never materialises into an occupied footprint.
 */
export const applyLevel41GeneratorOpeningBridgeRepair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 41) return source;
  if (source.shutters?.some((shutter) => shutter.id === "sr-41-18" && shutter.triggerBlockIds?.[0] === "cc-041-b1-09")) {
    return source;
  }
  const triggerByShutter = new Map<string, readonly string[]>();
  const blocks = source.blocks.map((block) => {
    const opening = OPENING.get(block.id);
    if (opening) {
      if (block.shutterId) {
        const stage = source.shutters?.find((shutter) => shutter.id === block.shutterId);
        if (!stage || stage.skin !== "staging") throw new Error(`Lv41 opening source drift at ${block.id}`);
      }
      const { shutterId: _staging, ...visible } = block;
      return { ...visible, x: opening[0], y: opening[1] };
    }
    const chain = CHAINS.get(block.id);
    if (!chain) return block;
    if (!block.shutterId) throw new Error(`Lv41 staging source drift at ${block.id}`);
    triggerByShutter.set(block.shutterId, chain.triggers);
    return { ...block, x: chain.at[0], y: chain.at[1] };
  });
  if (triggerByShutter.size !== CHAINS.size) throw new Error("Lv41 staging chain inventory drift");
  const referenced = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  const shutters = (source.shutters ?? []).flatMap((shutter) => {
    if (shutter.skin === "staging" && !referenced.has(shutter.id)) return [];
    const triggers = triggerByShutter.get(shutter.id);
    return [{
      ...shutter,
      ...(triggers ? { count: triggers.length, triggerBlockIds: [...triggers] } : {}),
    }];
  });
  return {
    ...source,
    gates: source.gates.map(repairGate),
    blocks,
    shutters,
  };
};
