import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv73 candidate. Keep the recommended 50-cell outline here
// until the authoritative v6 contract is deliberately rebound by the caller.
// The candidate starts from an already assembled/replayed runtime and asks the
// exact verifier whether its dense 5x5 staged-frame opening delays the first
// clear for the entire campaign floor.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-runtime-r25-all/runtime.generated.ts",
);
const routesRelative = option(
  "--routes",
  ".codex-temp/video-parity-v6-runtime-r25-all/routes.json",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv73-staged-frame-prefix-candidate",
);
const proofMode = option("--proof-mode", "physical-prefix");
if (!new Set(["physical-prefix", "stage-cores"]).has(proofMode)) {
  throw new Error(`unsupported --proof-mode ${proofMode}`);
}
const coreProofMethod = option("--core-method", "infinite_parking_relaxation");
if (!new Set(["infinite_parking_relaxation", "exact_gameplay_frontier"]).has(coreProofMethod)) {
  throw new Error(`unsupported --core-method ${coreProofMethod}`);
}
const openingCoreFloor = Number(option("--opening-core-floor", "7"));
const stagedCoreFloor = Number(option("--staged-core-floor", "7"));
const solveRouteMode = option("--solve-route", "none");
if (!new Set(["none", "validation", "optimal", "greedy-next-clear"]).has(solveRouteMode)) {
  throw new Error(`unsupported --solve-route ${solveRouteMode}`);
}
const solveMaxStates = Number(option("--solve-max-states", "500000"));
const targetGateOffset = Number(option("--target-gate-offset", "1"));
if (![0, 1, 2].includes(targetGateOffset)) throw new Error("--target-gate-offset must be 0, 1, or 2");
const handVariant = option("--hand-variant", "a");
if (!new Set(["a", "b", "c", "d"]).has(handVariant)) throw new Error("--hand-variant must be a, b, c, or d");

const BASELINE_MASK = [
  "#####..",
  "#######",
  "#######",
  "#######",
  "#######",
  "####...",
  "###....",
  "###....",
  "###....",
  "##.....",
  "#......",
  "#......",
];
const BOTTOM_SHAFT_MASK = [
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "####...",
  "####...",
  "###....",
  "##.....",
  "##.....",
];
const KLOTSKI_TENTACLE_MASK = [
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#######",
  ".##...#",
  ".##...#",
  ".##...#",
  ".##...#",
  ".##...#",
  ".##...#",
];
const KLOTSKI_WIDE_SHAFT_MASK = [
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#######",
  "###....",
  "###....",
  "###....",
  "###....",
  "###....",
  "###....",
];
const KLOTSKI_BOTTOM_BULB_MASK = [
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#####..",
  "#######",
  ".##....",
  ".##....",
  ".##....",
  "####...",
  "####...",
  "####...",
];
const candidateMode = option("--candidate-mode", "baseline");
if (!new Set(["baseline", "baseline-unique-sq2-probe", "bottom-sq2-prefix-probe", "klotski-sq2-prefix-probe", "klotski-wide-shaft-probe", "klotski-wide-shaft-mirror-probe", "klotski-hand-a-probe", "klotski-hand-a-bulb-probe"]).has(candidateMode)) {
  throw new Error(`unsupported --candidate-mode ${candidateMode}`);
}
const recommendedMask = candidateMode === "bottom-sq2-prefix-probe" ? BOTTOM_SHAFT_MASK
  : candidateMode === "klotski-sq2-prefix-probe" ? KLOTSKI_TENTACLE_MASK
    : candidateMode === "klotski-hand-a-bulb-probe" ? KLOTSKI_BOTTOM_BULB_MASK
    : candidateMode === "klotski-wide-shaft-probe" || candidateMode === "klotski-wide-shaft-mirror-probe" || candidateMode === "klotski-hand-a-probe" ? KLOTSKI_WIDE_SHAFT_MASK
      : BASELINE_MASK;
const isSq2PrefixProbe = candidateMode !== "baseline";
const targetSq2Id = option("--target-sq2-id", "cc-piece-s1-01");
if (isSq2PrefixProbe
  && !new Set(["cc-piece-s1-01", "cc-piece-s1-04"]).has(targetSq2Id)) {
  throw new Error(`unsupported --target-sq2-id ${targetSq2Id}`);
}

