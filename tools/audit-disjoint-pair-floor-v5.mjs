import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL), "..");

const parseArgs = (argv) => {
  const options = { input: null, levels: null, pairStateCap: 20_000 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") { options.input = resolve(ROOT, value); index += 1; }
    else if (argument === "--levels") { options.levels = value; index += 1; }
    else if (argument === "--pair-state-cap") { options.pairStateCap = Number(value); index += 1; }
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.input) throw new Error("--input is required");
  return options;
};

const selectedIds = (specification) => {
  if (!specification) return null;
  const selected = new Set();
  for (const token of specification.split(",").map((value) => value.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    for (let id = from; id <= to; id += 1) selected.add(id);
  }
  return selected;
};

const options = parseArgs(process.argv.slice(2));
const selection = selectedIds(options.levels);
const artifact = JSON.parse(await readFile(options.input, "utf8"));

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "audit-disjoint-pair-floor-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const clone = (value) => structuredClone(value);

const shutterFootprint = (shutter) => {
  const cells = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.push([x, y]);
  }
  return cells;
};

const stageGroups = (level) => {
  const internal = [...(level.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  const groups = [
    level.blocks.filter((block) => !block.shutterId),
    ...internal.map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id)),
  ];
  return groups.map((blocks, stageIndex) => {
    const stage = clone(level);
    stage.blocks = blocks.map((block) => {
      const copy = clone(block);
      delete copy.shutterId;
      return copy;
    });
    const futureCoverCells = internal.slice(stageIndex).flatMap(shutterFootprint);
    const uniqueBlocked = new Map([...(level.blocked ?? []), ...futureCoverCells]
      .map((cell) => [`${cell[0]},${cell[1]}`, cell]));
    stage.blocked = [...uniqueBlocked.values()];
    delete stage.shutters;
    delete stage.elevators;
    delete stage.conveyors;
    return { blocks, stage };
  });
};

const relaxedPairLevel = (sourceStage, pair) => {
  const level = clone(sourceStage);
  level.name = `${sourceStage.name} relaxed disjoint-pair audit`;
  level.blocks = pair.map((block) => {
    const copy = clone(block);
    delete copy.shutterId;
    delete copy.frozen;
    delete copy.star;
    return copy;
  });
  level.gates = level.gates.map((gate) => {
    const copy = { ...gate };
    delete copy.frozen;
    delete copy.star;
    return copy;
  });
  delete level.shutters;
  delete level.elevators;
  delete level.conveyors;
  delete level.designTargets;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  delete level.featureIntro;
  return level;
};

const findMatching = (blocks, edges, target) => {
  if (target <= 0) return [];
  const adjacency = Array.from({ length: blocks.length }, () => []);
  for (const [left, right] of edges) {
    adjacency[left].push(right);
    adjacency[right].push(left);
  }
  const memo = new Set();
  const fullMask = (1n << BigInt(blocks.length)) - 1n;
  const visit = (mask, remaining) => {
    if (remaining <= 0) return [];
    let available = 0;
    for (let index = 0; index < blocks.length; index += 1) {
      if ((mask & (1n << BigInt(index))) !== 0n) available += 1;
    }
    if (Math.floor(available / 2) < remaining) return null;
    const key = `${mask.toString(36)}|${remaining}`;
    if (memo.has(key)) return null;
    memo.add(key);
    let pivot = -1;
    let neighbors = [];
    for (let index = 0; index < blocks.length; index += 1) {
      if ((mask & (1n << BigInt(index))) === 0n) continue;
      const viable = adjacency[index].filter((other) => (mask & (1n << BigInt(other))) !== 0n);
      if (pivot < 0 || viable.length < neighbors.length) {
        pivot = index;
        neighbors = viable;
        if (!viable.length) break;
      }
    }
    if (pivot < 0) return null;
    const withoutPivot = mask & ~(1n << BigInt(pivot));
    for (const other of neighbors) {
      const suffix = visit(withoutPivot & ~(1n << BigInt(other)), remaining - 1);
      if (suffix) return [[pivot, other], ...suffix];
    }
    return visit(withoutPivot, remaining);
  };
  return visit(fullMask, target);
};

const rows = [];
for (const candidate of artifact.levels ?? []) {
  const numericId = Number((candidate.level_id ?? `Lv${candidate.level?.id}`).replace("Lv", ""));
  if (selection && !selection.has(numericId)) continue;
  const floor = candidate.target?.recommended_minimum_reposition_overhead
    ?? candidate.target?.solver_acceptance?.minimum_reposition_overhead
    ?? candidate.audit?.target_reposition_overhead
    ?? candidate.level?.designTargets?.minimumRepositionOverhead
    ?? 0;
  const groups = stageGroups(candidate.level);
  let remaining = floor;
  const certificates = [];
  const stageAudits = [];
  for (let stageIndex = 0; stageIndex < groups.length; stageIndex += 1) {
    const { blocks, stage } = groups[stageIndex];
    const edges = [];
    const edgeDetails = new Map();
    for (let left = 0; left < blocks.length; left += 1) {
      for (let right = left + 1; right < blocks.length; right += 1) {
        const pairLevel = relaxedPairLevel(stage, [blocks[left], blocks[right]]);
        try { runtime.validateLevel(pairLevel); } catch { continue; }
        const solution = runtime.solveLevelOptimally(pairLevel, options.pairStateCap);
        if (!solution.solved || !Number.isFinite(solution.repositionOverhead) || solution.repositionOverhead < 1) continue;
        edges.push([left, right]);
        edgeDetails.set(`${left},${right}`, {
          minimum_reposition_overhead: solution.repositionOverhead,
          explored_states: solution.exploredStates,
        });
      }
    }
    const wanted = Math.min(remaining, Math.floor(blocks.length / 2));
    let matching = null;
    for (let count = wanted; count >= 1 && !matching; count -= 1) matching = findMatching(blocks, edges, count);
    matching ??= [];
    const stageCertificates = matching.map(([left, right]) => ({
      block_ids: [blocks[left].id, blocks[right].id],
      ...edgeDetails.get(`${Math.min(left, right)},${Math.max(left, right)}`),
    }));
    certificates.push(...stageCertificates.map((certificate) => ({ stage_index: stageIndex + 1, ...certificate })));
    remaining -= stageCertificates.length;
    stageAudits.push({
      stage_index: stageIndex + 1,
      block_count: blocks.length,
      pair_edge_count: edges.length,
      selected_disjoint_pair_count: stageCertificates.length,
      selected_pairs: stageCertificates,
    });
  }
  rows.push({
    level_id: candidate.level_id ?? `Lv${String(numericId).padStart(3, "0")}`,
    target_floor: floor,
    certified_disjoint_pair_floor: certificates.length,
    target_met: certificates.length >= floor,
    stage_block_counts: groups.map((group) => group.blocks.length),
    stages: stageAudits,
    certificates,
  });
  console.log(`${rows.at(-1).level_id}: pair-floor ${certificates.length}/${floor}; batches=${groups.map((group) => group.blocks.length).join(",")}`);
}

console.log(JSON.stringify({
  input: options.input,
  levels: rows.length,
  target_met: rows.filter((row) => row.target_met).length,
  rows,
}, null, 2));
