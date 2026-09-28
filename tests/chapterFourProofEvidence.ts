// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import type { Point } from "../src/core/types";

export interface ChapterFourProofDrag {
  blockId: string;
  path: Point[];
  exitSide?: "top" | "right" | "bottom" | "left";
}

interface ProofAction extends ChapterFourProofDrag {
  kind?: string;
}

const readJson = <T>(relativePath: string): T => JSON.parse(readFileSync(
  new URL(relativePath, import.meta.url),
  "utf8",
)) as T;

const consolidated = readJson<{
  levels: Array<{
    level_id: number;
    provided_completion_witness: { actions: ProofAction[] };
  }>;
}>("../playtest-results/experiments/video-parity-v7/proofs/lv028-lv031-lv034-lv050-consolidated/reposition-floor-proof-v7-r124-consolidated-28-31-34-50.json");

const level32 = readJson<{
  reports: Array<{
    level_id: string;
    selected_solution_witness: { drags: ChapterFourProofDrag[] };
  }>;
}>("../playtest-results/experiments/video-parity-v7/proofs/lv032-wide/reposition-lower-bound-report-v7-r107-contract-bound-lv032.json");

const recertifiedRoute = (levelId: 33 | 34): ChapterFourProofDrag[] => readJson<{
  drags: ChapterFourProofDrag[];
}>(`../playtest-results/experiments/video-parity-v7/proofs/lv033-lv034-recertified-r153/lv${String(levelId).padStart(3, "0")}-completion-route.json`).drags;

const level35 = readJson<{ route: ChapterFourProofDrag[] }>(
  "../playtest-results/experiments/video-parity-v7/proofs/lv035-certified-floor8-r153/lv35-certified-route.json",
);
const level36 = readJson<{ route: ChapterFourProofDrag[] }>(
  "../playtest-results/experiments/video-parity-v7/proofs/lv036-certified-floor5-r152/lv36-trial6-certified-route.json",
);
const rebound = readJson<{
  levels: Array<{
    level_id: number;
    provided_completion_witness: { actions: ProofAction[] };
  }>;
}>("../playtest-results/experiments/video-parity-v7/proofs/lv037-lv040/reposition-floor-proof-v7-r109-rebound-37-40.json");
const level38 = readJson<Array<{ drags: ChapterFourProofDrag[] }>>(
  "../playtest-results/experiments/video-parity-v7/proofs/lv038-certified-floor5-r153/production-completion-route.json",
);
const level39 = readJson<Array<{ drags: ChapterFourProofDrag[] }>>(
  "../playtest-results/experiments/video-parity-v7/proofs/lv039-certified-floor5-r153/validation-routes.json",
);
const level40 = readJson<{ route: ChapterFourProofDrag[] }>(
  "../playtest-results/experiments/video-parity-v7/proofs/lv040-pointer-safe-floor15-r154/production-completion-route.json",
);

const proofActions = (
  report: { levels: Array<{ level_id: number; provided_completion_witness: { actions: ProofAction[] } }> },
  levelId: number,
): ChapterFourProofDrag[] => {
  const entry = report.levels.find((candidate) => candidate.level_id === levelId);
  if (!entry) throw new Error(`Missing permanent chapter-four proof route for Lv${levelId}`);
  return entry.provided_completion_witness.actions
    .filter((action) => action.kind === undefined || action.kind === "drag")
    .map(({ blockId, path, exitSide }) => ({ blockId, path, exitSide }));
};

const level32Route = level32.reports.find((entry) => entry.level_id === "Lv032")
  ?.selected_solution_witness.drags;
if (!level32Route) throw new Error("Missing permanent chapter-four proof route for Lv32");

export const CHAPTER_FOUR_PROOF_ROUTES = new Map<number, ChapterFourProofDrag[]>([
  [31, proofActions(consolidated, 31)],
  [32, level32Route],
  [33, recertifiedRoute(33)],
  [34, recertifiedRoute(34)],
  [35, level35.route],
  [36, level36.route],
  [37, proofActions(rebound, 37)],
  [38, level38[0]?.drags ?? []],
  [39, level39[0]?.drags ?? []],
  [40, level40.route],
]);

export const chapterFourProofRoute = (levelId: number): ChapterFourProofDrag[] => {
  const route = CHAPTER_FOUR_PROOF_ROUTES.get(levelId);
  if (!route?.length) throw new Error(`Missing permanent chapter-four proof route for Lv${levelId}`);
  return route;
};
