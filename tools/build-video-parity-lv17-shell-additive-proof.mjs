import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build the two machine-checkable premises used by the Lv17 additive floor:
 *
 *   relaxed outer-layer projection floor >= 8
 *   + one mandatory reposition of the b1-20 shell carrier
 *   = full runtime floor >= 9
 *
 * The projection recolours only the b1-20 inner layer from red to purple. It
 * retains the same number of clears and every frozen counter, but lets that
 * inner layer leave through the already-open top gate. The structural checks
 * prove that every full solution must reposition the real red inner carrier at
 * least once, while the projected carrier can clear both layers in place.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv17-stage-gadget-mode10-r77/level-only.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv17-shell-additive-proof-r81",
);
const inputPath = resolve(root, inputRelative);
const outputDir = resolve(root, outputDirRelative);
const inputText = await readFile(inputPath, "utf8");
const input = JSON.parse(inputText);
const source = input.levels?.find((entry) => entry.level_id === "Lv017");
if (!source?.level) throw new Error("Lv017 level candidate is missing");
const level = structuredClone(source.level);
if (level.id !== 17) throw new Error(`expected level id 17, received ${level.id}`);
if (source.target?.recommended_minimum_reposition_overhead !== 9) {
  throw new Error("Lv017 full target must be exactly 9 for this additive certificate");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonical(value[key])]]
    )))
    : value;
const levelSha = (value) => sha256(JSON.stringify(canonical(value)));
const pointKey = ([x, y]) => `${x},${y}`;
const shapeKey = (block) => block.shape.map(pointKey).sort().join(";");
const leadingOuterColorLayers = (block) => {
  const layers = block.layers?.length ? block.layers : [block.color];
  let count = 0;
  for (const color of layers) {
    if (color !== block.color) break;
    count += 1;
  }
  return count;
};
const fail = (message) => { throw new Error(`Lv17 additive premise failed: ${message}`); };

if (level.height !== 8 || level.width !== 6 || level.playable?.length !== 48) {
  fail("candidate must retain the exact full 8x6 board");
}
const playable = new Set(level.playable.map(pointKey));
for (let y = 0; y < 8; y += 1) {
  for (let x = 0; x < 6; x += 1) {
    if (!playable.has(`${x},${y}`)) fail(`missing full-board cell ${x},${y}`);
  }
}

const ordinaryGates = level.gates.filter((gate) => !gate.frozen);
if (ordinaryGates.length !== 1) fail(`expected one ordinary gate, received ${ordinaryGates.length}`);
const purpleGate = ordinaryGates[0];
if (purpleGate.color !== "purple" || purpleGate.side !== "top"
  || purpleGate.offset !== 0 || purpleGate.size !== 3) {
  fail("ordinary gate must be purple top[0..2]");
}
const frozenGateValues = level.gates.filter((gate) => gate.frozen)
  .map((gate) => gate.frozen).sort((left, right) => left - right);
if (JSON.stringify(frozenGateValues) !== JSON.stringify([8, 16, 21, 26])) {
  fail(`frozen gate values drifted: ${frozenGateValues.join(",")}`);
}

const byId = new Map(level.blocks.map((block) => [block.id, block]));
const focus = byId.get("cc-017-b1-20");
const cap = byId.get("cc-017-b1-17");
if (!focus || !cap) fail("focus shell or gate cap is missing");
if (focus.x !== 2 || focus.y !== 0 || shapeKey(focus) !== "0,0;0,1") {
  fail("focus shell must be the vertical domino at (2,0)");
}
if (focus.color !== "purple" || JSON.stringify(focus.layers) !== JSON.stringify(["purple", "red"])) {
  fail("focus shell must peel from purple to red");
}
if (cap.x !== 0 || cap.y !== 0 || shapeKey(cap) !== "0,0;0,1;1,0;1,1"
  || cap.color !== "purple" || JSON.stringify(cap.layers) !== JSON.stringify(["purple", "purple"])) {
  fail("the 2x2 purple cap must occupy top columns 0 and 1 with one extra layer");
}
const redGate = level.gates.find((gate) => gate.color === "red");
if (!redGate || redGate.frozen !== 26) fail("the focus inner colour must remain locked to frozen-26 red");

const purpleBlocks = level.blocks.filter((block) => block.color === "purple");
const widePurple = purpleBlocks.filter((block) => shapeKey(block) === "0,0;1,0;2,0");
if (widePurple.length < 1) fail("at least one width-3 purple body is required");
const narrowPurpleClearLoad = purpleBlocks
  .filter((block) => shapeKey(block) !== "0,0;1,0;2,0")
  .reduce((sum, block) => sum + leadingOuterColorLayers(block), 0);
