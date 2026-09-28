import { createHash } from "node:crypto";
import { build } from "esbuild";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL), "..");
const CONTRACT_PATH = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const DENSITY_PLAN_PATH = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/density-and-staging-plan.json");
const R140_PATH = resolve(ROOT, "playtest-results/experiments/competitor-composition-r140/formal-candidates-lv001-lv100.json");
const R140_DIR = dirname(R140_PATH);
const R141_DIR = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141");
const OUTPUT_PATH = resolve(R141_DIR, "assembled-expanded-density-candidates-v5.json");
const GENERATED_PATH = resolve(R141_DIR, "expandedDensityLevels.generated.ts");
const PRODUCTION_GENERATED_PATH = resolve(ROOT, "src/core/expandedDensityLevels.generated.ts");
const WRITE_PRODUCTION = process.argv.includes("--write-production");
const MAX_DENSE_STAGE_BATCH_COUNT = 6;
const LIVE_LEVEL_IDS_PRESERVED_BY_USER = new Set(
  Array.from({ length: 10 }, (_, index) => `Lv${String(index + 1).padStart(3, "0")}`),
);
const PLAYER_FACING_NAME_OVERRIDES = new Map([
  [16, "色彩接力"],
  [21, "路径复习"],
  [22, "路线接力"],
  [52, "折线换位"],
  [53, "分区转运"],
  [56, "批次接力"],
  [63, "分流枢纽"],
  [66, "阶段接力"],
  [69, "错层迷城"],
  [78, "热浪叠阵"],
  [86, "高阶跃迁"],
  [88, "叠态枢纽"],
  [96, "终局总线"],
  [97, "终局总控"],
]);

const playerFacingName = (level) => PLAYER_FACING_NAME_OVERRIDES.get(level.id)
  ?? level.name.replace(/ (?:multi )?cognitive corridor$/u, "");

