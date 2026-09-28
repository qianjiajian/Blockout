import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Lv64 has six logical colours but seven exits.  Preserve the already replayed
// geometry and move the sixth colour onto a late hidden carrier, so the exact
// frozen-exit multiset can thaw before each colour's first routed clear.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const inputRelative = process.env.VIDEO_PARITY_LV64_ACTIVATION_INPUT_RELATIVE
  ?? ".codex-temp/video-parity-lv64-final-gate-seed-r3/final-cover-model-candidates.json";
const repairedRoutesRelative = process.env.VIDEO_PARITY_LV64_ACTIVATION_REPAIRED_ROUTES_RELATIVE
  ?? ".codex-temp/video-parity-lv64-activation-seed-r4/repaired-base-routes.json";
const outputRelative = process.env.VIDEO_PARITY_LV64_ACTIVATION_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-lv64-activation-seed/base-overrides.json";
const sha256 = (text) => createHash("sha256").update(text).digest("hex").toUpperCase();
const [contractText, inputText, repairedRoutesText] = await Promise.all([
  readFile(resolve(root, contractRelative), "utf8"),
  readFile(resolve(root, inputRelative), "utf8"),
  readFile(resolve(root, repairedRoutesRelative), "utf8"),
]);
const contract = JSON.parse(contractText);
const input = JSON.parse(inputText);
const source = (input.levels ?? input).find((entry) => Number(entry.level?.id ?? entry.id) === 64);
if (!source?.level || !Array.isArray(source.route)) throw new Error("Lv64 source entry or route missing");
const entry = structuredClone(source);
const repairedRouteEntry = JSON.parse(repairedRoutesText)
  .find((candidate) => Number(String(candidate.level_id).replace(/^Lv/i, "")) === 64);