if (narrowPurpleClearLoad !== 7) {
  fail(`non-H3 purple clear load must be exactly 7 before frozen-8 opens, received ${narrowPurpleClearLoad}`);
}
if (level.gates.some((gate) => gate !== purpleGate && gate.frozen < 8)) {
  fail("no alternative colour gate may open before eight clears");
}

const projection = structuredClone(level);
projection.name = `${level.name} — focus-inner-colour-relaxation`;
projection.blocks = projection.blocks.map((block) => {
  const copy = structuredClone(block);
  if (copy.id === focus.id) copy.layers = ["purple", "purple"];
  return copy;
});
delete projection.parMoves;
projection.designTargets = {
  ...(projection.designTargets ?? {}),
  minimumRepositionOverhead: 8,
};

const projectionTarget = structuredClone(source.target);
projectionTarget.campaign_reposition_floor = 8;
projectionTarget.recommended_minimum_reposition_overhead = 8;
if (projectionTarget.solver_acceptance) {
  projectionTarget.solver_acceptance.necessary_reposition_lower_bound = 8;
}
const projectionArtifact = {
  schema_version: "blockout-video-parity-lv17-focus-inner-colour-relaxation-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source_binding: {
    input: { path: inputRelative, sha256: sha256(inputText) },
    full_level_spec_sha256: levelSha(level),
    projected_level_spec_sha256: levelSha(projection),
  },
  levels: [{ level_id: "Lv017", target: projectionTarget, level: projection }],
};
const theorem = {
  schema_version: "blockout-video-parity-lv17-shell-additive-theorem-v1",
  source_binding: projectionArtifact.source_binding,
  claimed_full_floor: 9,
  premises: {
    relaxed_projection_floor: 8,
    mandatory_omittable_focus_reposition: 1,
  },
  structural_checks: {
    exact_full_board_8x6: true,
    one_initially_open_gate: true,
    open_gate_is_three_cell_purple_top: true,
    focus_vertical_domino_fills_gate_column_2: true,
    cap_sq2_fills_gate_columns_0_and_1: true,
    focus_outer_layer_can_be_removed_directly_in_projection: true,
    focus_inner_red_is_locked_until_26_clears_in_full_level: true,
    non_h3_purple_clear_load_before_first_other_gate: narrowPurpleClearLoad,
    first_other_gate_requires_clear_load: 8,
    remaining_purple_h3_requires_all_three_gate_columns: true,
  },
  implication: [
    "Until eight layers clear, only purple can exit. The seven non-H3 purple layers are insufficient, so a purple H3 must use the full top aperture.",
    "The b1-20 carrier occupies aperture column 2 before peeling and leaves a red core in the same cells after peeling; therefore every full solution must reposition that carrier at least once.",
    "If that reposition happens before peeling, a projected solution clears both purple layers directly at the initial gate position and omits the move. If it happens after peeling, the projected purple inner layer clears immediately and likewise omits the move.",
    "The projection keeps the same two clear events and only makes the second one available earlier; this cannot invalidate any remaining explicit PuzzleModel action, so every full solution maps to a projected solution with at least one fewer reposition.",
    "A certified projected floor of 8 therefore implies a full-runtime floor of at least 9.",
  ],
};

await mkdir(outputDir, { recursive: true });
const projectionText = `${JSON.stringify(projectionArtifact, null, 2)}\n`;
const theoremText = `${JSON.stringify(theorem, null, 2)}\n`;
const emptyWitnessText = `${JSON.stringify({
  schema_version: "blockout-video-parity-empty-route-seed-v1",
  levels: [{ level_id: "Lv017", events: [] }],
}, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "projection.json"), projectionText, "utf8"),
  writeFile(resolve(outputDir, "additive-theorem.json"), theoremText, "utf8"),
  writeFile(resolve(outputDir, "empty-routes.json"), emptyWitnessText, "utf8"),
]);
console.log(JSON.stringify({
  output_dir: relative(root, outputDir).replaceAll("\\", "/"),
  projection_sha256: sha256(projectionText),
  theorem_sha256: sha256(theoremText),
  full_level_spec_sha256: projectionArtifact.source_binding.full_level_spec_sha256,
  projected_level_spec_sha256: projectionArtifact.source_binding.projected_level_spec_sha256,
  narrow_purple_clear_load: narrowPurpleClearLoad,
  wide_purple_blocks: widePurple.map((block) => block.id),
}, null, 2));
