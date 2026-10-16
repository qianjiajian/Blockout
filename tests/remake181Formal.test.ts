import { describe, expect, it } from "vitest";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
import { LEVELS, getLevelStrict } from "../src/core/levels";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { replayRevisedRoute } from "../src/core/revisedLevelSearch";
import type { RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const root = "deliverables/regen181-20260930";
const sourcePath = "deliverables/remake181-190-v146-20260924/source181-185/source181-cohorts-v147.json";
const readArtifact = <T>(path: string): T => JSON.parse(readFileSync(
  new URL(`../${path}`, import.meta.url), "utf8",
)) as T;
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, canonical(object[key])]));
  }
  return value;
};
// Match the proof tools: object keys are sorted recursively; array order is preserved.
const digest = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(canonical(value))).digest("hex");

interface BoundLevel {
  level: LevelSpec;
  levelSha256: string;
}
interface Candidate extends BoundLevel {
  drags: RevisedSearchDrag[];
  routeSha256: string;
  lowerBound: { projection: { sourceSha256: string; projectedSha256: string; retainedBodies: number } };
}
interface FormalPacket extends BoundLevel {
  drags: RevisedSearchDrag[];
  routeSha256: string;
  candidateFile: string;
  proofFile: string;
  lowerBound: number;
  upperBound: number;
  newMoveTarget: number;
  timeTargetSeconds: number;
  sourceAdaptation: {
    changes: Array<{ id: string; sourceColor: string; designColor: string }>;
    otherFieldsPreserved: boolean;
    sourceUnknownFieldsUnchanged: boolean;
  };
}
interface FloorCertificate {
  sourceFile: string;
  levelSha256: string;
  fullInventoryCount: number;
  budget: { floor: number; maxStates: number; maxMilliseconds: number };
  proof: {
    status: string;
    thresholdProven: boolean;
    floor: number;
    termination: string;
    discoveredStates: number;
    exploredStates: number;
    abstraction: string;
  };
  pointerValidated: boolean;
  timeValidated: boolean;
}
type SourceBlock = Omit<BlockSpec, "timedBombSeconds"> & {
  timedBombSeconds?: number | null;
  firstFullyReadableBombSeconds?: number;
};

const packet = readArtifact<FormalPacket>(`${root}/formal-level181.json`);
const baseline = readArtifact<BoundLevel & {
  other199Sha256: string;
  campaignCount: number;
  stars: { moveTarget: number; timeTargetSeconds: number };
}>(`${root}/production-before.json`);
const candidate = readArtifact<Candidate>(packet.candidateFile);
const certificate = readArtifact<FloorCertificate>(packet.proofFile);
const source = readArtifact<{ cohorts: Record<string, SourceBlock[]> }>(sourcePath);
const authorizedColors = new Map<string, readonly [string, string]>([
  ["r147-181-open-blue-v2", ["blue", "cyan"]],
  ["r147-181-open-cyan-s2", ["cyan", "yellow"]],
  ["r147-181-open-red-v2", ["red", "blue"]],
  ["r147-181-open-pink-v3", ["pink", "purple"]],
  ["r147-181-open-red-s", ["red", "blue"]],
  ["r147-181-open-pink-s1", ["pink", "purple"]],
]);
const level = getLevelStrict(181);

