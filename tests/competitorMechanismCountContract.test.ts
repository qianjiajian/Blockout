// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditCompetitorMechanismCountContracts,
  compareCompetitorMechanismCountContract,
  COMPETITOR_MECHANISM_COUNT_CONTRACT_VERSION,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
  type CompetitorMechanismCountContract,
} from "../src/core/competitorMechanismCountContract";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec } from "../src/core/types";

const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;

const contracts = TRUTH_PATHS.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
));
const contractById = new Map(contracts.map((contract) => [contract.levelId, contract]));

const fixture: LevelSpec = {
  id: 999,
  name: "mechanism count fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 4,
  gates: [
    { id: "ordinary", side: "top", offset: 0, size: 1, color: "red" },
    { id: "frozen", side: "right", offset: 0, size: 1, color: "blue", frozen: 3 },
    { id: "star", side: "bottom", offset: 0, size: 1, color: "green", star: true, frozen: 2 },
  ],
  blocks: [
    { id: "ice-key", x: 0, y: 0, shape: [[0, 0]], color: "red", frozen: 4, keyId: "chain" },
    { id: "locked", x: 1, y: 0, shape: [[0, 0]], color: "blue", lockedBy: "chain", lockCount: 2 },
    { id: "covered", x: 2, y: 0, shape: [[0, 0]], color: "green", shutterId: "cover" },
    { id: "queued", x: 3, y: 0, shape: [[0, 0]], color: "yellow" },
  ],
  shutters: [{ id: "cover", x: 2, y: 0, width: 1, height: 1, count: 7, skin: "shutter" }],
  generators: [{ id: "generator", side: "left", offset: 0, spawn: [3, 0], queueBlockIds: ["queued"] }],
};

