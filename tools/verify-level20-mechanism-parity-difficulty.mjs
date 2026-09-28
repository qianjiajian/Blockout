import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const truthPath = resolve(
  root,
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
);
const repositionFloor = 10;
const maxStates = Number(process.env.LEVEL20_PROOF_MAX_STATES ?? 100_000);
const solverPathSuffix = "/src/core/levelSolver.ts";
const expectedMechanismKinds = ["color-exit", "frozen-exit", "irregular-board", "shutter"];
const expectedMask = ["#####", "#####", "#####", "..#..", "..#..", "#####", "#####", "#####"];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(Number.isSafeInteger(maxStates) && maxStates > 0, "LEVEL20_PROOF_MAX_STATES must be a positive integer");

// This exact source transform turns solveLevelOptimally into an exhaustive
// counterexample search for any completion below ten reposition drags.
const originalTransition = `      const { drag, state, key } = transition;
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(key, cost);
      const routeNodeId = routeNodes.length;
      routeNodes.push({ parentId: node.routeNodeId, drag });
      const remainingLayers = remainingLayerCount(state);
      const clearedLayers = clearLoad - remainingLayers;
      const repositionDrags = cost - clearedLayers;
      const remainingParking = Math.max(0, parkingLowerBound - repositionDrags);`;
const thresholdTransition = `      const { drag, state, key } = transition;
      const cost = node.cost + 1;
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      const remainingLayers = remainingLayerCount(state);
      const clearedLayers = clearLoad - remainingLayers;
      const repositionDrags = cost - clearedLayers;
      if (repositionDrags >= ${repositionFloor}) continue;
      best.set(key, cost);
      const routeNodeId = routeNodes.length;
      routeNodes.push({ parentId: node.routeNodeId, drag });
      const remainingParking = Math.max(0, parkingLowerBound - repositionDrags);`;

const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS } from "./src/core/levels.ts";
      export {
        MECHANISM_KIND_IDS,
        classifyRuntimeMechanismKinds,
        compareMechanismKindParity,
        competitorSourceLevelId,
      } from "./src/core/mechanismKindParity.ts";
      export { auditOrdinaryShutterCoverage } from "./src/core/shutterCoverage.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelOptimally } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "verify-level20-mechanism-parity-difficulty-entry.ts",
    loader: "ts",
  },
  plugins: [{
    name: "level20-reposition-threshold-proof",
    setup(buildApi) {
      buildApi.onLoad({ filter: /levelSolver\.ts$/ }, async (args) => {
        let source = (await readFile(args.path, "utf8")).replaceAll("\r\n", "\n");
        if (!args.path.replaceAll("\\", "/").endsWith(solverPathSuffix)) return { contents: source, loader: "ts" };
        const first = source.indexOf(originalTransition);
        const second = source.indexOf(originalTransition, first + 1);
        assert(first >= 0 && second < 0, `Expected one optimal-solver transition; first=${first}, second=${second}`);
        source = source.slice(0, first) + thresholdTransition + source.slice(first + originalTransition.length);
        return { contents: source, loader: "ts" };
      });
    },
  }],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  write: false,
  logLevel: "silent",
  legalComments: "none",
});
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

