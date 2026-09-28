import type { LevelSpec } from "./types";

export const COMPETITOR_MECHANISM_COUNT_CONTRACT_VERSION = "competitor-mechanism-counts-v1" as const;

export const MECHANISM_COUNT_FACT_KEYS = [
  "ordinaryExitCount",
  "frozenExitCount",
  "frozenExitValues",
  "starExitCount",
  "starFrozenExitCount",
  "starFrozenExitValues",
  "numericIceCount",
  "numericIceValues",
  "shellBlockCount",
  "shutterCount",
  "shutterCoverCounts",
  "shutterCoveredCohortCounts",
  "shutterCoveredCohortTotal",
  "shutterKnownCoveredCohorts",
  "generatorCount",
  "generatorQueueCounts",
  "keyCount",
  "lockCount",
  "lockRequirements",
  "axisBlockCount",
  "liftLayerCount",
  "stagedFrameCount",
  "elevatorCount",
  "conveyorCount",
  "starBlockCount",
  "bombCount",
  "rotationBadgeCount",
  "flipDoorCount",
  "coloredGridCellCount",
] as const;

export type MechanismCountFactKey = (typeof MECHANISM_COUNT_FACT_KEYS)[number];
export type MechanismCountFactValue = number | number[] | string[];
export type MechanismCountFacts = Partial<Record<MechanismCountFactKey, MechanismCountFactValue>>;

export interface CompetitorMechanismCountContract {
  levelId: number;
  sourceMissing: boolean;
  facts: MechanismCountFacts;
}

export interface MechanismCountIssue {
  levelId: number;
  field: MechanismCountFactKey | "level";
  expected: MechanismCountFactValue | "present";
  actual: MechanismCountFactValue | "missing";
}

export interface MechanismCountAuditRecord {
  levelId: number;
  sourceMissing: boolean;
  comparableFields: MechanismCountFactKey[];
  issues: MechanismCountIssue[];
  status: "match" | "mismatch" | "source-missing" | "runtime-missing";
}

type JsonRecord = Record<string, unknown>;

const recordOf = (value: unknown): JsonRecord | undefined => (
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined
);

const recordsOf = (value: unknown): JsonRecord[] => (
  Array.isArray(value) ? value.map(recordOf).filter((item): item is JsonRecord => Boolean(item)) : []
);

const isUnknown = (value: unknown): boolean => value === null
  || String(value ?? "").trim().toLowerCase() === "unclear";

