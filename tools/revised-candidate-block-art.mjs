import { matchFormalBlockShape } from "../src/game/formalBlockShapes.ts";
import { GAME_ART } from "../src/game/artManifest.ts";

/** Renderer support is an implementation gate, not a new shape-design rule.
 * Inspect every layer/hidden/queued block: a successful invisible Pointer hit
 * is not evidence that the candidate can be presented to a player.
 * Actual asset bytes are bound/checked by the outer artifact tool.
 */
export function auditCandidateBlockArt(level) {
  const issues = [], requirements = [];
  const add = (blockId, kind, color, shapeId, path) => {
    if (!path) issues.push({ code: "missing-whole-block-art", blockId, kind, color, shapeId });
    else requirements.push({ blockId, kind, color, shapeId, path });
  };
  if (!Array.isArray(level?.blocks)) return { checked: true, passed: false,
    issues: [{ code: "invalid-block-art-input" }], requirements, releaseApproved: false };
  for (const block of level.blocks) {
    if (!block || !Array.isArray(block.shape) || !block.shape.every((point) => Array.isArray(point)
      && point.length === 2 && point.every(Number.isSafeInteger))
      || (block.layers !== undefined && !Array.isArray(block.layers))) {
      issues.push({ code: "invalid-block-art-input", blockId: block?.id ?? null });
      continue;
    }
    const match = matchFormalBlockShape(block.shape);
    if (!match) {
      issues.push({ code: "unsupported-rendered-shape", blockId: block.id, cells: block.shape.length });
      continue;
    }
    const layers = block.layers?.length ? block.layers : [block.color];
    for (const color of layers) add(block.id, "solid", color, match.shapeId,
      GAME_ART.gameplay.formalBlocks[color]?.solid?.[match.shapeId]);
    if (layers.length > 1) add(block.id, "shell", layers[0], match.shapeId,
      GAME_ART.gameplay.formalBlocks[layers[0]]?.shell?.[match.shapeId]);
  }
  return { checked: true, passed: issues.length === 0, issues, requirements,
    scope: "Whole-block silhouette and every color/shell layer; not complete animation or pixel validation",
    releaseApproved: false };
}
