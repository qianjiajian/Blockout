import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const levelsRelative = process.env.VIDEO_PARITY_LV19_LEVELS_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/runtime.generated.ts";
const coreRouteRelative = process.env.VIDEO_PARITY_LV19_CORE_ROUTE_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/legacy-seed-r8/overrides.json";
const outputRelative = process.env.VIDEO_PARITY_LV19_WITNESS_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/completion-witness.json";
const corePlanRelative = process.env.VIDEO_PARITY_LV19_CORE_PLAN_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/core-plan.json";
const corridorRelative = process.env.VIDEO_PARITY_LV19_CORRIDOR_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/frozen-wall-corridor.json";
const corridorWitnessRelative = process.env.VIDEO_PARITY_LV19_CORRIDOR_WITNESS_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/frozen-wall-corridor-witness.json";
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().flatMap((key) => value[key] === undefined ? [] : [[key, canonical(value[key])]]),
  );
  return value;
};

const [levelsText, coreRouteText, contractText] = await Promise.all([
  readFile(resolve(root, levelsRelative), "utf8"),
  readFile(resolve(root, coreRouteRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const bundle = await build({
  stdin: {
    contents: `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(resolve(root, levelsRelative))}; export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};`,
    resolveDir: root, loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const level = runtime.levels.find((entry) => entry.id === 19);
if (!level) throw new Error("Lv19 missing");
runtime.validateLevel(level);
const source = JSON.parse(coreRouteText).levels.find((entry) => entry.level.id === 19);
const coreIds = new Set(Array.from({ length: 11 }, (_, index) => `core-019-c${String(index + 1).padStart(2, "0")}`));
const head = source.route.filter((event, index) => index === 0 || coreIds.has(event.blockId));
const drag = (blockId, path, exitSide) => ({ kind: "drag", blockId, path, ...(exitSide ? { exitSide } : {}) });
const route = [
  ...head,
  drag("core-019-s1-f03", [], "top"),
  drag("core-019-s1-f02", [[3, 0], [4, 0]], "top"),
  drag("core-019-s2-f05", [[4, 1], [4, 0]], "top"),
  drag("core-019-s2-f10", [[4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s2-f11", [[5, 2], [5, 1], [5, 0]], "top"),
  drag("core-019-s2-f04", [[3, 2], [4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s2-f03", [], "left"),
  drag("core-019-s2-f09", [[3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s1-f01", [[1, 0], [2, 0], [3, 0], [4, 0]], "top"),
  drag("core-019-s2-f08", [[1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s2-f06", [[0, 2], [0, 1], [0, 0]]),
  drag("core-019-s2-f02", [[4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s2-f01", [[3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"),
  drag("core-019-s2-f07", [[1, 3], [0, 3], [0, 2], [0, 1]], "left"),
  drag("core-019-s2-f06", [], "left"),
  drag("core-019-s1-f04", [[1, 5], [2, 5], [3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"),
];

const replay = () => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  for (const [index, event] of route.entries()) {
    for (const [x, y] of event.path) {
      if (!model.moveBlock(event.blockId, x, y)) throw new Error(`event ${index} ${event.blockId} rejected move ${x},${y}`);
    }
    if (event.exitSide) {
      const status = model.exitAttemptStatus(event.blockId, event.exitSide);
      if (status !== "ok") throw new Error(`event ${index} ${event.blockId} exit ${event.exitSide}: ${status}`);
      if (!model.tryExit(event.blockId, event.exitSide)) throw new Error(`event ${index} ${event.blockId} exit rejected`);
    } else {
      repositions += 1;
    }
  }
  if (!model.snapshot().complete) throw new Error(`fresh replay incomplete: ${model.snapshot().blocks.length} blocks remain`);
  return { complete: true, repositions, clear_actions: route.filter((event) => event.exitSide).length };
};
const first = replay();
const second = replay();
const levelSpecSha256 = sha256(JSON.stringify(canonical(level)));
const output = {
  schema_version: "blockout-video-parity-completion-witness-v1",
  contract_sha256: sha256(contractText),
  source_binding: {
    levels: { path: levelsRelative, sha256: sha256(levelsText) },
    contract: { path: contractRelative, sha256: sha256(contractText) },
    level_spec_sha256: levelSpecSha256,
  },
  levels: [{
    level_id: "Lv019", route, replayed: true,
    replay_authority: "fresh PuzzleModel; two independent model instances",
    metrics: first,
  }],
  verification: { validate_level: true, first, second },
};
const coreRoute = head.filter((event) => coreIds.has(event.blockId));
const corridorRoute = coreRoute.map((event) => ({
  ...event,
  path: event.path.map(([x, y]) => [x, y - 7]),
}));
const corridorLevel = {
  ...structuredClone(level),
  id: 19,
  name: "Lv19 frozen-wall deadline corridor proof",
  width: 6,
  height: 2,
  playable: Array.from({ length: 2 }, (_, y) => Array.from({ length: 6 }, (_, x) => [x, y])).flat(),
  gates: [
    { id: "lv19-core-cyan-left", side: "left", offset: 1, size: 1, color: "cyan" },
    { id: "lv19-core-green-right", side: "right", offset: 1, size: 1, color: "green" },
  ],
  blocks: level.blocks.filter((block) => coreIds.has(block.id)).map((block) => ({
    id: block.id, x: block.x, y: block.y - 7, shape: block.shape, color: block.color,
  })),
  shutters: undefined,
  generators: undefined,
  elevators: undefined,
  conveyors: undefined,
  blocked: undefined,
  designTargets: {
    formulaVersion: "frozen-wall-deadline-corridor-v1",
    calibratedDifficulty: 0,
    minimumRepositionOverhead: 12,
  },
};
runtime.validateLevel(corridorLevel);
const corridorLevelSpecSha256 = sha256(JSON.stringify(canonical(corridorLevel)));
const corridorArtifact = {
  schema_version: "blockout-video-parity-frozen-wall-corridor-v1",
  source_full_level_spec_sha256: levelSpecSha256,
  levels: [corridorLevel],
};
const corridorWitness = {
  schema_version: "blockout-video-parity-completion-witness-v1",
  levels: [{ level_id: "Lv019", route: corridorRoute, replayed: true }],
};
const corePlan = {
  schema_version: "blockout-video-parity-frozen-wall-deadline-plan-v1",
  contract_sha256: sha256(contractText),
  source_binding: {
    levels: { path: levelsRelative, sha256: sha256(levelsText) },
    level_spec_sha256: levelSpecSha256,
  },
  levels: [{
    level_id: "Lv019",
    source: "contract-exact isolated legacy corridor rebuilt without staging",
    proof_scope: "frozen-wall deadline projection lower bound",
    level_spec_sha256: levelSpecSha256,
    frozen_separator_block_ids: ["core-019-s1-f04", "core-019-s2-f01", "core-019-s2-f02"],
    separator_frozen_threshold: 20,
    below_separator_filler_block_id: "core-019-s2-f12",
    corridor_block_ids: [...coreIds],
    corridor_level_spec_sha256: corridorLevelSpecSha256,
    target_reposition_overhead: 12,
  }],
};
const text = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
const coreText = `${JSON.stringify(corePlan, null, 2)}\n`;
const corridorText = `${JSON.stringify(corridorArtifact, null, 2)}\n`;
const corridorWitnessText = `${JSON.stringify(corridorWitness, null, 2)}\n`;
const corePath = resolve(root, corePlanRelative);
const corridorPath = resolve(root, corridorRelative);
const corridorWitnessPath = resolve(root, corridorWitnessRelative);
await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(corePath), { recursive: true }),
  mkdir(dirname(corridorPath), { recursive: true }),
  mkdir(dirname(corridorWitnessPath), { recursive: true }),
]);
await Promise.all([
  writeFile(outputPath, text, "utf8"),
  writeFile(corePath, coreText, "utf8"),
  writeFile(corridorPath, corridorText, "utf8"),
  writeFile(corridorWitnessPath, corridorWitnessText, "utf8"),
]);
console.log(JSON.stringify({
  output: outputRelative, core_plan: corePlanRelative, level_spec_sha256: levelSpecSha256,
  route_events: route.length, ...first, sha256: sha256(text), core_plan_sha256: sha256(coreText),
  corridor: corridorRelative, corridor_level_spec_sha256: corridorLevelSpecSha256,
  corridor_witness: corridorWitnessRelative,
}, null, 2));
