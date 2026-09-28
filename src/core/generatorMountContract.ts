import { gatePortals, outwardVector, portalMouthCells, directedRailKey } from "./gatePortals";
import { resolveGeneratorMouthTemplate } from "./generatorMouthSpawnGeometry";
import type { GeneratorSpec, LevelSpec, Point, Side } from "./types";

export interface GeneratorMountIssue {
  code: string;
  message: string;
  generatorId: string;
  otherGeneratorId?: string;
  gateId?: string;
  cell?: Point;
}

export interface GeneratorMountBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];
const keyOf = ([x, y]: Point): string => `${x},${y}`;

/**
 * Logical envelope of the existing three-rail machine: one cell outboard and
 * 0.35 cell inset. Kept independent of Canvas/assets; the contract tests compare
 * this geometry with the renderer so sprite geometry drift cannot pass silently.
 */
export const generatorMountBounds = (
  anchor: NonNullable<GeneratorSpec["rimAnchor"]>,
): GeneratorMountBounds => {
  if (anchor.quarterTurns === 0) return { x: anchor.x - 1.5, y: anchor.y - 1, width: 3, height: 1.35 };
  if (anchor.quarterTurns === 1) return { x: anchor.x - 0.35, y: anchor.y - 1.5, width: 1.35, height: 3 };
  if (anchor.quarterTurns === 2) return { x: anchor.x - 1.5, y: anchor.y - 0.35, width: 3, height: 1.35 };
  return { x: anchor.x - 1, y: anchor.y - 1.5, width: 1.35, height: 3 };
};

const intersects = (left: GeneratorMountBounds, right: GeneratorMountBounds): boolean => (
  Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x) > 1e-9
  && Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y) > 1e-9
);

/**
 * Read-only mounting check, deliberately separate from cargo occupancy. Two
 * machines may compete for overlapping future spawn footprints, but may never
 * share physical rails or overlap their machine bodies.
 */
export const auditGeneratorMounts = (level: LevelSpec): GeneratorMountIssue[] => {
  if (!level.generators?.length) return [];
  const issues: GeneratorMountIssue[] = [];
  const explicitPlayable = level.playable ? new Set(level.playable.map(keyOf)) : undefined;
  const blocked = new Set((level.blocked ?? []).map(keyOf));
  const playable = ([x, y]: Point): boolean => (
    Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x < level.width && y < level.height
    && (!explicitPlayable || explicitPlayable.has(keyOf([x, y]))) && !blocked.has(keyOf([x, y]))
  );
  // Only exterior-connected void is a mounting edge. An internal wall/hole or
  // a seam between two playable cells is not an external machine location.
  const exterior = new Set<string>();
  if (Number.isInteger(level.width) && level.width > 0 && Number.isInteger(level.height) && level.height > 0) {
    const pending: Point[] = [[-1, -1]];
    exterior.add("-1,-1");
    for (let index = 0; index < pending.length; index += 1) {
      const [x, y] = pending[index];
      for (const cell of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Point[]) {
        if (cell[0] < -1 || cell[1] < -1 || cell[0] > level.width || cell[1] > level.height) continue;
        const key = keyOf(cell);
        if (exterior.has(key) || playable(cell)) continue;
        exterior.add(key);
        pending.push(cell);
      }
    }
  }
  const exitRails = new Map<string, string>();
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (const portal of gatePortals(level, gate)) {
      // Malformed gates are diagnosed by their own constructor validation.
      if (!Number.isInteger(portal.size) || portal.size <= 0) continue;
      for (const cell of portalMouthCells(portal)) exitRails.set(directedRailKey(cell, portal.side), gate.id);
    }
  }
  const occupiedRails = new Map<string, string>();
  const occupiedBounds: Array<{ generatorId: string; bounds: GeneratorMountBounds }> = [];
  for (const generator of level.generators) {
    const add = (code: string, message: string, details: Partial<GeneratorMountIssue> = {}): void => {
      issues.push({ code, message, generatorId: generator.id, ...details });
    };
    if (generator.rimSpan !== undefined && generator.rimSpan !== 3) {
      add("generator-rim-span", "A generator requires exactly three mounting rails.");
    }
    if (generator.rimMount !== undefined && generator.rimMount !== "rim") {
      add("generator-rim-mount", "Revised generators must replace exposed rim rails, not float outboard.");
    }
    if (!SIDES.includes(generator.side) || !Number.isInteger(generator.offset)) {
      add("generator-rim-geometry", "Generator side and offset must identify a grid-aligned mounting edge.");
      continue;
    }
    const template = resolveGeneratorMouthTemplate(generator, level);
    if (template.status !== "ok") {
      add("generator-rim-geometry", template.reason);
      continue;
    }
    const { rimAnchor, mouthCells } = template;
    const side = SIDES[rimAnchor.quarterTurns];
    const expectedOffset = side === "top" || side === "bottom" ? rimAnchor.x - 0.5 : rimAnchor.y - 0.5;
    if (generator.side !== side || generator.offset !== expectedOffset) {
      add("generator-rim-direction", "Generator side/offset must agree with the actual rim anchor and inward mouth direction.");
    }
    const [dx, dy] = outwardVector(side);
    for (const cell of mouthCells) {
      const outward: Point = [cell[0] + dx, cell[1] + dy];
      if (!playable(cell) || !exterior.has(keyOf(outward))) {
        add("generator-rim-not-exposed", "Every machine rail must border playable floor and exterior-connected void.", { cell });
      }
      const rail = directedRailKey(cell, side);
      const gateId = exitRails.get(rail);
      if (gateId !== undefined) add("generator-exit-overlap", "A generator rail overlaps an exit, including closed, frozen or star exits.", { gateId, cell });
      const otherGeneratorId = occupiedRails.get(rail);
      if (otherGeneratorId !== undefined) add("generator-rail-overlap", "Two machines cannot share a mounting rail.", { otherGeneratorId, cell });
      else occupiedRails.set(rail, generator.id);
    }
    const bounds = generatorMountBounds(rimAnchor);
    for (const occupied of occupiedBounds) {
      if (intersects(bounds, occupied.bounds)) {
        add("generator-body-overlap", "Machine body envelopes overlap even if their directed rails differ.", { otherGeneratorId: occupied.generatorId });
      }
    }
    occupiedBounds.push({ generatorId: generator.id, bounds });
  }
  return issues;
};
