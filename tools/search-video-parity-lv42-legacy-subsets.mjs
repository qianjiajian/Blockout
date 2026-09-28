import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Lv42's v5 layout has a current-PuzzleModel floor certificate at 29 singles,
// while the video-parity v6 contract requires exactly 24.  This isolated
// search emits deterministic five-block deletion projections.  It deliberately
// transfers no certificate: every projection is replayed afresh and must be
// proven again by a current proof process.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = process.env.VIDEO_PARITY_LV42_LEGACY_INPUT_RELATIVE
  ?? "playtest-results/experiments/competitor-composition-r141/strict-batches/034-066/artifacts/lv042-whole-level-floor-9-DC6A6CE30ED4-input.json";
const outputDirRelative = process.env.VIDEO_PARITY_LV42_SUBSET_OUTPUT_DIR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-subsets-r1";
const count = Math.max(1, Number(process.env.VIDEO_PARITY_LV42_SUBSET_COUNT ?? 48));
const seed = Number(process.env.VIDEO_PARITY_LV42_SUBSET_SEED ?? 0x420006);
const fakeIdStart = Math.max(1000, Number(process.env.VIDEO_PARITY_LV42_SUBSET_ID_START ?? 42001));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const runtimeBundle = await build({
  stdin: {
    contents: `
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
    `,
    resolveDir: root,
    sourcefile: "video-parity-lv42-subset-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString("base64")}`);

const sourceText = await readFile(resolve(root, sourceRelative), "utf8");
const source = JSON.parse(sourceText).levels.find((entry) => entry.level?.id === 42);
if (!source) throw new Error("Lv42 legacy proof input is missing");
const baseLevel = source.level;
const baseRoute = source.route;
const allIds = baseLevel.blocks.map((block) => block.id);

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
const signature = (ids) => [...ids].sort().join("|");
const removalSets = [];
const seen = new Set();
const add = (ids, strategy) => {
  if (ids.length !== 5) return;
  const key = signature(ids);
  if (seen.has(key)) return;
  seen.add(key);
  removalSets.push({ ids: [...ids].sort(), strategy });
};

// Start with compact holes in the roomy lower chamber, then diversify across
// the full inventory.  Keeping the seven historically parked pieces is only a
// search heuristic and is not part of any proof claim.
const historicallyParked = new Set([
  "cc-piece-03", "cc-piece-04", "strategy-guard-06", "cc-piece-07",
  "cc-piece-08", "cc-piece-09", "cc-piece-10",
]);
const nonParked = allIds.filter((id) => !historicallyParked.has(id));
for (let start = 0; start + 5 <= nonParked.length && removalSets.length < count; start += 1) {
  add(nonParked.slice(start, start + 5), "contiguous-non-parked-window");
}
while (removalSets.length < count) {
  const pool = random() < 0.8 ? nonParked : allIds;
  add(shuffled(pool).slice(0, 5), pool === nonParked ? "random-non-parked" : "random-all");
}

const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  for (const [index, action] of route.entries()) {
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        model.cancelAction();
        return { complete: false, reason: `move ${index} ${action.blockId}@${x},${y}` };
      }
    }
    if (action.exitSide && !model.tryExit(action.blockId, action.exitSide).ok) {
      model.cancelAction();
      return { complete: false, reason: `exit ${index} ${action.blockId}->${action.exitSide}` };
    }
    if (!model.commitAction(true)) return { complete: false, reason: `commit ${index}` };
    if (!action.exitSide) repositions += 1;
  }
  const snapshot = model.snapshot();
  return {
    complete: snapshot.complete && snapshot.blocks.length === 0,
    reason: snapshot.complete ? null : `${snapshot.blocks.length} remain`,
    repositions,
    actions: route.length,
  };
};

const levels = [];
const witnesses = [];
const manifest = [];
for (const [index, removal] of removalSets.entries()) {
  const removed = new Set(removal.ids);
  const level = structuredClone(baseLevel);
  level.id = fakeIdStart + index;
  level.name = `Lv42 v6 five-hole projection ${String(index + 1).padStart(3, "0")}`;
  level.timeSeconds = 135;
  level.blocks = level.blocks.filter((block) => !removed.has(block.id));
  level.designTargets = {
    formulaVersion: "blockout-d1-campaign-wave",
    calibratedDifficulty: 79,
    minimumRepositionOverhead: 9,
  };
  delete level.parMoves;
  runtime.validateLevel(level);
  const route = baseRoute.filter((action) => !removed.has(action.blockId));
  const result = replay(level, route);
  if (!result.complete) throw new Error(`projection ${index + 1} failed replay: ${result.reason}`);
  const levelId = `Lv${level.id}`;
  levels.push({
    level_id: levelId,
    target: { recommended_minimum_reposition_overhead: 9 },
    audit: { target_reposition_overhead: 9 },
    level,
  });
  witnesses.push({ level_id: levelId, drags: route });
  manifest.push({
    ordinal: index + 1,
    fake_level_id: level.id,
    removed_block_ids: removal.ids,
    strategy: removal.strategy,
    replay: result,
  });
}

const outputDir = resolve(root, outputDirRelative);
const inputPath = resolve(outputDir, "proof-input.json");
const witnessPath = resolve(outputDir, "proof-witness.json");
const manifestPath = resolve(outputDir, "manifest.json");
await mkdir(outputDir, { recursive: true });
const inputText = `${JSON.stringify({
  schema_version: "blockout-video-parity-lv42-subset-search-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: { path: sourceRelative, sha256: sha256(sourceText) },
  levels,
}, null, 2)}\n`;
const witnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
const manifestText = `${JSON.stringify({
  schema_version: "blockout-video-parity-lv42-subset-manifest-v1",
  source: { path: sourceRelative, sha256: sha256(sourceText) },
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
  candidate_count: levels.length,
  selection: levels.map((entry) => entry.level.id).join(","),
}, null, 2));