describe("formal Lv181 finite color regeneration", () => {
  it("binds the formal packet, candidate, route and production object", () => {
    expect(level).toStrictEqual(packet.level);
    expect(level).toStrictEqual(candidate.level);
    expect(packet.levelSha256).toBe("214f51b59d6ca58b416525308b03078c1d14d35d29421e0d91473f3b6c77e31a");
    expect(digest(level)).toBe(packet.levelSha256);
    expect(candidate.levelSha256).toBe(packet.levelSha256);
    expect(packet.drags).toStrictEqual(candidate.drags);
    expect(digest(packet.drags)).toBe(packet.routeSha256);
    expect(candidate.routeSha256).toBe(packet.routeSha256);
  });

  it("changes exactly the six authorized colors and preserves every other field and level", () => {
    expect(digest(baseline.level)).toBe(baseline.levelSha256);
    const { blocks: oldBlocks, ...oldFields } = baseline.level;
    const { blocks, ...fields } = level;
    expect(fields).toStrictEqual(oldFields);
    expect(blocks.map((block) => block.id)).toStrictEqual(oldBlocks.map((block) => block.id));
    const changed: string[] = [];
    blocks.forEach((block, index) => {
      const before = oldBlocks[index];
      const { color: beforeColor, ...beforeOther } = before;
      const { color, ...other } = block;
      expect(other).toStrictEqual(beforeOther);
      if (color !== beforeColor) {
        changed.push(block.id);
        expect([beforeColor, color]).toStrictEqual(authorizedColors.get(block.id));
      }
    });
    expect(changed.sort()).toStrictEqual([...authorizedColors.keys()].sort());
    expect(LEVELS).toHaveLength(baseline.campaignCount);
    expect(digest(LEVELS.filter((entry) => entry.id !== 181))).toBe(baseline.other199Sha256);
    expect(levelStarTargets(level)).toStrictEqual(baseline.stars);
    expect(levelStarTargets(level)).toStrictEqual({ moveTarget: 43, timeTargetSeconds: 79 });
    expect([level.timeSeconds, level.parMoves, level.reward]).toStrictEqual([110, 49, 200]);
  });

  it("replays the complete 43-drag route in the current spatial model with both axes retained", () => {
    const spatial = structuredClone(level);
    // This is spatial coverage only. Natural clock, bomb deadlines and actual
    // three-star settlement have separate browser Pointer evidence.
    for (const block of spatial.blocks) delete block.timedBombSeconds;
    expect(spatial.blocks.filter((block) => block.movementAxis)).toHaveLength(2);
    expect(level.blocks.filter((block) => block.timedBombSeconds)).toHaveLength(2);
    const replay = replayRevisedRoute(spatial, packet.drags);
    expect(replay).toMatchObject({
      valid: true, complete: true, effectiveDrags: 43, clearEvents: 30, nonClearingDrags: 13,
    });
    expect(packet.drags).toHaveLength(43);
    expect(packet.upperBound).toBe(13);
    expect(packet.newMoveTarget).toBe(43);
    expect(packet.timeTargetSeconds).toBe(79);
  });

  it("binds the exhausted fresh floor-11 proof to the full current inventory", () => {
    expect(certificate.sourceFile).toBe(packet.candidateFile);
    expect(certificate.levelSha256).toBe(digest(level));
    expect(certificate.proof).toMatchObject({
      status: "threshold-proven", thresholdProven: true, floor: 11,
      termination: "below-threshold-exhausted",
      abstraction: "same-v139-graph-final-body-normalized-terminal-cost-skip-v124",
    });
    expect(certificate.proof.discoveredStates).toBe(254379);
    expect(certificate.proof.exploredStates).toBe(certificate.proof.discoveredStates);
    expect(certificate.budget).toStrictEqual({ floor: 11, maxStates: 1000000, maxMilliseconds: 30000 });
    expect(certificate.fullInventoryCount).toBe(30);
    expect(packet.lowerBound).toBe(11);
    const projected = structuredClone(level);
    for (const block of projected.blocks) {
      delete block.movementAxis;
      delete block.timedBombSeconds;
    }
    expect(candidate.lowerBound.projection.sourceSha256).toBe(digest(level));
    expect(candidate.lowerBound.projection.projectedSha256).toBe(digest(projected));
    expect(candidate.lowerBound.projection.retainedBodies).toBe(30);
    expect(projected.shutters).toStrictEqual(level.shutters);
    expect(projected.gates).toStrictEqual(level.gates);
    // A lower-bound certificate does not claim browser or deadline validation.
    expect(certificate.pointerValidated).toBe(false);
    expect(certificate.timeValidated).toBe(false);
  });

  it("preserves the recorded source cohorts, mechanics and unknown bomb initial value", () => {
    const sourceBytes = readFileSync(new URL(`../${sourcePath}`, import.meta.url));
    expect(createHash("sha256").update(sourceBytes).digest("hex"))
      .toBe("b0c8eec5be808d586e745ce40642e620d8c06151e9e53a74572769baab9a8c33");
    expect(Object.values(source.cohorts).map((rows) => rows.length)).toStrictEqual([17, 8, 5]);
    const inheritedSingles = new Set([
      "opening/yellow-v2", "upper/green-v2", "lower/blue-v2", "lower/yellow-v2",
    ]);
    for (const [cohort, rows] of Object.entries(source.cohorts)) for (const observed of rows) {
      const suffix = inheritedSingles.has(`${cohort}/${observed.id}`) ? "-adapt" : "";
      const id = `r147-181-${cohort === "opening" ? "open" : cohort}-${observed.id}${suffix}`;
      const block = level.blocks.find((entry) => entry.id === id)!;
      expect(block).toBeDefined();
      expect(block.color).toBe(authorizedColors.get(id)?.[1] ?? observed.color);
      expect(block.movementAxis).toBe(observed.movementAxis);
      expect(block.shutterId).toBe(cohort === "opening" ? undefined : `r147-181-cover${cohort === "upper" ? 17 : 25}`);
      if (cohort === "upper" && observed.id === "red-bomb") {
        expect(observed.timedBombSeconds).toBeNull();
        expect(observed.firstFullyReadableBombSeconds).toBe(59);
        expect(block.timedBombSeconds).toBe(60); // Inherited design value, not a newly claimed source fact.
      } else {
        expect(block.timedBombSeconds).toBe(observed.timedBombSeconds);
      }
    }
    expect(level.blocks).toHaveLength(30);
    expect(level.blocks.filter((block) => block.movementAxis)).toHaveLength(2);
    expect(level.blocks.filter((block) => block.timedBombSeconds)).toHaveLength(2);
    expect(level.shutters?.map((cover) => cover.count)).toStrictEqual([17, 25]);
    expect(packet.sourceAdaptation.changes).toStrictEqual([...authorizedColors].map(([id, [sourceColor, designColor]]) => ({ id, sourceColor, designColor })));
    expect(packet.sourceAdaptation.otherFieldsPreserved).toBe(true);
    expect(packet.sourceAdaptation.sourceUnknownFieldsUnchanged).toBe(true);
  });
});
