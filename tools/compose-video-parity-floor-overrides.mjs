import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Convert independently proven, fully assembled floor candidates plus their
 * replayed completion witnesses into contract-bound geometry overrides. The
 * runtime assembler remains the final authority and re-installs mechanisms;
 * numeric carrier identities are retained as explicit, auditable hints.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const candidateRelatives = String(process.env.VIDEO_PARITY_FLOOR_CANDIDATE_INPUTS ?? "")
  .split(";").map((value) => value.trim()).filter(Boolean);
const witnessRelatives = String(process.env.VIDEO_PARITY_FLOOR_WITNESS_INPUTS ?? "")
  .split(";").map((value) => value.trim()).filter(Boolean);
const requestedIds = new Set(String(process.env.VIDEO_PARITY_FLOOR_LEVEL_IDS ?? "")
  .split(",").map((value) => Number(value.trim())).filter(Number.isInteger));
const outputRelative = process.env.VIDEO_PARITY_FLOOR_OVERRIDE_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-overrides/base-overrides.json";

if (!candidateRelatives.length) throw new Error("VIDEO_PARITY_FLOOR_CANDIDATE_INPUTS is required");
if (!witnessRelatives.length) throw new Error("VIDEO_PARITY_FLOOR_WITNESS_INPUTS is required");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const display = (path) => relative(root, path).replaceAll("\\", "/");
const clone = (value) => structuredClone(value);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const SHAPE_ORDER = [
  "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "L3", "T4",
  "L4", "S4", "T5", "L5", "CROSS5", "RECT2X3", "SQ3",
];
const normalizedShapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([x, y]) => `${x},${y}`).join("|");
};
const SHAPES = {
  SINGLE: [[[0, 0]]], H2: [[[0, 0], [1, 0]]], V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]], V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]], V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [[[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]]],
  T4: [[[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]]],
  L4: [[[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]]],
  S4: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  T5: [[[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]], [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]]],
  L5: [[[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [[[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]],
  SQ3: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
};
const shapeBySignature = new Map(Object.entries(SHAPES).flatMap(([id, variants]) => (
  variants.map((shape) => [normalizedShapeSignature(shape), id])
)));
const shapeIdOf = (shape) => shapeBySignature.get(normalizedShapeSignature(shape)) ?? "UNKNOWN";
const runtimeShapeId = (shapeId) => ["SQ3", "RECT3X3", "RECT3X2", "RECT2X3"].includes(shapeId)
  ? "RECT2X3" : shapeId;

const contractPath = resolve(root, contractRelative);
const contractText = await readFile(contractPath, "utf8");
const contract = JSON.parse(contractText);
const contractSha256 = sha256(contractText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry.our_design_target,
]));

const candidatesById = new Map();
const sources = [];
for (const candidateRelative of candidateRelatives) {
  const text = await readFile(resolve(root, candidateRelative), "utf8");
  const artifact = JSON.parse(text);
  const declared = artifact.sources?.contract?.sha256 ?? artifact.source?.contract?.sha256
    ?? artifact.source_contract?.sha256 ?? artifact.contract_sha256 ?? null;
  const entries = artifact.levels ?? artifact;
  if (!Array.isArray(entries)) throw new Error(`${candidateRelative}: expected a levels array`);
  const selectedEntries = entries.filter((entry) => {
    const level = entry.level ?? entry;
    const id = Number(level.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
    return !requestedIds.size || requestedIds.has(id);
  });
  if (String(declared).toUpperCase() !== contractSha256) {
    const incompatible = selectedEntries.filter((entry) => {
      const level = entry.level ?? entry;
      const id = Number(level.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
      const activeTarget = contractById.get(id);
      if (!entry.target || !activeTarget) return true;
      if (same(entry.target, activeTarget)) return false;
      // Some certified layout searches intentionally emitted a recommended
      // original mask before that mask was promoted into the contract.  Once
      // the active target uses that exact mask, permit a board-only rebind;
      // every non-board target field must remain byte-semantically identical.
      const requestedMask = entry.recommended_board_mask
        ?? entry.board_mask_override_pending_contract_update;
      const requestedRebind = entry.contract_mask_rebind_required === true
        || Array.isArray(entry.board_mask_override_pending_contract_update);
      if (!requestedRebind
          || !Array.isArray(requestedMask)
          || !same(requestedMask, activeTarget.board?.playable_mask)) return true;
      const rebound = clone(entry.target);
      rebound.board = clone(activeTarget.board);
      return !same(rebound, activeTarget);
    });
    if (incompatible.length) {
      throw new Error(
        `${candidateRelative}: contract SHA ${declared ?? "missing"} does not match ${contractSha256}`
        + ` and ${incompatible.length} selected target projections differ`,
      );
    }
  }
  for (const entry of selectedEntries) {
    const level = entry.level ?? entry;
    const id = Number(level.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
    if (candidatesById.has(id)) throw new Error(`${label(id)} appears in multiple candidate inputs`);
    candidatesById.set(id, {
      level: clone(level),
      source: candidateRelative,
      preserveGateThawDescriptors: entry.preserve_gate_thaw_descriptors === true
        || entry.proof_plan?.proof_method === "physical_cover_prefix",
      preserveGeneratorDescriptors: entry.preserve_generator_descriptors === true,
    });
  }
  sources.push({ path: candidateRelative, sha256: sha256(text) });
}

const routesById = new Map();
for (const witnessRelative of witnessRelatives) {
  const text = await readFile(resolve(root, witnessRelative), "utf8");
  const artifact = JSON.parse(text);
  for (const entry of artifact.levels ?? artifact) {
    const id = Number(entry.level?.id ?? entry.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
    const route = entry.drags ?? entry.route
      ?? (entry.events ?? []).filter((event) => event?.type !== "wait" && event?.blockId);
    if (!candidatesById.has(id) || !Array.isArray(route) || !route.length) continue;
    if (entry.replayed === false) continue;
    routesById.set(id, clone(route));
  }
  sources.push({ path: witnessRelative, sha256: sha256(text) });
}

const numericRequirements = (target) => {
  const spec = target.mechanism_contract?.numeric_ice;
  if (!spec?.count) return [];
  if (Array.isArray(spec.items) && spec.items.length) return spec.items.map((item, index) => ({
    index, value: Number(item.value), shape: runtimeShapeId(String(item.shape).toUpperCase()),
  }));
  const values = [...(spec.values ?? [])].map(Number).sort((left, right) => right - left);
  const shapes = SHAPE_ORDER.flatMap((shape) => Array.from(
    { length: Number(spec.shape_histogram?.[shape] ?? 0) }, () => runtimeShapeId(shape),
  ));
  while (values.length < spec.count) values.push(values.at(-1) ?? 1);
  while (shapes.length < spec.count) shapes.push(null);
  return Array.from({ length: spec.count }, (_, index) => ({ index, value: values[index], shape: shapes[index] }));
};

const shellRequirements = (target) => {
  const spec = target.mechanism_contract?.shells;
  if (!spec?.count) return [];
  if (Array.isArray(spec.items) && spec.items.length) return spec.items.map((item, index) => ({
    index,
    shape: runtimeShapeId(String(item.shape).toUpperCase()),
    extraLayers: Number(item.extra_layers ?? 1),
  }));
  const shapes = SHAPE_ORDER.flatMap((shape) => Array.from(
    { length: Number(spec.shape_histogram?.[shape] ?? 0) }, () => runtimeShapeId(shape),
  ));
  const extras = [...(spec.extra_layers ?? [])].map(Number);
  while (shapes.length < spec.count) shapes.push(null);
  while (extras.length < spec.count) extras.push(1);
  return Array.from({ length: spec.count }, (_, index) => ({
    index, shape: shapes[index], extraLayers: extras[index],
  }));
};

const levels = [...candidatesById].sort(([left], [right]) => left - right).map(([id, candidate]) => {
  const target = contractById.get(id);
  const route = routesById.get(id);
  if (!target) throw new Error(`${label(id)} is absent from the active contract`);
  if (!route) throw new Error(`${label(id)} has no replayed completion witness`);
  const requirements = numericRequirements(target);
  const unused = new Set(requirements.map((requirement) => requirement.index));
  const numericHints = candidate.level.blocks
    .filter((block) => Number(block.frozen ?? 0) > 0)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((block) => {
      const value = Number(block.frozen);
      const shape = runtimeShapeId(shapeIdOf(block.shape));
      const requirement = requirements.find((item) => unused.has(item.index)
        && item.value === value && (!item.shape || item.shape === shape));
      if (!requirement) throw new Error(`${label(id)} cannot bind frozen carrier ${block.id}`);
      unused.delete(requirement.index);
      return { block_id: block.id, value, shape, requirement_index: requirement.index };
    });
  if (numericHints.length !== requirements.length) {
    throw new Error(`${label(id)} numeric carrier count ${numericHints.length} != contract ${requirements.length}`);
  }
  const requiredShells = shellRequirements(target);
  const unusedShells = new Set(requiredShells.map((requirement) => requirement.index));
  const shellHints = candidate.level.blocks
    .filter((block) => (block.layers?.length ?? 1) > 1)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((block) => {
      const shape = runtimeShapeId(shapeIdOf(block.shape));
      const extraLayers = block.layers.length - 1;
      const requirement = requiredShells.find((item) => unusedShells.has(item.index)
        && item.extraLayers === extraLayers && (!item.shape || item.shape === shape));
      if (!requirement) throw new Error(`${label(id)} cannot bind shell carrier ${block.id}`);
      unusedShells.delete(requirement.index);
      return {
        block_id: block.id,
        shape,
        layers: [...block.layers],
        requirement_index: requirement.index,
      };
    });
  if (shellHints.length !== requiredShells.length) {
    throw new Error(`${label(id)} shell carrier count ${shellHints.length} != contract ${requiredShells.length}`);
  }
  const numericIds = new Set(numericHints.map((hint) => hint.block_id));
  const colorsOf = (block) => block.layers?.length ? block.layers : [block.color];
  const numericColors = new Set(candidate.level.blocks
    .filter((block) => numericIds.has(block.id)).flatMap(colorsOf));
  const nonNumericColors = new Set(candidate.level.blocks
    .filter((block) => !numericIds.has(block.id)).flatMap(colorsOf));
  const concealedColors = new Set([...numericColors].filter((color) => !nonNumericColors.has(color)));
  const openingHiddenColorCarrierIds = candidate.level.blocks
    .filter((block) => numericIds.has(block.id)
      && colorsOf(block).some((color) => concealedColors.has(color)))
    .map((block) => block.id).sort();
  return {
    level_id: label(id),
    target: clone(target),
    level: candidate.level,
    route,
    route_semantics: "fully_assembled_runtime",
    ...(candidate.preserveGateThawDescriptors ? { preserve_gate_thaw_descriptors: true } : {}),
    ...(candidate.preserveGeneratorDescriptors ? { preserve_generator_descriptors: true } : {}),
    carrier_assignments: { numeric_ice: numericHints, shells: shellHints },
    validation: {
      source_candidate: candidate.source,
      completion_witness_replayed: true,
      intended_for_final_assembler_revalidation: true,
      opening_hidden_color_carrier_ids: openingHiddenColorCarrierIds,
    },
  };
});
if (!levels.length) throw new Error("No requested candidate levels were found");

const output = {
  schema_version: "blockout-video-parity-base-overrides-v1",
  title: "Contract-bound necessary-reposition floor candidate overrides",
  generated_on: new Date().toISOString(),
  prototype_only: true,
  applied_to_live_campaign: false,
  source: { contract: { path: contractRelative, sha256: contractSha256 }, artifacts: sources },
  scope: levels.map((entry) => entry.level_id),
  levels,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: display(outputPath), levels: levels.map((entry) => entry.level_id), sha256: sha256(outputText),
}, null, 2));