// Exact 24-drag optimum found by the unmodified optimal solver (3,052 states).
// 14 clears + 10 parking drags gives the matching completion upper bound.
const completionCertificate = [
  { blockId: "cc-020-b1-06", path: [], exitSide: "bottom" },
  { blockId: "cc-020-b1-07", path: [[2, 4], [2, 3]] },
  { blockId: "cc-020-b1-05", path: [[1, 7], [2, 7], [3, 7]] },
  { blockId: "cc-020-b1-03", path: [[0, 7]] },
  { blockId: "cc-020-b1-04", path: [[2, 6], [1, 6]] },
  { blockId: "cc-020-b1-05", path: [[3, 6]], exitSide: "right" },
  { blockId: "cc-020-b1-02", path: [[3, 6], [3, 7]], exitSide: "bottom" },
  { blockId: "cc-020-b1-03", path: [[1, 7], [2, 7], [3, 7]] },
  { blockId: "cc-020-b1-04", path: [[1, 7], [0, 7]], exitSide: "bottom" },
  { blockId: "cc-020-b1-01", path: [[0, 6], [0, 7]], exitSide: "bottom" },
  { blockId: "cc-020-b1-03", path: [[2, 7], [1, 7], [0, 7], [0, 6], [0, 5]], exitSide: "left" },
  { blockId: "cc-020-b2-02", path: [], exitSide: "top" },
  { blockId: "cc-020-b2-01", path: [[2, 0], [3, 0]] },
  { blockId: "cc-020-b2-03", path: [[1, 0]] },
  { blockId: "cc-020-b2-04", path: [[2, 1], [1, 1]] },
  { blockId: "cc-020-b2-01", path: [[3, 1]] },
  { blockId: "cc-020-b2-03", path: [[2, 0], [3, 0]], exitSide: "top" },
  { blockId: "cc-020-b2-04", path: [[1, 0], [2, 0], [3, 0]] },
  { blockId: "cc-020-b2-05", path: [[1, 1], [1, 0]], exitSide: "top" },
  { blockId: "cc-020-b1-07", path: [[2, 2], [2, 1], [2, 0]], exitSide: "top" },
  { blockId: "cc-020-b2-07", path: [[1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 5]], exitSide: "bottom" },
  { blockId: "cc-020-b2-01", path: [[2, 1], [1, 1], [1, 2], [0, 2]], exitSide: "left" },
  { blockId: "cc-020-b2-04", path: [[3, 1], [2, 1], [1, 1], [1, 2], [0, 2]], exitSide: "left" },
  { blockId: "cc-020-b2-06", path: [[3, 1], [3, 0]], exitSide: "right" },
];

const pointKey = (x, y) => `${x},${y}`;
const playableMask = (level) => {
  const cells = new Set(level.playable.map(([x, y]) => pointKey(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => cells.has(pointKey(x, y)) ? "#" : ".").join("")
  ));
};
const sameColorOrthogonalAdjacency = (level) => {
  const cells = level.blocks.map((block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]));
  const pairs = [];
  for (let left = 0; left < level.blocks.length; left += 1) {
    for (let right = left + 1; right < level.blocks.length; right += 1) {
      if ((level.blocks[left].layers?.[0] ?? level.blocks[left].color)
        !== (level.blocks[right].layers?.[0] ?? level.blocks[right].color)) continue;
      const rightCells = new Set(cells[right].map(([x, y]) => pointKey(x, y)));
      if (cells[left].some(([x, y]) => (
        rightCells.has(pointKey(x + 1, y)) || rightCells.has(pointKey(x - 1, y))
        || rightCells.has(pointKey(x, y + 1)) || rightCells.has(pointKey(x, y - 1))
      ))) pairs.push([level.blocks[left].id, level.blocks[right].id]);
    }
  }
  return pairs;
};

const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const [index, drag] of route.entries()) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      assert(model.moveBlockStep(drag.blockId, x, y), `Replay drag ${index + 1}: rejected move ${x},${y}`);
    }
    if (drag.exitSide) assert(model.tryExit(drag.blockId, drag.exitSide).ok, `Replay drag ${index + 1}: rejected exit`);
    assert(model.commitAction(), `Replay drag ${index + 1}: rejected commit`);
  }
  const snapshot = model.snapshot();
  assert(snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0, "Route did not complete");
};

assert(Array.isArray(runtime.LEVELS) && runtime.LEVELS.length >= 20, "Final runtime LEVELS lacks Lv20");
const level = runtime.LEVELS[19];
assert(level.id === 20, `Expected Lv20, received Lv${level.id}`);
runtime.validateLevel(level);
assert(level.width === 5 && level.height === 8, `Wrong board: ${level.width}x${level.height}`);
assert(JSON.stringify(playableMask(level)) === JSON.stringify(expectedMask), "Lv20 dogbone mask mismatch");
assert(level.timeSeconds === 75, `Lv20 time drifted to ${level.timeSeconds}`);
assert(level.blocks.length === 14, `Expected 14 blocks, got ${level.blocks.length}`);
assert(level.blocks.filter((block) => !block.shutterId).length === 7, "Opening block count is not seven");
assert(level.blocks.filter((block) => block.shutterId === "vp-020-cover-1").length === 7, "Hidden block count is not seven");
assert(level.blocks.reduce((sum, block) => sum + block.shape.length, 0) === 30, "Occupied-cell count is not 30");
assert(level.blocks.filter((block) => block.shape.length === 2).length === 12, "H2 count is not 12");
assert(level.blocks.filter((block) => block.shape.length === 3).length === 2, "V3 count is not 2");
assert(level.shutters?.length === 1, "Expected one shutter");
assert(JSON.stringify(level.shutters[0]) === JSON.stringify({
  id: "vp-020-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter",
}), "Lv20 shutter is not the exact 5x3/count6 contract");
assert(level.gates.length === 8, `Expected eight exits, got ${level.gates.length}`);
assert(level.gates.filter((gate) => !gate.frozen).length === 1, "Expected one ordinary exit");
assert(JSON.stringify(level.gates.map((gate) => gate.frozen).filter(Boolean).sort((a, b) => a - b))
  === JSON.stringify([1, 2, 3, 6, 7, 8, 10]), "Frozen exit values drifted");
