import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitContract101To200,
  COMPETITOR_LATE_EXIT_101_TO_200_SOLVER_EVIDENCE,
  COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_BLOCKERS,
  COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_LEVEL_IDS,
} from "../src/core/competitorLateExitContracts101To200";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { validateLevel } from "../src/core/PuzzleModel";
import { LEVELS } from "../src/core/levels";
import { paletteAwareMissingExitRequirements } from "../src/core/paletteAwareExitContractAudit";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";
import type { LevelSpec } from "../src/core/types";

const TARGET_IDS = [
  102,104,106,107,109,110,111,113,116,118,119,120,121,122,123,124,126,127,
  128,131,133,134,136,137,138,139,140,141,142,143,144,145,146,147,148,149,
  150,151,152,153,154,157,159,160,161,162,163,164,165,166,167,169,170,172,
  173,174,177,180,182,183,184,186,187,189,192,194,195,197,199,200,
] as const;

const withRawExits = (levelId: number): LevelSpec => {
  const source = LEVELS[levelId - 1]!;
  const raw = VIDEO_PARITY_LEVELS_101_TO_200[levelId - 101]!;
  return {
    ...source,
    gates: raw.gates.map((gate) => ({ ...gate })),
    ...(raw.flipDoors?.length
      ? { flipDoors: raw.flipDoors.map((door) => ({ ...door })) }
      : { flipDoors: undefined }),
  };
};

describe("competitor exact late exit contracts Lv101-200", () => {
  it("keeps every requested level explicitly blocked until it has a certified route", () => {
    expect(COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_LEVEL_IDS).toEqual([]);
    const blockerIds = COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_BLOCKERS.map(({ levelId }) => levelId);
    expect(blockerIds).toEqual([...TARGET_IDS]);
    expect(new Set(blockerIds).size).toBe(TARGET_IDS.length);
  });

  it("is an isolated reference-idempotent no-op", () => {
    for (const levelId of [101, ...TARGET_IDS, 198]) {
      const source = LEVELS[levelId - 1]!;
      expect(applyCompetitorLateExitContract101To200(source)).toBe(source);
    }
  });

  it("records the bounded raw-rail failures rather than accepting them", () => {
    expect(COMPETITOR_LATE_EXIT_101_TO_200_SOLVER_EVIDENCE).toEqual({
      107: { termination: "exhausted", exploredStates: 19_857 },
      121: { termination: "exhausted", exploredStates: 3_495 },
      127: { termination: "exhausted", exploredStates: 7_858 },
      150: { termination: "max_states", exploredStates: 30_000 },
    });
  });

  it("retains the two explicitly required source rails as evidence without shipping an unsafe patch", () => {
    const raw170 = VIDEO_PARITY_LEVELS_101_TO_200[69]!;
    expect(raw170.gates).toEqual(expect.arrayContaining([
      expect.objectContaining({ side: "left", offset: 8, size: 3 }),
      expect.objectContaining({ side: "left", offset: 5, size: 2, star: true }),
    ]));
    expect(COMPETITOR_LATE_EXIT_CONTRACTS_101_TO_200_BLOCKERS.find(({ levelId }) => levelId === 170)?.detail)
      .toContain("red star rail left/5/size2");
    expect(() => validateLevel(withRawExits(170))).toThrow(/invalid mouth cell/);

    const raw200 = VIDEO_PARITY_LEVELS_101_TO_200[99]!;
    expect(raw200.gates).toContainEqual(expect.objectContaining({
      side: "bottom", offset: 3, size: 3, color: "red",
    }));
    const candidate200 = withRawExits(200);
    expect(() => validateLevel(candidate200)).not.toThrow();
    expect(finalGeneratorPlacementIssues(candidate200)).toEqual([]);
    expect(paletteAwareMissingExitRequirements(candidate200).length).toBeGreaterThan(0);
  });
});