const SHAPES = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
};

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};
const canonical = (value) => JSON.stringify(stable(value));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const signature = (shape) => shape.map(([x, y]) => `${x},${y}`).sort().join(";");
const shapeBySignature = new Map(Object.entries(SHAPES).flatMap(([id, variants]) => variants.map((shape) => [signature(shape), id])));
const maskRows = (level) => Array.from({ length: level.height }, (_, y) => Array.from(
  { length: level.width },
  (_, x) => level.playable.some(([px, py]) => px === x && py === y) ? "#" : ".",
).join(""));
const histogramFor = (blocks) => blocks.reduce((result, block) => {
  const id = shapeBySignature.get(signature(block.shape)) ?? "UNKNOWN";
  result[id] = (result[id] ?? 0) + 1;
  return result;
}, {});
const normalizedMarker = (value) => String(value ?? "").toLowerCase().replaceAll("\\", "/");
const isPairGadgetCandidate = (candidate) => {
  const source = normalizedMarker(candidate.__source);
  const markers = normalizedMarker([
    candidate.__artifactMarker,
    candidate.audit?.generator,
    candidate.validation?.generator,
  ].filter(Boolean).join(" "));
  return source.includes("/certified-staged-gadgets/")
    || /pair[-_ ]?gadgets?/.test(markers)
    || candidate.level.blocks.some((block) => /^v5-\d{3}-pair-/.test(block.id));
};
const stageLayoutFor = (candidate, target, densityPlan) => {
  const errors = [];
  const approvedNonstagedOverride = !target.requires_staged_reveal
    && candidate.audit?.approved_solver_staging_override === "v5_nonstaged_floor_guarantee";
  const stagedPolicyApplies = target.requires_staged_reveal || approvedNonstagedOverride;
  const allShutters = candidate.level.shutters ?? [];
  const stagingShutters = allShutters.filter((shutter) => shutter.skin === "staging");
  const nonStagingShutters = allShutters.filter((shutter) => shutter.skin !== "staging");
  const duplicateShutterIds = stagingShutters.filter((shutter, index) => (
    stagingShutters.findIndex((other) => other.id === shutter.id) !== index
  ));
  const shutterById = new Map(stagingShutters.map((shutter) => [shutter.id, shutter]));
  const openingBlocks = candidate.level.blocks.filter((block) => !block.shutterId);
  const unknownShutterBlocks = candidate.level.blocks.filter((block) => block.shutterId && !shutterById.has(block.shutterId));
  const orderedShutters = [...stagingShutters].sort((left, right) => (
    Number(left.count) - Number(right.count) || left.id.localeCompare(right.id)
  ));
  const stages = [
    { id: "opening", blocks: openingBlocks },
    ...orderedShutters.map((shutter) => ({
      id: shutter.id,
      blocks: candidate.level.blocks.filter((block) => block.shutterId === shutter.id),
      shutter,
    })),
  ].map((stage, index) => ({
    ...stage,
    stage_index: index + 1,
    block_count: stage.blocks.length,
    occupied_cell_count: stage.blocks.reduce((sum, block) => sum + block.shape.length, 0),
    shape_histogram: histogramFor(stage.blocks),
  }));
  const playableCells = target.board.playable_cell_count;
  const openingOccupiedRatio = playableCells > 0 ? stages[0].occupied_cell_count / playableCells : 0;

  if (duplicateShutterIds.length) errors.push("duplicate_staging_shutter_id");
  if (unknownShutterBlocks.length) errors.push("unknown_staging_shutter_reference");
  if (nonStagingShutters.length) errors.push("unexpected_nonstaging_shutter");

  if (stagedPolicyApplies) {
    if (stagingShutters.length === 0) errors.push("missing_staging");
    if (stages.length < 2 || stages.length > MAX_DENSE_STAGE_BATCH_COUNT) {
      errors.push("staging_batch_count_outside_2_6");
    }
    // Lv21+ is the formal dense campaign. Do not accept tiny late reveals:
    // they satisfy the arithmetic contract but recreate the visibly sparse
    // tail that the density redesign is meant to remove.
    const minimumBlocksPerBatch = Number(candidate.level.id ?? 1) >= 21 || stages.length > 4 ? 4 : 2;
    if (stages.some((stage) => stage.block_count < minimumBlocksPerBatch)) {
      errors.push(`staging_batch_below_${minimumBlocksPerBatch}_blocks`);
    }
    if (openingOccupiedRatio < 0.5) errors.push("opening_occupied_ratio_below_0_5");

    for (let index = 0; index < stages.length; index += 1) {
      const occupiedCellCap = index === stages.length - 1 ? playableCells : playableCells - 1;
      if (stages[index].occupied_cell_count > occupiedCellCap) errors.push("staging_batch_capacity");
    }

    let clearedBeforeStage = stages[0].block_count;
    for (const stage of stages.slice(1)) {
      if (!Number.isInteger(stage.shutter?.count) || stage.shutter.count !== clearedBeforeStage) {
        errors.push("staging_trigger_count_mismatch");
      }
      clearedBeforeStage += stage.block_count;
    }
  } else {
    if (stagingShutters.length || candidate.level.blocks.some((block) => block.shutterId)) {
      errors.push("unexpected_staging");
    }
  }

  if (densityPlan) {
    const planned = densityPlan.staging_plan;
    if (Boolean(planned.requires_staged_reveal) !== Boolean(target.requires_staged_reveal)) {
      errors.push("density_plan_staging_mismatch");
    }
    if (stages.length < planned.required_stage_batch_count) errors.push("density_plan_minimum_batch_count");
    if (candidate.level.blocks.length !== densityPlan.v5_composition_plan.block_count) {
      errors.push("density_plan_block_count");
    }
    if (candidate.level.blocks.reduce((sum, block) => sum + block.shape.length, 0)
      !== densityPlan.v5_composition_plan.occupied_cell_count) {
      errors.push("density_plan_occupied");
    }
    if (canonical(histogramFor(candidate.level.blocks)) !== canonical(densityPlan.v5_composition_plan.shape_histogram)) {
      errors.push("density_plan_histogram");
    }
  }

  return {
    errors: [...new Set(errors)],
    summary: {
      required_stage_batch_count: densityPlan?.staging_plan.required_stage_batch_count ?? null,
      actual_stage_batch_count: stages.length,
      approved_nonstaged_staging_override: approvedNonstagedOverride,
      opening_block_count: stages[0].block_count,
      opening_occupied_cell_count: stages[0].occupied_cell_count,
      opening_occupied_ratio: Number(openingOccupiedRatio.toFixed(4)),
      batches: stages.map(({ stage_index, id, block_count, occupied_cell_count, shape_histogram }) => ({
        stage_index,
        id,
        block_count,
        occupied_cell_count,
        shape_histogram,
      })),
    },
  };
};
const routeMetrics = (candidate) => {
  const clearLoad = candidate.level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  return {
    actions: candidate.route.length,
    clear_load: clearLoad,
    reposition_overhead: candidate.route.length - clearLoad,
  };
};
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

