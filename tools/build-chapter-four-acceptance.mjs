import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { CHAPTER_FOUR_PROOF_ROUTES } from "./chapter-four-proof-routes.mjs";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "deliverables/original-levels/pipeline/blockout-lv031-lv040-certification.json");

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => [key, stableValue(value[key])]));
};
const hashValue = (value) => createHash("sha256")
  .update(JSON.stringify(stableValue(value)))
  .digest("hex")
  .toUpperCase();
const hashFile = async (relativePath) => createHash("sha256")
  .update(await readFile(resolve(root, relativePath)))
  .digest("hex")
  .toUpperCase();
const readJson = async (relativePath) => JSON.parse(await readFile(resolve(root, relativePath), "utf8"));

const SOURCES = {
  31: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv028-lv031-lv034-lv050-consolidated/reposition-floor-proof-v7-r124-consolidated-28-31-34-50.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv028-lv031-lv034-lv050-consolidated/reposition-floor-proof-v7-r124-consolidated-28-31-34-50.json",
  },
  32: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv032-wide/reposition-lower-bound-report-v7-r107-contract-bound-lv032.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv032-wide/reposition-lower-bound-report-v7-r107-contract-bound-lv032.json",
  },
  33: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/recertification-manifest.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/lv033-completion-route.json",
  },
  34: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/recertification-manifest.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/lv034-completion-route.json",
  },
  35: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv035-certified-floor8-r153/lv35-optimal-proof.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv035-certified-floor8-r153/lv35-certified-route.json",
  },
  36: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv036-certified-floor5-r152/lv36-trial6-certified-proof.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv036-certified-floor5-r152/lv36-trial6-certified-route.json",
  },
  37: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv037-lv040/reposition-floor-proof-v7-r109-rebound-37-40.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv037-lv040/reposition-floor-proof-v7-r109-rebound-37-40.json",
  },
  38: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv038-certified-floor5-r153/reposition-floor-proof-lv38-production-source-floor5-r153-38.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv038-certified-floor5-r153/production-completion-route.json",
  },
  39: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv039-certified-floor5-r153/production-floor-proof.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv039-certified-floor5-r153/validation-routes.json",
  },
  40: {
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv040-pointer-safe-floor15-r154/production-floor-proof.json",
    route: "playtest-results/experiments/video-parity-v7/proofs/lv040-pointer-safe-floor15-r154/production-completion-route.json",
  },
};

const proofClaim = (levelId, proof) => {
  if ([31, 37, 40].includes(levelId) || levelId === 38) {
    const entry = proof.levels.find((candidate) => candidate.level_id === levelId);
    return {
      certified: entry?.target_floor_certified === true && entry?.lower_bound_statement_proven === true,
      floor: entry?.campaign_reposition_floor,
      levelSpecSha256: entry?.level_spec_sha256,
      status: entry?.status,
      exploredStates: entry?.explored_states ?? entry?.exact_first_clear_prefix?.explored_states ?? null,
    };
  }
  if (levelId === 32) {
    const entry = proof.reports.find((candidate) => candidate.level_id === "Lv032");
    return {
      certified: entry?.certification?.target_floor_certified_for_playable_level === true
        && entry?.proof?.lower_bound_statement_proven === true,
      floor: entry?.target_reposition_overhead,
      levelSpecSha256: null,
      status: entry?.proof?.status,
      exploredStates: entry?.proof?.explored_states ?? null,
    };
  }
  if (levelId === 33 || levelId === 34) {
    const entry = proof.levels.find((candidate) => candidate.level_id === levelId);
    return {
      certified: entry?.proof_status?.startsWith("floor_lower_bound_proven") === true
        && entry?.completion_replay_complete === true,
      floor: entry?.minimum_reposition_overhead,
      levelSpecSha256: entry?.level_spec_sha256,
      status: entry?.proof_status,
      exploredStates: entry?.explored_states ?? null,
    };
  }
  if (levelId === 35) return {
    certified: proof.status === "exact_optimum_proven" && proof.archivedRouteMatchesFreshOptimalRoute === true,
    floor: proof.necessaryRepositionFloor,
    levelSpecSha256: proof.productionBinding?.canonicalLevelSpecSha256,
    status: proof.status,
    exploredStates: proof.exploredStates,
  };
  if (levelId === 36) return {
    certified: proof.strict_floor_proof?.status === "floor_proven_exhaustive"
      && proof.completion_replay?.status === "complete",
    floor: proof.strict_floor_proof?.necessary_reposition_lower_bound,
    levelSpecSha256: proof.bindings?.canonical_level_spec_sha256,
    status: proof.strict_floor_proof?.status,
    exploredStates: proof.strict_floor_proof?.explored_states,
  };
  if (levelId === 39) return {
    certified: proof.applied_to_live_campaign === true
      && proof.necessary_reposition?.lower_bound_statement_proven === true
      && proof.completion_witness?.puzzle_model_replay_complete === true,
    floor: proof.necessary_reposition?.certified_floor,
    levelSpecSha256: proof.production_level_spec_sha256,
    status: proof.necessary_reposition?.status,
    exploredStates: proof.necessary_reposition?.explored_states,
  };
  throw new Error(`No proof adapter for Lv${levelId}`);
};

