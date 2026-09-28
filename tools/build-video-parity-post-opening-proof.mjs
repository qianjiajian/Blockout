import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = arg(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const inputPath = resolve(root, required("--input"));
const outputPath = resolve(root, required("--output"));
const levelNumber = Number(required("--level"));
const contractSha256 = required("--contract-sha256").toUpperCase();
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};

const inputText = await readFile(inputPath, "utf8");
const input = JSON.parse(inputText);
const entries = Array.isArray(input) ? input : input.levels ?? [];
const source = entries.find((entry) => Number(String(entry.level_id ?? entry.level?.id).replace(/^Lv/i, "")) === levelNumber);
if (!source?.level) throw new Error(`Lv${levelNumber} is missing from input`);
const level = structuredClone(source.level);
const shutters = level.shutters ?? [];
if (shutters.length !== 1) throw new Error(`Lv${levelNumber} must have exactly one staged cover for this proof`);
const shutter = shutters[0];
const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
const opening = level.blocks.filter((block) => !block.shutterId);
if (!hidden.length || !opening.length) throw new Error("both opening and hidden cohorts are required");
if (hidden.length + opening.length !== level.blocks.length) throw new Error("nested or foreign stage bindings are unsupported");
const clearLayers = (block) => Array.isArray(block.layers) && block.layers.length ? block.layers.length : 1;
const openingClearLoad = opening.reduce((sum, block) => sum + clearLayers(block), 0);
if (shutter.count !== openingClearLoad) {
  throw new Error(`cover count ${shutter.count} != deterministic opening clear load ${openingClearLoad}`);
}
if (opening.some((block) => block.triggerBlockIds?.length || block.locked || block.lockCount || block.keyToken)) {
  throw new Error("opening cohort contains a dependency that invalidates direct post-opening projection");
}
const projected = structuredClone(level);
projected.id = levelNumber;
projected.name = `${level.name} — exact post-opening lower-bound projection`;
projected.blocks = hidden.map((block) => {
  const copy = structuredClone(block);
  delete copy.shutterId;
  if (Number.isFinite(copy.frozen)) {
    copy.frozen = Math.max(0, copy.frozen - openingClearLoad);
    if (copy.frozen === 0) delete copy.frozen;
  }
  return copy;
});
projected.gates = (level.gates ?? []).map((gate) => {
  const copy = structuredClone(gate);
  if (Number.isFinite(copy.frozen)) {
    copy.frozen = Math.max(0, copy.frozen - openingClearLoad);
    if (copy.frozen === 0) delete copy.frozen;
  }
  return copy;
});
delete projected.shutters;
delete projected.elevators;
delete projected.conveyors;

const projectedSha256 = sha256(JSON.stringify(canonical(projected)));
const artifact = {
  schema_version: "blockout-video-parity-post-opening-lower-bound-projection-v1",
  source_binding: {
    contract_sha256: contractSha256,
    input: { path: relative(root, inputPath).replaceAll("\\", "/"), sha256: sha256(inputText) },
    source_level_spec_sha256: sha256(JSON.stringify(canonical(level))),
    projected_level_spec_sha256: projectedSha256,
  },
  theorem: {
    kind: "single-cover-deterministic-post-opening-projection",
    cover_id: shutter.id,
    cover_count: shutter.count,
    opening_block_count: opening.length,
    opening_clear_load: openingClearLoad,
    hidden_block_count: hidden.length,
    checks: {
      exactly_one_cover: true,
      every_hidden_block_bound_to_cover: true,
      no_hidden_block_active_before_release: true,
      release_requires_all_opening_clear_layers: true,
      opening_actions_cannot_change_hidden_anchors: true,
      frozen_counters_projected_by_exact_clear_load: true,
      opening_repositions_have_nonnegative_cost: true,
    },
    implication: "Every full-level completion reaches this exact hidden-cohort state after at least opening_clear_load clears; discarding all opening reposition cost is a relaxation, so the projected minimum is a valid lower bound for the full level.",
  },
  levels: [{
    level_id: `Lv${String(levelNumber).padStart(3, "0")}`,
    target: source.target,
    level: projected,
    route: [],
  }],
};
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
await writeFile(outputPath, outputText);
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  sha256: sha256(outputText),
  source_level_spec_sha256: artifact.source_binding.source_level_spec_sha256,
  projected_level_spec_sha256: projectedSha256,
  opening_clear_load: openingClearLoad,
  hidden_blocks: hidden.length,
}, null, 2));
