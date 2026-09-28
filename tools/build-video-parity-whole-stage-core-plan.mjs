import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build a strict-verifier core plan for levels whose complete inventory is
 * present in the opening stage.  The resulting core removes only rule-bearing
 * fields that prove-video-parity-reposition-floors.mjs itself removes when it
 * rebuilds a relaxed core.  It never fabricates a route or a target floor.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const parseIds = (text) => [...new Set(String(text).split(",").flatMap((token) => {
  const match = token.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`Invalid level selection: ${token}`);
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  if (from <= 0 || to < from) throw new Error(`Invalid level range: ${token}`);
  return Array.from({ length: to - from + 1 }, (_value, index) => from + index);
}))].sort((left, right) => left - right);
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const isLevel = (value) => Boolean(value && Number.isSafeInteger(value.id)
  && Array.isArray(value.blocks) && Array.isArray(value.gates));

async function loadLevels(path) {
  const text = await readFile(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.LEVELS ?? [];
    const levels = entries.map((entry) => entry.level ?? entry).filter(isLevel);
    if (!levels.length) throw new Error(`${path}: no LevelSpec records`);
    return { text, levels };
  }
  const bundle = await build({
    entryPoints: [path],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const bytes = Buffer.from(bundle.outputFiles[0].contents);
  const module = await import(`data:text/javascript;base64,${bytes.toString("base64")}`);
  const entries = module.VIDEO_PARITY_LEVELS ?? module.LEVELS ?? module.default;
  if (!Array.isArray(entries) || !entries.every(isLevel)) {
    throw new Error(`${path}: no exported LevelSpec array`);
  }
  return { text, levels: entries };
}

function relaxedImmutableSignature(source) {
  const block = structuredClone(source);
  const activeColor = block.layers?.[0] ?? block.color;
  block.color = activeColor;
  block.layers = [activeColor];
  delete block.id;
  delete block.x;
  delete block.y;
  delete block.frozen;
  delete block.shutterId;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
  return canonicalJson(block);
}

const inputRelative = required("--input");
const witnessesRelative = required("--witnesses");
const outputRelative = required("--output");
const ids = parseIds(required("--levels"));
const inputPath = resolve(root, inputRelative);
const witnessesPath = resolve(root, witnessesRelative);
const { text: inputText, levels } = await loadLevels(inputPath);
const witnessText = await readFile(witnessesPath, "utf8");
const witnessArtifact = JSON.parse(witnessText);
const witnessEntries = Array.isArray(witnessArtifact)
  ? witnessArtifact
  : witnessArtifact.levels ?? witnessArtifact.routes ?? [];
const routeById = new Map(witnessEntries.map((entry) => [
  Number(String(entry.level_id ?? entry.levelId ?? entry.id).replace(/^Lv/i, "")),
  entry.drags ?? entry.actions ?? entry.route?.drags ?? entry.route,
]));
const levelById = new Map(levels.map((level) => [level.id, level]));
const plans = [];

for (const id of ids) {
  const level = levelById.get(id);
  if (!level) throw new Error(`Lv${id}: missing from input`);
  const route = routeById.get(id);
  if (!Array.isArray(route) || !route.length) throw new Error(`Lv${id}: missing completion witness`);
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds ?? []));
  const autonomous = new Set([
    ...(level.elevators ?? []).map((item) => item.blockId),
    ...(level.conveyors ?? []).map((item) => item.blockId),
  ]);
  const nonOpening = level.blocks.filter((block) => block.shutterId
    || queued.has(block.id) || autonomous.has(block.id));
  if (nonOpening.length) {
    throw new Error(`Lv${id}: whole-stage core requires every block in opening stage; found ${nonOpening.map((block) => block.id).join(", ")}`);
  }
  const floor = Number(level.designTargets?.minimumRepositionOverhead);
  if (!Number.isSafeInteger(floor) || floor <= 0) throw new Error(`Lv${id}: invalid authored floor`);
  const classes = new Map();
  for (const block of level.blocks) {
    const signature = relaxedImmutableSignature(block);
    if (!classes.has(signature)) classes.set(signature, []);
    classes.get(signature).push(block.id);
  }
  const symmetryClasses = [...classes.values()]
    .filter((blockIds) => blockIds.length >= 2)
    .map((blockIds) => [...blockIds].sort());
  plans.push({
    level_id: `Lv${String(id).padStart(3, "0")}`,
    source: "contract-bound whole-opening relaxed core with verifier-validated symmetry classes",
    proof_scope: "single all-opening-block relaxed-core lower bound",
    level_spec_sha256: sha256(canonicalJson(level)),
    groups: [{
      id: "opening-all",
      stage_key: "opening",
      target_reposition_overhead: floor,
      proof_method: "exact_gameplay_frontier",
      block_ids: level.blocks.map((block) => block.id),
      interchangeable_block_id_groups: symmetryClasses,
      route,
    }],
  });
}

const output = {
  schema_version: "blockout-video-parity-whole-opening-core-plan-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    input: { path: inputRelative, sha256: sha256(inputText) },
    witnesses: { path: witnessesRelative, sha256: sha256(witnessText) },
  },
  levels: plans,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  levels: plans.map((plan) => plan.level_id),
  sha256: sha256(outputText),
}, null, 2));