assert(level.gates.find((gate) => gate.id === "lv020-exact-bottom-red-2")?.color === "red", "Bottom/2 swap missing");
assert(level.gates.find((gate) => gate.id === "lv020-exact-left-blue-3")?.color === "blue", "Left/3 swap missing");

assert(runtime.MECHANISM_KIND_IDS.length === 18, "Runtime mechanism taxonomy drifted");
const mechanisms = runtime.classifyRuntimeMechanismKinds(level);
const presentKinds = runtime.MECHANISM_KIND_IDS.filter((kind) => mechanisms[kind]).sort();
assert(JSON.stringify(presentKinds) === JSON.stringify(expectedMechanismKinds), `Mechanism kinds differ: ${presentKinds}`);
const truthPayload = JSON.parse(await readFile(truthPath, "utf8"));
const competitorLevelId = runtime.competitorSourceLevelId(level.id);
const truthLevel = truthPayload.levels?.find((record) => Number(record.level ?? record.level_id) === competitorLevelId);
assert(truthLevel, `Missing competitor truth Lv${competitorLevelId}`);
const parity = runtime.compareMechanismKindParity(level.id, truthLevel, level);
assert(parity.status === "exact-known" && !parity.missingKinds.length && !parity.extraKinds.length,
  `Mechanism parity failed: ${JSON.stringify(parity)}`);

const adjacencyPairs = sameColorOrthogonalAdjacency(level);
assert(adjacencyPairs.length === 0, `Same-colour adjacency: ${JSON.stringify(adjacencyPairs)}`);
const shutterCoverageIssues = runtime.auditOrdinaryShutterCoverage(level);
assert(shutterCoverageIssues.length === 0, `Shutter coverage mismatch: ${JSON.stringify(shutterCoverageIssues)}`);
assert(completionCertificate.length === 24, "Completion certificate is not 24 drags");
replay(level, completionCertificate);

// Restore the literal video colours under the two numbered ice overlays.  This
// produces the nine-reposition counterexample that justified the minimal swap.
const literalVideoColours = structuredClone(level);
literalVideoColours.gates.find((gate) => gate.id === "lv020-exact-bottom-red-2").color = "blue";
literalVideoColours.gates.find((gate) => gate.id === "lv020-exact-left-blue-3").color = "red";
const literalCounterexample = runtime.solveLevelOptimally(literalVideoColours, maxStates);
assert(literalCounterexample.solved, `Literal colours did not yield expected counterexample: ${literalCounterexample.termination}`);
assert(literalCounterexample.repositionOverhead === 9, `Literal colours overhead is ${literalCounterexample.repositionOverhead}, not 9`);

const proof = runtime.solveLevelOptimally(level, maxStates);
assert(!proof.solved, "Found a candidate completion below ten reposition drags");
assert(proof.termination === "exhausted", `Threshold proof is inconclusive: ${proof.termination}`);
assert(!proof.unsupportedReasons.length && !proof.staticUnsatReasons.length, "Threshold proof is not clean");

console.log(JSON.stringify({
  status: "PASS",
  levelId: level.id,
  parity: parity.status,
  mechanismKinds: presentKinds,
  contract: {
    board: "5x8 dogbone",
    openingBlocks: 7,
    hiddenBlocks: 7,
    totalBlocks: 14,
    occupiedCells: 30,
    shutter: "5x3/count6",
    frozenValues: [1, 2, 3, 6, 7, 8, 10],
  },
  completion: { drags: completionCertificate.length, clearLoad: 14, repositionOverhead: 10, replay: "complete" },
  proof: { maxStates, exploredStates: proof.exploredStates, termination: proof.termination },
  minimalInvisibleDifference: {
    production: "bottom/2 red + left/3 blue",
    literalVideo: "bottom/2 blue + left/3 red",
    literalVideoRepositionOverhead: literalCounterexample.repositionOverhead,
  },
  adjacencyPairs: adjacencyPairs.length,
  shutterCoverageIssues: shutterCoverageIssues.length,
}));
console.log("PASS");
