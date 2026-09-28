import { validateGeneratorMouthSpawn } from "./generatorMouthSpawnGeometry";
import { auditGeneratorMounts } from "./generatorMountContract";
import { usesRevisedMechanisms } from "./mechanismRules";
import { auditOrdinaryShutterCoverage } from "./shutterCoverage";
import { shutterHasPhysicalFootprint, type LevelSpec, type Point, type ShutterSpec } from "./types";

export interface RevisedMechanismContractIssue {
  levelId: number;
  code: string;
  message: string;
  blockId?: string;
  generatorId?: string;
  otherGeneratorId?: string;
  gateId?: string;
  elevatorId?: string;
  conveyorId?: string;
  shutterId?: string;
  otherShutterId?: string;
  cell?: Point;
}

const keyOf = ([x, y]: Point): string => `${x},${y}`;
const validRectangle = (region: ShutterSpec): boolean => (
  [region.x, region.y, region.width, region.height].every(Number.isInteger)
  && region.width > 0 && region.height > 0
);
const regionContains = (region: ShutterSpec, [x, y]: Point): boolean => (
  x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height
);

/**
 * Opt-in construction checks for isolated revised-mechanism scenes.
 * This is not a generation or solvability certificate: original board design,
 * unique exit colors, difficulty and external cover-unlock paths belong to that
 * layer. Machine mounting is checked without importing generated data or UI.
 * Optional rimSpan/rimMount metadata is not required by these runtime checks.
 */
