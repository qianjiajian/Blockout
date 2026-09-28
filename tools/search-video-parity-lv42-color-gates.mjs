import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Deterministic contract-preserving Lv42 search over colour placement and
// one-cell ordinary gate geometry.  A legacy filtered route supplies only an
// action order; every exit path is rebuilt from the live PuzzleModel state and
// replayed from scratch.  The output remains candidate evidence, never a proof.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirRelative = process.env.VIDEO_PARITY_LV42_COLOR_SOURCE_DIR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-subsets-r1";
const sourceFakeId = Number(process.env.VIDEO_PARITY_LV42_COLOR_SOURCE_ID ?? 42022);
const outputDirRelative = process.env.VIDEO_PARITY_LV42_COLOR_OUTPUT_DIR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-colors-r1";
const count = Math.max(1, Number(process.env.VIDEO_PARITY_LV42_COLOR_COUNT ?? 64));
const maxAttempts = Math.max(count, Number(process.env.VIDEO_PARITY_LV42_COLOR_MAX_ATTEMPTS ?? 20000));
const fakeIdStart = Math.max(1000, Number(process.env.VIDEO_PARITY_LV42_COLOR_ID_START ?? 42101));
const seed = Number(process.env.VIDEO_PARITY_LV42_COLOR_SEED ?? 0x42c0106);
const fixedGateGeometry = process.env.VIDEO_PARITY_LV42_COLOR_FIXED_GATE_GEOMETRY === "1";
const requireUniqueTopCarrier = process.env.VIDEO_PARITY_LV42_COLOR_REQUIRE_UNIQUE_TOP === "1";
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const pointKey = (x, y) => `${x},${y}`;

const runtimeBundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "video-parity-lv42-colour-gate-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString("base64")}`);

const sourceInputPath = resolve(root, sourceDirRelative, "proof-input.json");
const sourceWitnessPath = resolve(root, sourceDirRelative, "proof-witness.json");
const [sourceInputText, sourceWitnessText] = await Promise.all([
  readFile(sourceInputPath, "utf8"),
  readFile(sourceWitnessPath, "utf8"),
]);
const sourceEntry = JSON.parse(sourceInputText).levels.find((entry) => entry.level?.id === sourceFakeId);
const sourceWitness = JSON.parse(sourceWitnessText).find((entry) => Number(entry.level_id.slice(2)) === sourceFakeId);
if (!sourceEntry || !sourceWitness) throw new Error(`source candidate ${sourceFakeId} missing`);
const sourceLevel = sourceEntry.level;
const sourceRoute = sourceWitness.drags;
const palette = ["cyan", "green", "orange", "red"];

let randomState = seed >>> 0;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
};
const shuffled = (values) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
};

const playable = new Set(sourceLevel.playable.map(([x, y]) => pointKey(x, y)));
const boundarySlots = [];
for (const [x, y] of sourceLevel.playable) {
  if (y === 0) boundarySlots.push({ side: "top", offset: x });
  if (x === sourceLevel.width - 1) boundarySlots.push({ side: "right", offset: y });
  if (y === sourceLevel.height - 1) boundarySlots.push({ side: "bottom", offset: x });
  if (x === 0) boundarySlots.push({ side: "left", offset: y });
}
const uniqueBoundarySlots = [...new Map(boundarySlots.map((slot) => [`${slot.side}:${slot.offset}`, slot])).values()];
const slotKey = (slot) => `${slot.side}:${slot.offset}`;
const gateCell = (gate, level) => gate.side === "top" ? [gate.offset, 0]
  : gate.side === "bottom" ? [gate.offset, level.height - 1]
    : gate.side === "left" ? [0, gate.offset]
      : [level.width - 1, gate.offset];

function reachableBoundarySlotKeys(model, level, blockId) {
  const block = model.getBlock(blockId);
  if (!block) return new Set();
  const boundaryByCell = new Map();
  for (const slot of uniqueBoundarySlots) {
    const cellKey = pointKey(...gateCell(slot, level));
    const entries = boundaryByCell.get(cellKey) ?? [];
    entries.push(slotKey(slot));
    boundaryByCell.set(cellKey, entries);
  }
  const reached = new Set([pointKey(block.x, block.y)]);
  const queue = [[block.x, block.y]];
  const result = new Set();
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const key of boundaryByCell.get(pointKey(x, y)) ?? []) result.add(key);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const nextKey = pointKey(nx, ny);
      if (reached.has(nextKey) || !playable.has(nextKey) || !model.canPlace(block, nx, ny)) continue;
      reached.add(nextKey);
      queue.push([nx, ny]);
    }
  }
  return result;
}

