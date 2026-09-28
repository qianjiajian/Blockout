// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  MECHANISM_KIND_IDS,
  classifyCompetitorMechanismKinds,
  classifyRuntimeMechanismKinds,
  compareMechanismKindParity,
  competitorSourceLevelId,
} from "../src/core/mechanismKindParity";
import type { LevelSpec } from "../src/core/types";

type JsonRecord = Record<string, any>;

const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;

const truthLevels = TRUTH_PATHS.flatMap((path) => (
  (JSON.parse(readFileSync(path, "utf8")) as JsonRecord).levels as JsonRecord[]
));
const truthById = new Map(truthLevels.map((level) => [Number(level.level ?? level.level_id), level]));

const parityRecords = () => LEVELS.map((level) => {
  const competitorLevelId = competitorSourceLevelId(level.id);
  const truth = truthById.get(competitorLevelId);
  if (!truth) throw new Error(`Missing competitor truth Lv${competitorLevelId} for runtime Lv${level.id}`);
  return compareMechanismKindParity(level.id, truth, level);
});

describe("competitor mechanism-kind parity", () => {
  it("publishes the exact official-14 plus four post-100 mechanism taxonomy", () => {
    expect(MECHANISM_KIND_IDS).toEqual([
      "color-exit",
      "irregular-block",
      "frozen-exit",
      "irregular-board",
      "numeric-ice",
      "multilayer-shell",
      "shutter",
      "generator",
      "axis-block",
      "key-lock",
      "layered-lift",
      "timed-generator",
      "staged-frame",
      "star",
      "bomb",
      "rotation-badge",
      "flip-door",
      "colored-grid",
    ]);
    expect(new Set(MECHANISM_KIND_IDS).size).toBe(18);
  });

  it("maps every runtime level to the same competitor source level", () => {
    expect([1, 2, 3, 4, 5, 6, 200].map(competitorSourceLevelId)).toEqual([1, 2, 3, 4, 5, 6, 200]);
  });

  it("keeps absent video facts unknown instead of manufacturing negative evidence", () => {
    expect(classifyCompetitorMechanismKinds(truthById.get(102))["color-exit"]).toBe("unknown");
    expect(classifyCompetitorMechanismKinds(truthById.get(171))["color-exit"]).toBe("present");
    expect(classifyCompetitorMechanismKinds(truthById.get(181))["color-exit"]).toBe("present");
    expect(classifyCompetitorMechanismKinds(truthById.get(190))["color-exit"]).toBe("unknown");
  });

  it("recognizes disconnected source components as an irregular board", () => {
    expect(classifyCompetitorMechanismKinds(truthById.get(176))["irregular-board"]).toBe("present");
    expect(classifyCompetitorMechanismKinds(truthById.get(185))["irregular-board"]).toBe("present");
  });

  it("marks the two missing competitor videos as source-missing, never as matches", () => {
    const records = parityRecords();
    expect(records.filter((record) => record.sourceMissing).map((record) => record.runtimeLevelId)).toEqual([190, 191]);
    expect(records.filter((record) => record.sourceMissing).map((record) => record.status)).toEqual([
      "source-missing",
      "source-missing",
    ]);
  });

  it("does not expose internal staging metadata as a player-facing shutter", () => {
    const fixture: LevelSpec = {
      id: 999,
      name: "internal staging fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 2,
      height: 2,
      gates: [],
      blocks: [],
      shutters: [{ id: "internal-stage", x: 0, y: 0, width: 2, height: 2, count: 1, skin: "staging" }],
    };
    expect(classifyRuntimeMechanismKinds(fixture).shutter).toBe(false);
  });

  it("has no known mechanism-kind mismatch in the final runtime LEVELS", () => {
    const records = parityRecords();
    expect(records).toHaveLength(200);
    expect(records.flatMap((record) => [
      ...record.missingKinds.map((kind) => `Lv${record.runtimeLevelId} missing ${kind}`),
      ...record.extraKinds.map((kind) => `Lv${record.runtimeLevelId} extra ${kind}`),
    ])).toEqual([]);
  });
});
