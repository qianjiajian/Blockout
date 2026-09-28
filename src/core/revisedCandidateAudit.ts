import { PuzzleModel } from "./PuzzleModel";
import { boardCellsSeparatedBySeam } from "./boardSeams";
import { enclosedBoardVoids } from "./boardTopology";
import { exitPassingSpan } from "./blockExitFrontier";
import { gatePortals, portalTangentOffset } from "./gatePortals";
import { COLORS, type LevelSpec, type Point } from "./types";

export interface RevisedExitInventory {
  kind: "ordinary" | "flip";
  /** Observed source width is reference data, not a requirement to copy geometry. */
  width?: number;
  frozen: number;
  star: boolean;
}

/** Complete source-authored inventory; empty arrays explicitly mean none. */
export interface RevisedMechanismInventory {
  generatorQueueLengths: number[];
  axisHorizontalBlocks: number;
  axisVerticalBlocks: number;
  keyGroups: Array<{ keyCount: number; lockCounts: number[] }>;
  starBlocks: number;
  flipDoorInitialOpen: boolean[];
  coloredGridCellCounts: number[];
  bombSeconds: number[];
  shutterClearCounts: number[];
  shutterHiddenBatchCounts: number[];
  liftCount: number;
  liftHiddenBatchCounts: number[];
  numericIceValues: number[];
  shellBlocks: number;
  /** One entry per physical aperture, not per shared logical gate record. */
  exits: RevisedExitInventory[];
}

export interface RevisedCandidateSourceContract {
  /** Required before applying any level-specific, user-approved exception. */
  levelId?: number;
  referenceId: string;
  sha256: string;
  seed: string;
  width: number;
  height: number;
  openingBlockCount: number;
  fullBlockCount: number;
  mechanisms: RevisedMechanismInventory;
  /** Complete effective competitor mask, required to certify originality. */
  originalMask?: Point[];
}

export interface RevisedCandidateIssue {
  category: "source" | "construction" | "layout" | "composition" | "mechanism" | "exit";
  code: string;
  message: string;
  blockId?: string;
  otherBlockId?: string;
  cell?: Point;
}

export interface RevisedCandidateMeasurements {
  fullBlockCount: number;
  openingBlockCount?: number;
  openingBlockIds?: string[];
  fullIrregularCount: number;
  openingIrregularCount?: number;
  fullIrregularRatio: number;
  openingIrregularRatio?: number;
  playableCellCount: number;
  leftRightSymmetric: boolean;
  upDownSymmetric: boolean;
  mechanisms: RevisedMechanismInventory;
}

export interface RevisedCandidateAudit {
  ruleVersion: "1.2.1";
  runtimeProfile: "revised-2026-09-21-v1.2";
  levelId: number;
  sourceReference?: string;
  sourceSha256?: string;
  seed?: string;
  staticPassed: boolean;
  /** Always false: this module cannot certify solutions, lower bounds or time. */
  releaseApproved: false;
  outstandingGates: readonly string[];
  issues: RevisedCandidateIssue[];
  measurements: RevisedCandidateMeasurements;
}