function shortestGatePath(model, level, blockId) {
  const block = model.getBlock(blockId);
  if (!block) return null;
  const targetCells = new Map(level.gates.filter((gate) => gate.color === block.color).map((gate) => [
    pointKey(...gateCell(gate, level)), gate,
  ]));
  const start = [block.x, block.y];
  const startKey = pointKey(...start);
  const reached = new Map([[startKey, { point: start, parent: null }]]);
  const queue = [start];
  let targetKey = null;
  for (let index = 0; index < queue.length && targetKey === null; index += 1) {
    const [x, y] = queue[index];
    const key = pointKey(x, y);
    if (targetCells.has(key)) {
      targetKey = key;
      break;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const nextKey = pointKey(nx, ny);
      if (reached.has(nextKey) || !playable.has(nextKey) || !model.canPlace(block, nx, ny)) continue;
      reached.set(nextKey, { point: [nx, ny], parent: key });
      queue.push([nx, ny]);
    }
  }
  if (targetKey === null) return null;
  const path = [];
  let cursor = targetKey;
  while (cursor !== startKey) {
    const entry = reached.get(cursor);
    if (!entry) return null;
    path.push(entry.point);
    cursor = entry.parent;
  }
  path.reverse();
  return { path, exitSide: targetCells.get(targetKey).side };
}

function repairAndReplay(level) {
  const model = new runtime.PuzzleModel(level);
  const route = [];
  let repositions = 0;
  for (const [index, sourceAction] of sourceRoute.entries()) {
    const action = sourceAction.exitSide
      ? { blockId: sourceAction.blockId, ...shortestGatePath(model, level, sourceAction.blockId) }
      : { blockId: sourceAction.blockId, path: sourceAction.path.map(([x, y]) => [x, y]) };
    if (!action.path || (sourceAction.exitSide && !action.exitSide)) {
      return { complete: false, reason: `no exit path ${index}:${sourceAction.blockId}` };
    }
    model.beginAction();
    for (const [x, y] of action.path) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        model.cancelAction();
        return { complete: false, reason: `move ${index}:${action.blockId}@${x},${y}` };
      }
    }
    if (action.exitSide && !model.tryExit(action.blockId, action.exitSide).ok) {
      model.cancelAction();
      return { complete: false, reason: `exit ${index}:${action.blockId}->${action.exitSide}` };
    }
    if (!model.commitAction(true)) return { complete: false, reason: `commit ${index}` };
    if (!action.exitSide) repositions += 1;
    route.push(action);
  }
  const snapshot = model.snapshot();
  return {
    complete: snapshot.complete && snapshot.blocks.length === 0,
    reason: snapshot.complete ? null : `${snapshot.blocks.length} remain`,
    repositions,
    route,
  };
}

// The physical route is independent of colour.  Replay the source once to
// record every boundary slot each block could reach at its own clear step.
// Candidate colours are then chosen only from those reachable gates, making
// every emitted completion route constructive rather than solver-guessed.
const reachableSlotsByBlock = new Map();
{
  const model = new runtime.PuzzleModel(sourceLevel);
  for (const [index, action] of sourceRoute.entries()) {
    if (action.exitSide) reachableSlotsByBlock.set(
      action.blockId,
      reachableBoundarySlotKeys(model, sourceLevel, action.blockId),
    );
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) throw new Error(`source move ${index} rejected`);
    }
    if (action.exitSide && !model.tryExit(action.blockId, action.exitSide).ok) {
      throw new Error(`source exit ${index} rejected`);
    }
    if (!model.commitAction(true)) throw new Error(`source commit ${index} rejected`);
  }
  if (!model.snapshot().complete) throw new Error("source route did not complete during reachability pass");
}
if (reachableSlotsByBlock.size !== sourceLevel.blocks.length) {
  throw new Error(`expected ${sourceLevel.blocks.length} exit reachability sets, found ${reachableSlotsByBlock.size}`);
}