const vite = await createServer({ root, logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
try {
  const [{ LEVELS }, { PuzzleModel }] = await Promise.all([
    vite.ssrLoadModule("/src/core/levels.ts"),
    vite.ssrLoadModule("/src/core/PuzzleModel.ts"),
  ]);
  const entries = [];
  for (let levelId = 31; levelId <= 40; levelId += 1) {
    const level = LEVELS[levelId - 1];
    const sources = SOURCES[levelId];
    const route = CHAPTER_FOUR_PROOF_ROUTES[levelId];
    const proof = await readJson(sources.proof);
    const claim = proofClaim(levelId, proof);
    const canonicalLevelSpecSha256 = hashValue(level);
    const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    const floor = level.designTargets?.minimumRepositionOverhead;
    if (!claim.certified || claim.floor !== floor) throw new Error(`Lv${levelId} floor proof is not current`);
    if (claim.levelSpecSha256 && claim.levelSpecSha256 !== canonicalLevelSpecSha256) {
      throw new Error(`Lv${levelId} proof binds ${claim.levelSpecSha256}, production is ${canonicalLevelSpecSha256}`);
    }
    if (route.length !== level.parMoves) throw new Error(`Lv${levelId} route/par mismatch`);
    if (route.length - clearLoad < floor) throw new Error(`Lv${levelId} completion witness misses floor`);

    const model = new PuzzleModel(level);
    let gridSteps = 0;
    for (const [routeIndex, drag] of route.entries()) {
      model.beginAction();
      for (const [stepIndex, [x, y]] of drag.path.entries()) {
        if (!model.moveBlock(drag.blockId, x, y)) throw new Error(`Lv${levelId} route ${routeIndex} move rejected`);
        gridSteps += 1;
        const moved = model.getBlock(drag.blockId);
        const automaticSides = moved ? model.possibleExitSides(moved) : [];
        if (automaticSides.length && stepIndex !== drag.path.length - 1) {
          throw new Error(`Lv${levelId} route ${routeIndex} crosses an automatic exit early`);
        }
        if (automaticSides.length && (!drag.exitSide || !automaticSides.includes(drag.exitSide))) {
          throw new Error(`Lv${levelId} route ${routeIndex} ends on an undeclared automatic exit`);
        }
      }
      if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
        throw new Error(`Lv${levelId} route ${routeIndex} exit rejected`);
      }
      if (!model.commitAction()) throw new Error(`Lv${levelId} route ${routeIndex} did not commit`);
    }
    const snapshot = model.snapshot();
    if (!snapshot.complete) throw new Error(`Lv${levelId} route did not complete`);
    entries.push({
      levelId,
      name: level.name,
      canonicalLevelSpecSha256,
      parMoves: level.parMoves,
      clearLoad,
      minimumRepositionOverhead: floor,
      completionWitness: {
        actions: route.length,
        repositionOverhead: route.length - clearLoad,
        gridSteps,
        replayComplete: true,
        automaticEdgeExitSemanticsChecked: true,
        routeSource: sources.route,
        routeSourceSha256: await hashFile(sources.route),
      },
      floorProof: {
        certified: true,
        status: claim.status,
        exploredStates: claim.exploredStates,
        source: sources.proof,
        sourceSha256: await hashFile(sources.proof),
      },
    });
  }
  const output = {
    schemaVersion: "blockout-chapter-four-production-certification-v1",
    levelRange: [31, 40],
    levelCount: entries.length,
    allProductionSpecsBound: entries.every((entry) => Boolean(entry.canonicalLevelSpecSha256)),
    allCompletionWitnessesReplay: entries.every((entry) => entry.completionWitness.replayComplete),
    allFloorsCertified: entries.every((entry) => entry.floorProof.certified),
    entries,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Certified Lv31-Lv40: ${entries.length}/10 production specs, routes, and floors -> ${outputPath}`);
} finally {
  await vite.close();
}