const inputPath = resolve(root, inputRelative);
const routesPath = resolve(root, routesRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, routesText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(routesPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv073")?.our_design_target;
if (!target) throw new Error("Lv73 is missing from the active design contract");

const routesArtifact = JSON.parse(routesText);
const sourceRouteEntry = (routesArtifact.levels ?? routesArtifact).find((entry) => (
  Number(String(entry.level_id ?? entry.id).replace(/^Lv/i, "")) === 73
));
const sourceRoute = sourceRouteEntry?.drags ?? sourceRouteEntry?.route;
if (!Array.isArray(sourceRoute) || !sourceRoute.length) {
  throw new Error("Lv73 completion route is missing from the source route artifact");
}

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelForValidation, solveLevelOptimally } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
      export function restoreCandidateModel(model, snapshot) {
        model.restore(snapshot);
        model.history = [];
        model.pendingHistory = undefined;
        model.pendingActionMutated = false;
        model.pendingGeneratorCheck = false;
        return model;
      }
    `,
    resolveDir: root,
    sourcefile: "lv73-staged-frame-prefix-candidate-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const source = runtime.levels.find((level) => level.id === 73);
if (!source) throw new Error("Lv73 is missing from the input runtime");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const levelSpecSha256 = (level) => sha256(canonicalJson(level));
const sameJson = (left, right) => canonicalJson(left) === canonicalJson(right);

const playableFromMask = (mask) => mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
const shapeKind = (block) => {
  const points = block.shape.map(([x, y]) => [x, y]);
  if (points.length === 1) return "SINGLE";
  if (points.length === 2) return points.every(([, y]) => y === points[0][1]) ? "H2" : "V2";
  if (points.length === 3) {
    if (points.every(([, y]) => y === points[0][1])) return "H3";
    if (points.every(([x]) => x === points[0][0])) return "V3";
    return "L3";
  }
  if (points.length === 4) {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    const height = Math.max(...ys) - Math.min(...ys) + 1;
    if (width === 2 && height === 2) return "SQ2";
    const keys = new Set(points.map(([x, y]) => `${x},${y}`));
    const degrees = points.map(([x, y]) => (
      [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => keys.has(`${x + dx},${y + dy}`)).length
    )).sort((a, b) => a - b);
    if (sameJson(degrees, [1, 1, 1, 3])) return "T4";
    if (sameJson(degrees, [1, 1, 2, 2])) return "L4";
  }
  return `OTHER_${points.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);

if (target.board.rows !== 12 || target.board.cols !== 7
  || target.board.playable_cell_count !== 50
  || target.full_level_block_count !== 29
  || target.full_level_occupied_cell_count !== 71
  || target.time_seconds !== 180
  || target.campaign_reposition_floor !== 14) {
  throw new Error("Lv73 scalar contract changed; redesign before regenerating this candidate");
}

const level = structuredClone(source);
level.name = "双层框架回廊";
level.width = 7;
level.height = 12;
level.playable = playableFromMask(recommendedMask);
level.timeSeconds = target.time_seconds;
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: target.campaign_reposition_floor,
};
delete level.blocked;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