const finiteNonNegativeInteger = (value: unknown): number | undefined => {
  if (typeof value === "boolean" || value === null || value === undefined || value === "" || isUnknown(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

const sortedNumbers = (values: readonly number[]): number[] => [...values].sort((left, right) => left - right);
const sortedStrings = (values: readonly string[]): string[] => [...values].sort((left, right) => left.localeCompare(right));

const collectionCount = (value: unknown, missingIsZero: boolean): number | undefined => {
  if (value === undefined) return missingIsZero ? 0 : undefined;
  if (isUnknown(value)) return undefined;
  if (Array.isArray(value)) return value.length;
  const direct = finiteNonNegativeInteger(value);
  if (direct !== undefined) return direct;
  const record = recordOf(value);
  if (!record) return undefined;
  const count = finiteNonNegativeInteger(record.count);
  if (count !== undefined) return count;
  return Array.isArray(record.items) ? record.items.length : undefined;
};

const starBlockCount = (value: unknown, missingIsZero: boolean): number | undefined => {
  if (!Array.isArray(value)) return collectionCount(value, missingIsZero);
  if (!value.length) return 0;
  const entries = recordsOf(value);
  if (entries.length !== value.length) return value.length;
  const groupedCounts = entries.map((entry) => finiteNonNegativeInteger(entry.block_count));
  if (groupedCounts.some((count) => count !== undefined)) {
    if (!groupedCounts.every((count): count is number => count !== undefined)) return undefined;
    return groupedCounts.reduce((sum, count) => sum + count, 0);
  }
  return value.length;
};

const counterValue = (value: unknown): number | undefined => {
  const direct = finiteNonNegativeInteger(value);
  if (direct !== undefined) return direct;
  const record = recordOf(value);
  if (!record) return undefined;
  for (const key of ["value", "frozen_value", "count"] as const) {
    const parsed = finiteNonNegativeInteger(record[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const recordCounterValue = (record: JsonRecord): number | undefined => {
  for (const key of ["value", "frozen_value", "count"] as const) {
    const parsed = finiteNonNegativeInteger(record[key]);
    if (parsed !== undefined) return parsed;
  }
  return counterValue(record.frozen);
};

const valuesFromCollection = (value: unknown): number[] | undefined => {
  if (isUnknown(value)) return undefined;
  const record = recordOf(value);
  if (record && Array.isArray(record.values)) {
    const values = record.values.map(finiteNonNegativeInteger);
    return values.every((item): item is number => item !== undefined) ? sortedNumbers(values) : undefined;
  }
  const items = Array.isArray(value) ? recordsOf(value) : recordsOf(record?.items);
  if (!items.length) return Array.isArray(value) || Array.isArray(record?.items) ? [] : undefined;
  const values = items.map(recordCounterValue);
  return values.every((item): item is number => item !== undefined) ? sortedNumbers(values) : undefined;
};

const sourceMissing = (truthLevel: JsonRecord): boolean => {
  const classification = String(recordOf(truthLevel.provenance)?.classification ?? "");
  return classification === "source_missing_external_reference_only";
};

const truthLevelId = (truthLevel: JsonRecord): number => {
  const direct = finiteNonNegativeInteger(truthLevel.level);
  if (direct !== undefined) return direct;
  const parsed = Number(String(truthLevel.level_id ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("Competitor truth level is missing a valid level id");
  return parsed;
};

const setFact = (
  facts: MechanismCountFacts,
  key: MechanismCountFactKey,
  value: MechanismCountFactValue | undefined,
): void => {
  if (value !== undefined) facts[key] = value;
};

const extractDirectionalExitFacts = (
  facts: MechanismCountFacts,
  mechanisms: JsonRecord,
  legacyExhaustive: boolean,
): void => {
  const exits = recordOf(mechanisms.directional_exits) ?? {};
  if (legacyExhaustive) {
    setFact(facts, "ordinaryExitCount", finiteNonNegativeInteger(exits.ordinary_count));
    if (Array.isArray(exits.frozen_values)) {
      const values = exits.frozen_values.map(finiteNonNegativeInteger);
      if (values.every((value): value is number => value !== undefined)) {
        setFact(facts, "frozenExitCount", values.length);
        setFact(facts, "frozenExitValues", sortedNumbers(values));
      }
    }
    setFact(facts, "starExitCount", finiteNonNegativeInteger(exits.star_count));
    setFact(facts, "starFrozenExitCount", finiteNonNegativeInteger(exits.star_frozen_count));
    if (Array.isArray(exits.star_frozen_values)) {
      const values = exits.star_frozen_values.map(finiteNonNegativeInteger);
      if (values.every((value): value is number => value !== undefined)) {
        setFact(facts, "starFrozenExitValues", sortedNumbers(values));
      }
    }
    return;
  }

  for (const [sourceKey, countKey, valuesKey] of [
    ["frozen", "frozenExitCount", "frozenExitValues"],
    ["star", "starExitCount", undefined],
  ] as const) {
    const source = exits[sourceKey];
    if (!Array.isArray(source)) continue;
    setFact(facts, countKey, source.length);
    if (valuesKey) {
      const values = recordsOf(source).map(recordCounterValue);
      if (values.length === source.length && values.every((value): value is number => value !== undefined)) {
        setFact(facts, valuesKey, sortedNumbers(values));
      }
    }
  }
  if (Array.isArray(exits.ordinary)) setFact(facts, "ordinaryExitCount", exits.ordinary.length);

  if (Array.isArray(exits.star)) {
    const frozenValues: number[] = [];
    let allKnown = true;
    for (const raw of exits.star) {
      const star = recordOf(raw);
      if (!star) {
        allKnown = false;
        continue;
      }
      const frozenSource = Object.hasOwn(star, "frozen_value") ? star.frozen_value : star.frozen;
      if (frozenSource === false || frozenSource === null || frozenSource === undefined) continue;
      const value = counterValue(frozenSource);
      if (value === undefined) allKnown = false;
      else frozenValues.push(value);
    }
    if (allKnown) {
      setFact(facts, "starFrozenExitCount", frozenValues.length);
      setFact(facts, "starFrozenExitValues", sortedNumbers(frozenValues));
    }
  }
};

const extractCoverFacts = (
  facts: MechanismCountFacts,
  source: unknown,
  legacyExhaustive: boolean,
): void => {
  const count = collectionCount(source, legacyExhaustive);
  setFact(facts, "shutterCount", count);
  if (count === undefined) return;
  if (count === 0) {
    setFact(facts, "shutterCoverCounts", []);
    setFact(facts, "shutterCoveredCohortCounts", []);
    setFact(facts, "shutterCoveredCohortTotal", 0);
    setFact(facts, "shutterKnownCoveredCohorts", []);
    return;
  }

  const cover = recordOf(source);
  const coverRecords = recordsOf(source);
  const rawCoverCounts = Array.isArray(cover?.values)
    ? cover.values
    : coverRecords.map((record) => record.count);
  const coverCounts = rawCoverCounts.map(finiteNonNegativeInteger);
  if (coverCounts.length === count && coverCounts.every((value): value is number => value !== undefined)) {
    setFact(facts, "shutterCoverCounts", sortedNumbers(coverCounts));
  }

  const rawCohorts = Array.isArray(cover?.hidden_batch_counts)
    ? cover.hidden_batch_counts
    : coverRecords.map((record) => record.hidden_batch_piece_count ?? record.hidden_piece_count);
  const cohortCounts = rawCohorts.map(finiteNonNegativeInteger);
  const allCohortsKnown = cohortCounts.length === count
    && cohortCounts.every((value): value is number => value !== undefined);
  if (allCohortsKnown) {
    setFact(facts, "shutterCoveredCohortCounts", sortedNumbers(cohortCounts));
    setFact(facts, "shutterCoveredCohortTotal", cohortCounts.reduce((sum, value) => sum + value, 0));
  } else {
    const aggregate = finiteNonNegativeInteger(cover?.source_hidden_aggregate_count);
    if (aggregate !== undefined) setFact(facts, "shutterCoveredCohortTotal", aggregate);
    else if (cohortCounts.length > 0 && cohortCounts.every((value): value is number => value !== undefined)) {
      setFact(facts, "shutterCoveredCohortTotal", cohortCounts.reduce((sum, value) => sum + value, 0));
    }
  }

  const paired: string[] = [];
  if (rawCoverCounts.length === count && rawCohorts.length === count) {
    for (let index = 0; index < count; index += 1) {
      const coverCount = coverCounts[index];
      const cohortCount = cohortCounts[index];
      if (coverCount !== undefined && cohortCount !== undefined) paired.push(`${coverCount}:${cohortCount}`);
    }
  }
  if (allCohortsKnown || paired.length) setFact(facts, "shutterKnownCoveredCohorts", sortedStrings(paired));
};

const extractGeneratorFacts = (
  facts: MechanismCountFacts,
  source: unknown,
  legacyExhaustive: boolean,
): void => {
  const count = collectionCount(source, legacyExhaustive);
  setFact(facts, "generatorCount", count);
  if (count === undefined) return;
  if (count === 0) {
    setFact(facts, "generatorQueueCounts", []);
    return;
  }

  const generators = recordOf(source);
  const records = recordsOf(source);
  const rawCounts = Array.isArray(generators?.queue_lengths)
    ? generators.queue_lengths
    : records.map((generator) => {
      const direct = finiteNonNegativeInteger(generator.queue_length)
        ?? finiteNonNegativeInteger(generator.queue_count);
      if (direct !== undefined) return direct;
      if (Array.isArray(generator.queueBlockIds)) return generator.queueBlockIds.length;
      if (Array.isArray(generator.queue)) return generator.queue.length;
      return undefined;
    });
  const queueCounts = rawCounts.map(finiteNonNegativeInteger);
  if (queueCounts.length === count && queueCounts.every((value): value is number => value !== undefined)) {
    setFact(facts, "generatorQueueCounts", sortedNumbers(queueCounts));
  }
};

const extractKeyLockFacts = (
  facts: MechanismCountFacts,
  source: unknown,
  legacyExhaustive: boolean,
): void => {
  if (source === undefined && legacyExhaustive) {
    setFact(facts, "keyCount", 0);
    setFact(facts, "lockCount", 0);
    setFact(facts, "lockRequirements", []);
    return;
  }
  if (source === undefined || isUnknown(source)) return;
  const keyLocks = recordOf(source);
  if (keyLocks) {
    setFact(facts, "keyCount", finiteNonNegativeInteger(keyLocks.key_count));
    setFact(facts, "lockCount", finiteNonNegativeInteger(keyLocks.lock_count));
    const rawRequirements = Array.isArray(keyLocks.lock_requirements)
      ? keyLocks.lock_requirements
      : Array.isArray(keyLocks.locks)
        ? recordsOf(keyLocks.locks).map((lock) => lock.lock_count)
        : undefined;
    if (rawRequirements) {
      const requirements = rawRequirements.map(finiteNonNegativeInteger);
      if (requirements.every((value): value is number => value !== undefined)) {
        setFact(facts, "lockRequirements", sortedNumbers(requirements));
      }
    }
    return;
  }

  if (!Array.isArray(source)) return;
  if (!source.length) {
    setFact(facts, "keyCount", 0);
    setFact(facts, "lockCount", 0);
    setFact(facts, "lockRequirements", []);
    return;
  }
  const groups = recordsOf(source);
  if (groups.length !== source.length) return;
  const visibleKeyCounts = groups.map((group) => finiteNonNegativeInteger(group.visible_key_piece_count));
  if (visibleKeyCounts.every((value): value is number => value !== undefined)) {
    setFact(facts, "keyCount", visibleKeyCounts.reduce((sum, value) => sum + value, 0));
  } else if (groups.every((group) => group.kind === "key" || group.kind === "lock")) {
    setFact(facts, "keyCount", groups.filter((group) => group.kind === "key").length);
  }

  const lockGroups = groups.filter((group) => Object.hasOwn(group, "lock_count")
    || Object.hasOwn(group, "lock_shape") || group.kind === "lock");
  if (lockGroups.length === groups.length || groups.every((group) => group.kind === "key" || group.kind === "lock")) {
    setFact(facts, "lockCount", lockGroups.length);
  }
  const requirements = lockGroups.map((group) => finiteNonNegativeInteger(group.lock_count));
  if (requirements.length === lockGroups.length
    && requirements.every((value): value is number => value !== undefined)) {
    setFact(facts, "lockRequirements", sortedNumbers(requirements));
  }
};

const coloredGridCellCount = (source: unknown, missingIsZero: boolean): number | undefined => {
  if (source === undefined) return missingIsZero ? 0 : undefined;
  if (isUnknown(source)) return undefined;
  const entries = Array.isArray(source) ? source : [source];
  let total = 0;
  for (const entry of entries) {
    const record = recordOf(entry);
    if (!record) return undefined;
    const count = finiteNonNegativeInteger(record.count);
    if (count !== undefined) total += count;
    else if (Array.isArray(record.cells)) total += record.cells.length;
    else return undefined;
  }
  return total;
};

export const extractCompetitorMechanismCountContract = (
  truthValue: unknown,
): CompetitorMechanismCountContract => {
  const truthLevel = recordOf(truthValue);
  if (!truthLevel) throw new Error("Competitor truth level must be an object");
  const levelId = truthLevelId(truthLevel);
  if (sourceMissing(truthLevel)) return { levelId, sourceMissing: true, facts: {} };

  const mechanisms = recordOf(truthLevel.mechanisms) ?? {};
  const exits = recordOf(mechanisms.directional_exits) ?? {};
  const legacyExhaustive = Object.hasOwn(exits, "ordinary_count");
  const facts: MechanismCountFacts = {};
  extractDirectionalExitFacts(facts, mechanisms, legacyExhaustive);

  const numericIce = mechanisms.numeric_ice;
  setFact(facts, "numericIceCount", collectionCount(numericIce, legacyExhaustive));
  const numericIceValues = numericIce === undefined && legacyExhaustive ? [] : valuesFromCollection(numericIce);
  setFact(facts, "numericIceValues", numericIceValues);

  setFact(facts, "shellBlockCount", collectionCount(mechanisms.shells, legacyExhaustive));
  extractCoverFacts(facts, mechanisms.covers, legacyExhaustive);
  extractGeneratorFacts(facts, mechanisms.generators, legacyExhaustive);
  extractKeyLockFacts(facts, mechanisms.key_locks ?? mechanisms.keys_locks, legacyExhaustive);

  for (const [key, source] of [
    ["axisBlockCount", mechanisms.axis_blocks],
    ["liftLayerCount", mechanisms.lifts],
    ["stagedFrameCount", mechanisms.staged_frames],
    ["elevatorCount", mechanisms.elevators],
    ["conveyorCount", mechanisms.conveyors],
    ["bombCount", mechanisms.bombs],
    ["rotationBadgeCount", mechanisms.rotatable_blocks],
    ["flipDoorCount", mechanisms.flip_doors],
  ] as const) {
    setFact(facts, key, collectionCount(source, legacyExhaustive));
  }
  setFact(
    facts,
    "starBlockCount",
    starBlockCount(mechanisms.star_blocks ?? mechanisms.stars, legacyExhaustive),
  );
  setFact(facts, "coloredGridCellCount", coloredGridCellCount(mechanisms.colored_grid, legacyExhaustive));

  return { levelId, sourceMissing: false, facts };
};

export const extractCompetitorMechanismCountContracts = (
  truthDocument: unknown,
): CompetitorMechanismCountContract[] => {
  const root = recordOf(truthDocument);
  if (!root || !Array.isArray(root.levels)) throw new Error("Competitor truth document must contain a levels array");
  return root.levels.map(extractCompetitorMechanismCountContract);
};

const runtimeShutters = (level: LevelSpec) => (level.shutters ?? []).filter((shutter) => (
  shutter.count > 0 && (shutter.skin === undefined || shutter.skin === "shutter")
));

export const extractRuntimeMechanismCountFacts = (level: LevelSpec): Required<MechanismCountFacts> => {
  const ordinaryExits = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) <= 0);
  const frozenExits = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) > 0);
  const starExits = level.gates.filter((gate) => gate.star);
  const starFrozenExits = starExits.filter((gate) => (gate.frozen ?? 0) > 0);
  const numericIce = level.blocks.filter((block) => (block.frozen ?? 0) > 0);
  const shutters = runtimeShutters(level);
  const cohortCounts = shutters.map((shutter) => (
    level.blocks.filter((block) => block.shutterId === shutter.id).length
  ));
  const knownCohorts = shutters.map((shutter, index) => `${shutter.count}:${cohortCounts[index]}`);
  const generators = level.generators ?? [];
  const lockedBlocks = level.blocks.filter((block) => Boolean(block.lockedBy));
  return {
    ordinaryExitCount: ordinaryExits.length,
    frozenExitCount: frozenExits.length,
    frozenExitValues: sortedNumbers(frozenExits.map((gate) => gate.frozen!)),
    starExitCount: starExits.length,
    starFrozenExitCount: starFrozenExits.length,
    starFrozenExitValues: sortedNumbers(starFrozenExits.map((gate) => gate.frozen!)),
    numericIceCount: numericIce.length,
    numericIceValues: sortedNumbers(numericIce.map((block) => block.frozen!)),
    shellBlockCount: level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
    shutterCount: shutters.length,
    shutterCoverCounts: sortedNumbers(shutters.map((shutter) => shutter.count)),
    shutterCoveredCohortCounts: sortedNumbers(cohortCounts),
    shutterCoveredCohortTotal: cohortCounts.reduce((sum, value) => sum + value, 0),
    shutterKnownCoveredCohorts: sortedStrings(knownCohorts),
    generatorCount: generators.length,
    generatorQueueCounts: sortedNumbers(generators.map((generator) => generator.queueBlockIds.length)),
    keyCount: level.blocks.filter((block) => Boolean(block.keyId)).length,
    lockCount: lockedBlocks.length,
    lockRequirements: sortedNumbers(lockedBlocks.map((block) => block.lockCount ?? 1)),
    axisBlockCount: level.blocks.filter((block) => Boolean(block.movementAxis)).length,
    liftLayerCount: (level.shutters ?? []).filter((shutter) => shutter.skin === "lift").length,
    stagedFrameCount: (level.shutters ?? []).filter((shutter) => shutter.skin === "staged-frame").length,
    elevatorCount: level.elevators?.length ?? 0,
    conveyorCount: level.conveyors?.length ?? 0,
    starBlockCount: level.blocks.filter((block) => Boolean(block.star)).length,
    bombCount: level.blocks.filter((block) => Number.isFinite(block.timedBombSeconds)).length,
    rotationBadgeCount: level.blocks.filter((block) => Boolean(block.rotationBadge)).length,
    flipDoorCount: level.flipDoors?.length ?? 0,
    coloredGridCellCount: (level.coloredGrids ?? []).reduce((sum, grid) => sum + grid.cells.length, 0),
  };
};

const sameFact = (expected: MechanismCountFactValue, actual: MechanismCountFactValue): boolean => (
  JSON.stringify(expected) === JSON.stringify(actual)
);

const containsMultiset = (actual: readonly string[], expected: readonly string[]): boolean => {
  const counts = new Map<string, number>();
  for (const value of actual) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const value of expected) {
    const available = counts.get(value) ?? 0;
    if (available <= 0) return false;
    counts.set(value, available - 1);
  }
  return true;
};

export const compareCompetitorMechanismCountContract = (
  level: LevelSpec | undefined,
  contract: CompetitorMechanismCountContract,
): MechanismCountAuditRecord => {
  const comparableFields = MECHANISM_COUNT_FACT_KEYS.filter((key) => contract.facts[key] !== undefined);
  if (contract.sourceMissing) {
    return { levelId: contract.levelId, sourceMissing: true, comparableFields, issues: [], status: "source-missing" };
  }
  if (!level) {
    return {
      levelId: contract.levelId,
      sourceMissing: false,
      comparableFields,
      issues: [{ levelId: contract.levelId, field: "level", expected: "present", actual: "missing" }],
      status: "runtime-missing",
    };
  }

  const actual = extractRuntimeMechanismCountFacts(level);
  const issues: MechanismCountIssue[] = [];
  for (const field of comparableFields) {
    const expected = contract.facts[field]!;
    const actualValue = actual[field];
    const matches = field === "shutterKnownCoveredCohorts"
      ? containsMultiset(actualValue as string[], expected as string[])
      : sameFact(expected, actualValue);
    if (!matches) issues.push({ levelId: contract.levelId, field, expected, actual: actualValue });
  }
  return {
    levelId: contract.levelId,
    sourceMissing: false,
    comparableFields,
    issues,
    status: issues.length ? "mismatch" : "match",
  };
};

export const auditCompetitorMechanismCountContracts = (
  levels: readonly LevelSpec[],
  contracts: readonly CompetitorMechanismCountContract[],
): MechanismCountAuditRecord[] => {
  const levelById = new Map(levels.map((level) => [level.id, level]));
  return contracts.map((contract) => compareCompetitorMechanismCountContract(
    levelById.get(contract.levelId),
    contract,
  ));
};
