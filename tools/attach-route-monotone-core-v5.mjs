import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const input = resolve(ROOT, arg("--input"));
const output = resolve(ROOT, arg("--output"));
const levelNumber = Number(arg("--level"));
if (!input || !output || !Number.isSafeInteger(levelNumber)) throw new Error("--input, --output and --level are required");

const artifact = JSON.parse(await readFile(input, "utf8"));
const source = artifact.levels.find((entry) => entry.level?.id === levelNumber);
if (!source) throw new Error(`Lv${levelNumber} is missing`);
const candidate = structuredClone(source);
const shutters = [...(candidate.level.shutters ?? [])].filter((item) => item.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
const stageBlockIds = [
  candidate.level.blocks.filter((block) => !block.shutterId).map((block) => block.id),
  ...shutters.map((shutter) => candidate.level.blocks.filter((block) => block.shutterId === shutter.id).map((block) => block.id)),
];
const target = candidate.target?.recommended_minimum_reposition_overhead
  ?? candidate.target?.solver_acceptance?.minimum_reposition_overhead
  ?? candidate.audit?.target_reposition_overhead
  ?? candidate.level.designTargets?.minimumRepositionOverhead;
let remaining = target;
const allocations = Array(stageBlockIds.length).fill(0);
const groups = [];
const requestedAllocations = arg("--allocations")?.split(",").map(Number) ?? null;
const allStageBlocks = args.includes("--all-stage-blocks");
if (requestedAllocations && (requestedAllocations.length !== stageBlockIds.length
  || requestedAllocations.some((value) => !Number.isSafeInteger(value) || value < 0)
  || requestedAllocations.reduce((sum, value) => sum + value, 0) !== target)) {
  throw new Error(`--allocations must contain ${stageBlockIds.length} non-negative integers summing to ${target}`);
}
for (let stageIndex = 0; stageIndex < stageBlockIds.length && remaining > 0; stageIndex += 1) {
  const stageIds = new Set(stageBlockIds[stageIndex]);
  const repositionIds = allStageBlocks
    ? [...stageIds]
    : [...new Set(candidate.route
      .filter((drag) => stageIds.has(drag.blockId) && !drag.exitSide)
      .map((drag) => drag.blockId))];
  const projectedRoute = candidate.route.filter((drag) => repositionIds.includes(drag.blockId));
  const witnessOverhead = projectedRoute.filter((drag) => !drag.exitSide).length;
  if (!repositionIds.length || witnessOverhead <= 0) continue;
  const allocation = requestedAllocations
    ? requestedAllocations[stageIndex]
    : Math.min(remaining, witnessOverhead);
  if (allocation === 0) continue;
  if (allocation > witnessOverhead) throw new Error(`Stage ${stageIndex + 1} witness overhead is below requested allocation`);
  allocations[stageIndex] = allocation;
  groups.push({
    stage_index: stageIndex + 1,
    block_ids: repositionIds,
    target_reposition_overhead: allocation,
    route: projectedRoute,
  });
  remaining -= allocation;
}
if (remaining > 0) throw new Error(`Witness overhead cannot cover target; ${remaining} remains`);
candidate.audit = {
  ...(candidate.audit ?? {}),
  generator: "dense_route_monotone_core_v5",
  strict_stage_floor_allocation: allocations,
  strict_core_floor_groups: groups,
  route_monotone_core: {
    source_generator: source.audit?.generator ?? null,
    allocations,
    group_block_counts: groups.map((group) => group.block_ids.length),
  },
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({
  title: `Lv${String(levelNumber).padStart(3, "0")} dense route monotone-core candidate`,
  applied_to_live_campaign: false,
  levels: [candidate],
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ level: levelNumber, target, allocations, groups: groups.map((group) => ({
  stage_index: group.stage_index,
  block_count: group.block_ids.length,
  target: group.target_reposition_overhead,
  route_overhead: group.route.filter((drag) => !drag.exitSide).length,
})) }, null, 2));