const record = (value: unknown): Record<string, unknown> | undefined => (
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined
);
const keyOf = ([x, y]: Point): string => `${x},${y}`;
const nonNegativeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const positiveInteger = (value: unknown): value is number => nonNegativeInteger(value) && value > 0;
const sortedNumbers = (values: readonly number[]): number[] => [...values].sort((left, right) => left - right);
const canonicalSort = <T>(values: readonly T[]): T[] => [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
const canonicalInventory = (inventory: RevisedMechanismInventory): RevisedMechanismInventory => ({
  generatorQueueLengths: sortedNumbers(inventory.generatorQueueLengths),
  axisHorizontalBlocks: inventory.axisHorizontalBlocks,
  axisVerticalBlocks: inventory.axisVerticalBlocks,
  keyGroups: canonicalSort(inventory.keyGroups.map((group) => ({ keyCount: group.keyCount, lockCounts: sortedNumbers(group.lockCounts) }))),
  starBlocks: inventory.starBlocks,
  flipDoorInitialOpen: [...inventory.flipDoorInitialOpen].sort(),
  coloredGridCellCounts: sortedNumbers(inventory.coloredGridCellCounts),
  bombSeconds: sortedNumbers(inventory.bombSeconds),
  // Arrays share an index: sorting each independently loses count/cohort identity.
  shutterClearCounts: canonicalSort(inventory.shutterClearCounts.map((count, index) => [count, inventory.shutterHiddenBatchCounts[index]])).map(([count]) => count),
  shutterHiddenBatchCounts: canonicalSort(inventory.shutterClearCounts.map((count, index) => [count, inventory.shutterHiddenBatchCounts[index]])).map(([, count]) => count),
  liftCount: inventory.liftCount,
  liftHiddenBatchCounts: sortedNumbers(inventory.liftHiddenBatchCounts),
  numericIceValues: sortedNumbers(inventory.numericIceValues),
  shellBlocks: inventory.shellBlocks,
  exits: canonicalSort(inventory.exits.map((exit) => ({ kind: exit.kind, width: exit.width, frozen: exit.frozen, star: exit.star }))),
});

/** Candidate measurement only. Never substitute it for missing source evidence. */
export const measureRevisedMechanismInventory = (level: LevelSpec): RevisedMechanismInventory => {
  const groups = new Map<string, { keyCount: number; lockCounts: number[] }>();
  for (const block of level.blocks) {
    if (block.keyId) {
      const group = groups.get(block.keyId) ?? { keyCount: 0, lockCounts: [] };
      group.keyCount += 1;
      groups.set(block.keyId, group);
    }
    if (block.lockedBy) {
      const group = groups.get(block.lockedBy) ?? { keyCount: 0, lockCounts: [] };
      group.lockCounts.push(block.lockCount ?? 1);
      groups.set(block.lockedBy, group);
    }
  }
  return canonicalInventory({
    generatorQueueLengths: (level.generators ?? []).map((generator) => generator.queueBlockIds.length),
    axisHorizontalBlocks: level.blocks.filter((block) => block.movementAxis === "horizontal").length,
    axisVerticalBlocks: level.blocks.filter((block) => block.movementAxis === "vertical").length,
    keyGroups: [...groups.values()],
    starBlocks: level.blocks.filter((block) => block.star).length,
    flipDoorInitialOpen: (level.flipDoors ?? []).map((door) => door.initiallyOpen),
    coloredGridCellCounts: (level.coloredGrids ?? []).map((grid) => grid.cells.length),
    bombSeconds: level.blocks.flatMap((block) => block.timedBombSeconds === undefined ? [] : [block.timedBombSeconds]),
    shutterClearCounts: (level.shutters ?? []).filter((shutter) => shutter.skin === undefined || shutter.skin === "shutter").map((shutter) => shutter.count),
    shutterHiddenBatchCounts: (level.shutters ?? []).filter((shutter) => shutter.skin === undefined || shutter.skin === "shutter")
      .map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id).length),
    liftCount: (level.shutters ?? []).filter((shutter) => shutter.skin === "lift").length,
    liftHiddenBatchCounts: (level.shutters ?? []).filter((shutter) => shutter.skin === "lift")
      .map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id).length),
    numericIceValues: level.blocks.flatMap((block) => (block.frozen ?? 0) > 0 ? [block.frozen!] : []),
    shellBlocks: level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
    exits: [
      ...level.gates.flatMap((gate) => gatePortals(level, gate).map((portal): RevisedExitInventory => ({
        kind: "ordinary", width: portal.size, frozen: gate.frozen ?? 0, star: gate.star ?? false,
      }))),
      ...(level.flipDoors ?? []).flatMap((door) => gatePortals(level, door).map((portal): RevisedExitInventory => ({
        kind: "flip", width: portal.size, frozen: door.frozen ?? 0, star: door.star ?? false,
      }))),
    ],
  });
};

