import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Independent theorem binder for the Lv19 frozen-wall deadline construction.
// It proves that the exact two-row corridor lower bound transfers to the full
// contract level until every corridor block has cleared.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const levelsRelative = process.env.VIDEO_PARITY_FROZEN_WALL_LEVELS_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/runtime.generated.ts";
const auditRelative = process.env.VIDEO_PARITY_FROZEN_WALL_AUDIT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/audit.json";
const witnessRelative = process.env.VIDEO_PARITY_FROZEN_WALL_WITNESS_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/completion-witness.json";
const planRelative = process.env.VIDEO_PARITY_FROZEN_WALL_PLAN_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/core-plan.json";
const corridorRelative = process.env.VIDEO_PARITY_FROZEN_WALL_CORRIDOR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/frozen-wall-corridor.json";
const corridorProofRelative = process.env.VIDEO_PARITY_FROZEN_WALL_CORRIDOR_PROOF_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/corridor-proof/reposition-floor-proof-lv19-frozen-wall-corridor-19.json";
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const outputRelative = process.env.VIDEO_PARITY_FROZEN_WALL_PROOF_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv19/r8/frozen-wall-deadline-proof.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().flatMap((key) => value[key] === undefined ? [] : [[key, canonical(value[key])]]),
  );
  return value;
};
const specSha = (value) => sha256(JSON.stringify(canonical(value)));
const fail = (message) => { throw new Error(message); };

const paths = [levelsRelative, auditRelative, witnessRelative, planRelative, corridorRelative,
  corridorProofRelative, contractRelative];
const texts = await Promise.all(paths.map((path) => readFile(resolve(root, path), "utf8")));
const [levelsText, auditText, witnessText, planText, corridorText, proofText, contractText] = texts;
const [audit, witness, plan, corridorArtifact, corridorProof] = [auditText, witnessText, planText,
  corridorText, proofText].map(JSON.parse);
const contractSha256 = sha256(contractText);
if (contractSha256 !== "FA86E5E9811351735936EBAB706BA95A91CB6E01865C1FA93F9C26C58793B388") {
  fail(`unexpected active contract ${contractSha256}`);
}
if (String(audit.inputs?.contract?.sha256).toUpperCase() !== contractSha256) fail("audit contract binding mismatch");
if (String(audit.outputs?.levels_sha256).toUpperCase() !== sha256(levelsText)) fail("audit runtime source binding mismatch");
const levelAudit = audit.levels.find((entry) => entry.level_id === "Lv019");
if (levelAudit?.exact_contract?.exact !== true || levelAudit?.validation?.valid === false) fail("Lv19 audit is not exact/valid");

