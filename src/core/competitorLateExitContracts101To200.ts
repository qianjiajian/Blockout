import type { LevelSpec } from "./types";

export const COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_VERSION = "competitor-late-exits-101-200-r1" as const;

/**
 * No late exit replacement is safe yet. The final boards and blocks no longer
 * admit any of the remaining source rails without either inventing a portal,
 * changing a block, or exceeding the bounded solver/replay contract.
 */
export const COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_LEVEL_IDS = [] as const;

export type CompetitorLateExit101To200BlockerKind =
  | "source-physical-exits-incomplete"
  | "physical-mouth-remap-required"
  | "generator-rim-conflict"
  | "no-certified-geometry-cover"
  | "bounded-search-not-certified"
  | "no-certified-route"
  | "required-rail-unrouteable";

export interface CompetitorLateExit101To200Blocker {
  levelId: number;
  kind: CompetitorLateExit101To200BlockerKind;
  detail: string;
}

const geometryCoverBlockers = [
  104, 109, 110, 111, 113, 118, 119, 120, 122, 123, 124, 126, 128, 131,
  133, 134, 136, 137, 138, 139, 140, 141, 142, 143, 145, 146, 147, 149,
  151, 153, 154, 157, 160, 161, 163, 164, 165, 166, 169, 173, 174, 180,
  184, 186, 187, 189, 194, 195, 197, 199,
] as const;

const physicalMouthBlockers = [144, 148, 152, 159, 167, 172, 177, 182, 183, 192] as const;

/**
 * Every requested level is either explicitly accepted above or has one
 * evidence-backed blocker here. These records are deliberately production
 * adjacent: an unresolved truth count can never silently fall back to merged
 * same-colour exits, frozen=1 placeholders, or a synthetic edge rail.
 */
export const COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_BLOCKERS:
readonly CompetitorLateExit101To200Blocker[] = [
  {
    levelId: 102,
    kind: "source-physical-exits-incomplete" as const,
    detail: "structured truth and raw generated data expose zero directional exits, but the final level still contains thirteen exit-requiring block layers",
  },
  {
    levelId: 106,
    kind: "source-physical-exits-incomplete" as const,
    detail: "truth requires eleven independent frozen counters plus one star exit, while raw generated data contains only seven frozen counters plus the star exit",
  },
  {
    levelId: 116,
    kind: "generator-rim-conflict" as const,
    detail: "the raw right-side ordinary rail overlaps generator-2's reserved three-cell rim; moving either rail has no video-backed mapping",
  },
  ...physicalMouthBlockers.map((levelId) => ({
    levelId,
    kind: "physical-mouth-remap-required" as const,
    detail: "at least one raw physical GateSpec mouth lies outside the final certified mask; no complete evidence-backed portal plus solver/replay candidate is certified",
  })),
  {
    levelId: 170,
    kind: "physical-mouth-remap-required" as const,
    detail: "the required red star rail left/5/size2 needs local portal [1,5]/size2 and yellow ordinary left/8/size3 is source-proven, but the complete twelve-exit raw contract still leaves eleven final block requirements without compatible exits",
  },
  ...geometryCoverBlockers.map((levelId) => ({
    levelId,
    kind: "no-certified-geometry-cover" as const,
    detail: "the exact raw physical rails and truth exit classes cannot cover every final block layer/axis/star requirement without changing block colour, shape, or rail geometry",
  })),
  ...[107, 121, 127].map((levelId) => ({
    levelId,
    kind: "bounded-search-not-certified" as const,
    detail: "the exact raw-rail palette candidate validates structurally but exhausts its supported state space without a complete PuzzleModel replay",
  })),
  {
    levelId: 150,
    kind: "bounded-search-not-certified" as const,
    detail: "the raw-rail candidate with truth counters [7,7] reaches the 30,000-state certification ceiling without a replayable completion",
  },
  {
    levelId: 162,
    kind: "no-certified-route" as const,
    detail: "restoring the raw five flip doors and zero directional gates is statically unable to route the final block cohort",
  },
  {
    levelId: 200,
    kind: "required-rail-unrouteable" as const,
    detail: "the required red ordinary rail bottom/3/size3 is present in raw data, but the remaining six exact size1 frozen rails cannot cover the final block shapes; no evidence authorizes enlarging or relocating them",
  },
].sort((left, right) => left.levelId - right.levelId || left.kind.localeCompare(right.kind));

export const COMPETITOR_LATE_EXIT_101_TO_200_SOLVER_EVIDENCE = {
  107: { termination: "exhausted", exploredStates: 19_857 },
  121: { termination: "exhausted", exploredStates: 3_495 },
  127: { termination: "exhausted", exploredStates: 7_858 },
  150: { termination: "max_states", exploredStates: 30_000 },
} as const;

/** No-op until a requested level has both physical evidence and a certified route. */
export const applyCompetitorLateExitContract101To200 = (source: LevelSpec): LevelSpec => source;
