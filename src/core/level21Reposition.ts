import { rect, type BlockSpec, type LevelSpec } from "./types";

// v1.15 user scope: Lv21 BLOCKS only. Keep all covers, gates, counters,
// time/rewards/star targets and the other 199 levels exactly as authored.
// Proven minimum: 18 non-clearing gestures; full witness: 46 gestures.
// Evidence: deliverables/level21-floor18-2026-09-23/.
const patches: Record<string, Pick<BlockSpec, "x" | "y" | "color" | "shape"> & Pick<Partial<BlockSpec>, "layers">> = {
  "lv21-b01": { x: 0, y: 2, color: "red", shape: rect(1, 3) },
  "lv21-b02": { x: 2, y: 6, color: "green", shape: rect(1, 1) },
  "lv21-b03": { x: 0, y: 8, color: "red", shape: rect(2, 1) },
  "lv21-b04": { x: 1, y: 2, color: "purple", shape: rect(2, 2) },
  "lv21-b05": { x: 3, y: 6, color: "purple", shape: rect(3, 3) },
  "lv21-b06": { x: 5, y: 5, color: "blue", shape: rect(1, 1) },
  "lv21-b07": { x: 0, y: 5, color: "purple", shape: rect(1, 3) },
  "lv21-b08": { x: 2, y: 7, color: "yellow", shape: rect(1, 2) },
  "lv21-b09": { x: 2, y: 5, color: "red", shape: rect(3, 1) },
  "lv21-b10": { x: 1, y: 4, color: "yellow", shape: rect(3, 1) },
  "lv21-b11": { x: 4, y: 4, color: "purple", shape: rect(2, 1) },
  "lv21-b12": { x: 3, y: 2, color: "green", shape: rect(3, 1), layers: ["green", "blue"] },
  "lv21-b13": { x: 1, y: 5, color: "blue", shape: rect(1, 3), layers: ["blue", "red"] },
  "lv21-b14": { x: 3, y: 3, color: "red", shape: rect(3, 1), layers: ["red", "blue"] },
};

export function applyLevel21Reposition(level: LevelSpec): LevelSpec {
  if (level.id !== 21) return level;
  return { ...level, blocks: level.blocks.map(block => {
    const patch = patches[block.id];
    return patch ? { ...block, ...patch,
      shape: patch.shape.map(([x, y]) => [x, y] as [number, number]),
      ...(patch.layers ? { layers: [...patch.layers] } : {}),
    } : block;
  }) };
}