const sourceInventory = (value: unknown): RevisedMechanismInventory | undefined => {
  const object = record(value);
  if (!object) return undefined;
  const integerArrays = ["generatorQueueLengths", "coloredGridCellCounts", "shutterClearCounts", "shutterHiddenBatchCounts", "liftHiddenBatchCounts", "numericIceValues"];
  if (integerArrays.some((field) => !Array.isArray(object[field]) || !(object[field] as unknown[]).every(nonNegativeInteger))) return undefined;
  if ((object.shutterClearCounts as number[]).length !== (object.shutterHiddenBatchCounts as number[]).length) return undefined;
  if (["axisHorizontalBlocks", "axisVerticalBlocks", "starBlocks", "liftCount", "shellBlocks"].some((field) => !nonNegativeInteger(object[field]))) return undefined;
  if (!Array.isArray(object.bombSeconds) || !object.bombSeconds.every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0)) return undefined;
  if (!Array.isArray(object.flipDoorInitialOpen) || !object.flipDoorInitialOpen.every((entry) => typeof entry === "boolean")) return undefined;
  if (!Array.isArray(object.keyGroups) || !object.keyGroups.every((entry) => {
    const group = record(entry);
    return group && nonNegativeInteger(group.keyCount) && Array.isArray(group.lockCounts) && group.lockCounts.every(positiveInteger);
  })) return undefined;
  if (!Array.isArray(object.exits) || !object.exits.every((entry) => {
    const exit = record(entry);
    return exit && (exit.kind === "ordinary" || exit.kind === "flip") && (exit.width === undefined || positiveInteger(exit.width))
      && nonNegativeInteger(exit.frozen) && typeof exit.star === "boolean";
  })) return undefined;
  return canonicalInventory(object as unknown as RevisedMechanismInventory);
};

/** Full rectangles, including translated relative shapes, are not irregular. */
export const isRevisedIrregularShape = (shape: readonly Point[]): boolean => {
  if (!shape.length) return true;
  const width = Math.max(...shape.map(([x]) => x)) - Math.min(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) - Math.min(...shape.map(([, y]) => y)) + 1;
  return new Set(shape.map(keyOf)).size !== width * height;
};

const DIRECTIONS: readonly Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const maskKey = (mask: readonly Point[]): string => mask.map(keyOf).sort().join(";");