if (isSq2PrefixProbe) {
  const openingById = new Map(level.blocks.filter((block) => !block.shutterId)
    .map((block) => [block.id, block]));
  if (candidateMode === "klotski-wide-shaft-mirror-probe") {
    for (const block of openingById.values()) {
      const shapeWidth = Math.max(...block.shape.map(([dx]) => dx)) + 1;
      block.x = 5 - shapeWidth - block.x;
      block.shape = block.shape.map(([dx, dy]) => [shapeWidth - 1 - dx, dy]);
    }
  }
  if (candidateMode === "klotski-hand-a-probe" || candidateMode === "klotski-hand-a-bulb-probe") {
    const handBottomPacking = {
      a: {
        h2: { x: 0, y: 3, shape: [[0, 0], [1, 0]] },
        single: { x: 0, y: 4, shape: [[0, 0]] },
        l3: { x: 1, y: 3, shape: [[1, 0], [0, 1], [1, 1]] },
      },
      b: {
        h2: { x: 1, y: 3, shape: [[0, 0], [1, 0]] },
        single: { x: 2, y: 4, shape: [[0, 0]] },
        l3: { x: 0, y: 3, shape: [[0, 0], [0, 1], [1, 1]] },
      },
      c: {
        h2: { x: 1, y: 4, shape: [[0, 0], [1, 0]] },
        single: { x: 2, y: 3, shape: [[0, 0]] },
        l3: { x: 0, y: 3, shape: [[0, 0], [1, 0], [0, 1]] },
      },
      d: {
        h2: { x: 0, y: 4, shape: [[0, 0], [1, 0]] },
        single: { x: 0, y: 3, shape: [[0, 0]] },
        l3: { x: 1, y: 3, shape: [[0, 0], [1, 0], [1, 1]] },
      },
    }[handVariant];
    const openingPacking = {
      "cc-piece-s1-01": { x: 1, y: 1, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "cc-piece-s1-02": { x: 3, y: 3, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "cc-piece-s1-03": { x: 3, y: 2, shape: [[0, 0], [1, 0]] },
      "cc-piece-s1-04": { x: 3, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      "strategy-guard-s1-05": { x: 2, y: 0, shape: [[0, 0]] },
      "cc-piece-s1-06": handBottomPacking.h2,
      "strategy-guard-s1-07": { x: 0, y: 0, shape: [[0, 0], [1, 0], [0, 1], [0, 2]] },
      "strategy-guard-s1-08": handBottomPacking.single,
      "cc-piece-s1-09": handBottomPacking.l3,
    };
    for (const block of openingById.values()) {
      const packed = openingPacking[block.id];
      if (!packed) throw new Error(`missing hand-a opening packing for ${block.id}`);
      Object.assign(block, structuredClone(packed));
    }
  }
  const recolor = (id, color, layers = null) => {
    const block = openingById.get(id);
    if (!block) throw new Error(`missing opening probe block ${id}`);
    block.color = color;
    if (layers) block.layers = [...layers];
    else delete block.layers;
  };
  recolor("cc-piece-s1-01", targetSq2Id === "cc-piece-s1-01" ? "blue" : "red");
  recolor("cc-piece-s1-02", "pink", ["pink", "blue"]);
  recolor("cc-piece-s1-03", "purple");
  recolor("cc-piece-s1-04", targetSq2Id === "cc-piece-s1-04" ? "blue" : "red");
  recolor("strategy-guard-s1-05", "orange");
  recolor("cc-piece-s1-06", "pink");
  recolor("strategy-guard-s1-07", "orange");
  recolor("strategy-guard-s1-08", "purple");
  recolor("cc-piece-s1-09", "yellow");
  if (candidateMode === "klotski-wide-shaft-mirror-probe"
    || candidateMode === "klotski-hand-a-probe"
    || candidateMode === "klotski-hand-a-bulb-probe") {
    recolor("cc-piece-s1-03", "purple");
    recolor("cc-piece-s1-06", "purple");
    recolor("strategy-guard-s1-05", "yellow");
    recolor("strategy-guard-s1-08", "yellow");
  }

  const isKlotskiProbe = candidateMode === "klotski-sq2-prefix-probe"
    || candidateMode === "klotski-wide-shaft-probe"
    || candidateMode === "klotski-wide-shaft-mirror-probe"
    || candidateMode === "klotski-hand-a-probe"
    || candidateMode === "klotski-hand-a-bulb-probe";
  const isBaselineUniqueProbe = candidateMode === "baseline-unique-sq2-probe";
  const bottomGateOffset = isKlotskiProbe ? 1 : 0;
  const dummyGate = isKlotskiProbe
    ? { side: "right", offset: 5, size: 1, color: "red" }
    : { side: "left", offset: 11, size: 1, color: "blue" };
  const lateGateSide = candidateMode === "klotski-wide-shaft-probe"
    || candidateMode === "klotski-wide-shaft-mirror-probe"
    || candidateMode === "klotski-hand-a-probe" ? "left" : "right";
  const bulbLateBottomOffsets = targetGateOffset === 0 ? [2, 3]
    : targetGateOffset === 2 ? [0, 1] : [0, 3];
  const gateSpecs = candidateMode === "klotski-hand-a-bulb-probe" ? [
    { side: "bottom", offset: targetGateOffset, size: 2, color: "blue" },
    dummyGate,
    { side: "left", offset: 0, size: 1, color: "purple", frozen: 1 },
    { side: "top", offset: 0, size: 2, color: "yellow", frozen: 3 },
    { side: "left", offset: 1, size: 2, color: "pink", frozen: 5 },
    { side: "top", offset: 2, size: 2, color: "orange", frozen: 6 },
    { side: "left", offset: 5, size: 1, color: "blue", frozen: 6 },
    { side: "left", offset: 3, size: 2, color: "red", frozen: 8 },
    { side: "top", offset: 4, size: 1, color: "pink", frozen: 19 },
    { side: "left", offset: 9, size: 1, color: "yellow", frozen: 20 },
    { side: "left", offset: 10, size: 1, color: "red", frozen: 22 },
    { side: "left", offset: 11, size: 1, color: "orange", frozen: 23 },
    { side: "bottom", offset: bulbLateBottomOffsets[0], size: 1, color: "purple", frozen: 24 },
    { side: "bottom", offset: bulbLateBottomOffsets[1], size: 1, color: "blue", frozen: 25 },
  ] : candidateMode === "klotski-wide-shaft-mirror-probe"
    || candidateMode === "klotski-hand-a-probe" ? [
    { side: "bottom", offset: 1, size: 2, color: "blue" },
    dummyGate,
    { side: "left", offset: 0, size: 1, color: "purple", frozen: 1 },
    { side: "top", offset: 0, size: 2, color: "yellow", frozen: 3 },
    { side: "left", offset: 1, size: 2, color: "pink", frozen: 5 },
    { side: "top", offset: 2, size: 2, color: "orange", frozen: 6 },
    { side: "left", offset: 5, size: 1, color: "blue", frozen: 6 },
    { side: "left", offset: 3, size: 2, color: "red", frozen: 8 },
    { side: "left", offset: 6, size: 1, color: "pink", frozen: 19 },
    { side: "left", offset: 7, size: 1, color: "yellow", frozen: 20 },
    { side: "left", offset: 8, size: 1, color: "red", frozen: 22 },
    { side: "left", offset: 9, size: 1, color: "orange", frozen: 23 },
    { side: "left", offset: 10, size: 1, color: "purple", frozen: 24 },
    { side: "left", offset: 11, size: 1, color: "blue", frozen: 25 },
  ] : isKlotskiProbe ? [
    { side: "bottom", offset: bottomGateOffset, size: 2, color: "blue" },
    dummyGate,
    { side: "left", offset: 0, size: 2, color: "pink", frozen: 1 },
    { side: "top", offset: 0, size: 2, color: "yellow", frozen: 3 },
    { side: "left", offset: 2, size: 1, color: "purple", frozen: 5 },
    { side: "top", offset: 2, size: 2, color: "orange", frozen: 6 },
    { side: "left", offset: 5, size: 1, color: "blue", frozen: 6 },
    { side: "left", offset: 3, size: 2, color: "red", frozen: 8 },
    { side: lateGateSide, offset: 6, size: 1, color: "pink", frozen: 19 },
    { side: lateGateSide, offset: 7, size: 1, color: "yellow", frozen: 20 },
    { side: lateGateSide, offset: 8, size: 1, color: "red", frozen: 22 },
    { side: lateGateSide, offset: 9, size: 1, color: "orange", frozen: 23 },
    { side: lateGateSide, offset: 10, size: 1, color: "purple", frozen: 24 },
    { side: lateGateSide, offset: 11, size: 1, color: "blue", frozen: 25 },
  ] : isBaselineUniqueProbe ? [
    { side: "top", offset: 0, size: 2, color: "blue" },
    { side: "right", offset: 1, size: 1, color: "red" },
    { side: "left", offset: 0, size: 2, color: "pink", frozen: 1 },
    { side: "top", offset: 2, size: 2, color: "yellow", frozen: 3 },
    { side: "left", offset: 2, size: 1, color: "purple", frozen: 5 },
    { side: "left", offset: 3, size: 3, color: "orange", frozen: 6 },
    { side: "top", offset: 4, size: 1, color: "blue", frozen: 6 },
    { side: "left", offset: 6, size: 2, color: "red", frozen: 8 },
    { side: "left", offset: 8, size: 1, color: "pink", frozen: 19 },
    { side: "left", offset: 9, size: 1, color: "yellow", frozen: 20 },
    { side: "left", offset: 10, size: 1, color: "red", frozen: 22 },
    { side: "left", offset: 11, size: 1, color: "orange", frozen: 23 },
    { side: "right", offset: 2, size: 1, color: "purple", frozen: 24 },
    { side: "right", offset: 3, size: 1, color: "blue", frozen: 25 },
  ] : [
    { side: "bottom", offset: bottomGateOffset, size: 2, color: "red" },
    dummyGate,
    { side: "top", offset: 0, size: 3, color: "yellow", frozen: 1 },
    { side: "top", offset: 3, size: 2, color: "blue", frozen: 3 },
    { side: "left", offset: 0, size: 2, color: "pink", frozen: 5 },
    { side: "left", offset: 2, size: 1, color: "purple", frozen: 6 },
    { side: "left", offset: 3, size: 1, color: "orange", frozen: 6 },
    { side: "left", offset: 4, size: 1, color: "red", frozen: 8 },
    { side: "left", offset: 5, size: 1, color: "blue", frozen: 19 },
    { side: "left", offset: 6, size: 1, color: "pink", frozen: 20 },
    { side: "left", offset: 7, size: 1, color: "purple", frozen: 22 },
    { side: "left", offset: 8, size: 1, color: "orange", frozen: 23 },
    { side: "left", offset: 9, size: 1, color: "red", frozen: 24 },
    { side: "left", offset: 10, size: 1, color: "yellow", frozen: 25 },
  ];
  level.gates.forEach((gate, index) => {
    Object.assign(gate, gateSpecs[index]);
    if (gateSpecs[index].frozen === undefined) delete gate.frozen;
    delete gate.star;
  });
  if (isKlotskiProbe) {
    const physicalCover = level.shutters?.find((item) => item.skin !== "staged-frame");
    if (!physicalCover) throw new Error("missing Lv73 physical cover");
    Object.assign(physicalCover, candidateMode === "klotski-wide-shaft-probe"
      || candidateMode === "klotski-wide-shaft-mirror-probe"
      || candidateMode === "klotski-hand-a-probe"
      ? { x: 0, y: 6, width: 1, height: 1 }
      : candidateMode === "klotski-hand-a-bulb-probe"
        ? { x: 3, y: 9, width: 1, height: 1 }
        : { x: 6, y: 6, width: 1, height: 1 });

    const stagedColors = {
      "cc-piece-s2-01": "red",
      "strategy-guard-s2-02": "purple",
      "cc-piece-s2-03": "purple",
      "cc-piece-s2-04": "blue",
      "cc-piece-s2-05": "purple",
      "cc-piece-s2-06": "red",
      "strategy-guard-s2-07": "blue",
      "strategy-guard-s2-08": "pink",
      "strategy-guard-s2-09": "yellow",
    };
    for (const block of level.blocks.filter((item) => item.shutterId
      && item.shutterId !== physicalCover.id)) {
      const color = stagedColors[block.id];
      if (!color) throw new Error(`missing staged-frame color for ${block.id}`);
      block.color = color;
      delete block.layers;
    }

    // The source cover batch was packed in the old lower-left tail.  Keep the
    // contract's exact stage histogram, but repack that still-hidden cohort
    // inside the 5x5 frame so every body remains valid under this probe mask.
    // By the time count=19 releases it, both earlier cohorts have cleared.
    const coverPacking = {
      "cc-piece-s3-01": { x: 4, y: 1, shape: [[0, 0]] },
      "cc-piece-s3-02": { x: 4, y: 2, shape: [[0, 0]] },
      "strategy-guard-s3-03": { x: 3, y: 3, shape: [[0, 0]] },
      "strategy-guard-s3-04": { x: 4, y: 3, shape: [[0, 0]] },
      "strategy-guard-s3-05": { x: 3, y: 0, shape: [[0, 0], [1, 0]] },
      "cc-piece-s3-06": { x: 2, y: 1, shape: [[0, 0], [0, 1]] },
      "strategy-guard-s3-07": { x: 0, y: 0, shape: [[0, 0], [1, 0], [2, 0]] },
      "cc-piece-s3-08": { x: 0, y: 1, shape: [[0, 0], [1, 0]] },
      "strategy-guard-s3-09": { x: 3, y: 1, shape: [[0, 0], [0, 1]] },
      "cc-piece-s3-10": { x: 0, y: 2, shape: [[0, 0], [1, 0], [0, 1]] },
      "strategy-guard-s3-11": { x: 1, y: 3, shape: [[0, 0], [1, 0], [1, 1]] },
    };
    const coverColors = {
      "cc-piece-s3-01": "pink",
      "cc-piece-s3-02": "yellow",
      "strategy-guard-s3-03": "red",
      "strategy-guard-s3-04": "orange",
      "strategy-guard-s3-05": "purple",
      "cc-piece-s3-06": "pink",
      "strategy-guard-s3-07": "blue",
      "cc-piece-s3-08": "yellow",
      "strategy-guard-s3-09": "red",
      "cc-piece-s3-10": "yellow",
      "strategy-guard-s3-11": "red",
    };
    for (const block of level.blocks.filter((item) => item.shutterId === physicalCover.id)) {
      const packed = coverPacking[block.id];
      if (!packed) throw new Error(`missing cover packing for ${block.id}`);
      Object.assign(block, structuredClone(packed));
      block.color = coverColors[block.id];
      delete block.layers;
    }
  }
}

runtime.validateLevel(level);

const cellsAt = (block, x = block.x, y = block.y) => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy])
);
const candidateExitSidesAt = (candidate, snapshot, block, x, y) => {
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const activeColor = block.layers?.[0] ?? block.color;
  return ["top", "right", "bottom", "left"].filter((side) => {
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === candidate.height - 1
        : side === "left" ? minX === 0
          : maxX === candidate.width - 1;
    if (!atEdge) return false;
    const gate = snapshot.gates.find((item) => {
      if (item.side !== side) return false;
      return side === "top" || side === "bottom"
        ? minX >= item.offset && maxX < item.offset + item.size
        : minY >= item.offset && maxY < item.offset + item.size;
    });
    return Boolean(gate && gate.frozen <= 0 && gate.color === activeColor
      && (!block.star || gate.star));
  });
};
const routePositionKey = (x, y) => `${x},${y}`;
const routePathTo = (reached, targetKey) => {
  const path = [];
  for (let cursor = targetKey; cursor;) {
    const entry = reached.get(cursor);
    if (!entry) break;
    path.push(entry.point);
    cursor = entry.parent;
  }
  return path.reverse().slice(1);
};
const enumerateCandidateDrags = (candidate, snapshot, model) => {
  runtime.restoreCandidateModel(model, snapshot);
  const drags = [];
  for (const snapshotBlock of snapshot.blocks) {
    const block = model.getBlock(snapshotBlock.id);
    if (!block || !model.isBlockActive(block)) continue;
    const startKey = routePositionKey(block.x, block.y);
    const reached = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
    const queue = [[block.x, block.y]];
    const directions = block.movementAxis === "horizontal"
      ? [[1, 0], [-1, 0]]
      : block.movementAxis === "vertical" ? [[0, 1], [0, -1]]
        : [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      const key = routePositionKey(x, y);
      const path = routePathTo(reached, key);
      const exits = candidateExitSidesAt(candidate, snapshot, snapshotBlock, x, y);
      for (const exitSide of exits) {
        drags.push({ blockId: block.id, path, exitSide, cost: 0 });
      }
      const moved = x !== block.x || y !== block.y;
      if (moved && exits.length) continue;
      if (moved) drags.push({ blockId: block.id, path, cost: 1 });
      for (const [dx, dy] of directions) {
        const nextX = x + dx;
        const nextY = y + dy;
        const nextKey = routePositionKey(nextX, nextY);
        if (reached.has(nextKey) || !model.canPlace(block, nextX, nextY)) continue;
        reached.set(nextKey, { point: [nextX, nextY], parent: key });
        queue.push([nextX, nextY]);
      }
    }
  }
  return drags;
};
const applyCandidateDrag = (candidate, snapshot, action, model) => {
  runtime.restoreCandidateModel(model, snapshot);
  model.beginAction();
  for (const [x, y] of action.path) {
    if (!model.moveBlockStep(action.blockId, x, y)) {
      model.cancelAction();
      throw new Error(`candidate route rejected ${action.blockId}@${x},${y}`);
    }
  }
  if (action.exitSide) {
    const result = model.tryExit(action.blockId, action.exitSide);
    if (!result.ok) {
      model.cancelAction();
      throw new Error(`candidate route rejected ${action.blockId}->${action.exitSide}: ${result.reason}`);
    }
  }
  if (!model.commitAction(true)) throw new Error(`candidate route did not commit ${action.blockId}`);
  return model.snapshot();
};
const routeSymmetryGroups = candidateMode === "klotski-wide-shaft-mirror-probe"
  || candidateMode === "klotski-hand-a-probe"
  || candidateMode === "klotski-hand-a-bulb-probe" ? [
  ["cc-piece-s1-03", "cc-piece-s1-06"],
  ["strategy-guard-s1-05", "strategy-guard-s1-08"],
] : [];
const routeSymmetryById = new Map(routeSymmetryGroups.flatMap((ids, groupIndex) => (
  ids.map((id) => [id, `g${groupIndex}`])
)));
const mutableBlockKey = (block, includeId = true) => [
  ...(includeId ? [block.id] : []),
  block.x,
  block.y,
  (block.layers ?? [block.color]).join("/"),
  block.frozen ?? 0,
  block.lockedBy ?? "-",
  block.lockCount ?? 0,
].join("@");
const routeStateKey = (snapshot) => {
  const ordinary = [];
  const grouped = new Map(routeSymmetryGroups.map((_ids, index) => [`g${index}`, []]));
  for (const block of snapshot.blocks) {
    const group = routeSymmetryById.get(block.id);
    if (group) grouped.get(group).push(mutableBlockKey(block, false));
    else ordinary.push(mutableBlockKey(block));
  }
  ordinary.sort();
  const symmetric = [...grouped].map(([group, entries]) => `${group}:${entries.sort().join("~")}`);
  return [
    `b:${ordinary.join("|")}`,
    `sym:${symmetric.join("|")}`,
    `q:${snapshot.queuedBlocks.map((block) => mutableBlockKey(block)).sort().join("|")}`,
    `g:${snapshot.gates.map((gate) => `${gate.id}:${gate.frozen}`).join("|")}`,
    `s:${snapshot.shutters.map((shutter) => `${shutter.id}:${shutter.count}`).join("|")}`,
    `cleared:${snapshot.cleared}`,
    `started:${snapshot.started ? 1 : 0}`,
    `failed:${snapshot.failed ? 1 : 0}`,
    `complete:${snapshot.complete ? 1 : 0}`,
  ].join(";");
};
const findNextClear = (candidate, startSnapshot, maxStates) => {
  const model = new runtime.PuzzleModel(candidate);
  const startKey = routeStateKey(startSnapshot);
  const buckets = Array.from({ length: 65 }, () => []);
  const heads = Array.from({ length: 65 }, () => 0);
  const best = new Map([[startKey, 0]]);
  const records = new Map([[startKey, { snapshot: startSnapshot, parent: null, action: null }]]);
  buckets[0].push(startKey);
  let explored = 0;
  let maxCostReached = 0;
  const targetAnchors = new Set();
  for (let cost = 0; cost < buckets.length; cost += 1) {
    while (heads[cost] < buckets[cost].length) {
      const key = buckets[cost][heads[cost]++];
      if (best.get(key) !== cost) continue;
      if (++explored > maxStates) return { solved: false, reason: "state-cap", explored };
      const record = records.get(key);
      maxCostReached = Math.max(maxCostReached, cost);
      const targetBlock = record.snapshot.blocks.find((block) => block.id === targetSq2Id);
      if (targetBlock) targetAnchors.add(`${targetBlock.x},${targetBlock.y}`);
      for (const action of enumerateCandidateDrags(candidate, record.snapshot, model)) {
        const next = applyCandidateDrag(candidate, record.snapshot, action, model);
        const nextCost = cost + action.cost;
        const nextKey = routeStateKey(next);
        if (next.cleared > startSnapshot.cleared) {
          const actions = [action];
          for (let cursor = key; cursor !== startKey;) {
            const prior = records.get(cursor);
            actions.push(prior.action);
            cursor = prior.parent;
          }
          actions.reverse();
          return { solved: true, explored, reposition_cost: nextCost, actions, snapshot: next };
        }
        if (nextCost >= buckets.length || nextCost >= (best.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
        best.set(nextKey, nextCost);
        records.set(nextKey, { snapshot: next, parent: key, action });
        buckets[nextCost].push(nextKey);
      }
    }
  }
  return {
    solved: false,
    reason: "frontier-exhausted",
    explored,
    max_cost_reached: maxCostReached,
    target_anchors: [...targetAnchors].sort(),
  };
};
const solveGreedyNextClear = (candidate, maxStates) => {
  const model = new runtime.PuzzleModel(candidate);
  let snapshot = model.snapshot();
  const drags = [];
  const stages = [];
  while (!snapshot.complete && stages.length < 64) {
    const step = findNextClear(candidate, snapshot, maxStates);
    stages.push({
      cleared_before: snapshot.cleared,
      active_blocks_before: snapshot.blocks.length,
      queued_blocks_before: snapshot.queuedBlocks.length,
      solved: step.solved,
      explored_states: step.explored,
      reposition_cost: step.reposition_cost ?? null,
      reason: step.reason ?? null,
      max_cost_reached: step.max_cost_reached ?? null,
      target_anchors: step.target_anchors ?? null,
    });
    if (!step.solved) return { solved: false, exploredStates: stages.reduce((sum, item) => sum + item.explored_states, 0), drags, stages };
    drags.push(...step.actions.map(({ cost: _cost, ...action }) => action));
    snapshot = step.snapshot;
  }
  return {
    solved: snapshot.complete,
    exploredStates: stages.reduce((sum, item) => sum + item.explored_states, 0),
    minimumDrags: drags.length,
    repositionOverhead: drags.filter((action) => !action.exitSide).length,
    drags,
    stages,
  };
};
const routeSolveResult = solveRouteMode === "validation"
  ? runtime.solveLevelForValidation(level, solveMaxStates)
  : solveRouteMode === "optimal"
    ? runtime.solveLevelOptimally(level, solveMaxStates)
    : solveRouteMode === "greedy-next-clear"
      ? solveGreedyNextClear(level, solveMaxStates)
      : null;
if (routeSolveResult && !routeSolveResult.solved) {
  const lastStage = routeSolveResult.stages?.at(-1);
  throw new Error(`Lv73 ${solveRouteMode} route search exhausted ${routeSolveResult.exploredStates} states${lastStage ? `; last=${JSON.stringify(lastStage)}` : ""}`);
}
const route = routeSolveResult?.drags
  ? structuredClone(routeSolveResult.drags)
  : candidateMode === "baseline" ? structuredClone(sourceRoute) : [];

const replay = (candidate, drags) => {
  const model = new runtime.PuzzleModel(candidate);
  let repositions = 0;
  let clearLayers = 0;
  let firstClearAction = null;
  const releaseEvents = [];
  for (const [dragIndex, action] of drags.entries()) {
    const before = model.snapshot();
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        throw new Error(`route action ${dragIndex + 1} move failed for ${action.blockId} at ${x},${y}`);
      }
    }
    if (action.exitSide) {
      const result = model.tryExit(action.blockId, action.exitSide);
      if (!result.ok) {
        throw new Error(`route action ${dragIndex + 1} exit failed for ${action.blockId}: ${result.reason}`);
      }
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route action ${dragIndex + 1} commit failed`);
    const after = model.snapshot();
    if (firstClearAction === null && after.cleared > before.cleared) firstClearAction = dragIndex + 1;
    for (const priorShutter of before.shutters) {
      const nextShutter = after.shutters.find((item) => item.id === priorShutter.id);
      if (priorShutter.count > 0 && nextShutter?.count === 0) {
        releaseEvents.push({ action: dragIndex + 1, cleared: after.cleared, shutter_id: priorShutter.id });
      }
    }
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete || snapshot.blocks.length || snapshot.queuedBlocks.length) {
    throw new Error(`route ended incomplete with ${snapshot.blocks.length} active blocks`);
  }
  return {
    actions: drags.length,
    repositions,
    clear_layers: clearLayers,
    first_clear_action: firstClearAction,
    repositions_before_first_clear: firstClearAction === null
      ? null
      : drags.slice(0, firstClearAction - 1).filter((action) => !action.exitSide).length,
    release_events: releaseEvents,
    final_snapshot_sha256: sha256(canonicalJson(snapshot)),
  };
};

const witnessMetrics = route.length ? replay(level, route) : null;
const independentWitnessMetrics = route.length
  ? replay(structuredClone(level), structuredClone(route))
  : null;
if (route.length && !sameJson(witnessMetrics, independentWitnessMetrics)) {
  throw new Error("independent PuzzleModel replay disagrees with the primary replay");
}
if (route.length) level.parMoves = route.length;

const stagedFrame = level.shutters?.find((item) => item.skin === "staged-frame");
const covers = (level.shutters ?? []).filter((item) => item.skin !== "staged-frame");
if (!stagedFrame || covers.length !== 1) throw new Error("Lv73 staged devices changed unexpectedly");
const cover = covers[0];
const opening = level.blocks.filter((block) => !block.shutterId);
const stagedBatch = level.blocks.filter((block) => block.shutterId === stagedFrame.id);
const coverBatch = level.blocks.filter((block) => block.shutterId === cover.id);
const clearColors = (blocks) => new Set(blocks.flatMap((block) => block.layers ?? [block.color]));
const frozenValues = level.gates.flatMap((gate) => gate.frozen ? [gate.frozen] : []).sort((a, b) => a - b);
const expectedFrozenValues = [...target.mechanism_contract.directional_exits.frozen_values].sort((a, b) => a - b);
const occupiedCells = level.blocks.reduce((sum, block) => sum + block.shape.length, 0);
const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
const exactChecks = {
  recommended_mask_scalars: level.playable.length === target.board.playable_cell_count,
  board: level.width === target.board.cols && level.height === target.board.rows,
  time: level.timeSeconds === target.time_seconds,
  blocks: level.blocks.length === target.full_level_block_count,
  occupied_cells: occupiedCells === target.full_level_occupied_cell_count,
  full_shapes: sameJson(histogram(level.blocks), target.full_level_shape_histogram),
  opening_stage: opening.length === target.stage_partitions[0].count
    && sameJson(histogram(opening), target.stage_partitions[0].shape_histogram),
  staged_frame_stage: stagedBatch.length === target.stage_partitions[1].count
    && sameJson(histogram(stagedBatch), target.stage_partitions[1].shape_histogram),
  cover_stage: coverBatch.length === target.stage_partitions[2].count
    && sameJson(histogram(coverBatch), target.stage_partitions[2].shape_histogram),
  colors: clearColors(opening).size === target.opening_color_count
    && clearColors(level.blocks).size === target.full_level_color_count,
  gates: level.gates.filter((gate) => !gate.frozen).length
      === target.mechanism_contract.directional_exits.ordinary_count
    && sameJson(frozenValues, expectedFrozenValues),
  shell: shellBlocks.length === 1 && opening.includes(shellBlocks[0])
    && shapeKind(shellBlocks[0]) === "SQ2" && shellBlocks[0].layers.length === 2
    && shellBlocks[0].layers[0] !== shellBlocks[0].layers[1],
  staged_frame: stagedFrame.count === 9 && stagedFrame.triggerBlockIds?.length === 9
    && stagedBatch.length === 9,
  cover: cover.count === 19 && coverBatch.length === 11,
  floor: level.designTargets.minimumRepositionOverhead === target.campaign_reposition_floor,
};
const failures = Object.entries(exactChecks).filter(([, passed]) => !passed).map(([key]) => key);
if (failures.length) throw new Error(`Lv73 exact contract checks failed: ${failures.join(", ")}`);

const candidateLevelSpecSha256 = levelSpecSha256(level);
const coreRouteFor = (blocks) => {
  const ids = new Set(blocks.map((block) => block.id));
  const removed = new Set();
  return route.flatMap((action) => {
    if (!ids.has(action.blockId) || removed.has(action.blockId)) return [];
    if (action.exitSide) removed.add(action.blockId);
    return [structuredClone(action)];
  });
};
const coreGroups = [
  {
    id: "opening-dense-frame",
    stage_key: "opening",
    block_ids: opening.map((block) => block.id),
    floor: openingCoreFloor,
    proof_method: coreProofMethod,
    route: coreRouteFor(opening),
  },
  {
    id: "staged-frame-dense-batch",
    stage_key: `shutter:${stagedFrame.id}`,
    block_ids: stagedBatch.map((block) => block.id),
    floor: stagedCoreFloor,
    proof_method: coreProofMethod,
    route: coreRouteFor(stagedBatch),
  },
];
const proofPlan = proofMode === "stage-cores" ? {
  level_id: "Lv073",
  source: "two disjoint nine-block staged-frame cohorts rebuilt under the verifier relaxation",
  proof_scope: "disjoint relaxed-core lower bound",
  level_spec_sha256: candidateLevelSpecSha256,
  groups: coreGroups,
} : {
  level_id: "Lv073",
  source: "exact initial PuzzleModel prefix with the 5x5 staged frame, physical cover and frozen exits retained",
  proof_scope: "whole-level lower bound from exhaustive first-clear prefix",
  proof_method: "physical_cover_prefix",
  level_spec_sha256: candidateLevelSpecSha256,
  target_reposition_overhead: target.campaign_reposition_floor,
  prefix_event: "first_clear_or_layer_removal",
  interchangeable_block_id_groups: candidateMode === "klotski-wide-shaft-mirror-probe"
    || candidateMode === "klotski-hand-a-probe"
    || candidateMode === "klotski-hand-a-bulb-probe" ? [
    ["cc-piece-s1-03", "cc-piece-s1-06"],
    ["strategy-guard-s1-05", "strategy-guard-s1-08"],
  ] : [],
  groups: [],
};
const shellCarrier = shellBlocks[0];
const entry = {
  level_id: "Lv073",
  search_attempt: "existing-dense-staged-frame-opening-exact-prefix-audit",
  target: structuredClone(target),
  recommended_board_mask: recommendedMask,
  contract_mask_rebind_required: !sameJson(recommendedMask, target.board.playable_mask),
  level,
  route,
  route_semantics: "fully_assembled_runtime",
  carrier_assignments: {
    numeric_ice: [],
    shells: [{
      block_id: shellCarrier.id,
      shape: "SQ2",
      layers: [...shellCarrier.layers],
      requirement_index: 0,
    }],
  },
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
  proof_plan: proofPlan,
};
const artifact = {
  schema_version: "blockout-video-parity-lv73-staged-frame-prefix-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    routes: { path: routesRelative, sha256: sha256(routesText) },
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: target.board.rows,
    cols: target.board.cols,
    playable_cell_count: target.board.playable_cell_count,
    block_count: target.full_level_block_count,
    occupied_cell_count: target.full_level_occupied_cell_count,
    shape_histogram: target.full_level_shape_histogram,
    opening_count: target.stage_partitions[0].count,
    staged_frame_hidden_count: target.stage_partitions[1].count,
    cover_hidden_count: target.stage_partitions[2].count,
    ordinary_exit_count: target.mechanism_contract.directional_exits.ordinary_count,
    frozen_values: expectedFrozenValues,
    cover_values: target.mechanism_contract.covers.values,
    required_reposition_floor: target.campaign_reposition_floor,
  },
  board_mask: recommendedMask,
  exact_contract_checks: exactChecks,
  levels: [entry],
};
const witnesses = route.length ? [{
  level_id: "Lv073",
  source: entry.search_attempt,
  proof_scope: "complete PuzzleModel replay; upper bound only",
  drags: route,
  metrics: witnessMetrics,
}] : [];

const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const witnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
const corePlanText = `${JSON.stringify([proofPlan], null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), witnessText, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), corePlanText, "utf8"),
]);

console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  candidate_level_spec_sha256: candidateLevelSpecSha256,
  proof_input_sha256: sha256(artifactText),
  proof_witness_sha256: sha256(witnessText),
  core_plan_sha256: sha256(corePlanText),
  proof_mode: proofMode,
  core_proof_method: coreProofMethod,
  candidate_mode: candidateMode,
  route_solve_mode: solveRouteMode,
  route_solve_result: routeSolveResult ? {
    solved: routeSolveResult.solved,
    explored_states: routeSolveResult.exploredStates,
    minimum_drags: routeSolveResult.minimumDrags,
    reposition_overhead: routeSolveResult.repositionOverhead,
  } : null,
  target_sq2_id: isSq2PrefixProbe ? targetSq2Id : null,
  recommended_board_mask: recommendedMask,
  contract_mask_rebind_required: !sameJson(recommendedMask, target.board.playable_mask),
  exact_contract_checks: exactChecks,
  witness_metrics: witnessMetrics,
  independent_replay_matches: route.length ? true : null,
}, null, 2));