export const auditRevisedMechanismContract = (level: LevelSpec): RevisedMechanismContractIssue[] => {
  if (!usesRevisedMechanisms(level)) return [];
  const issues: RevisedMechanismContractIssue[] = [];
  const add = (code: string, message: string, details: Partial<RevisedMechanismContractIssue> = {}): void => {
    issues.push({ levelId: level.id, code, message, ...details });
  };
  const blocks = new Map(level.blocks.map((block) => [block.id, block]));
  const playable = level.playable ? new Set(level.playable.map(keyOf)) : undefined;
  const blocked = new Set((level.blocked ?? []).map(keyOf));
  const isPlayable = ([x, y]: Point): boolean => (
    Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && x < level.width && y >= 0 && y < level.height
    && (!playable || playable.has(keyOf([x, y]))) && !blocked.has(keyOf([x, y]))
  );

  for (const elevator of level.elevators ?? []) {
    add("legacy-moving-elevator", "Revised lifts reveal a fixed region; moving platform elevators are not approved.", { elevatorId: elevator.id });
  }
  for (const conveyor of level.conveyors ?? []) {
    add("legacy-conveyor", "Legacy conveyors have no approved revised-mechanism mapping.", { conveyorId: conveyor.id });
  }
  for (const block of level.blocks) if (block.rotationBadge) {
    add("legacy-rotation-badge", "Rotation metadata is not a revised axis-movement mechanism.", { blockId: block.id });
  }

  if (level.coloredGrids?.length) {
    for (const block of level.blocks) if ((block.layers?.length ?? 1) > 1) {
      add("colored-grid-shell", "A colored-grid level cannot contain a shell, including hidden or queued blocks.", { blockId: block.id });
    }
  }

  for (const generator of level.generators ?? []) {
    if (generator.trigger === "time") {
      add("timed-generator", "Revised generators release from vacant footprints, not wall-clock time.", { generatorId: generator.id });
    }
    if (generator.intervalSeconds !== undefined || generator.initialDelaySeconds !== undefined) {
      add("generator-clock-metadata", "Revised generators have no timed interval or initial delay.", { generatorId: generator.id });
    }
    for (const blockId of generator.queueBlockIds) {
      const block = blocks.get(blockId);
      if (!block) {
        add("missing-queued-block", "Generator queue references a missing block.", { generatorId: generator.id, blockId });
        continue;
      }
      if ((block.frozen ?? 0) > 0) add("queued-ice", "Generator cargo cannot carry numeric ice.", { generatorId: generator.id, blockId });
      // Current occupants are deliberately absent: a blocked valid mouth must
      // wait at runtime, not become an invalid level or relocate its cargo.
      const placement = validateGeneratorMouthSpawn(generator, generator.spawn, block.shape, level);
      if (placement.status !== "ok") {
        add("generator-mouth-footprint", placement.reason, { generatorId: generator.id, blockId });
      }
    }
  }
  for (const mountIssue of auditGeneratorMounts(level)) issues.push({ levelId: level.id, ...mountIssue });

  const validRegions: ShutterSpec[] = [];
  for (const shutter of level.shutters ?? []) {
    if (shutter.skin === "staging" || shutter.skin === "staged-frame") {
      add("legacy-nonspatial-staging", "Non-spatial staging and staged-frame releases are not revised mechanisms.", { shutterId: shutter.id });
    }
    if (shutter.skin === "generator") {
      add("legacy-generator-shutter", "A countdown-covered generator skin is not a fixed-mouth queue generator.", { shutterId: shutter.id });
    }
    if ((shutter.skin === undefined || shutter.skin === "shutter") && shutter.triggerBlockIds !== undefined) {
      add("shutter-trigger-cohort", "Revised ordinary shutters count all clears and peels, not a named removal cohort.", { shutterId: shutter.id });
    }
    if (!validRectangle(shutter)) {
      add("region-geometry", "Mechanism regions require integer coordinates and positive integer dimensions.", { shutterId: shutter.id });
      continue;
    }
    validRegions.push(shutter);
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!isPlayable([x, y])) add("region-outside-playable", "Mechanism region includes a wall or non-playable cell.", { shutterId: shutter.id, cell: [x, y] });
      }
    }
    if (shutter.skin !== "lift") continue;
    if (shutter.triggerBlockIds !== undefined) {
      add("lift-trigger-cohort", "A revised lift waits for its occupied region to clear, not a named removal cohort.", { shutterId: shutter.id });
    }
    const occupied = new Map<string, string>();
    for (const block of level.blocks.filter((piece) => piece.shutterId === shutter.id)) {
      for (const [dx, dy] of block.shape) {
        const cell: Point = [block.x + dx, block.y + dy];
        if (!regionContains(shutter, cell)) {
          add("lift-hidden-outside-region", "Every hidden lift cell must lie inside its fixed region.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        if (!isPlayable(cell)) {
          add("lift-hidden-outside-playable", "Hidden lift cargo must have a fully playable footprint.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        const key = keyOf(cell);
        const previous = occupied.get(key);
        if (previous !== undefined) {
          add("lift-hidden-overlap", `Hidden lift cohort overlaps ${previous} at ${key}.`, { shutterId: shutter.id, blockId: block.id, cell });
        } else occupied.set(key, block.id);
      }
    }
    // Visible blocks may occupy a lift region; their complete departure is the
    // runtime trigger. They must not be mistaken for illegal cover occupants.
  }

  const validRegionIds = new Set(validRegions.map(({ id }) => id));
  for (const coverage of auditOrdinaryShutterCoverage({
    ...level,
    shutters: (level.shutters ?? []).filter((shutter) => validRegionIds.has(shutter.id)),
  })) {
    // Preserve the existing coverage distinction: an empty reserve is not a
    // footprint mismatch. External advancement/solvability is checked later.
    if (coverage.kind === "missing-hidden-cohort") continue;
    add(`shutter-${coverage.kind}`, `Ordinary shutter coverage: ${coverage.kind}.`, {
      shutterId: coverage.shutterId, blockId: coverage.blockId, cell: coverage.cell,
    });
  }
  const physical = validRegions.filter(shutterHasPhysicalFootprint);
  for (let index = 0; index < physical.length; index += 1) {
    const left = physical[index];
    for (const right of physical.slice(index + 1)) {
      const x = Math.max(left.x, right.x);
      const y = Math.max(left.y, right.y);
      if (x < Math.min(left.x + left.width, right.x + right.width)
        && y < Math.min(left.y + left.height, right.y + right.height)) {
        add("physical-shutter-overlap", "Closed physical shutters cannot overlap.", {
          shutterId: left.id, otherShutterId: right.id, cell: [x, y],
        });
      }
    }
  }
  return issues;
};

export const assertRevisedMechanismContract = (level: LevelSpec): void => {
  const issues = auditRevisedMechanismContract(level);
  if (!issues.length) return;
  const first = issues[0];
  const owner = first.generatorId ?? first.shutterId ?? first.blockId ?? first.elevatorId ?? first.conveyorId;
  throw new Error(`Level ${level.id}: revised mechanism ${first.code}${owner ? ` (${owner})` : ""}: ${first.message}`);
};
