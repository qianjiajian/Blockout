import type { GateSpec, LevelSpec } from "./types";

export const COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_VERSION = "competitor-late-exits-1-100-r1" as const;

/**
 * This late candidate deliberately contains only levels that retained the
 * competitor's physical GateSpec rails and passed a fresh bounded solve plus
 * PuzzleModel replay after every later board/block overlay.
 */
export const COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_LEVEL_IDS = [64] as const;

export type CompetitorLateExitBlockerKind =
  | "physical-mouth-remap-required"
  | "generator-rim-conflict"
  | "source-physical-exits-incomplete"
  | "no-certified-route"
  | "bounded-search-not-certified";

export interface CompetitorLateExitBlocker {
  levelId: number;
  kind: CompetitorLateExitBlockerKind;
  detail: string;
}

/**
 * Audited blockers are kept beside the safe patch so an unresolved level can
 * never be mistaken for an accepted approximation. No entry authorizes a
 * synthetic edge slot, a merged same-colour exit, or a frozen=1 placeholder.
 */
export const COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_BLOCKERS: readonly CompetitorLateExitBlocker[] = [
  ...[8, 16, 25, 27, 33, 46, 48, 61, 68, 72, 77, 79, 84, 88, 92, 93, 94].map((levelId) => ({
    levelId,
    kind: "physical-mouth-remap-required" as const,
    detail: "one or more raw GateSpec mouth cells are outside the final certified mask; video-backed local portals that also avoid reserved rims are required",
  })),
  ...[38, 47, 62, 89].map((levelId) => ({
    levelId,
    kind: "generator-rim-conflict" as const,
    detail: "a raw physical exit rail overlaps the final generator rim reservation",
  })),
  {
    levelId: 71,
    kind: "source-physical-exits-incomplete" as const,
    detail: "source-fps truth has ten independent exits, but raw generated data contains only eight and omits frozen counters 12 and 13",
  },
  ...[10, 14, 17, 19, 31, 32, 40, 41, 51, 52, 53, 55, 66, 69, 74, 100].map((levelId) => ({
    levelId,
    kind: "no-certified-route" as const,
    detail: "the exact-count/raw-rail candidate exhausted the supported state space or had no compatible exact palette/frozen assignment",
  })),
  ...[22, 34, 59, 67].map((levelId) => ({
    levelId,
    kind: "bounded-search-not-certified" as const,
    detail: "the exact-count/raw-rail candidate did not produce a replayable route within the 30,000-state certification budget",
  })),
].sort((left, right) => left.levelId - right.levelId || left.kind.localeCompare(right.kind));

const LV64_GATES: readonly GateSpec[] = [
  { id: "vp-064-gate-01", side: "bottom", offset: 0, size: 3, color: "red" },
  { id: "vp-064-gate-02", side: "right", offset: 3, size: 3, color: "green", frozen: 3 },
  { id: "vp-064-gate-03", side: "top", offset: 3, size: 3, color: "purple", frozen: 6 },
  { id: "vp-064-gate-04", side: "right", offset: 0, size: 3, color: "cyan", frozen: 8 },
  { id: "vp-064-gate-05", side: "top", offset: 6, size: 1, color: "blue", frozen: 22 },
  { id: "vp-064-gate-06", side: "right", offset: 6, size: 3, color: "orange", frozen: 16 },
  { id: "vp-064-gate-07", side: "bottom", offset: 3, size: 3, color: "blue", frozen: 17 },
];

const sameGate = (left: GateSpec, right: GateSpec): boolean => (
  left.id === right.id
  && left.side === right.side
  && left.offset === right.offset
  && left.size === right.size
  && left.color === right.color
  && (left.frozen ?? 0) === (right.frozen ?? 0)
  && Boolean(left.star) === Boolean(right.star)
  && JSON.stringify(left.portals ?? []) === JSON.stringify(right.portals ?? [])
);

const alreadyApplied = (source: LevelSpec): boolean => (
  source.gates.length === LV64_GATES.length
  && (source.flipDoors?.length ?? 0) === 0
  && source.gates.every((gate, index) => sameGate(gate, LV64_GATES[index]!))
);

export const applyCompetitorLateExitContract1To100 = (source: LevelSpec): LevelSpec => {
  if (source.id !== 64 || alreadyApplied(source)) return source;
  return {
    ...source,
    gates: LV64_GATES.map((gate) => ({ ...gate })),
    flipDoors: undefined,
  };
};