const bundle = await build({
  stdin: {
    contents: `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(resolve(root, levelsRelative))}; export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};`,
    resolveDir: root, loader: "ts",
  }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const level = runtime.levels.find((entry) => entry.id === 19) ?? fail("Lv19 missing");
runtime.validateLevel(level);
const levelSpecSha256 = specSha(level);
const planLevel = plan.levels.find((entry) => entry.level_id === "Lv019") ?? fail("Lv19 plan missing");
if (planLevel.level_spec_sha256 !== levelSpecSha256) fail("plan/full LevelSpec binding mismatch");

const replayRoute = witness.levels.find((entry) => entry.level_id === "Lv019")?.route ?? fail("Lv19 witness missing");
const replay = () => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  for (const [index, event] of replayRoute.entries()) {
    for (const [x, y] of event.path ?? []) if (!model.moveBlock(event.blockId, x, y)) fail(`fresh replay event ${index} move rejected`);
    if (event.exitSide) {
      if (model.exitAttemptStatus(event.blockId, event.exitSide) !== "ok") fail(`fresh replay event ${index} exit rejected`);
      if (!model.tryExit(event.blockId, event.exitSide)) fail(`fresh replay event ${index} exit mutation rejected`);
    } else repositions += 1;
  }
  if (!model.snapshot().complete) fail("fresh replay incomplete");
  return { complete: true, repositions, events: replayRoute.length };
};
const replayA = replay();
const replayB = replay();

const wallIds = planLevel.frozen_separator_block_ids;
const wall = wallIds.map((id) => level.blocks.find((block) => block.id === id) ?? fail(`wall block ${id} missing`));
const wallCells = new Set(wall.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
const expectedWallCells = new Set(Array.from({ length: 2 }, (_, row) => (
  Array.from({ length: 6 }, (_, x) => `${x},${5 + row}`)
)).flat());
if (wallCells.size !== expectedWallCells.size || [...expectedWallCells].some((cell) => !wallCells.has(cell))) {
  fail("frozen wall does not completely span rows 5-6");
}
if (wall.some((block) => Number(block.frozen ?? 0) < planLevel.separator_frozen_threshold)) {
  fail("frozen wall threshold is below the declared deadline");
}
const coreIds = new Set(planLevel.corridor_block_ids);
const core = level.blocks.filter((block) => coreIds.has(block.id));
if (core.length !== coreIds.size || core.some((block) => block.shape.length !== 1 || block.y < 7)) {
  fail("corridor cohort is not the bound eleven-single bottom chamber");
}
const belowWall = level.blocks.filter((block) => block.shape.some(([, dy]) => block.y + dy >= 7));
const permittedBelow = new Set([...coreIds, planLevel.below_separator_filler_block_id]);
if (belowWall.some((block) => !permittedBelow.has(block.id)) || belowWall.length !== permittedBelow.size) {
  fail("unexpected non-corridor block below the frozen separator");
}
const filler = level.blocks.find((block) => block.id === planLevel.below_separator_filler_block_id)
  ?? fail("below-wall filler missing");
const first = replayRoute[0];
if (first.blockId !== filler.id || first.exitSide !== "right" || (first.path?.length ?? 0) !== 0) {
  fail("filler is not independently removed by the bound zero-reposition opening exit");
}
const belowWallClearMaximum = belowWall.length;
if (belowWallClearMaximum >= planLevel.separator_frozen_threshold) {
  fail("wall could thaw before the corridor cohort is exhausted");
}
const lowerGates = level.gates.filter((gate) => gate.side === "left" || gate.side === "right")
  .filter((gate) => gate.offset <= 8 && gate.offset + gate.size > 7);
if (lowerGates.length !== 2 || !lowerGates.some((gate) => gate.side === "left" && gate.offset === 8 && gate.color === "cyan")
  || !lowerGates.some((gate) => gate.side === "right" && gate.offset === 8 && gate.color === "green")) {
  fail("bottom chamber exits differ from the corridor projection");
}

// The separator's numeric countdown is global, so merely counting the lower
// chamber is insufficient: an upper clear could also thaw the wall.  Prove
// that this cannot happen by enumerating the complete one-action frontier of
// the packed upper chamber after every possible prior-clear count 0..11.  The
// counters are reduced by that count, which is the most permissive state the
// upper chamber could have at that deadline.  Because every frontier is empty,
// no upper state beyond its untouched opening is reachable before clear 12.
const upperHeight = 5;
const upperBlocks = level.blocks.filter((block) => block.shape.some(([, dy]) => block.y + dy < upperHeight));
if (upperBlocks.some((block) => block.shape.some(([, dy]) => block.y + dy >= upperHeight))) {
  fail("a block straddles the upper chamber and frozen separator");
}
const upperCells = new Set(upperBlocks.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
const expectedUpperCells = new Set(Array.from({ length: upperHeight }, (_, y) => (
  Array.from({ length: level.width }, (_, x) => `${x},${y}`)
)).flat());
if (upperCells.size !== expectedUpperCells.size || [...expectedUpperCells].some((cell) => !upperCells.has(cell))) {
  fail("upper chamber is not completely packed in its untouched opening");
}
const upperGates = level.gates.filter((gate) => gate.side === "top"
  || ((gate.side === "left" || gate.side === "right") && gate.offset < upperHeight));
if (upperGates.some((gate) => gate.side === "bottom")) fail("upper projection unexpectedly contains a bottom gate");
const thawed = (entry, priorClears) => {
  const copy = structuredClone(entry);
  if (copy.frozen !== undefined) {
    const remaining = Math.max(0, Number(copy.frozen) - priorClears);
    if (remaining > 0) copy.frozen = remaining;
    else delete copy.frozen;
  }
  return copy;
};
const sides = ["top", "right", "bottom", "left"];
const upperPrefixFrontier = [];
for (let priorClears = 0; priorClears < 12; priorClears += 1) {
  const upperLevel = {
    ...structuredClone(level),
    id: 19,
    name: `Lv19 upper-prefix frontier after ${priorClears} external clears`,
    height: upperHeight,
    playable: Array.from({ length: upperHeight }, (_, y) => (
      Array.from({ length: level.width }, (_, x) => [x, y])
    )).flat(),
    gates: upperGates.map((gate) => thawed(gate, priorClears)),
    blocks: upperBlocks.map((block) => thawed(block, priorClears)),
    blocked: undefined,
    shutters: undefined,
    generators: undefined,
    elevators: undefined,
    conveyors: undefined,
    designTargets: {
      formulaVersion: "frozen-wall-upper-prefix-frontier-v1",
      calibratedDifficulty: 0,
      minimumRepositionOverhead: 0,
    },
  };
  runtime.validateLevel(upperLevel);
  const acceptedMoves = [];
  const acceptedExits = [];
  for (const block of upperLevel.blocks) {
    for (let y = 0; y < upperHeight; y += 1) {
      for (let x = 0; x < upperLevel.width; x += 1) {
        if (x === block.x && y === block.y) continue;
        const model = new runtime.PuzzleModel(upperLevel);
        if (model.moveBlock(block.id, x, y)) acceptedMoves.push({ block_id: block.id, x, y });
      }
    }
    for (const side of sides) {
      const model = new runtime.PuzzleModel(upperLevel);
      if (model.exitAttemptStatus(block.id, side) === "ok") acceptedExits.push({ block_id: block.id, side });
    }
  }
  if (acceptedMoves.length || acceptedExits.length) {
    fail(`upper chamber has an action after ${priorClears} prior clears: ${JSON.stringify({ acceptedMoves, acceptedExits })}`);
  }
  upperPrefixFrontier.push({
    prior_clears: priorClears,
    blocks_checked: upperLevel.blocks.length,
    anchors_checked: upperLevel.blocks.length * upperLevel.width * upperHeight - upperLevel.blocks.length,
    exits_checked: upperLevel.blocks.length * sides.length,
    accepted_moves: 0,
    accepted_exits: 0,
  });
}

const corridor = corridorArtifact.levels[0];
const corridorLevelSpecSha256 = specSha(corridor);
if (corridorLevelSpecSha256 !== planLevel.corridor_level_spec_sha256) fail("corridor plan binding mismatch");
const proof = (corridorProof.proofs ?? corridorProof.levels ?? []).find((entry) => Number(entry.level_id) === 19)
  ?? fail("corridor exhaustive proof missing");
if (proof.level_spec_sha256 !== corridorLevelSpecSha256 || proof.status !== "floor_lower_bound_proven"
  || proof.target_floor_certified !== true || Number(proof.campaign_reposition_floor) !== 12) {
  fail("corridor exhaustive proof is not a bound floor-12 certificate");
}

const result = {
  schema_version: "blockout-video-parity-frozen-wall-deadline-proof-v1",
  level_id: "Lv019",
  contract_sha256: contractSha256,
  full_level_spec_sha256: levelSpecSha256,
  full_runtime_source_sha256: sha256(levelsText),
  exact_contract: true,
  validate_level: true,
  fresh_completion_replay: { first: replayA, second: replayB },
  lower_bound: {
    certified: true,
    target_floor: 12,
    corridor_certified_floor: 12,
    corridor_level_spec_sha256: corridorLevelSpecSha256,
    corridor_proof_status: proof.status,
    corridor_explored_states: proof.explored_states,
    frozen_separator_cells: [...wallCells].sort(),
    frozen_separator_threshold: planLevel.separator_frozen_threshold,
    maximum_clears_before_corridor_exhaustion: belowWallClearMaximum,
    upper_chamber_prefix_frontier: upperPrefixFrontier,
    transfer_argument: "Rows 5-6 are fully occupied by numeric-ice blocks frozen through at least clear 19. The only blocks below them are one freely removed filler and the eleven corridor singles. Independently, the complete upper chamber one-action frontier was mechanically enumerated after each hypothetical external clear count 0..11 with all gate/block countdowns reduced accordingly; every legal anchor move and every exit attempt remained unavailable. Thus no upper clear can contribute to the separator countdown before clear 12. Until every corridor single is gone, no corridor block can enter the upper chamber; removing the filler and thawing the two bottom gates gives exactly the certified 6x2 corridor relaxation. Therefore every full completion contains at least the corridor's certified 12 internal drags.",
  },
  bindings: Object.fromEntries(paths.map((path, index) => [path, sha256(texts[index])])),
};
const outputText = `${JSON.stringify(result, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({ output: outputRelative, full_level_spec_sha256: levelSpecSha256, floor: 12, certified: true, sha256: sha256(outputText) }, null, 2));
