import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Lv17 has exactly eight mechanism-free purple SINGLE bodies in the preserved
// completion seed. They form a deterministic opening column and thaw the
// value-8 exit. This search recolours the remaining eighteen bodies into nine
// disjoint two-body opposed-exit cores. Each core is independently solved and
// must have exact relaxed overhead >= 1, so the verifier can add them to the
// campaign floor of nine without treating a long authored route as proof.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-lv17-floor-core-search/size5/runtime-search/candidate-pool.json",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv17-paired-cores-r56",
);
const exactMaxStates = Number(option("--max-states", "500000"));
const pairingLimit = Number(option("--pairing-limit", "80"));

const [inputText, contractText] = await Promise.all([
  readFile(resolve(root, inputRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const parsed = JSON.parse(inputText);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv017")?.our_design_target;
const sourceCandidate = parsed.levels?.find((entry) => entry.level_id === "Lv017")?.candidates?.[0];
if (!target || !sourceCandidate?.level) throw new Error("Lv17 source candidate or active target missing");

const bundle = await build({
  stdin: {
    contents: `
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelOptimally, solveLevelForValidation } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv17-paired-core-search-runtime.ts",
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
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const levelSpecSha256 = (level) => sha256(JSON.stringify(canonicalize(level)));
const blockNumber = (id) => Number(id.slice(-2));

const directIds = new Set([
  "cc-017-b1-01", "cc-017-b1-02", "cc-017-b1-04", "cc-017-b1-07",
  "cc-017-b1-10", "cc-017-b1-13", "cc-017-b1-14", "cc-017-b1-18",
]);
const level = structuredClone(sourceCandidate.level);
level.name = `${level.name} · 九组相向核心`;
level.timeSeconds = target.time_seconds;
level.gates = [
  { id: "vp-017-gate-01", side: "top", offset: 0, size: 2, color: "purple" },
  { id: "vp-017-gate-02", side: "right", offset: 0, size: 8, color: "blue", frozen: 8 },
  { id: "vp-017-gate-03", side: "left", offset: 0, size: 8, color: "yellow", frozen: 16 },
  { id: "vp-017-gate-04", side: "bottom", offset: 0, size: 6, color: "pink", frozen: 21 },
  { id: "vp-017-gate-05", side: "top", offset: 2, size: 4, color: "red", frozen: 26 },
];
for (const block of level.blocks) {
  delete block.frozen;
  delete block.layers;
  block.color = directIds.has(block.id) ? "purple" : "blue";
}
const allById = new Map(level.blocks.map((block) => [block.id, block]));
const remainingIds = level.blocks.filter((block) => !directIds.has(block.id)).map((block) => block.id);
const h3Ids = remainingIds.filter((id) => allById.get(id).shape.length === 3);
const h2Ids = remainingIds.filter((id) => {
  const shape = allById.get(id).shape;
  return shape.length === 2 && shape.every(([, y]) => y === 0);
});
const v2Ids = remainingIds.filter((id) => {
  const shape = allById.get(id).shape;
  return shape.length === 2 && shape.every(([x]) => x === 0);
});
const sq2Id = remainingIds.find((id) => allById.get(id).shape.length === 4);
if (h3Ids.length !== 6 || h2Ids.length !== 3 || v2Ids.length !== 4 || !sq2Id) {
  throw new Error("Lv17 preserved seed inventory drifted");
}

const thawedCore = (leftId, leftColor, rightId, rightColor) => {
  const core = structuredClone(level);
  core.blocks = [
    { ...structuredClone(allById.get(leftId)), color: leftColor, layers: [leftColor] },
    { ...structuredClone(allById.get(rightId)), color: rightColor, layers: [rightColor] },
  ];
  core.gates = core.gates.map((sourceGate) => {
    const gate = structuredClone(sourceGate);
    delete gate.frozen;
    return gate;
  });
  core.blocked = [];
  delete core.designTargets;
  delete core.parMoves;
  runtime.validateLevel(core);
  return core;
};
const edgeCache = new Map();
const edge = (leftId, leftColor, rightId, rightColor) => {
  const key = `${leftId}:${leftColor}|${rightId}:${rightColor}`;
  if (edgeCache.has(key)) return edgeCache.get(key);
  const solved = runtime.solveLevelOptimally(thawedCore(leftId, leftColor, rightId, rightColor), 20000);
  const result = solved.solved && solved.repositionOverhead >= 1
    ? { floor: solved.repositionOverhead, route: solved.drags, explored_states: solved.exploredStates }
    : null;
  edgeCache.set(key, result);
  return result;
};

const pairings = (ids, leftColor, rightColor, limit) => {
  const results = [];
  const search = (remaining, groups, colors) => {
    if (results.length >= limit) return;
    if (!remaining.length) {
      results.push({ groups: structuredClone(groups), colors: new Map(colors) });
      return;
    }
    const [first, ...tail] = remaining;
    for (let index = 0; index < tail.length; index += 1) {
      const second = tail[index];
      const next = tail.filter((_value, other) => other !== index);
      for (const [a, aColor, b, bColor] of [
        [first, leftColor, second, rightColor],
        [first, rightColor, second, leftColor],
      ]) {
        const proof = edge(a, aColor, b, bColor);
        if (!proof) continue;
        const nextColors = new Map(colors);
        nextColors.set(a, aColor);
        nextColors.set(b, bColor);
        search(next, [...groups, { block_ids: [a, b], colors: [aColor, bColor], ...proof }], nextColors);
      }
    }
  };
  search(ids, [], new Map());
  return results;
};

const combinations = (values, count) => {
  const output = [];
  const visit = (start, selected) => {
    if (selected.length === count) { output.push([...selected]); return; }
    for (let index = start; index <= values.length - (count - selected.length); index += 1) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return output;
};

const replay = (spec, drags) => {
  const model = new runtime.PuzzleModel(spec);
  let repositions = 0;
  let clears = 0;
  for (const [index, drag] of drags.entries()) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return { ok: false, error: `move ${index + 1}` };
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) return { ok: false, error: `exit ${index + 1}: ${result.reason}` };
      clears += 1;
    } else repositions += 1;
    if (!model.commitAction(true)) return { ok: false, error: `commit ${index + 1}` };
  }
  const snapshot = model.snapshot();
  return { ok: snapshot.complete, repositions, actions: drags.length, clear_layers: clears };
};

const attempts = [];
let accepted = null;
const searchCounters = { high_combinations_with_pairing: 0, special_edges: 0, ordinary_pairings: 0 };
for (const highIds of combinations(h3Ids, 4)) {
  const highPairings = pairings(highIds, "pink", "red", Math.min(pairingLimit, 24));
  if (!highPairings.length) continue;
  searchCounters.high_combinations_with_pairing += 1;
  const earlyIds = remainingIds.filter((id) => !highIds.includes(id));
  for (const specialId of [sq2Id, ...v2Ids]) {
    if (!earlyIds.includes(specialId)) continue;
    for (const extraId of earlyIds.filter((id) => id !== specialId)) {
      const specialProof = edge(specialId, "purple", extraId, "yellow");
      if (!specialProof) continue;
      searchCounters.special_edges += 1;
      const ordinaryIds = earlyIds.filter((id) => id !== specialId && id !== extraId);
      const ordinaryPairings = pairings(ordinaryIds, "blue", "yellow", pairingLimit);
      if (!ordinaryPairings.length) continue;
      searchCounters.ordinary_pairings += ordinaryPairings.length;
      for (const high of highPairings) for (const ordinary of ordinaryPairings) {
        const candidate = structuredClone(level);
        const colors = new Map([...high.colors, ...ordinary.colors, [specialId, "purple"], [extraId, "yellow"]]);
        for (const block of candidate.blocks) {
          block.color = directIds.has(block.id) ? "purple" : colors.get(block.id);
          delete block.frozen;
          delete block.layers;
        }
        const candidateById = new Map(candidate.blocks.map((block) => [block.id, block]));
        h2Ids.forEach((id) => { candidateById.get(id).frozen = 6; });
        [...highIds].sort((a, b) => blockNumber(a) - blockNumber(b)).forEach((id, index) => {
          candidateById.get(id).frozen = index < 2 ? 18 : 19;
        });
        const specialShape = candidateById.get(specialId).shape.length;
        const shellV2 = specialShape === 2
          ? [specialId, v2Ids.find((id) => id !== specialId)]
          : v2Ids.slice(0, 2);
        const shellIds = [sq2Id, ...shellV2].filter((id, index, values) => values.indexOf(id) === index);
        if (shellIds.length !== 3 || shellIds.filter((id) => candidateById.get(id).shape.length === 2).length !== 2) continue;
        for (const id of shellIds) {
          const block = candidateById.get(id);
          const inner = id === specialId ? "blue" : "pink";
          if (block.color === inner) continue;
          block.layers = [block.color, inner];
        }
        if (shellIds.some((id) => !candidateById.get(id).layers)) continue;
        candidate.designTargets = {
          formulaVersion: "blockout-d1",
          calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
          minimumRepositionOverhead: 9,
        };
        delete candidate.parMoves;
        try { runtime.validateLevel(candidate); } catch (error) {
          attempts.push({ status: "invalid", error: error.message, highIds, specialId, extraId });
          continue;
        }
        const solved = runtime.solveLevelForValidation(candidate, exactMaxStates);
        attempts.push({
          status: solved.solved ? "solved" : "unsolved",
          highIds, specialId, extraId,
          exact_states: solved.exploredStates,
          exact_overhead: solved.solved ? solved.repositionOverhead : null,
        });
        if (!solved.solved) continue;
        const replayed = replay(candidate, solved.drags);
        if (!replayed.ok || replayed.repositions < 9) continue;
        candidate.parMoves = replayed.actions;
        const groups = [
          {
            id: "special-purple-yellow-pair",
            stage_key: "opening",
            block_ids: [specialId, extraId],
            floor: 1,
            proof_method: "exact_gameplay_frontier",
            route: specialProof.route,
          },
          ...ordinary.groups.map((group, index) => ({
            id: `blue-yellow-pair-${index + 1}`,
            stage_key: "opening",
            block_ids: group.block_ids,
            floor: 1,
            proof_method: "exact_gameplay_frontier",
            route: group.route,
          })),
          ...high.groups.map((group, index) => ({
            id: `pink-red-h3-pair-${index + 1}`,
            stage_key: "opening",
            block_ids: group.block_ids,
            floor: 1,
            proof_method: "exact_gameplay_frontier",
            route: group.route,
          })),
        ];
        if (groups.length !== 9 || new Set(groups.flatMap((group) => group.block_ids)).size !== 18) {
          throw new Error("constructed core plan is not nine disjoint pairs");
        }
        accepted = { level: candidate, route: solved.drags, replay: replayed, groups, highIds, shellIds, specialId, extraId };
        break;
      }
      if (accepted) break;
    }
    if (accepted) break;
  }
  if (accepted) break;
}

const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const purpleYellowEdges = [];
for (let left = 0; left < remainingIds.length; left += 1) {
  for (let right = left + 1; right < remainingIds.length; right += 1) {
    for (const [purpleId, yellowId] of [
      [remainingIds[left], remainingIds[right]],
      [remainingIds[right], remainingIds[left]],
    ]) {
      const proof = edge(purpleId, "purple", yellowId, "yellow");
      if (proof) purpleYellowEdges.push({ purple_id: purpleId, yellow_id: yellowId, floor: proof.floor });
    }
  }
}
const diagnostic = {
  schema_version: "blockout-video-parity-lv17-paired-core-search-v1",
  source: { path: inputRelative, sha256: sha256(inputText) },
  contract: { path: contractRelative, sha256: sha256(contractText) },
  exact_max_states: exactMaxStates,
  pair_edge_cache_size: edgeCache.size,
  search_counters: searchCounters,
  purple_yellow_edges: purpleYellowEdges,
  attempts,
  accepted: Boolean(accepted),
};
await writeFile(resolve(outputDir, "search-diagnostic.json"), `${JSON.stringify(diagnostic, null, 2)}\n`, "utf8");
if (!accepted) {
  console.log(JSON.stringify({
    output: relative(root, outputDir).replaceAll("\\", "/"),
    accepted: false,
    pair_edge_cache_size: edgeCache.size,
    exact_attempts: attempts.length,
    search_counters: searchCounters,
    diagnostic_sha256: sha256(JSON.stringify(diagnostic)),
  }, null, 2));
  process.exit(2);
}

const specSha = levelSpecSha256(accepted.level);
const entry = {
  level_id: "Lv017",
  search_attempt: "nine-disjoint-opposed-exit-pairs",
  target: structuredClone(target),
  level: accepted.level,
  route: accepted.route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: accepted.replay,
  core_groups: accepted.groups,
};
const artifact = {
  schema_version: "blockout-video-parity-lv17-paired-core-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  levels: [entry],
};
const witnesses = [{ level_id: "Lv017", drags: accepted.route, metrics: accepted.replay }];
const plans = [{
  level_id: "Lv017",
  level_spec_sha256: specSha,
  source: "nine disjoint opposed-exit two-body cores",
  proof_scope: "disjoint relaxed-core lower bound",
  groups: accepted.groups,
}];
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witnesses, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), `${JSON.stringify(plans, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  accepted: true,
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  level_spec_sha256: specSha,
  witness: accepted.replay,
  core_floor_sum: accepted.groups.reduce((sum, group) => sum + group.floor, 0),
  high_numeric_h3_ids: accepted.highIds,
  shell_ids: accepted.shellIds,
}, null, 2));
