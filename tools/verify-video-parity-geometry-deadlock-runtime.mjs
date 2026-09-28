import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Independently verify the Lv083/Lv098/Lv100 geometry-deadlock runtime slice.
 * The verifier imports the emitted LevelSpecs, validates each one, creates a
 * fresh PuzzleModel per level, and replays every recorded drag from scratch.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  levels: ".codex-temp/video-parity-geometry-deadlock-seeds/runtime.generated.ts",
  routes: ".codex-temp/video-parity-geometry-deadlock-seeds/runtime-routes.json",
  runtimeAudit: ".codex-temp/video-parity-geometry-deadlock-seeds/runtime-audit.json",
  output: ".codex-temp/video-parity-geometry-deadlock-seeds/verification.json",
};
const keys = new Map([
  ["--contract", "contract"],
  ["--levels", "levels"],
  ["--routes", "routes"],
  ["--runtime-audit", "runtimeAudit"],
  ["--output", "output"],
]);
const options = { ...defaults };
for (let index = 0; index < process.argv.slice(2).length; index += 1) {
  const argv = process.argv.slice(2);
  const key = keys.get(argv[index]);
  if (!key) throw new Error(`Unknown option: ${argv[index]}`);
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
  options[key] = value;
  index += 1;
}

const absolute = (path) => resolve(root, path);
const displayPath = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (source) => createHash("sha256").update(source).digest("hex").toUpperCase();
const [contractText, levelsText, routesText, runtimeAuditText] = await Promise.all([
  readFile(absolute(options.contract), "utf8"),
  readFile(absolute(options.levels), "utf8"),
  readFile(absolute(options.routes), "utf8"),
  readFile(absolute(options.runtimeAudit), "utf8"),
]);
const contractSha = sha256(contractText);
const runtimeAudit = JSON.parse(runtimeAuditText);
const routes = JSON.parse(routesText);
const requiredIds = [83, 98, 100];

if (runtimeAudit.inputs?.contract?.sha256 !== contractSha) {
  throw new Error(`Runtime audit contract SHA ${runtimeAudit.inputs?.contract?.sha256} does not match ${contractSha}.`);
}
if (runtimeAudit.run_configuration?.selected_level_ids?.join(",") !== requiredIds.join(",")) {
  throw new Error("Runtime audit is not the isolated Lv083/Lv098/Lv100 replay slice.");
}

const bundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { VIDEO_PARITY_LEVELS } from ${JSON.stringify(`./${displayPath(absolute(options.levels))}`)};
      export { PuzzleModel, validateLevel, VIDEO_PARITY_LEVELS };
    `,
    resolveDir: root,
    sourcefile: "geometry-deadlock-runtime-verifier-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { PuzzleModel, validateLevel, VIDEO_PARITY_LEVELS } = await import(moduleUrl);

const routeById = new Map(routes.map((entry) => [
  Number(String(entry.level_id ?? entry.levelId ?? entry.id).replace(/^Lv/i, "")),
  entry.drags ?? entry.route ?? [],
]));
const runtimeAuditById = new Map(runtimeAudit.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry,
]));

const replayFresh = (level, drags) => {
  const model = new PuzzleModel(level);
  model.start();
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  for (const [dragIndex, drag] of drags.entries()) {
    if (!model.getBlock(drag.blockId) && timedIntervals.length) model.tick(Math.max(...timedIntervals));
    if (!model.getBlock(drag.blockId)) throw new Error(`drag ${dragIndex + 1}: ${drag.blockId} is not active`);
    model.beginAction();
    for (const [pathIndex, [x, y]] of (drag.path ?? []).entries()) {
      const before = model.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      const after = model.getBlock(drag.blockId);
      if (!moved || !after || after.x !== x || after.y !== y) {
        throw new Error(`drag ${dragIndex + 1} step ${pathIndex + 1}: cannot move ${drag.blockId} to ${x},${y}`);
      }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      throw new Error(`drag ${dragIndex + 1}: cannot exit ${drag.blockId} via ${drag.exitSide}`);
    }
    if (!model.commitAction()) throw new Error(`drag ${dragIndex + 1}: action did not mutate the puzzle`);
    if (timedIntervals.length) model.tick(Math.max(...timedIntervals));
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) {
    throw new Error(`${snapshot.blocks.length} active and ${snapshot.queuedBlocks.length} queued blocks remain`);
  }
  return { complete: true, moves: snapshot.moves, cleared: snapshot.cleared };
};

const results = requiredIds.map((id) => {
  const label = `Lv${String(id).padStart(3, "0")}`;
  const level = VIDEO_PARITY_LEVELS.find((candidate) => candidate.id === id);
  const drags = routeById.get(id);
  const priorAudit = runtimeAuditById.get(id);
  if (!level || !Array.isArray(drags) || !priorAudit) throw new Error(`${label}: runtime level, route, or audit is missing.`);
  validateLevel(level);
  if (priorAudit.validate_level !== "pass" || priorAudit.exact_contract?.exact !== true
    || priorAudit.completion_witness?.replayed !== true || priorAudit.status !== "assembled_and_replayed") {
    throw new Error(`${label}: assembly audit did not satisfy validate + exact contract + replay.`);
  }
  const replay = replayFresh(level, drags);
  return {
    level_id: label,
    validate_level: "pass",
    exact_contract: true,
    assembly_replay: true,
    fresh_independent_replay: replay.complete,
    route_drags: drags.length,
    runtime_moves: replay.moves,
    cleared: replay.cleared,
    assembly_route_source: priorAudit.completion_witness.source,
  };
});

const verification = {
  schema_version: "blockout-video-parity-geometry-deadlock-runtime-verification-v1",
  generated_on: new Date().toISOString(),
  inputs: {
    contract: { path: options.contract, sha256: contractSha },
    levels: { path: options.levels, sha256: sha256(levelsText) },
    routes: { path: options.routes, sha256: sha256(routesText) },
    runtime_audit: { path: options.runtimeAudit, sha256: sha256(runtimeAuditText) },
  },
  policy: "Each required level must validate, match the exact active contract, have an assembly replay, and complete in a second fresh PuzzleModel replay.",
  summary: {
    requested: requiredIds.length,
    validate_level_passed: results.filter((entry) => entry.validate_level === "pass").length,
    exact_contract: results.filter((entry) => entry.exact_contract).length,
    assembly_replayed: results.filter((entry) => entry.assembly_replay).length,
    fresh_independent_replayed: results.filter((entry) => entry.fresh_independent_replay).length,
    failed: results.filter((entry) => !entry.fresh_independent_replay).length,
  },
  levels: results,
};
const outputPath = absolute(options.output);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(JSON.stringify(verification, null, 2));