if (!repairedRouteEntry?.replayed || !Array.isArray(repairedRouteEntry.events)) {
  throw new Error("Lv64 independently replayed route missing");
}
entry.route = structuredClone(repairedRouteEntry.events);
entry.level_id = "Lv064";
entry.target = structuredClone(contract.levels.find((candidate) => candidate.level_id === "Lv064").our_design_target);
const placements = {
  "cc-064-b3-03": [3, 8],
  "cc-064-b3-05": [5, 6],
  "cc-064-b4-05": [0, 0],
  "cc-064-b4-06": [4, 0],
  "cc-064-b1-04": [0, 6],
};
for (const [id, [x, y]] of Object.entries(placements)) {
  const block = entry.level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv64 block ${id} missing`);
  Object.assign(block, { x, y });
}
const rotatedCover13L4 = entry.level.blocks.find((candidate) => candidate.id === "cc-064-b4-05");
if (!rotatedCover13L4) throw new Error("Lv64 cover-13 L4 rotation carrier missing");
rotatedCover13L4.shape = [[0, 0], [1, 0], [2, 0], [0, 1]];
// Clear the stage-2 right-facing L3 first, then one already-accessible red
// block, before the two top-facing stage-2 blocks.  This preserves the crucial
// invariant that stage 3 activates only after all overlapping stage-2 bodies
// have departed, while delaying the next distinct colours past 6 and 8 clears.
const stage2GreenId = "cc-064-b2-03";
const stage2GreenIndex = entry.route.findIndex((event) => event.blockId === stage2GreenId && event.exitSide);
const fillerRedId = "cc-064-b1-05";
const fillerRedIndex = entry.route.findIndex((event) => event.blockId === fillerRedId && event.exitSide);
if (stage2GreenIndex < 0 || fillerRedIndex < 0) throw new Error("Lv64 threshold route events missing");
const [stage2GreenEvent] = entry.route.splice(stage2GreenIndex, 1);
stage2GreenEvent.path = [[5, 1], [5, 2], [5, 3]];
stage2GreenEvent.purpose = "deadline-threshold-green-exit";
const refreshedFillerIndex = entry.route.findIndex((event) => event.blockId === fillerRedId && event.exitSide);
if (refreshedFillerIndex < 0) throw new Error("Lv64 threshold filler missing after first splice");
const [fillerRedEvent] = entry.route.splice(refreshedFillerIndex, 1);
const firstPurpleIndex = entry.route.findIndex((event) => event.blockId === "cc-064-b2-01" && event.exitSide);
if (firstPurpleIndex < 0) throw new Error("Lv64 first purple event missing");
entry.route.splice(firstPurpleIndex, 0, stage2GreenEvent, fillerRedEvent);

// Keep five colours in the opening cohort.  The route clears red/green/purple
// first; cyan starts only after clear 8, blue after clear 16, and the hidden
// sixth colour (orange) after clear 17.  Updating every shell layer with its
// carrier colour preserves the contracted layer count and shape/stage pairing.
const recolors = {
  "cc-064-b2-03": "green",
  "cc-064-b2-02": "purple",
  "cc-064-b3-02": "purple",
  "cc-064-b3-05": "orange",
  "cc-064-b3-03": "cyan",
  "cc-064-b4-01": "purple",
  "cc-064-b1-10": "green",
};
for (const [id, color] of Object.entries(recolors)) {
  const block = entry.level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv64 recolour carrier ${id} missing`);
  block.color = color;
  if (Array.isArray(block.layers)) block.layers = block.layers.map(() => color);
}
entry.level.gates = [
  { id: "cc-064-gate-1", side: "bottom", offset: 0, size: 3, color: "red" },
  { id: "cc-064-gate-2", side: "right", offset: 3, size: 3, color: "green" },
  { id: "cc-064-gate-3", side: "top", offset: 3, size: 3, color: "purple" },
  { id: "cc-064-gate-4", side: "right", offset: 0, size: 3, color: "cyan" },
  { id: "cc-064-gate-5", side: "top", offset: 6, size: 1, color: "blue" },
  { id: "cc-064-gate-6", side: "right", offset: 6, size: 3, color: "orange" },
  { id: "cc-064-gate-7", side: "bottom", offset: 3, size: 3, color: "blue" },
];
entry.carrierAssignments = {
  shells: [
    { block_id: "cc-064-b3-04", requirement_index: 0, layers: ["green", "cyan"] },
    { block_id: "cc-064-b4-04", requirement_index: 1, layers: ["red", "blue"] },
    { block_id: "cc-064-b4-03", requirement_index: 2, layers: ["cyan", "green"] },
  ],
  numeric_ice: [
    { block_id: "cc-064-b4-06", requirement_index: 0 },
  ],
};
const stage3Top = entry.route.find((event) => event.blockId === "cc-064-b3-02" && event.exitSide);
if (!stage3Top) throw new Error("Lv64 stage-3 top carrier missing");
stage3Top.path = [];
stage3Top.exitSide = "top";
const takeEvents = (blockId) => {
  const taken = entry.route.filter((event) => event.blockId === blockId && event.exitSide);
  entry.route = entry.route.filter((event) => !(event.blockId === blockId && event.exitSide));
  return taken;
};
const [cover8L4Event] = takeEvents("cc-064-b3-04");
const [lateGreenEvent] = takeEvents("cc-064-b1-10");
const [numericGreenEvent] = takeEvents("cc-064-b4-06");
const [cyanFillerEvent] = takeEvents("cc-064-b1-03");
const [lateBlueEvent] = takeEvents("cc-064-b3-05");
const [relocatedStage3Event] = takeEvents("cc-064-b3-03");
if (![cover8L4Event, lateGreenEvent, numericGreenEvent, cyanFillerEvent, lateBlueEvent, relocatedStage3Event].every(Boolean)) {
  throw new Error("Lv64 staged route splice inputs missing");
}
const cover8L4Second = {
  ...structuredClone(cover8L4Event),
  path: [[4, 3], [4, 2], [4, 1]],
  purpose: "contracted-shell-second-layer",
};
lateGreenEvent.path = [[3, 5], [4, 5], [5, 5], [6, 5], [6, 4]];
numericGreenEvent.path = [[4, 1], [4, 2], [4, 3], [5, 3]];
lateBlueEvent.path = [];
lateBlueEvent.exitSide = "right";
lateBlueEvent.purpose = "deadline-threshold-orange-exit";
relocatedStage3Event.path = [[3, 7], [3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [4, 1]];
const lastStage2Index = entry.route.findIndex((event) => event.blockId === "cc-064-b2-04" && event.exitSide);
if (lastStage2Index < 0) throw new Error("Lv64 last stage-2 route event missing");
entry.route.splice(
  lastStage2Index + 1,
  0,
  cover8L4Event,
  cover8L4Second,
  lateGreenEvent,
  numericGreenEvent,
  cyanFillerEvent,
  lateBlueEvent,
);
const firstBottomShellIndex = entry.route.findIndex((event) => event.blockId === "cc-064-b4-04" && event.exitSide);
if (firstBottomShellIndex < 0) throw new Error("Lv64 bottom shell route event missing");
entry.route.splice(firstBottomShellIndex, 0, relocatedStage3Event);
const latePurpleIndex = entry.route.findIndex((event) => event.blockId === "cc-064-b4-05" && event.exitSide);
if (latePurpleIndex < 0) throw new Error("Lv64 relocated cover-13 L4 route event missing");
entry.route[latePurpleIndex].path = [[0, 1], [1, 1], [2, 1], [3, 1], [3, 0]];
const cover13T4Events = entry.route.filter((event) => event.blockId === "cc-064-b4-04" && event.exitSide);
if (cover13T4Events.length !== 2) throw new Error("Lv64 cover-13 T4 shell needs two route events");
cover13T4Events[1].path = [[1, 8], [2, 8], [3, 8]];
cover13T4Events[1].purpose = "contracted-shell-second-layer";
const bottomInnerIndex = entry.route.indexOf(cover13T4Events[1]);
const [bottomInnerEvent] = entry.route.splice(bottomInnerIndex, 1);
const lateOpeningPurpleIndex = entry.route.findIndex((event) => event.blockId === "cc-064-b1-02" && event.exitSide);
if (lateOpeningPurpleIndex < 0) throw new Error("Lv64 late opening purple route event missing");
entry.route.splice(lateOpeningPurpleIndex + 1, 0, bottomInnerEvent);
const bottomRedIndex = entry.route.findIndex((event) => event.blockId === "cc-064-b1-04" && event.exitSide);
if (bottomRedIndex < 0) throw new Error("Lv64 delayed bottom red route event missing");
const [bottomRedEvent] = entry.route.splice(bottomRedIndex, 1);
bottomRedEvent.path = [[0, 7], [0, 8], [0, 9]];
const refreshedBottomOuterIndex = entry.route.findIndex((event) => (
  event.blockId === "cc-064-b4-04" && event.exitSide && event !== bottomInnerEvent
));
entry.route.splice(refreshedBottomOuterIndex, 0, bottomRedEvent);
const cover13L4Events = entry.route.filter((event) => event.blockId === "cc-064-b4-03" && event.exitSide);
if (cover13L4Events.length !== 2) throw new Error("Lv64 cover-13 L4 shell needs two route events");
cover13L4Events[1].path = [[5, 1], [5, 2], [5, 3]];
cover13L4Events[1].purpose = "contracted-shell-second-layer";
const artifact = {
  schema_version: "blockout-video-parity-lv64-deadline-colour-seed-v2",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: sha256(contractText) },
    candidates: { path: inputRelative, sha256: sha256(inputText) },
  },
  policy: {
    immutable: "board, block ids/count/shapes, stage membership/counts, mechanisms, timer",
    permitted_change: "authored route ordering plus colour/exit descriptor remapping; no scalar, shape, stage, or geometry mutation",
    reason: "bind six colours to first-clear thresholds 0/3/6/8/16/17 while retaining the replayed geometry",
  },
  changes: {
    Lv064: {
      placements,
      threshold_filler_event: fillerRedId,
      early_stage2_green_event: stage2GreenId,
      recolors,
      exit_count: entry.level.gates.length,
    },
  },
  levels: [entry],
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputRelative, contract_sha256: artifact.source.contract.sha256, placements }, null, 2));
