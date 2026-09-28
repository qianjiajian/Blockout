import { describe, expect, it } from "vitest";
// @ts-expect-error App tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
// @ts-ignore Offline deterministic prototype; never imported by production LEVELS.
import { buildRevisedLv21Candidate, buildRevisedLv21DualSquareCandidate } from "../tools/revised-lv021-candidate.mjs";
// @ts-ignore Offline artifact API runs in Node/Vitest.
import { parseCandidateRoute, semanticHash, validateCandidateFile } from "../tools/revised-candidate-artifact.mjs";
import { replayRevisedRoute } from "../src/core/revisedLevelSearch";

const candidatePath = "tests/fixtures/revised-candidate-lv021-prototype.json";
const routePath = "tests/fixtures/revised-candidate-lv021-route.json";
const proposal = () => JSON.parse(readFileSync(candidatePath, "utf8"));
const route = () => JSON.parse(readFileSync(routePath, "utf8"));
const dualCandidatePath = "tests/fixtures/revised-candidate-lv021-dual-square.json";
const dualRoutePath = "tests/fixtures/revised-candidate-lv021-dual-square-route.json";

describe("isolated Lv21 prototype and independently replayed supplied route", () => {
  it("reproduces the exact full candidate from its deterministic construction", () => {
    expect(buildRevisedLv21Candidate()).toEqual(proposal());
    expect(buildRevisedLv21Candidate().level.blocks).toHaveLength(24);
  });

  it("reproduces the renderable two-square variant without changing hidden cohorts", () => {
    const candidate = buildRevisedLv21DualSquareCandidate();
    expect(candidate).toEqual(JSON.parse(readFileSync(dualCandidatePath, "utf8")));
    expect(candidate.level.blocks.filter((block: any) => block.shutterId))
      .toEqual(buildRevisedLv21Candidate().level.blocks.filter((block: any) => block.shutterId));
    expect(candidate.level.shutters).toEqual(buildRevisedLv21Candidate().level.shutters);
  });

  it("independently validates the renderable variant's 12-block obligation union and 58-drag route", async () => {
    const result = await validateCandidateFile(dualCandidatePath, { routePath: dualRoutePath });
    expect(result.gates).toMatchObject({ static: true, stageAttachments: true, wholeBlockArt: true,
      spatialWitness: true, repositionFloor: true, pointerReplay: false, userAcceptance: false });
    expect(result.evidence.structuralFloor).toMatchObject({ status: "threshold-proven", lowerBound: 12,
      bestSinglePivotLowerBound: 6, mandatoryUnionLowerBound: 12, boundMethod: "mandatory-blocker-union" });
    expect(result.evidence.independentModelReplay).toMatchObject({ complete: true, effectiveDrags: 58,
      nonClearingDrags: 30, clearEvents: 28 });
    expect(result).toMatchObject({ status: "awaiting-pointer-time-calibration", releaseApproved: false });
  }, 30000);

  it("binds the entire level, not just the seed or positions", () => {
    const level = proposal().level;
    const parsed = parseCandidateRoute(route(), level);
    expect(parsed.candidateSha256).toBe(semanticHash(level));
    parsed.drags[0].blockId = "changed-copy";
    expect(route().drags[0].blockId).not.toBe("changed-copy");
    level.timeSeconds += 1;
    expect(() => parseCandidateRoute(route(), level)).toThrow(/exact complete candidate hash/);
  });

  it.each(["passed", "certificate", "floor", "pointerReplayValidated", "timeValidated", "releaseApproved"])(
    "refuses a supplied authority flag: %s", (field) => {
      expect(() => parseCandidateRoute({ ...route(), [field]: true }, proposal().level)).toThrow(/drags only/);
    },
  );

  it("refuses malformed or unbound routes", () => {
    for (const mutation of [
      { schemaVersion: 2 }, { candidateSha256: "0".repeat(64) }, { drags: null },
      { drags: [{ blockId: "blue-starter", path: [[0.5, 3]] }] },
      { drags: [{ blockId: "blue-starter", path: [], exitSide: "diagonal" }] },
      { drags: [{ blockId: "blue-starter", path: [], passed: true }] },
    ]) expect(() => parseCandidateRoute({ ...route(), ...mutation }, proposal().level)).toThrow();
  });

  it("replays 39 real model transactions, with 28 clear/peel and 11 non-clearing gestures", () => {
    const result = replayRevisedRoute(proposal().level, route().drags);
    expect(result).toMatchObject({ valid: true, complete: true, effectiveDrags: 39, clearEvents: 28, nonClearingDrags: 11 });
  });

  it("rejects a structurally well-formed but illegal jump without trusting its candidate hash", () => {
    const input = route();
    input.drags[1].path = [[-10, -10]];
    const parsed = parseCandidateRoute(input, proposal().level);
    expect(replayRevisedRoute(proposal().level, parsed.drags).valid).toBe(false);
  });

  it("does not confuse an incomplete, valid prefix with a completion", () => {
    const result = replayRevisedRoute(proposal().level, route().drags.slice(0, 12));
    expect(result).toMatchObject({ valid: true, complete: false, effectiveDrags: 12, clearEvents: 2, nonClearingDrags: 10 });
  });

  it("binds source/replay/floor but rejects the unsupported invisible 3 by 4 rendering", async () => {
    const result = await validateCandidateFile(candidatePath, { routePath });
    expect(result.gates).toEqual({ static: true, stageAttachments: true, wholeBlockArt: false, spatialWitness: true, repositionFloor: true,
      pointerReplay: false, sameRouteTimeAndStars: false, calibratedTimeCoefficients: false, userAcceptance: false });
    expect(result.evidence.structuralFloor).toMatchObject({ status: "threshold-proven", lowerBound: 10, pivot: "red-pivot" });
    expect(result.evidence.independentModelReplay).toMatchObject({ complete: true, nonClearingDrags: 11 });
    expect(result.context.files[routePath].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.context.files["tools/revised-first-exit-obligations.mjs"].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.evidence.wholeBlockArt.issues).toContainEqual({ code: "unsupported-rendered-shape", blockId: "red-pivot", cells: 12 });
    expect(result).toMatchObject({ status: "rejected-block-art", releaseApproved: false, userAccepted: false });
  }, 30000);
});