describe(`competitor mechanism count contract ${COMPETITOR_MECHANISM_COUNT_CONTRACT_VERSION}`, () => {
  it("extracts 200 same-numbered contracts while preserving source-missing as unknown", () => {
    expect(contracts).toHaveLength(200);
    expect(new Set(contracts.map((contract) => contract.levelId)).size).toBe(200);
    expect(contracts.filter((contract) => contract.sourceMissing).map((contract) => contract.levelId)).toEqual([190, 191]);
    expect(contractById.get(190)?.facts).toEqual({});
    expect(contractById.get(191)?.facts).toEqual({});
  });

  it("reads both queue_length and queue_count instead of turning queue_count into zero", () => {
    const expected = new Map<number, number[]>([
      [114, [4]],
      [116, [2, 2]],
      [138, [2]],
      [139, [4]],
      [143, [2]],
      [156, [4, 4, 4, 4]],
      [161, [2, 2]],
      [177, [3]],
      [183, [4]],
      [186, [3, 4]],
    ]);
    for (const [levelId, queueCounts] of expected) {
      expect(contractById.get(levelId)?.facts.generatorQueueCounts, `Lv${levelId}`).toEqual(queueCounts);
    }

    const synthetic = extractCompetitorMechanismCountContracts({
      levels: [
        {
          level: 901,
          mechanisms: {
            directional_exits: { ordinary: [], frozen: [], star: [] },
            generators: [{ queue_length: 2 }, { queue_count: 4 }],
          },
        },
        {
          level: 902,
          mechanisms: {
            directional_exits: { ordinary: [], frozen: [], star: [] },
            generators: [{ queue: "unclear" }],
          },
        },
      ],
    });
    expect(synthetic[0]?.facts).toMatchObject({ generatorCount: 2, generatorQueueCounts: [2, 4] });
    expect(synthetic[1]?.facts.generatorCount).toBe(1);
    expect(synthetic[1]?.facts.generatorQueueCounts).toBeUndefined();
  });

  it("keeps cover counters, exact cohorts, aggregate-only cohorts, and partial known pairs distinct", () => {
    expect(contractById.get(20)?.facts).toMatchObject({
      shutterCount: 1,
      shutterCoverCounts: [6],
      shutterCoveredCohortCounts: [7],
      shutterCoveredCohortTotal: 7,
      shutterKnownCoveredCohorts: ["6:7"],
    });
    expect(contractById.get(44)?.facts).toMatchObject({
      shutterCount: 5,
      shutterCoverCounts: [6, 6, 6, 6, 6],
      shutterCoveredCohortTotal: 6,
    });
    expect(contractById.get(44)?.facts.shutterCoveredCohortCounts).toBeUndefined();
    expect(contractById.get(49)?.facts.shutterCoveredCohortTotal).toBe(17);
    expect(contractById.get(49)?.facts.shutterKnownCoveredCohorts).toBeUndefined();
    expect(contractById.get(135)?.facts).toMatchObject({
      shutterCount: 1,
      shutterCoverCounts: [10],
      shutterCoveredCohortCounts: [4],
      shutterKnownCoveredCohorts: ["10:4"],
    });
    expect(contractById.get(138)?.facts).toMatchObject({
      shutterCount: 3,
      shutterCoverCounts: [8, 10, 14],
      shutterKnownCoveredCohorts: ["8:6"],
    });
    expect(contractById.get(138)?.facts.shutterCoveredCohortTotal).toBeUndefined();
  });

  it("extracts exact exit, numeric-ice, star, key, lock, and requirement quantities when present", () => {
    expect(contractById.get(100)?.facts).toMatchObject({
      ordinaryExitCount: 1,
      frozenExitCount: 1,
      frozenExitValues: [6],
      starExitCount: 2,
      starFrozenExitCount: 2,
      starFrozenExitValues: [3, 8],
    });
    expect(contractById.get(144)?.facts).toMatchObject({
      ordinaryExitCount: 1,
      frozenExitCount: 6,
      frozenExitValues: [3, 7, 12, 15, 18, 23],
      numericIceCount: 0,
      keyCount: 4,
      lockCount: 1,
      lockRequirements: [3],
    });
    expect(contractById.get(165)?.facts).toMatchObject({ keyCount: 2, lockCount: 1 });
    expect(contractById.get(165)?.facts.lockRequirements).toBeUndefined();
    expect(contractById.get(146)?.facts).toMatchObject({ starExitCount: 1, starFrozenExitCount: 0 });
    expect(contractById.get(163)?.facts.starBlockCount).toBe(2);
  });

  it("compares exact facts and treats partial shutter cohort pairs as a required multiset subset", () => {
    const actual = extractRuntimeMechanismCountFacts(fixture);
    const matching: CompetitorMechanismCountContract = {
      levelId: 999,
      sourceMissing: false,
      facts: {
        ordinaryExitCount: 1,
        frozenExitCount: 1,
        frozenExitValues: [3],
        starExitCount: 1,
        starFrozenExitCount: 1,
        numericIceCount: 1,
        generatorCount: 1,
        generatorQueueCounts: [1],
        shutterCount: 1,
        shutterCoverCounts: [7],
        shutterKnownCoveredCohorts: ["7:1"],
        keyCount: 1,
        lockCount: 1,
        lockRequirements: [2],
      },
    };
    expect(actual.shutterKnownCoveredCohorts).toEqual(["7:1"]);
    expect(compareCompetitorMechanismCountContract(fixture, matching)).toMatchObject({ status: "match", issues: [] });
    expect(compareCompetitorMechanismCountContract(fixture, {
      ...matching,
      facts: { ...matching.facts, generatorQueueCounts: [2], shutterKnownCoveredCohorts: ["7:2"] },
    }).issues.map((issue) => issue.field)).toEqual(["shutterKnownCoveredCohorts", "generatorQueueCounts"]);
  });

  it("audits final LEVELS without mutating campaign data or treating missing-source levels as matches", () => {
    const before = JSON.stringify(LEVELS);
    const records = auditCompetitorMechanismCountContracts(LEVELS, contracts);
    expect(records).toHaveLength(200);
    expect(records.filter((record) => record.status === "source-missing").map((record) => record.levelId)).toEqual([190, 191]);
    expect(records.filter((record) => record.status === "runtime-missing")).toEqual([]);
    expect(records.filter((record) => !record.sourceMissing).every((record) => record.comparableFields.length > 0)).toBe(true);
    expect(JSON.stringify(LEVELS)).toBe(before);
  });
});
