import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `export { validateLevel } from "./src/core/PuzzleModel.ts"; export { checkRevisedIndependentSeamFloor, checkRevisedRepositionFloor } from "./src/core/revisedRepositionFloor.ts";`,
    resolveDir: process.cwd(), loader: "ts",
  }, bundle: true, write: false, platform: "node", format: "esm",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const makeTiledLevel = (count) => {
  const gates = [];
  const blocks = [];
  for (let index = 0; index < count; index += 1) {
    const y = index * 2;
    gates.push(
      { id: `r0-${index}`, side: "right", offset: y, size: 1, color: "red" },
      { id: `l0-${index}`, side: "left", offset: y, size: 1, color: "blue" },
      { id: `r1-${index}`, side: "right", offset: y + 1, size: 1, color: "green" },
      { id: `l1-${index}`, side: "left", offset: y + 1, size: 1, color: "yellow" },
    );
    blocks.push(
      { id: `a-${index}`, x: 0, y, shape: [[0, 0]], color: "red" },
      { id: `b-${index}`, x: 1, y, shape: [[0, 0]], color: "blue" },
      { id: `c-${index}`, x: 1, y: y + 1, shape: [[0, 0]], color: "green" },
      { id: `d-${index}`, x: 2, y: y + 1, shape: [[0, 0]], color: "yellow" },
    );
  }
  return {
    mechanismRules: "revised-2026-09-23-v1.4", id: 991, name: "seam-composition-fixture",
    difficulty: "super", timeSeconds: 300, reward: 0, width: 3, height: count * 2,
    seams: Array.from({ length: count - 1 }, (_, index) => ({
      orientation: "horizontal", offset: (index + 1) * 2, start: 0, size: 3,
    })), gates, blocks,
    dailyProof: { kind: "seam-chambers-v1", componentWidth: 3, componentHeight: 2, componentCount: count, componentFloor: 1 },
  };
};

const level = makeTiledLevel(31);
runtime.validateLevel(level);
const proof = runtime.checkRevisedIndependentSeamFloor(level, {
  floor: 31, maxStates: 20_000, maxDragStates: 500, maxTransitions: 500_000, maxMilliseconds: 5_000,
});
assert.equal(proof.status, "threshold-proven");
assert.equal(proof.thresholdProven, true);
assert.equal(proof.componentFloorSum, 31);
assert.equal(proof.components.length, 31);
assert.ok(proof.components.every((component) => component.lowerBound >= 1));
console.log("PASS static seam component composition: 31 independent floors sum to 31");
const dispatched = runtime.checkRevisedRepositionFloor(level, {
  floor: 31, maxStates: 20_000, maxDragStates: 500, maxTransitions: 500_000, maxMilliseconds: 5_000,
});
assert.equal(dispatched.status, "threshold-proven");
assert.ok(dispatched.relaxedRoute?.length);
console.log("PASS dispatched composition proof includes exact concatenated route");
