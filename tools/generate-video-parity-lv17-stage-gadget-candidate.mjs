import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Converts a whole-opening relaxed layout discovered by
// search-video-parity-stage-gadgets into an exact Lv17 runtime candidate.
// The competitor inventory, numeric ice, shells, frozen exits and timer are
// inherited unchanged from the assembled source runtime. Only anchors and the
// permutation of the existing outer colours are replaced.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv14-17-18-20-baseline-r35/runtime.generated.ts",
);
const searchRelative = option(
  "--search",
  ".codex-temp/lv17-stage-gadget-probe-r2.json",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv17-stage-gadget-candidate-r50",
);
const candidateIndex = Number(option("--candidate-index", "0"));
const maxStates = Number(option("--max-states", "2000000"));
const reassignMechanismsMode = Number(option("--reassign-mechanisms", "0"));
const emitLevelOnly = args.includes("--emit-level-only");
const swapAnchorsRaw = option("--swap-anchors", "").trim();
const swapFrozenRaw = option("--swap-frozen", "").trim();

const inputPath = resolve(root, inputRelative);
const [inputText, searchText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(resolve(root, searchRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const search = JSON.parse(searchText);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv017")?.our_design_target;
const opening = search.stages?.find((entry) => entry.stage_key === "opening");
const candidate = opening?.best?.[candidateIndex];
if (!target || !candidate) throw new Error("Lv17 target or searched candidate is missing");
if (candidate.reposition_overhead < target.campaign_reposition_floor) {
  throw new Error(`searched relaxed floor ${candidate.reposition_overhead} is below ${target.campaign_reposition_floor}`);
}

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelForValidation } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv17-stage-gadget-candidate-runtime.ts",
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
const source = runtime.levels.find((entry) => entry.id === 17);
if (!source) throw new Error("Lv17 is missing from the input runtime");

const level = structuredClone(source);
level.name = `${source.name} · 全局换位`;
level.timeSeconds = target.time_seconds;
for (const block of level.blocks) {
  const position = candidate.positions?.[block.id];
  const color = candidate.colors?.[block.id];
  if (!position || !color) throw new Error(`searched assignment missing ${block.id}`);
  [block.x, block.y] = position;
  block.color = color;
  if (block.layers?.length) block.layers[0] = color;
}
if (reassignMechanismsMode === 1) {
  // The source-frame contract fixes carrier shape/value histograms, not the
  // identity of a carrier. Move the counters/shells away from the only early
  // ordinary-gate escape so the exact schedule remains playable.
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
  }
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  for (const [id, value] of [
    ["cc-017-b1-12", 6], ["cc-017-b1-15", 6], ["cc-017-b1-19", 6],
    ["cc-017-b1-06", 18], ["cc-017-b1-08", 18],
    ["cc-017-b1-09", 19], ["cc-017-b1-11", 19],
  ]) byId.get(id).frozen = value;
  for (const [id, inner] of [
    ["cc-017-b1-16", "purple"],
    ["cc-017-b1-24", "blue"],
    ["cc-017-b1-17", "purple"],
  ]) {
    const block = byId.get(id);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 2) {
  // Mechanism-aware peel schedule for the dense whole-opening candidate:
  // 8 purple clears on the right, 8 blue clears on top, 5 yellow clears on
  // the left, 5 pink clears on the bottom, then the three red shell bodies.
  level.gates = [
    { id: "vp-017-gate-01", side: "right", offset: 0, size: 8, color: "purple" },
    { id: "vp-017-gate-02", side: "top", offset: 0, size: 4, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "left", offset: 0, size: 8, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "bottom", offset: 0, size: 6, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "top", offset: 4, size: 2, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const numbered = (values) => values.map((value) => `cc-017-b1-${String(value).padStart(2, "0")}`);
  const purple = numbered([2, 9, 10, 11, 19, 21, 22, 23]);
  const blue = numbered([1, 4, 7, 13, 17, 18, 20, 26]);
  const yellow = numbered([3, 5, 6, 12, 15]);
  const pink = numbered([8, 14, 16, 24, 25]);
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
    if (purple.includes(block.id)) block.color = "purple";
    else if (blue.includes(block.id)) block.color = "blue";
    else if (yellow.includes(block.id)) block.color = "yellow";
    else if (pink.includes(block.id)) block.color = "pink";
    else throw new Error(`Lv17 phase palette omitted ${block.id}`);
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [3, 18], [5, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "red"],
    [17, "purple"],
    [24, "red"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 3) {
  // Preserve the searched high-parking colour assignment, but bind the
  // competitor's four frozen-exit deadlines to a causal peel schedule. The
  // ordinary purple right edge has eight non-numeric outer layers available;
  // later colours open at the exact 8/16/21/26 countdown thresholds.
  level.gates = [
    { id: "vp-017-gate-01", side: "right", offset: 0, size: 8, color: "purple" },
    { id: "vp-017-gate-02", side: "top", offset: 0, size: 3, color: "yellow", frozen: 8 },
    { id: "vp-017-gate-03", side: "top", offset: 3, size: 3, color: "blue", frozen: 16 },
    { id: "vp-017-gate-04", side: "bottom", offset: 0, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [9, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "pink"],
    [17, "purple"],
    [24, "blue"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 4) {
  // Minimal repair of mode 3: exchange one initially right-edge red single
  // with a trapped purple V2, and place the one-extra-layer shells on the
  // required SQ2/V2/V2 shape histogram. Five distinct purple bodies plus the
  // second layer on b1-22 produce the six clears needed to thaw the H2 ice
  // carriers without flattening the searched parking geometry.
  level.gates = [
    { id: "vp-017-gate-01", side: "right", offset: 0, size: 8, color: "purple" },
    { id: "vp-017-gate-02", side: "top", offset: 0, size: 3, color: "yellow", frozen: 8 },
    { id: "vp-017-gate-03", side: "top", offset: 3, size: 3, color: "blue", frozen: 16 },
    { id: "vp-017-gate-04", side: "bottom", offset: 0, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
  }
  byId.get("cc-017-b1-02").color = "purple";
  byId.get("cc-017-b1-20").color = "red";
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [9, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [17, "purple"],
    [22, "purple"],
    [24, "blue"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 5) {
  // Same minimally changed palette/mechanism carriers as mode 4, with each
  // deadline colour assigned a disjoint full-edge lane. This removes the
  // artificial half-gate deadlock while retaining the dense parking layout.
  level.gates = [
    { id: "vp-017-gate-01", side: "right", offset: 0, size: 8, color: "purple" },
    { id: "vp-017-gate-02", side: "top", offset: 0, size: 6, color: "yellow", frozen: 8 },
    { id: "vp-017-gate-03", side: "bottom", offset: 0, size: 6, color: "blue", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 0, size: 4, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "left", offset: 4, size: 4, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
  }
  byId.get("cc-017-b1-02").color = "purple";
  byId.get("cc-017-b1-20").color = "red";
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [9, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [17, "purple"],
    [22, "purple"],
    [24, "blue"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 6) {
  // Variant of mode 5 with the yellow/blue full-edge lanes exchanged. The
  // searched layout keeps two late yellow singles on the lower rim, so the
  // bottom yellow lane supplies the sixteenth causal clear instead of
  // deadlocking one tick before the blue deadline opens.
  level.gates = [
    { id: "vp-017-gate-01", side: "right", offset: 0, size: 8, color: "purple" },
    { id: "vp-017-gate-02", side: "bottom", offset: 0, size: 6, color: "yellow", frozen: 8 },
    { id: "vp-017-gate-03", side: "top", offset: 0, size: 6, color: "blue", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 0, size: 4, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "left", offset: 4, size: 4, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
  }
  byId.get("cc-017-b1-02").color = "purple";
  byId.get("cc-017-b1-20").color = "red";
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [9, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [17, "purple"],
    [22, "purple"],
    [24, "blue"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 7) {
  // Route-order phase binding: retain the whole-opening parking geometry but
  // assign each outer layer to the edge it can reach in the discovered dense
  // peel order. High numeric counters are deliberately placed in the final
  // pink cohort; the sole H2 counter needed early thaws after six clears.
  level.gates = [
    { id: "vp-017-gate-01", side: "top", offset: 0, size: 6, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 0, size: 8, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "bottom", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 0, size: 8, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const numbered = (values) => values.map((value) => `cc-017-b1-${String(value).padStart(2, "0")}`);
  const cohorts = [
    ["purple", numbered([3, 4, 7, 9, 17, 19, 20, 26])],
    ["blue", numbered([1, 10, 13, 16, 21, 22, 23, 24])],
    ["yellow", numbered([2, 12, 15, 18, 25])],
    ["pink", numbered([5, 6, 8, 11, 14])],
  ];
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
    const cohort = cohorts.find(([, ids]) => ids.includes(block.id));
    if (!cohort) throw new Error(`Lv17 phase palette omitted ${block.id}`);
    block.color = cohort[0];
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [5, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "red"],
    [17, "purple"],
    [24, "red"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 8) {
  // Narrow-window variant of mode 7. The five gate/mechanism counts and
  // countdown values are unchanged, while each colour must route through the
  // competitor-sized three-cell aperture instead of a whole board edge.
  level.gates = [
    { id: "vp-017-gate-01", side: "top", offset: 0, size: 3, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 3, size: 3, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "bottom", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 3, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const numbered = (values) => values.map((value) => `cc-017-b1-${String(value).padStart(2, "0")}`);
  const cohorts = [
    ["purple", numbered([3, 4, 7, 9, 17, 19, 20, 26])],
    ["blue", numbered([1, 10, 13, 16, 21, 22, 23, 24])],
    ["yellow", numbered([2, 12, 15, 18, 25])],
    ["pink", numbered([5, 6, 8, 11, 14])],
  ];
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
    const cohort = cohorts.find(([, ids]) => ids.includes(block.id));
    if (!cohort) throw new Error(`Lv17 phase palette omitted ${block.id}`);
    block.color = cohort[0];
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [5, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "red"],
    [17, "purple"],
    [24, "red"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 9) {
  // Gate-blocking shell variant of mode 8. Moving the second V2 shell from
  // the late b1-24 carrier to the early b1-22 carrier leaves a red inner body
  // in the blue aperture while later blue blocks still need that lane. This
  // creates a real mandatory parking decision without changing any histogram.
  level.gates = [
    { id: "vp-017-gate-01", side: "top", offset: 0, size: 3, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 3, size: 3, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "bottom", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 3, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const numbered = (values) => values.map((value) => `cc-017-b1-${String(value).padStart(2, "0")}`);
  const cohorts = [
    ["purple", numbered([3, 4, 7, 9, 17, 19, 20, 26])],
    ["blue", numbered([1, 10, 13, 16, 21, 22, 23, 24])],
    ["yellow", numbered([2, 12, 15, 18, 25])],
    ["pink", numbered([5, 6, 8, 11, 14])],
  ];
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
    const cohort = cohorts.find(([, ids]) => ids.includes(block.id));
    if (!cohort) throw new Error(`Lv17 phase palette omitted ${block.id}`);
    block.color = cohort[0];
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [5, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "red"],
    [17, "purple"],
    [22, "red"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (reassignMechanismsMode === 10) {
  // Mandatory top-aperture shell variant. b1-20 peels while still occupying
  // the three-cell purple gate; its red V2 core must be parked before another
  // H3 can use that aperture. b1-24 becomes single-layer, so all shell/count/
  // shape histograms remain identical to mode 8.
  level.gates = [
    { id: "vp-017-gate-01", side: "top", offset: 0, size: 3, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 3, size: 3, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "bottom", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "left", offset: 3, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const numbered = (values) => values.map((value) => `cc-017-b1-${String(value).padStart(2, "0")}`);
  const cohorts = [
    ["purple", numbered([3, 4, 7, 9, 17, 19, 20, 26])],
    ["blue", numbered([1, 10, 13, 16, 21, 22, 23, 24])],
    ["yellow", numbered([2, 12, 15, 18, 25])],
    ["pink", numbered([5, 6, 8, 11, 14])],
  ];
  for (const block of level.blocks) {
    delete block.frozen;
    delete block.layers;
    const cohort = cohorts.find(([, ids]) => ids.includes(block.id));
    if (!cohort) throw new Error(`Lv17 phase palette omitted ${block.id}`);
    block.color = cohort[0];
  }
  for (const [id, value] of [
    [12, 6], [15, 6], [19, 6],
    [5, 18], [11, 18], [6, 19], [8, 19],
  ]) byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`).frozen = value;
  for (const [id, inner] of [
    [16, "red"],
    [17, "purple"],
    [20, "red"],
  ]) {
    const block = byId.get(`cc-017-b1-${String(id).padStart(2, "0")}`);
    block.layers = [block.color, inner];
  }
}
if (swapAnchorsRaw) {
  const ids = swapAnchorsRaw.split(",").map((value) => (
    value.startsWith("cc-") ? value : `cc-017-b1-${String(Number(value)).padStart(2, "0")}`
  ));
  if (ids.length !== 2 || ids.some((id) => !level.blocks.some((block) => block.id === id))) {
    throw new Error(`--swap-anchors expects two existing Lv17 block ids; received ${swapAnchorsRaw}`);
  }
  const [left, right] = ids.map((id) => level.blocks.find((block) => block.id === id));
  const shapeKey = (block) => JSON.stringify([...block.shape].sort(([ax, ay], [bx, by]) => ax - bx || ay - by));
  if (shapeKey(left) !== shapeKey(right)) {
    throw new Error(`--swap-anchors requires identical footprints; ${left.id} and ${right.id} differ`);
  }
  [left.x, right.x] = [right.x, left.x];
  [left.y, right.y] = [right.y, left.y];
}
if (swapFrozenRaw) {
  const ids = swapFrozenRaw.split(",").map((value) => (
    value.startsWith("cc-") ? value : `cc-017-b1-${String(Number(value)).padStart(2, "0")}`
  ));
  if (ids.length !== 2 || ids.some((id) => !level.blocks.some((block) => block.id === id))) {
    throw new Error(`--swap-frozen expects two existing Lv17 block ids; received ${swapFrozenRaw}`);
  }
  const [left, right] = ids.map((id) => level.blocks.find((block) => block.id === id));
  [left.frozen, right.frozen] = [right.frozen, left.frozen];
  if (left.frozen === undefined) delete left.frozen;
  if (right.frozen === undefined) delete right.frozen;
}
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: target.campaign_reposition_floor,
};
delete level.parMoves;
try {
  runtime.validateLevel(level);
} catch (error) {
  throw new Error(`Lv17 candidate validation failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (emitLevelOnly) {
  const outputDir = resolve(root, outputDirRelative);
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "level-only.json");
  const levelOnlyArtifact = {
    schema_version: "blockout-video-parity-lv17-level-only-v1",
    prototype_only: true,
    applied_to_live_campaign: false,
    source: {
      input: inputRelative,
      search: searchRelative,
      contract: contractRelative,
      reassign_mechanisms_mode: reassignMechanismsMode,
    },
    levels: [{
      level_id: "Lv017",
      target: {
        ...structuredClone(target),
        recommended_minimum_reposition_overhead: target.campaign_reposition_floor,
      },
      level,
    }],
  };
  const outputText = `${JSON.stringify(levelOnlyArtifact, null, 2)}\n`;
  const routesPath = resolve(outputDir, "empty-routes.json");
  await Promise.all([
    writeFile(outputPath, outputText, "utf8"),
    writeFile(routesPath, `${JSON.stringify({
      schema_version: "blockout-video-parity-empty-route-seed-v1",
      levels: [{ level_id: "Lv017", events: [] }],
    }, null, 2)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({
    output: relative(root, outputPath).replaceAll("\\", "/"),
    routes: relative(root, routesPath).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(outputText).digest("hex").toUpperCase(),
  }, null, 2));
  process.exit(0);
}

const solved = runtime.solveLevelForValidation(level, maxStates);
if (!solved.solved) {
  throw new Error(`exact Lv17 completion search exhausted ${solved.exploredStates} states`);
}
const route = solved.drags;
const replay = (spec, drags) => {
  const model = new runtime.PuzzleModel(spec);
  let repositions = 0;
  let clearLayers = 0;
  for (const [index, drag] of drags.entries()) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        throw new Error(`route action ${index + 1} move failed for ${drag.blockId} at ${x},${y}`);
      }
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) throw new Error(`route action ${index + 1} exit failed: ${result.reason}`);
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route action ${index + 1} failed to commit`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route left ${snapshot.blocks.length} board blocks`);
  return { actions: drags.length, repositions, clear_layers: clearLayers };
};
const witnessMetrics = replay(level, route);
if (witnessMetrics.repositions < target.campaign_reposition_floor) {
  throw new Error(`exact witness overhead ${witnessMetrics.repositions} is below target`);
}
level.parMoves = witnessMetrics.actions;

const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const levelSpecSha256 = sha256(JSON.stringify(canonicalize(level)));
const coreGroup = {
  id: "opening-whole-relaxed",
  stage_key: "opening",
  block_ids: [...opening.block_ids],
  floor: target.campaign_reposition_floor,
  proof_method: "exact_gameplay_frontier",
  route: candidate.route,
};
const entry = {
  level_id: "Lv017",
  search_attempt: `whole-opening-stage-gadget-candidate-${candidateIndex}`,
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  relaxed_search_metrics: {
    repositions: candidate.reposition_overhead,
    actions: candidate.minimum_drags,
    explored_states: candidate.explored_states,
  },
  core_groups: [coreGroup],
};
const artifact = {
  schema_version: "blockout-video-parity-lv17-whole-opening-stage-gadget-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    search: { path: searchRelative, sha256: sha256(searchText) },
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv017",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv017",
  level_spec_sha256: levelSpecSha256,
  source: "searched whole-opening relaxed core; verifier independently exhausts every route below the requested floor",
  proof_scope: "single relaxed-core lower bound",
  groups: [coreGroup],
}];

const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witnesses, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), `${JSON.stringify(corePlans, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  level_spec_sha256: levelSpecSha256,
  exact_completion_search_states: solved.exploredStates,
  witness_metrics: witnessMetrics,
  relaxed_search_metrics: entry.relaxed_search_metrics,
}, null, 2));
