import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));

const consolidated = readJson(
  "playtest-results/experiments/video-parity-v7/proofs/lv028-lv031-lv034-lv050-consolidated/reposition-floor-proof-v7-r124-consolidated-28-31-34-50.json",
);
const level32 = readJson(
  "playtest-results/experiments/video-parity-v7/proofs/lv032-wide/reposition-lower-bound-report-v7-r107-contract-bound-lv032.json",
);
const rebound = readJson(
  "playtest-results/experiments/video-parity-v7/proofs/lv037-lv040/reposition-floor-proof-v7-r109-rebound-37-40.json",
);
const level40 = readJson(
  "playtest-results/experiments/video-parity-v7/proofs/lv040-pointer-safe-floor15-r154/production-completion-route.json",
);

const proofActions = (report, levelId) => {
  const entry = report.levels.find((candidate) => candidate.level_id === levelId);
  if (!entry) throw new Error(`Missing permanent chapter-four proof route for Lv${levelId}`);
  return entry.provided_completion_witness.actions
    .filter((action) => action.kind === undefined || action.kind === "drag")
    .map(({ blockId, path, exitSide }) => ({ blockId, path, exitSide }));
};

const selectedLevel32 = level32.reports.find((entry) => entry.level_id === "Lv032")
  ?.selected_solution_witness.drags;
if (!selectedLevel32) throw new Error("Missing permanent chapter-four proof route for Lv32");

export const CHAPTER_FOUR_PROOF_ROUTES = Object.freeze({
  31: proofActions(consolidated, 31),
  32: selectedLevel32,
  33: readJson("playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/lv033-completion-route.json").drags,
  34: readJson("playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/lv034-completion-route.json").drags,
  35: readJson("playtest-results/experiments/video-parity-v7/proofs/lv035-certified-floor8-r153/lv35-certified-route.json").route,
  36: readJson("playtest-results/experiments/video-parity-v7/proofs/lv036-certified-floor5-r152/lv36-trial6-certified-route.json").route,
  37: proofActions(rebound, 37),
  38: readJson("playtest-results/experiments/video-parity-v7/proofs/lv038-certified-floor5-r153/production-completion-route.json")[0].drags,
  39: readJson("playtest-results/experiments/video-parity-v7/proofs/lv039-certified-floor5-r153/validation-routes.json")[0].drags,
  40: level40.route,
});
