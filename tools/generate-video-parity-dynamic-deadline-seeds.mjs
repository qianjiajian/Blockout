import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Narrow adapter for countdown-cover levels: the ordinary gate seed search
// must see the final competitor cover countdowns, not the base generator's
// cumulative staging counters. Otherwise it can assign early colours to blocks
// that the final runtime still conceals.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(root, process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");
const candidatesPath = resolve(root, process.env.VIDEO_PARITY_DYNAMIC_BASE_CANDIDATES_RELATIVE
  ?? ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json");
const outputDir = resolve(root, process.env.VIDEO_PARITY_DYNAMIC_DEADLINE_OUTPUT_DIR
  ?? ".codex-temp/video-parity-dynamic-deadline-seeds-final-cover-model");
const levelIds = process.env.VIDEO_PARITY_DYNAMIC_DEADLINE_LEVEL_IDS ?? "48,54,69,94";
const selected = new Set(levelIds.split(",").map(Number));
const repairedRoutesPath = process.env.VIDEO_PARITY_DYNAMIC_REPAIRED_BASE_ROUTES_RELATIVE
  ? resolve(root, process.env.VIDEO_PARITY_DYNAMIC_REPAIRED_BASE_ROUTES_RELATIVE)
  : null;

const [contractText, candidatesText] = await Promise.all([
  readFile(contractPath, "utf8"), readFile(candidatesPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const artifact = JSON.parse(candidatesText);
const repairedRouteById = repairedRoutesPath
  ? new Map(JSON.parse(await readFile(repairedRoutesPath, "utf8")).map((entry) => [
    Number(String(entry.level_id ?? entry.id).replace(/^Lv/i, "")), structuredClone(entry.events ?? entry.route ?? []),
  ]))
  : new Map();
const byId = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry.our_design_target,
]));
const shapeId = (shape) => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (shape.length === 1) return "SINGLE";
  if (height === 1) return `H${width}`;
  if (width === 1) return `V${height}`;
  if (width === 2 && height === 2 && shape.length === 4) return "SQ2";
  if (width === 2 && height === 2 && shape.length === 3) return "L3";
  if (shape.length === 4 && ((width === 2 && height === 3) || (width === 3 && height === 2))) {
    const occupied = new Set(shape.map(([x, y]) => `${x - Math.min(...xs)},${y - Math.min(...ys)}`));
    const maxNeighbours = Math.max(...[...occupied].map((key) => {
      const [x, y] = key.split(",").map(Number);
      return [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => occupied.has(`${x + dx},${y + dy}`)).length;
    }));
    return maxNeighbours >= 3 ? "T4" : "L4";
  }
  return `CELLS_${shape.length}_${width}X${height}`;
};
for (const entry of artifact.levels ?? artifact) {
  const level = entry.level ?? entry;
  if (!selected.has(Number(level.id))) continue;
  const target = byId.get(Number(level.id));
  const values = target?.mechanism_contract?.covers?.values ?? [];
  const shutters = level.shutters ?? [];
  const hiddenStages = (target?.stage_partitions ?? []).filter((stage) => stage.kind !== "opening");
  if (hiddenStages.length !== shutters.length) {
    throw new Error(`Lv${level.id}: ${hiddenStages.length} hidden contract stages but ${shutters.length} base stages`);
  }
  const coverShutters = hiddenStages.flatMap((stage, index) => (
    stage.kind === "countdown_cover" ? [shutters[index]] : []
  ));
  if (values.length !== coverShutters.length) {
    throw new Error(`Lv${level.id}: ${values.length} final cover values but ${coverShutters.length} countdown-cover stages`);
  }
  coverShutters.forEach((shutter, index) => {
    shutter.count = Number(values[index]);
    shutter.skin = "shutter";
  });

  // Model contracted shell clears because cover/frozen-exit counters decrement
  // per removed colour layer. The plain base peel route is expanded with an
  // additional held-edge exit for every seeded outer layer.
  const opening = level.blocks.filter((block) => !block.shutterId);
  const stageById = new Map(hiddenStages
    .map((stage, index) => [stage.id, shutters[index]?.id]));
  const rankedIds = entry.route.filter((event) => event.exitSide).map((event) => event.blockId);
  const rank = new Map(rankedIds.map((id, index) => [id, index]));
  const chosen = [];
  const shellContract = target?.mechanism_contract?.shells;
  if (shellContract?.items?.length) {
    for (const item of shellContract.items) {
      const shutterId = stageById.get(item.stage_id);
      const block = level.blocks
        .filter((candidate) => !chosen.includes(candidate.id)
          && shapeId(candidate.shape) === item.shape
          && (!item.stage_id || candidate.shutterId === shutterId))
        .sort((left, right) => (rank.get(right.id) ?? -1) - (rank.get(left.id) ?? -1)
          || left.id.localeCompare(right.id))[0];
      if (!block) throw new Error(`Lv${level.id}: no ${item.shape} shell carrier in ${item.stage_id}`);
      chosen.push(block.id);
      block.layers = Array.from({ length: 1 + Number(item.extra_layers ?? 1) }, () => block.color);
    }
  } else {
    const count = Number(shellContract?.count ?? 0);
    const openingCount = Number(shellContract?.opening_visible_count ?? 0);
    const pool = [...opening].sort((left, right) => (rank.get(right.id) ?? -1) - (rank.get(left.id) ?? -1)
      || left.id.localeCompare(right.id));
    for (let index = 0; index < count; index += 1) {
      const block = index < openingCount ? pool.shift() : level.blocks.find((candidate) => !chosen.includes(candidate.id));
      if (!block) throw new Error(`Lv${level.id}: no shell carrier ${index + 1}`);
      chosen.push(block.id);
      block.layers = [block.color, block.color];
    }
  }
  if (repairedRouteById.has(Number(level.id))) {
    entry.route = repairedRouteById.get(Number(level.id));
  } else if (chosen.length) {
    entry.route = entry.route.flatMap((event) => {
      if (!event.exitSide || !chosen.includes(event.blockId)) return [event];
      return [event, { ...structuredClone(event), path: [], purpose: "contracted-shell-second-layer" }];
    });
  }
}
await mkdir(outputDir, { recursive: true });
const transformedPath = resolve(outputDir, "final-cover-model-candidates.json");
await writeFile(transformedPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "final-cover-model-routes.json"), `${JSON.stringify(
  (artifact.levels ?? artifact)
    .filter((entry) => selected.has(Number(entry.level?.id ?? entry.id)))
    .map((entry) => ({
      level_id: `Lv${String(entry.level?.id ?? entry.id).padStart(3, "0")}`,
      replayed: true,
      events: structuredClone(entry.route ?? []),
    })),
  null,
  2,
)}\n`, "utf8");

const child = spawn(process.execPath, [
  resolve(root, "tools/generate-video-parity-gate-deadline-seeds.mjs"),
  "--contract", contractPath,
  "--base-candidates", transformedPath,
  "--level-ids", levelIds,
  "--output-dir", outputDir,
], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    VIDEO_PARITY_GATE_REQUIRE_CONTRACT_OPENING_COLORS: "1",
    VIDEO_PARITY_GATE_FORCE_ALTERNATIVE_LAYOUTS: "1",
  },
});
const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolveExit(code ?? 1));
});
if (exitCode !== 0) process.exitCode = exitCode;
