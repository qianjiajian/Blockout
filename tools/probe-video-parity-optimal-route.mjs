import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Read-only diagnostic for isolated candidate files. This is intentionally not
// part of the campaign generation or acceptance pipeline.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(root, process.argv[2] ?? ".codex-temp/video-parity-lv17-lv32-floor-seeds/runtime.generated.ts");
const levelId = Number(process.argv[3] ?? 17);
const maxStates = Number(process.argv[4] ?? 500_000);
const gatePatch = process.argv[5]
  ? Object.fromEntries(process.argv[5].split(",").map((part) => part.split("=")))
  : null;
const coreIds = process.argv[6]?.startsWith("core=")
  ? new Set(process.argv[6].slice("core=".length).split(",").filter(Boolean))
  : null;

const isJson = input.toLowerCase().endsWith(".json");
const bundle = await build({
  stdin: {
    contents: `
      ${isJson ? "" : `export { VIDEO_PARITY_LEVELS } from ${JSON.stringify(input.replaceAll("\\", "/"))};`}
      export { validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelOptimally } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "video-parity-optimal-route-probe.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
let level;
if (isJson) {
  const parsed = JSON.parse(await readFile(input, "utf8"));
  const entry = (Array.isArray(parsed) ? parsed : parsed.levels ?? []).find((item) => (
    Number(String(item.level_id ?? item.id ?? "").replace(/^Lv/i, "")) === levelId
  ));
  level = structuredClone(entry?.level ?? entry?.candidates?.find((candidate) => candidate.level?.id === levelId)?.level
    ?? (entry?.id === levelId ? entry : null));
} else {
  level = structuredClone(runtime.VIDEO_PARITY_LEVELS.find((entry) => entry.id === levelId));
}
if (!level) throw new Error(`Lv${levelId} not found in ${input}`);
if (gatePatch) {
  const gateIndex = Number(gatePatch.index ?? 1);
  const gate = level.gates[gateIndex];
  if (!gate) throw new Error(`Gate index ${gateIndex} not found`);
  if (gatePatch.side) gate.side = gatePatch.side;
  if (gatePatch.offset !== undefined) gate.offset = Number(gatePatch.offset);
  if (gatePatch.size !== undefined) gate.size = Number(gatePatch.size);
}
if (coreIds) {
  if (coreIds.has("*")) {
    coreIds.clear();
    for (const block of level.blocks) coreIds.add(block.id);
  }
  level.blocks = level.blocks.filter((block) => coreIds.has(block.id)).map((source) => {
    const block = structuredClone(source);
    const activeColor = block.layers?.[0] ?? block.color;
    block.color = activeColor;
    block.layers = [activeColor];
    delete block.frozen;
    delete block.shutterId;
    delete block.keyId;
    delete block.lockedBy;
    delete block.lockCount;
    delete block.star;
    return block;
  });
  if (level.blocks.length !== coreIds.size) throw new Error("One or more requested core block ids are missing");
  level.gates = level.gates.map((source) => {
    const gate = structuredClone(source);
    delete gate.frozen;
    delete gate.star;
    return gate;
  });
  level.blocked = [];
  delete level.shutters;
  delete level.generators;
  delete level.elevators;
  delete level.conveyors;
  delete level.designTargets;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  delete level.featureIntro;
}
runtime.validateLevel(level);
const result = runtime.solveLevelOptimally(level, maxStates);
console.log(JSON.stringify({ input, level_id: levelId, max_states: maxStates, gate_patch: gatePatch,
  core_ids: coreIds ? [...coreIds] : null, ...result }, null, 2));