const candidates = [];
const witnesses = [];
const manifest = [];
const seen = new Set();
for (let attempt = 1; attempt <= maxAttempts && candidates.length < count; attempt += 1) {
  const level = structuredClone(sourceLevel);
  const slots = fixedGateGeometry || attempt === 1
    ? sourceLevel.gates.map(({ side, offset }) => ({ side, offset }))
    : shuffled(uniqueBoundarySlots).slice(0, palette.length);
  const selectedSlotKeys = new Set(slots.map(slotKey));
  if (level.blocks.some((block) => ![...reachableSlotsByBlock.get(block.id)]
    .some((key) => selectedSlotKeys.has(key)))) continue;
  const gateColors = shuffled(palette);
  level.gates = slots.map((slot, index) => ({
    id: `lv42-search-gate-${String(index + 1).padStart(2, "0")}`,
    ...slot,
    size: 1,
    color: gateColors[index],
  }));
  const colorBySlot = new Map(level.gates.map((gate) => [slotKey(gate), gate.color]));
  for (const block of level.blocks) {
    const choices = [...reachableSlotsByBlock.get(block.id)]
      .filter((key) => selectedSlotKeys.has(key));
    block.color = colorBySlot.get(choices[Math.floor(random() * choices.length)]);
  }
  if (new Set(level.blocks.map((block) => block.color)).size !== palette.length) continue;
  if (requireUniqueTopCarrier) {
    const topGate = level.gates.find((gate) => gate.side === "top");
    if (!topGate) continue;
    const carriers = level.blocks.filter((block) => block.color === topGate.color);
    if (carriers.length !== 1 || carriers[0].id !== "cc-piece-28") continue;
  }
  const candidateSignature = JSON.stringify({
    colors: level.blocks.map((block) => block.color),
    gates: level.gates.map(({ side, offset, color }) => [side, offset, color]),
  });
  if (seen.has(candidateSignature)) continue;
  seen.add(candidateSignature);
  let validationError = null;
  try { runtime.validateLevel(level); } catch (error) { validationError = error.message; }
  if (validationError) continue;
  const replay = repairAndReplay(level);
  if (!replay.complete) continue;
  const id = fakeIdStart + candidates.length;
  level.id = id;
  level.name = `Lv42 colour/gate search ${String(candidates.length + 1).padStart(3, "0")}`;
  delete level.parMoves;
  candidates.push({
    level_id: `Lv${id}`,
    target: { recommended_minimum_reposition_overhead: 9 },
    audit: { target_reposition_overhead: 9 },
    level,
  });
  witnesses.push({ level_id: `Lv${id}`, drags: replay.route });
  manifest.push({
    ordinal: candidates.length,
    fake_level_id: id,
    source_fake_level_id: sourceFakeId,
    attempt,
    completion_reposition_upper_bound: replay.repositions,
    gate_geometry: level.gates.map(({ side, offset, color }) => ({ side, offset, color })),
    block_colors: Object.fromEntries(level.blocks.map((block) => [block.id, block.color])),
  });
}
if (!candidates.length) throw new Error(`no route-replaying variants after ${maxAttempts} attempts`);

const outputDir = resolve(root, outputDirRelative);
const inputPath = resolve(outputDir, "proof-input.json");
const witnessPath = resolve(outputDir, "proof-witness.json");
const manifestPath = resolve(outputDir, "manifest.json");
await mkdir(outputDir, { recursive: true });
const inputText = `${JSON.stringify({
  schema_version: "blockout-video-parity-lv42-colour-gate-search-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    input: { path: relative(root, sourceInputPath).replaceAll("\\", "/"), sha256: sha256(sourceInputText) },
    witness: { path: relative(root, sourceWitnessPath).replaceAll("\\", "/"), sha256: sha256(sourceWitnessText) },
  },
  levels: candidates,
}, null, 2)}\n`;
const witnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
const manifestText = `${JSON.stringify({
  schema_version: "blockout-video-parity-lv42-colour-gate-search-manifest-v1",
  source_fake_level_id: sourceFakeId,
  seed,
  attempts: manifest.at(-1)?.attempt ?? maxAttempts,
  proof_input_sha256: sha256(inputText),
  proof_witness_sha256: sha256(witnessText),
  candidates: manifest,
}, null, 2)}\n`;
await Promise.all([
  writeFile(inputPath, inputText, "utf8"),
  writeFile(witnessPath, witnessText, "utf8"),
  writeFile(manifestPath, manifestText, "utf8"),
]);
console.log(JSON.stringify({
  input: relative(root, inputPath).replaceAll("\\", "/"),
  witness: relative(root, witnessPath).replaceAll("\\", "/"),
  manifest: relative(root, manifestPath).replaceAll("\\", "/"),
  requested: count,
  emitted: candidates.length,
  attempts: manifest.at(-1)?.attempt ?? maxAttempts,
  selection: candidates.length === 1 ? String(fakeIdStart) : `${fakeIdStart}-${fakeIdStart + candidates.length - 1}`,
}, null, 2));
