import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/** Fresh, independent PuzzleModel replay for the isolated Lv84 runtime. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const levelsRelative = process.argv[2] ?? ".codex-temp/video-parity-lv84-keylock-seed/runtime.generated.ts";
const routesRelative = process.argv[3] ?? ".codex-temp/video-parity-lv84-keylock-seed/runtime-routes.json";
const outputRelative = process.argv[4] ?? ".codex-temp/video-parity-lv84-keylock-seed/fresh-replay-audit.json";
const assemblyAuditRelative = process.argv[5] ?? ".codex-temp/video-parity-lv84-keylock-seed/runtime-audit.json";
const contractRelative = process.argv[6] ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const absolute = (path) => resolve(root, path);
const display = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const [levelsText, routesText, assemblyAuditText, contractText] = await Promise.all([
  readFile(absolute(levelsRelative), "utf8"),
  readFile(absolute(routesRelative), "utf8"),
  readFile(absolute(assemblyAuditRelative), "utf8"),
  readFile(absolute(contractRelative), "utf8"),
]);
const bundle = await build({
  stdin: {
    contents: `
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { VIDEO_PARITY_LEVELS } from "${absolute(levelsRelative).replaceAll("\\", "/")}";
    `,
    resolveDir: root,
    sourcefile: "lv84-fresh-replay-entry.ts",
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
const level = VIDEO_PARITY_LEVELS.find((candidate) => candidate.id === 84);
const routeEntry = JSON.parse(routesText).find((entry) => entry.level_id === "Lv084");
const assemblyEntry = JSON.parse(assemblyAuditText).levels.find((entry) => entry.level_id === "Lv084");
const contractEntry = JSON.parse(contractText).levels.find((entry) => entry.level_id === "Lv084");
if (!level || !routeEntry?.drags?.length || !assemblyEntry || !contractEntry) {
  throw new Error("Lv084 runtime level, replay route, assembly audit, or contract entry is missing.");
}
validateLevel(level);

const execute = (model, drag, dragIndex) => {
  const block = model.getBlock(drag.blockId);
  if (!block) throw new Error(`drag ${dragIndex + 1}: missing ${drag.blockId}`);
  model.beginAction();
  for (let pathIndex = 0; pathIndex < (drag.path ?? []).length; pathIndex += 1) {
    const [x, y] = drag.path[pathIndex];
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
  if (!model.commitAction()) throw new Error(`drag ${dragIndex + 1}: no-op`);
};

const model = new PuzzleModel(level);
model.start();
routeEntry.drags.forEach((drag, index) => execute(model, drag, index));
const snapshot = model.snapshot();
if (!snapshot.complete) {
  throw new Error(`Lv084 fresh replay incomplete: ${snapshot.blocks.length} active blocks remain.`);
}

const actual = assemblyEntry.exact_contract?.actual;
const keyLock = actual?.key_locks?.[0];
const expectedKeys = ["cc-084-b1-01", "cc-084-b1-02", "cc-084-b2-04"];
const target = contractEntry.our_design_target;
const sorted = (values) => [...values].map(Number).sort((left, right) => left - right);
const contractChecks = {
  assembly_status: assemblyEntry.status === "assembled_and_replayed",
  assembly_validate_level: assemblyEntry.validate_level === "pass",
  exact_contract: assemblyEntry.exact_contract?.exact === true
    && assemblyEntry.exact_contract?.mismatches?.length === 0,
  runtime_completion_witness: assemblyEntry.completion_witness?.replayed === true,
  rows: level.height === target.board.rows,
  cols: level.width === target.board.cols,
  playable_cells: level.playable.length === target.board.playable_cell_count,
  blocks: level.blocks.length === target.full_level_block_count,
  time_seconds: level.timeSeconds === target.time_seconds,
  full_colors: actual.colors.full_logical_count === target.full_level_color_count,
  opening_colors: actual.colors.opening_visible_count === target.opening_color_count,
  ordinary_gates: actual.gates.ordinary_count === target.mechanism_contract.directional_exits.ordinary_count,
  frozen_values: JSON.stringify(sorted(actual.gates.frozen_values))
    === JSON.stringify(sorted(target.mechanism_contract.directional_exits.frozen_values)),
  shells: actual.shells.length === target.mechanism_contract.shells.count
    && actual.shells.every((shell) => shell.extraLayers === 1),
  covers: JSON.stringify(actual.covers.map((cover) => cover.value))
    === JSON.stringify(target.mechanism_contract.covers.values),
  cover_groups: JSON.stringify(actual.covers.map((cover) => cover.blockIds.length))
    === JSON.stringify(target.mechanism_contract.covers.hidden_batch_counts),
  key_ids: JSON.stringify(keyLock?.keyBlockIds) === JSON.stringify(expectedKeys),
  lock_id: keyLock?.lockBlockId === "cc-084-b1-05",
  lock_requirement: keyLock?.requirement === 3,
  key_lock_dependency_safe: keyLock?.dependencySafe === true,
};
if (!Object.values(contractChecks).every(Boolean)) {
  throw new Error(`Lv084 runtime acceptance failed: ${JSON.stringify(contractChecks)}.`);
}

const audit = {
  schema_version: "blockout-video-parity-lv84-fresh-replay-audit-v1",
  generated_on: new Date().toISOString(),
  inputs: {
    levels: { path: levelsRelative, sha256: sha256(levelsText) },
    routes: { path: routesRelative, sha256: sha256(routesText) },
    assembly_audit: { path: assemblyAuditRelative, sha256: sha256(assemblyAuditText) },
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  checks: {
    ...contractChecks,
    validate_level: true,
    fresh_independent_replay: true,
    complete: snapshot.complete,
    route_source: routeEntry.source,
    drags: routeEntry.drags.length,
    clear_layers: snapshot.cleared,
    moves: snapshot.moves,
  },
};
await mkdir(dirname(absolute(outputRelative)), { recursive: true });
await writeFile(absolute(outputRelative), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: display(absolute(outputRelative)), ...audit.checks }, null, 2));