/** Static necessary conditions only; no output mutation, certificate or files. */
export const auditRevisedCandidate = (level: LevelSpec, sourceInput: unknown): RevisedCandidateAudit => {
  const issues: RevisedCandidateIssue[] = [];
  const add = (category: RevisedCandidateIssue["category"], code: string, message: string, details: Partial<RevisedCandidateIssue> = {}): void => {
    issues.push({ category, code, message, ...details });
  };
  const source = record(sourceInput);
  const sourceText = (field: string): string | undefined => typeof source?.[field] === "string" && (source[field] as string).trim()
    ? source[field] as string : undefined;
  const reference = sourceText("referenceId");
  const seed = sourceText("seed");
  const hash = sourceText("sha256");
  if (!reference) add("source", "missing-source-reference", "An independently recorded source reference is required.");
  if (!hash || !/^[a-f\d]{64}$/i.test(hash)) add("source", "missing-source-hash", "An independently recorded SHA-256 source identifier is required.");
  if (!seed) add("source", "missing-seed", "A recorded generation seed is required.");
  for (const field of ["width", "height", "fullBlockCount"] as const) {
    if (!positiveInteger(source?.[field])) add("source", "missing-source-number", `Source ${field} must be explicitly evidenced as a positive integer.`);
  }
  if (!nonNegativeInteger(source?.openingBlockCount)) add("source", "missing-source-number", "Source openingBlockCount must be explicitly evidenced.");
  const expectedInventory = sourceInventory(source?.mechanisms);
  if (!expectedInventory) add("source", "incomplete-source-inventory", "All mechanism inventory fields and key values are required; missing does not mean zero.");
  if (level.mechanismRules !== "revised-2026-09-21-v1.2") add("construction", "wrong-rule-profile", "Candidate must explicitly opt into the active v1.2 runtime profile.");

  if (!positiveInteger(level.width) || !positiveInteger(level.height)) {
    add("construction", "invalid-board-dimensions", "Candidate dimensions must be finite positive safe integers before geometry can be audited.");
    return {
      ruleVersion: "1.2.1", runtimeProfile: "revised-2026-09-21-v1.2", levelId: level.id,
      sourceReference: reference, sourceSha256: hash, seed, staticPassed: false, releaseApproved: false,
      outstandingGates: ["valid-board-dimensions", "all-candidate-validation"], issues,
      measurements: {
        fullBlockCount: level.blocks.length, fullIrregularCount: level.blocks.filter((block) => isRevisedIrregularShape(block.shape)).length,
        fullIrregularRatio: level.blocks.length ? level.blocks.filter((block) => isRevisedIrregularShape(block.shape)).length / level.blocks.length : 0,
        playableCellCount: 0, leftRightSymmetric: false, upDownSymmetric: false,
        mechanisms: measureRevisedMechanismInventory(level),
      },
    };
  }
  const allowedColors = new Set<string>(COLORS);
  for (const block of level.blocks) for (const color of [block.color, ...(block.layers ?? [])]) {
    if (!allowedColors.has(color)) add("composition", "unknown-block-colour", `Unsupported block/layer colour ${String(color)} cannot expand the approved palette.`, { blockId: block.id });
  }
  for (const grid of level.coloredGrids ?? []) if (!allowedColors.has(grid.color)) {
    add("mechanism", "unknown-grid-colour", `Unsupported coloured-grid colour ${String(grid.color)}.`);
  }
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) if (!allowedColors.has(gate.color)) {
    add("exit", "unknown-exit-colour", `Unsupported exit colour ${String(gate.color)} cannot expand the approved palette.`);
  }

  const blocked = new Set((level.blocked ?? []).map(keyOf));
  const rawPlayable = level.playable ?? Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x): Point => [x, y])
  )).flat();
  const playable = rawPlayable.filter((cell) => !blocked.has(keyOf(cell)));
  const playableKeys = new Set(playable.map(keyOf));
  const leftRightSymmetric = playable.every(([x, y]) => playableKeys.has(keyOf([level.width - 1 - x, y])));
  const upDownSymmetric = playable.every(([x, y]) => playableKeys.has(keyOf([x, level.height - 1 - y])));
  if (!leftRightSymmetric && !upDownSymmetric) add("layout", "asymmetric-board", "Effective floor must be left-right or up-down symmetric.");
  if (positiveInteger(source?.width) && positiveInteger(source?.height)
    && (level.width !== source.width || level.height !== source.height)) {
    add("layout", "source-board-dimensions", "Candidate board width/height differ from the evidenced source dimensions.");
  }
  const xValues = playable.map(([x]) => x);
  const yValues = playable.map(([, y]) => y);
  if (!playable.length || Math.min(...xValues) !== 0 || Math.max(...xValues) !== level.width - 1
    || Math.min(...yValues) !== 0 || Math.max(...yValues) !== level.height - 1) {
    add("layout", "floor-bounding-box", "Effective floor must actually span the declared source-sized bounding box.");
  }
  if (playable.length) {
    const connected = new Set<string>([keyOf(playable[0])]);
    const pending: Point[] = [playable[0]];
    for (let index = 0; index < pending.length; index += 1) {
      const cell = pending[index];
      for (const [dx, dy] of DIRECTIONS) {
        const next: Point = [cell[0] + dx, cell[1] + dy];
        const key = keyOf(next);
        if (!playableKeys.has(key) || connected.has(key) || boardCellsSeparatedBySeam(level, cell, next)) continue;
        connected.add(key); pending.push(next);
      }
    }
    if (connected.size !== playableKeys.size) add("layout", "disconnected-board", "Floor must be one connected component, including physical seam restrictions.");
  }
  const rows = Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => playableKeys.has(`${x},${y}`) ? "#" : ".").join(""));
  if (enclosedBoardVoids(rows, level.width, level.height).length) add("layout", "internal-board-void", "Board contains an enclosed internal wall or hole.");
  const sourceMask = source?.originalMask;
  const validSourceMask = Array.isArray(sourceMask) && sourceMask.length > 0 && sourceMask.every((cell) => (
    Array.isArray(cell) && cell.length === 2 && cell.every(nonNegativeInteger)
    && cell[0] < Number(source?.width) && cell[1] < Number(source?.height)
  )) && new Set((sourceMask as Point[]).map(keyOf)).size === sourceMask.length;
  if (!validSourceMask) add("source", "originality-unverified", "Complete source mask evidence is missing or invalid; originality cannot be approved.");
  else {
    const mask = sourceMask as Point[];
    const width = Number(source?.width), height = Number(source?.height);
    if (mask.length < width * height && playableKeys.size === level.width * level.height) {
      add("mechanism", "irregular-board-mechanism-lost", "An irregular source board cannot be replaced by a full rectangle to satisfy capacity; mechanism kinds must be preserved.");
    }
    const equivalents = [mask, mask.map(([x, y]): Point => [width - 1 - x, y]),
      mask.map(([x, y]): Point => [x, height - 1 - y]), mask.map(([x, y]): Point => [width - 1 - x, height - 1 - y])];
    if (width === height) equivalents.push(mask.map(([x, y]): Point => [y, x]),
      mask.map(([x, y]): Point => [width - 1 - y, x]), mask.map(([x, y]): Point => [y, height - 1 - x]),
      mask.map(([x, y]): Point => [width - 1 - y, height - 1 - x]));
    if (equivalents.some((equivalent) => maskKey(equivalent) === maskKey(playable))) {
      add("layout", "source-mask-reused", "Board mask duplicates the competitor mask or an equivalent reflection/rotation.");
    }
  }

  const inventory = measureRevisedMechanismInventory(level);
  const exitKinds = (exits: RevisedExitInventory[]) => canonicalSort(exits.map(({ kind, frozen, star }) => ({ kind, frozen, star })));
  const ordinaryExit = (exit: RevisedExitInventory) => exit.kind === "ordinary" && !exit.star && exit.frozen === 0;
  const lv26Exception = level.mechanismRules === "revised-2026-09-21-v1.2" && level.id === 26 && source?.levelId === 26
    && expectedInventory?.exits.length === 11 && expectedInventory.exits.filter(ordinaryExit).length === 8
    && JSON.stringify(exitKinds(expectedInventory.exits.filter((exit) => !ordinaryExit(exit))))
      === JSON.stringify(exitKinds([5, 9, 14].map((frozen) => ({ kind: "ordinary", frozen, star: false }))));
  if (expectedInventory) for (const field of Object.keys(expectedInventory) as Array<keyof RevisedMechanismInventory>) {
    const actual = field === "exits" ? exitKinds(inventory.exits.filter((exit) => !lv26Exception || !ordinaryExit(exit))) : inventory[field];
    const expected = field === "exits" ? exitKinds(expectedInventory.exits.filter((exit) => !lv26Exception || !ordinaryExit(exit))) : expectedInventory[field];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      add("mechanism", "source-mechanism-mismatch", `Mechanism inventory ${field} differs from the independent source contract.`);
    }
  }
  if (lv26Exception && (inventory.exits.filter(ordinaryExit).length < 1 || inventory.exits.filter(ordinaryExit).length > 5)) {
    add("exit", "lv26-ordinary-exit-range", "Approved Lv26 redesign requires 1–5 ordinary exits and the unchanged three frozen exits (5/9/14).");
  }
  const fullCount = level.blocks.length;
  const fullIrregular = level.blocks.filter((block) => isRevisedIrregularShape(block.shape)).length;
  if (positiveInteger(source?.fullBlockCount) && fullCount !== source.fullBlockCount) add("composition", "full-count-mismatch", "Full independent-block count differs from source; shells do not add blocks.");
  if (fullIrregular * 10 > fullCount * 3) add("composition", "full-irregular-ratio", "Full irregular piece ratio exceeds 30%.");
  const measurements: RevisedCandidateMeasurements = {
    fullBlockCount: fullCount, fullIrregularCount: fullIrregular,
    fullIrregularRatio: fullCount ? fullIrregular / fullCount : 0,
    playableCellCount: playableKeys.size, leftRightSymmetric, upDownSymmetric, mechanisms: inventory,
  };
  try {
    // The constructor settles all deterministic initial reveals/dispatches.
    // UI animation completion is a separate gate; no elapsed time is invented.
    const model = new PuzzleModel(structuredClone(level));
    const snapshot = model.snapshot();
    const opening = snapshot.blocks.filter((block) => !block.shutterId
      || snapshot.shutters.find((shutter) => shutter.id === block.shutterId)?.revealed === true);
    const openingIrregular = opening.filter((block) => isRevisedIrregularShape(block.shape)).length;
    Object.assign(measurements, { openingBlockCount: opening.length, openingBlockIds: opening.map((block) => block.id),
      openingIrregularCount: openingIrregular, openingIrregularRatio: opening.length ? openingIrregular / opening.length : 0 });
    if (nonNegativeInteger(source?.openingBlockCount) && opening.length !== source.openingBlockCount) add("composition", "opening-count-mismatch", "Opening count differs at the first stable playable model state, after automatic reveal/dispatch.");
    if (openingIrregular * 10 > opening.length * 3) add("composition", "opening-irregular-ratio", "Opening irregular piece ratio exceeds 30%.");
    const occupied = new Map<string, { id: string; color: string }>();
    for (const block of opening) for (const [dx, dy] of block.shape) occupied.set(keyOf([block.x + dx, block.y + dy]), { id: block.id, color: block.layers[0] ?? block.color });
    const seenPairs = new Set<string>();
    for (const [cellKey, owner] of occupied) {
      const [x, y] = cellKey.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
        const other = occupied.get(`${x + dx},${y + dy}`);
        if (!other || other.id === owner.id || other.color !== owner.color) continue;
        const pair = [owner.id, other.id].sort().join("\0");
        if (seenPairs.has(pair)) continue;
        seenPairs.add(pair);
        add("composition", "opening-same-colour-adjacency", "Different opening pieces touch orthogonally with the same current outer colour.", { blockId: owner.id, otherBlockId: other.id, cell: [x, y] });
      }
    }
  } catch (error) {
    add("construction", "invalid-runtime-level", error instanceof Error ? error.message : String(error));
  }

  const mouths = [...level.gates, ...(level.flipDoors ?? [])].flatMap((gate) => gatePortals(level, gate).map((portal) => ({ gate, portal })));
  const ordinaryMouths = mouths.filter(({ gate }) => !gate.star).length;
  const starMouths = mouths.length - ordinaryMouths;
  if (Math.max(ordinaryMouths, starMouths) > COLORS.length) add("exit", "exit-colour-capacity", "Non-star and star apertures each have at most one slot per approved colour.");
  if (expectedInventory && !lv26Exception && Math.max(expectedInventory.exits.filter((exit) => !exit.star).length,
    expectedInventory.exits.filter((exit) => exit.star).length) > COLORS.length) add("source", "source-exit-colour-capacity", "Source aperture counts exceed the available ordinary/star colour slots without an approved exception.");
  const exitColours = new Map<string, { ordinary: number; star: number }>();
  for (const { gate } of mouths) {
    const counts = exitColours.get(gate.color) ?? { ordinary: 0, star: 0 };
    counts[gate.star ? "star" : "ordinary"] += 1;
    exitColours.set(gate.color, counts);
  }
  for (const [color, counts] of exitColours) {
    const matchingStar = level.blocks.some((block) => block.star && (block.layers ?? [block.color]).includes(color as typeof block.color));
    if (counts.ordinary > 1 || counts.star > 1 || (counts.ordinary > 0 && counts.star > 0 && !matchingStar)) {
      add("exit", "repeated-exit-colour", `Colour ${color} may only pair one non-star mouth with one star mouth backed by a matching star block.`);
    }
  }
  const cargoSpawns = new Map((level.generators ?? []).flatMap((generator) => generator.queueBlockIds.map((id) => [id, generator.spawn] as const)));
  for (const block of level.blocks) {
    const anchor = cargoSpawns.get(block.id) ?? [block.x, block.y];
    for (const color of block.layers ?? [block.color]) {
      const hasCompatibleMouth = mouths.some(({ gate, portal }) => {
        if (gate.color !== color || (block.star && !gate.star)) return false;
        const horizontalExit = portal.side === "left" || portal.side === "right";
        if (block.movementAxis && (block.movementAxis === "horizontal") !== horizontalExit) return false;
        if (exitPassingSpan(block.shape, portal.side) > portal.size) return false;
        if (!block.movementAxis) return true;
        const start = portalTangentOffset(portal);
        return block.shape.every(([dx, dy]) => {
          const tangent = horizontalExit ? anchor[1] + dy : anchor[0] + dx;
          return tangent >= start && tangent < start + portal.size;
        });
      });
      if (!hasCompatibleMouth) add("exit", "missing-compatible-exit", `Layer ${color} has no matching star/axis/full-width physical exit; this is only a necessary path condition.`, { blockId: block.id });
    }
  }
  return {
    ruleVersion: "1.2.1", runtimeProfile: "revised-2026-09-21-v1.2", levelId: level.id,
    sourceReference: reference, sourceSha256: hash, seed, staticPassed: issues.length === 0, releaseApproved: false,
    outstandingGates: ["authoritative-no-booster-route-replay", "minimum-nonclear-drag-proof", "same-route-time-and-three-stars", "stable-interactive-frame-ui", "user-acceptance"],
    issues, measurements,
  };
};