if (process.argv.includes("--self-test")) {
  const block = (id, shutterId) => ({ id, x: 0, y: 0, shape: [[0, 0]], color: "red", ...(shutterId ? { shutterId } : {}) });
  const target = {
    board: { playable_cell_count: 8 },
    requires_staged_reveal: true,
  };
  const densityPlan = {
    v5_composition_plan: { block_count: 8, occupied_cell_count: 8, shape_histogram: { SINGLE: 8 } },
    staging_plan: {
      requires_staged_reveal: true,
      required_stage_batch_count: 2,
      batches: [{ occupied_cell_cap: 7 }, { occupied_cell_cap: 8 }],
    },
  };
  const dense = {
    __source: "playtest-results/experiments/dense/formal-candidates.json",
    level: {
      id: 1,
      blocks: [block("a"), block("b"), block("c"), block("d"), block("e", "stage-2"), block("f", "stage-2"), block("g", "stage-2"), block("h", "stage-2")],
      shutters: [{ id: "stage-2", count: 4, skin: "staging" }],
    },
  };
  const sparsePair = structuredClone(dense);
  sparsePair.__source = "playtest-results/experiments/competitor-composition-r141/certified-staged-gadgets/formal-candidates.json";
  sparsePair.audit = { generator: "certified_staged_pair_gadgets_v5" };
  sparsePair.level.blocks = [block("v5-017-pair-01-a"), block("v5-017-pair-01-b", "stage-2")];
  const extraStage = structuredClone(dense);
  extraStage.level.blocks[6].shutterId = "stage-3";
  extraStage.level.blocks[7].shutterId = "stage-3";
  extraStage.level.shutters.push({ id: "stage-3", count: 6, skin: "staging" });
  const oneBlockReveal = structuredClone(dense);
  for (const current of oneBlockReveal.level.blocks) delete current.shutterId;
  oneBlockReveal.level.blocks[7].shutterId = "stage-2";
  oneBlockReveal.level.shutters[0].count = 7;
  const badTrigger = structuredClone(dense);
  badTrigger.level.shutters[0].count = 3;
  const threeStageMinimumPlan = structuredClone(densityPlan);
  threeStageMinimumPlan.staging_plan.required_stage_batch_count = 3;
  const tooManyStages = structuredClone(extraStage);
  tooManyStages.level.blocks[7].shutterId = "stage-4";
  tooManyStages.level.shutters.push({ id: "stage-4", count: 7, skin: "staging" });
  tooManyStages.level.blocks[6].shutterId = "stage-5";
  tooManyStages.level.shutters.push({ id: "stage-5", count: 6, skin: "staging" });
  const nonstagedTarget = { ...target, requires_staged_reveal: false };
  const nonstagedPlan = structuredClone(densityPlan);
  nonstagedPlan.staging_plan.requires_staged_reveal = false;
  nonstagedPlan.staging_plan.required_stage_batch_count = 1;
  const approvedNonstaged = structuredClone(dense);
  approvedNonstaged.audit = { approved_solver_staging_override: "v5_nonstaged_floor_guarantee" };
  const sparseLateTail = structuredClone(dense);
  sparseLateTail.level.id = 40;
  sparseLateTail.level.blocks = [
    block("a"), block("b"), block("c"), block("d"), block("e"), block("f"),
    block("g", "stage-2"), block("h", "stage-2"),
  ];
  sparseLateTail.level.shutters[0].count = 6;
  const denseResult = stageLayoutFor(dense, target, densityPlan);
  const checks = {
    dense_candidate_passes_stage_policy: denseResult.errors.length === 0,
    pair_path_is_rejected: isPairGadgetCandidate(sparsePair),
    pair_generator_is_rejected: isPairGadgetCandidate({ ...dense, __source: "safe/formal-candidates.json", audit: sparsePair.audit }),
    sparse_opening_is_rejected: stageLayoutFor({ ...dense, level: sparsePair.level }, target, densityPlan).errors.includes("opening_occupied_ratio_below_0_5"),
    extra_stage_above_plan_minimum_is_allowed: stageLayoutFor(extraStage, target, densityPlan).errors.length === 0,
    stage_count_below_plan_minimum_is_rejected: stageLayoutFor(dense, target, threeStageMinimumPlan).errors.includes("density_plan_minimum_batch_count"),
    five_stage_micro_batches_are_rejected: stageLayoutFor(tooManyStages, target, densityPlan).errors.includes("staging_batch_below_4_blocks"),
    one_block_batch_is_rejected: stageLayoutFor(oneBlockReveal, target, densityPlan).errors.includes("staging_batch_below_2_blocks"),
    lv21_plus_two_block_tail_is_rejected: stageLayoutFor(sparseLateTail, target, densityPlan).errors.includes("staging_batch_below_4_blocks"),
    trigger_count_mismatch_is_rejected: stageLayoutFor(badTrigger, target, densityPlan).errors.includes("staging_trigger_count_mismatch"),
    unmarked_nonstaged_staging_is_rejected: stageLayoutFor(dense, nonstagedTarget, nonstagedPlan).errors.includes("unexpected_staging"),
    approved_nonstaged_staging_is_allowed: stageLayoutFor(approvedNonstaged, nonstagedTarget, nonstagedPlan).errors.length === 0,
  };
  console.log(JSON.stringify({ checks, pass: Object.values(checks).every(Boolean) }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
  process.exit();
}

const runtimeBundle = await build({
  stdin: {
    contents: `import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts"; export { PuzzleModel, validateLevel };`,
    resolveDir: ROOT,
    sourcefile: "assemble-expanded-density-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const replay = (candidate) => {
  const model = new runtime.PuzzleModel(candidate.level);
  for (let index = 0; index < candidate.route.length; index += 1) {
    const drag = candidate.route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move ${index}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit ${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit ${index}` };
  }
  return { pass: model.snapshot().complete, reason: model.snapshot().complete ? null : "incomplete" };
};

const contractBytes = await readFile(CONTRACT_PATH);
const contractSha256 = sha256(contractBytes);
const contract = JSON.parse(contractBytes.toString("utf8"));
const densityPlan = await readJson(DENSITY_PLAN_PATH);
if (densityPlan.validated_v5_contract?.sha256 !== contractSha256) {
  throw new Error(`Density plan is stale: expected contract ${contractSha256}, found ${densityPlan.validated_v5_contract?.sha256 ?? "missing"}`);
}
const contractById = new Map(contract.levels.map((entry) => [entry.level_id, entry]));
const densityPlanById = new Map(densityPlan.levels.map((entry) => [entry.level_id, entry]));
const pools = new Map(contract.levels.map((entry) => [entry.level_id, []]));
const sources = [];

const addArtifact = async (path, kind) => {
  let artifact;
  try { artifact = await readJson(path); } catch { return; }
  for (const original of artifact.levels ?? []) {
    const id = original.level_id ?? `Lv${String(original.level?.id ?? 0).padStart(3, "0")}`;
    if (!contractById.has(id) || !original.level || !Array.isArray(original.route)) continue;
    const candidate = structuredClone(original);
    candidate.level_id = id;
    candidate.target = contractById.get(id).our_design_target;
    if ((kind === "r140_exact_reuse" || kind === "r140_strict_certified")
      && candidate.target.requires_staged_reveal && candidate.level.shutters?.length) {
      candidate.level.shutters = candidate.level.shutters.map((shutter) => ({ ...shutter, skin: "staging" }));
    }
    candidate.__source = relative(ROOT, path).replaceAll("\\", "/");
    candidate.__kind = kind;
    candidate.__artifactMarker = [artifact.title, artifact.generator, artifact.candidate_layer]
      .filter(Boolean).join(" ");
    pools.get(id).push(candidate);
  }
  sources.push(relative(ROOT, path).replaceAll("\\", "/"));
};

await addArtifact(R140_PATH, "r140_exact_reuse");
const r140Files = await readdir(R140_DIR, { recursive: true, withFileTypes: true });
for (const entry of r140Files) {
  if (!entry.isFile() || entry.name !== "strict-accepted-candidates.json") continue;
  await addArtifact(resolve(entry.parentPath, entry.name), "r140_strict_certified");
}
const r141Files = await readdir(R141_DIR, { recursive: true, withFileTypes: true });

const strictCertificatesByCandidate = new Map();
const certificateSources = [];
const certifiedWholeLevelInputs = new Set();
for (const entry of [...r140Files, ...r141Files]) {
  if (!entry.isFile() || entry.name !== "strict-v5-certificate-catalog.json") continue;
  const path = resolve(entry.parentPath, entry.name);
  const source = relative(ROOT, path).replaceAll("\\", "/");
  if (normalizedMarker(source).includes("/certified-staged-gadgets/")) continue;
  let catalog;
  try { catalog = await readJson(path); } catch { continue; }
  if (catalog.source_contract?.sha256 !== contractSha256) continue;
  for (const proof of catalog.levels ?? []) {
    if (!/^strict_v5_.*certified/.test(proof.status ?? "")) continue;
    const proofComponents = proof.components ?? [];
    if (!proof.candidate_sha256
      || !Number.isFinite(Number(proof.certified_lower_bound))
      || proofComponents.length === 0
      || !proofComponents.every((component) => (
        component.accepted === true && component.lower_bound_statement_proven === true
      ))) continue;
    const key = `${proof.level_id}:${String(proof.candidate_sha256).toUpperCase()}`;
    const current = strictCertificatesByCandidate.get(key) ?? [];
    current.push({
      path: source,
      status: proof.status,
      certified_lower_bound: proof.certified_lower_bound,
    });
    strictCertificatesByCandidate.set(key, current);
    for (const component of proofComponents) {
      if (component.level_spec_sha256 !== proof.candidate_sha256 || !component.proof_input) continue;
      const proofInputPath = resolve(ROOT, component.proof_input);
      if (proofInputPath.startsWith(`${ROOT}\\`) || proofInputPath.startsWith(`${ROOT}/`)) {
        certifiedWholeLevelInputs.add(proofInputPath);
      }
    }
  }
  certificateSources.push(source);
}

for (const path of certifiedWholeLevelInputs) await addArtifact(path, "r141_strict_proof_input");

for (const entry of r141Files) {
  if (!entry.isFile()) continue;
  const path = resolve(entry.parentPath, entry.name);
  const normalized = path.replaceAll("\\", "/");
  if (entry.name === "strict-accepted-candidates.json") {
    await addArtifact(path, "r141_strict_certified");
  } else if (/^formal-candidates(?:-.*)?\.json$/.test(entry.name) || /^expanded-density-candidates-.*\.json$/.test(entry.name)) {
    const kind = normalized.includes("/certified-staged-gadgets/")
      ? "r141_certified_stage_gadget"
      : "r141_generated";
    await addArtifact(path, kind);
  }
}

const decisions = [];
const selected = [];
for (const contractEntry of contract.levels) {
  const id = contractEntry.level_id;
  const levelNumber = Number(id.slice(2));
  const target = contractEntry.our_design_target;
  const plannedDensity = densityPlanById.get(id) ?? null;
  const requiredFloor = target.recommended_minimum_reposition_overhead;
  const inspected = [];
  const seen = new Set();
  for (const candidate of pools.get(id)) {
    const levelHash = sha256(canonical(candidate.level));
    if (seen.has(levelHash)) continue;
    seen.add(levelHash);
    const errors = [];
    if (isPairGadgetCandidate(candidate)) {
      errors.push("forbidden_pair_gadget");
      if (levelNumber <= 20) errors.push("lv1_20_pair_gadget_forbidden");
    }
    if (levelNumber >= 21 && !plannedDensity) errors.push("missing_v5_density_plan");
    try { runtime.validateLevel(candidate.level); } catch (error) { errors.push(`validate:${error.message}`); }
    if (candidate.level.id !== Number(id.slice(2))) errors.push("id");
    if (candidate.level.width !== target.board.cols || candidate.level.height !== target.board.rows) errors.push("dimensions");
    if (canonical(maskRows(candidate.level)) !== canonical(target.board.playable_mask)) errors.push("mask");
    if (candidate.level.blocks.length !== target.full_level_block_count) errors.push("block_count");
    if (canonical(histogramFor(candidate.level.blocks)) !== canonical(target.full_level_shape_histogram)) errors.push("histogram");
    if (candidate.level.blocks.reduce((sum, block) => sum + block.shape.length, 0) !== target.full_level_occupied_cell_count) errors.push("occupied");
    const palette = [...new Set(candidate.level.blocks.map((block) => block.color))].sort();
    if (canonical(palette) !== canonical([...target.design_palette].sort())) errors.push("palette");
    const stageLayout = stageLayoutFor(candidate, target, plannedDensity);
    errors.push(...stageLayout.errors);
    const allCertificates = strictCertificatesByCandidate.get(`${id}:${levelHash}`) ?? [];
    const qualifyingCertificates = allCertificates.filter((certificate) => (
      requiredFloor == null || Number(certificate.certified_lower_bound) >= requiredFloor
    ));
    if (requiredFloor != null && requiredFloor > 0 && qualifyingCertificates.length === 0) {
      errors.push("missing_strict_v5_floor_certificate");
    }
    if (errors.length === 0) {
      const played = replay(candidate);
      if (!played.pass) errors.push(`replay:${played.reason}`);
    }
    const metrics = routeMetrics(candidate);
    inspected.push({
      candidate,
      errors: [...new Set(errors)],
      metrics,
      levelHash,
      stageLayout: stageLayout.summary,
      certificates: qualifyingCertificates,
    });
  }
  const valid = inspected.filter((item) => item.errors.length === 0).sort((left, right) => {
    const leftCertified = left.certificates.length > 0;
    const rightCertified = right.certificates.length > 0;
    const leftMet = requiredFloor == null || left.metrics.reposition_overhead >= requiredFloor;
    const rightMet = requiredFloor == null || right.metrics.reposition_overhead >= requiredFloor;
    return Number(rightCertified) - Number(leftCertified)
      || Number(rightMet) - Number(leftMet)
      || right.metrics.reposition_overhead - left.metrics.reposition_overhead
      || left.metrics.actions - right.metrics.actions
      || left.levelHash.localeCompare(right.levelHash);
  });
  const certificateOnly = inspected.filter((item) => (
    item.errors.length === 1 && item.errors[0] === "missing_strict_v5_floor_certificate"
  )).sort((left, right) => (
    right.metrics.reposition_overhead - left.metrics.reposition_overhead
    || left.metrics.actions - right.metrics.actions
    || left.levelHash.localeCompare(right.levelHash)
  ));
  const bestCertificateOnly = certificateOnly[0];
  const winner = valid[0];
  if (winner) {
    const normalized = structuredClone(winner.candidate);
    delete normalized.__source;
    delete normalized.__kind;
    normalized.target = target;
    normalized.level.name = playerFacingName(normalized.level);
    normalized.assembly = {
      source: winner.candidate.__source,
      source_kind: winner.candidate.__kind,
      level_sha256: winner.levelHash,
      route_metrics: winner.metrics,
      witness_floor_met: requiredFloor == null || winner.metrics.reposition_overhead >= requiredFloor,
      stage_layout: winner.stageLayout,
      strict_v5_certificates: winner.certificates,
    };
    selected.push(normalized);
  }
  decisions.push({
    level_id: id,
    pool_size: pools.get(id).length,
    structurally_valid: valid.length,
    selected_source: winner?.candidate.__source ?? null,
    selected_source_kind: winner?.candidate.__kind ?? null,
    selected_level_sha256: winner?.levelHash ?? null,
    route_reposition_overhead: winner?.metrics.reposition_overhead ?? null,
    target_reposition_overhead: requiredFloor,
    witness_floor_met: winner ? (requiredFloor == null || winner.metrics.reposition_overhead >= requiredFloor) : false,
    strict_v5_floor_certified: winner ? (requiredFloor == null || winner.certificates.length > 0) : false,
    strict_v5_certificates: winner?.certificates ?? [],
    stage_layout: winner?.stageLayout ?? null,
    live_level_preserved_by_user: LIVE_LEVEL_IDS_PRESERVED_BY_USER.has(id),
    best_candidate_awaiting_certificate: bestCertificateOnly ? {
      source: bestCertificateOnly.candidate.__source,
      source_kind: bestCertificateOnly.candidate.__kind,
      level_sha256: bestCertificateOnly.levelHash,
      route_metrics: bestCertificateOnly.metrics,
      stage_layout: bestCertificateOnly.stageLayout,
    } : null,
    forbidden_pair_candidates: inspected.filter((item) => item.errors.includes("forbidden_pair_gadget")).length,
    density_or_staging_policy_rejected_candidates: inspected.filter((item) => item.errors.some((reason) => (
      reason.startsWith("density_plan_") || reason.startsWith("staging_") || reason === "opening_occupied_ratio_below_0_5"
    ))).length,
    rejected_reasons: [...new Set(inspected.flatMap((item) => item.errors))],
  });
}

const report = {
  title: "Block Out! expanded-density v5 assembled candidates",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: WRITE_PRODUCTION,
  live_campaign_application_scope: {
    preserved_current_levels: [...LIVE_LEVEL_IDS_PRESERVED_BY_USER],
    replaceable_levels: "Lv011-Lv100",
    authority: "User explicitly requested that Lv1-Lv10 remain unchanged.",
  },
  contract: relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"),
  contract_sha256: contractSha256,
  density_plan: relative(ROOT, DENSITY_PLAN_PATH).replaceAll("\\", "/"),
  density_plan_sha256: sha256(await readFile(DENSITY_PLAN_PATH)),
  source_artifacts: [...new Set(sources)].sort(),
  strict_certificate_artifacts: [...new Set(certificateSources)].sort(),
  counts: {
    contract_levels: contract.levels.length,
    selected: selected.length,
    witness_floor_met: decisions.filter((decision) => decision.witness_floor_met).length,
    strict_v5_floor_certified: decisions.filter((decision) => decision.strict_v5_floor_certified).length,
    missing: decisions.filter((decision) => decision.structurally_valid === 0).length,
    below_witness_floor: decisions.filter((decision) => decision.structurally_valid > 0 && !decision.witness_floor_met).length,
    pair_gadget_candidates_rejected: decisions.reduce((sum, decision) => sum + decision.forbidden_pair_candidates, 0),
    density_or_staging_policy_rejected_candidates: decisions.reduce((sum, decision) => (
      sum + decision.density_or_staging_policy_rejected_candidates
    ), 0),
  },
  decisions,
  levels: selected,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(GENERATED_PATH, `/* eslint-disable */\n// AUTO-GENERATED candidate artifact; not imported by the live campaign.\nimport type { LevelSpec } from "../../../src/core/types";\nexport const EXPANDED_DENSITY_LEVEL_CANDIDATES: LevelSpec[] = ${JSON.stringify(selected.map((entry) => entry.level), null, 2)};\n`, "utf8");
if (WRITE_PRODUCTION) {
  const productionLevels = selected
    .map((entry) => entry.level)
    .filter((level) => level.id >= 11);
  await writeFile(PRODUCTION_GENERATED_PATH, `/* eslint-disable */\n// AUTO-GENERATED by tools/assemble-expanded-density-candidates-v5.mjs.\n// Lv1-Lv10 are intentionally excluded and remain sourced from chapterOnePilotLevels.ts.\nimport type { LevelSpec } from "./types";\nexport const EXPANDED_DENSITY_LEVEL_CANDIDATES: LevelSpec[] = ${JSON.stringify(productionLevels, null, 2)};\n`, "utf8");
}
console.log(JSON.stringify({
  output: relative(ROOT, OUTPUT_PATH).replaceAll("\\", "/"),
  generated_typescript: relative(ROOT, GENERATED_PATH).replaceAll("\\", "/"),
  production_generated_typescript: WRITE_PRODUCTION
    ? relative(ROOT, PRODUCTION_GENERATED_PATH).replaceAll("\\", "/")
    : null,
  counts: report.counts,
  missing: decisions.filter((decision) => decision.structurally_valid === 0).map((decision) => decision.level_id),
  below_witness_floor: decisions.filter((decision) => decision.structurally_valid > 0 && !decision.witness_floor_met).map((decision) => `${decision.level_id}:${decision.route_reposition_overhead}/${decision.target_reposition_overhead}`),
}, null, 2));
