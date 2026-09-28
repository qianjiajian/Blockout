import { PuzzleModel } from "../src/core/PuzzleModel.ts";
import { matchingPortalForExitFrontier } from "../src/core/blockExitFrontier.ts";
import { COLORS } from "../src/core/types.ts";

export const FIRST_EXIT_OBLIGATIONS_VERSION = "revised-first-exit-obligations-v2";
const profile = "revised-2026-09-21-v1.2";
const sides = ["top", "right", "bottom", "left"];
const integer = (value) => Number.isSafeInteger(value);
const point = (value) => Array.isArray(value) && value.length === 2 && value.every(integer);
const key = ([x, y]) => `${x},${y}`;
const cells = (block) => block.shape.map(([x, y]) => [block.x + x, block.y + y]);
const none = (value) => value === undefined || (Array.isArray(value) && value.length === 0);
const rectangular = (shape) => {
  if (!Array.isArray(shape) || !shape.length || !shape.every((p) => Array.isArray(p) && p.length === 2 && p.every(integer))) return false;
  const xs = shape.map((p) => p[0]), ys = shape.map((p) => p[1]);
  return new Set(shape.map(key)).size === shape.length
    && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};

/**
 * A narrow structural lower bound, independent of route search. Before either
 * of exactly two ordinary opening carriers exits, the other can supply at most
 * one clear. Every other opening carrier is single-layer and has only a gate
 * frozen above one; every hidden cohort is behind a cover above one. Hence no
 * such carrier can clear and no hidden block can appear before the chosen
 * pivot exits. At that exit's full footprint, each surviving initial occupant
 * must already have been moved by its own non-clearing committed drag.
 *
 * For each ordinary rectangular pivot, enumerate ALL legal exit footprints
 * while removing other pieces and covers as obstacles. This is a superset:
 * taking the minimum obligations over it cannot overstate the lower bound.
 * For a pivot, the intersection of blocker IDs over ALL footprints contains
 * individually mandatory moves. Take the union of those intersections over
 * pivots, deduplicating IDs: all ordinary pivots must eventually exit, and the
 * same prefix invariant applies whichever ordinary pivot exits second. Use
 * the maximum of this union size and the best single-pivot minimum. Never add
 * per-pivot minima or count a shared ID twice. Empty footprint sets contribute
 * nothing, not a vacuous universal intersection. No solvability, clock,
 * Pointer or publication claim is made.
 * `pivot`, `exitFootprints` and `blockers` remain best-single-pivot diagnostic
 * fields; when `boundMethod` is mandatory-blocker-union, its proof evidence is
 * `mandatoryBlockers`, `supportingPivots` and the complete `pivots` array.
 *
 * This MJS module imports TS domain code; use the qualified artifact bundler
 * or Vitest, rather than importing it with an unconfigured bare Node process.
 */
export function certifyFirstExitObligations(level, { floor } = {}) {
  const base = {
    version: FIRST_EXIT_OBLIGATIONS_VERSION, status: "unsupported", floor: floor ?? null,
    thresholdProven: false, lowerBound: null, pivot: null, priorClearUpperBound: null,
    pivots: [], exitFootprints: [], blockers: [], reasons: [],
    bestSinglePivotLowerBound: null, mandatoryUnionLowerBound: null, mandatoryBlockers: [],
    boundMethod: null, supportingPivots: [],
    rulesProfile: level?.mechanismRules ?? null, hashBindingRequired: true,
    solvabilityValidated: false, pointerReplayValidated: false, timeValidated: false, releaseApproved: false,
  };
  const reject = (reason) => ({ ...base, reasons: [reason] });
  if (!integer(floor) || floor < 1) return reject("floor must be a positive safe integer");
  if (!level || level.mechanismRules !== profile || !Array.isArray(level.blocks) || !Array.isArray(level.gates)) return reject("Explicit qualified v1.2 level required");
  if (level.gates.some((gate) => !gate || !COLORS.includes(gate.color))
    || level.blocks.some((block) => !block || !COLORS.includes(block.color))) return reject("Every gate and block color must belong to the supported palette");
  // The model falls back from a nullish outer layer to block.color. Reject
  // malformed layers before classifying carriers by their outer layer, and
  // expand sparse arrays so an absent entry cannot bypass the palette check.
  if (level.blocks.some((block) => block.layers !== undefined && (!Array.isArray(block.layers)
    || !block.layers.length || !Array.from(block.layers).every((color) => COLORS.includes(color))))) return reject("Explicit layers must be a nonempty array of supported palette colors");
  if (!integer(level.width) || !integer(level.height) || level.width < 2 || level.height < 2 || level.width > 64 || level.height > 64) return reject("Board dimensions outside this bounded proof domain");
  if ([level.playable, level.blocked].some((points) => points !== undefined && (!Array.isArray(points) || !points.every(point)))) return reject("Only integer board cells are in this finite enumeration domain");
  if (["generators", "flipDoors", "coloredGrids", "elevators", "conveyors", "seams"].some((name) => !none(level[name]))) return reject("Generator, flip, grid, lift, seam and autonomous mechanisms are outside this proof domain");
  if (level.blocks.some((b) => !b || b.timedBombSeconds !== undefined || b.keyId !== undefined || b.lockedBy !== undefined || b.lockCount !== undefined || b.star || b.movementAxis !== undefined || b.rotationBadge)) return reject("Bomb, key/lock, star, axis or rotation blocks are outside this proof domain");
  if (level.blocks.some((b) => !integer(b.x) || !integer(b.y) || !Array.isArray(b.shape) || !b.shape.length || !b.shape.every(point)
    || (b.frozen !== undefined && (!integer(b.frozen) || b.frozen <= 0)))) return reject("Only integer block geometry and integer freeze countdowns are supported");
  if (level.blocks.some((b) => Math.abs(b.x) > 128 || Math.abs(b.y) > 128
    || b.shape.some((p) => p.some((coordinate) => Math.abs(coordinate) > 64)))) return reject("Block anchors must be within +/-128 and relative shape offsets within +/-64 in this bounded proof domain");
  if (level.gates.some((g) => !g || g.portals !== undefined || g.star || !sides.includes(g.side))) return reject("Only ordinary fixed outer gates with no portals are supported");
  if (level.gates.some((g) => !integer(g.offset) || !integer(g.size) || g.size < 1
    || (g.frozen !== undefined && (!integer(g.frozen) || g.frozen <= 0)))) return reject("Only integer gate geometry and integer freeze countdowns are supported");
  if (level.gates.some((g) => g.offset < 0 || g.offset > 63 || g.size > 64)) return reject("Gate geometry is outside the bounded board domain");
  if (new Set(level.gates.map((g) => g.color)).size !== level.gates.length) return reject("Repeated exit colors could create an alternate clear route");
  if (level.shutters !== undefined && (!Array.isArray(level.shutters) || level.shutters.some((s) => !s || (s.skin !== undefined && s.skin !== "shutter")))) return reject("Only countdown covers are supported");
  if (level.shutters?.some((s) => !integer(s.count) || s.count <= 0 || s.triggerBlockIds !== undefined)) return reject("Only positive integer countdown covers without trigger cohorts are supported");
  if (level.shutters?.some((s) => ![s.x, s.y, s.width, s.height].every(integer)
    || s.x < 0 || s.y < 0 || s.width < 1 || s.height < 1
    || s.width > level.width || s.height > level.height
    || s.x > level.width - s.width || s.y > level.height - s.height)) return reject("Cover geometry must be bounded by the board before model initialization");
  try {
    const initial = new PuzzleModel(structuredClone(level)).snapshot();
    if (initial.queuedBlocks.length || initial.shutters.some((s) => s.revealed)) return reject("The initial state must not auto-dispatch or auto-reveal");
    const ordinaryGates = initial.gates.filter((g) => g.frozen === 0);
    const frozenGates = initial.gates.filter((g) => g.frozen > 0);
    if (ordinaryGates.length !== 2 || !frozenGates.length) return reject("Exactly two ordinary exits and at least one frozen exit are required");
    const opening = initial.blocks.filter((b) => !b.shutterId);
    if (opening.some((b) => b.layers.length !== 1 || b.frozen > 0)) return reject("All opening carriers must be unshelled and uniced");
    const ordinaryColors = new Set(ordinaryGates.map((g) => g.color));
    const frozenColors = new Set(frozenGates.map((g) => g.color));
    const ordinaryCarriers = opening.filter((b) => ordinaryColors.has(b.layers[0]));
    if (ordinaryCarriers.length !== 2 || ordinaryGates.some((g) => ordinaryCarriers.filter((b) => b.layers[0] === g.color).length !== 1)) return reject("Each of the two ordinary exits must have exactly one opening carrier");
    const survivors = opening.filter((b) => !ordinaryColors.has(b.layers[0]));
    if (survivors.some((b) => !frozenColors.has(b.layers[0]))) return reject("Every other opening carrier needs a uniquely colored frozen exit");
    const priorClearUpperBound = 1;
    if (frozenGates.some((g) => g.frozen <= priorClearUpperBound)) return reject("A frozen exit can thaw before the chosen pivot exits");
    if (initial.shutters.some((s) => s.count <= priorClearUpperBound)) return reject("A hidden cohort can reveal before the chosen pivot exits");
    const playable = new Set(initial.playable.map(key));
    for (const p of initial.blocked) playable.delete(key(p));
    const pivots = [];
    for (const pivot of ordinaryCarriers) {
      if (!rectangular(pivot.shape)) continue;
      const xs = pivot.shape.map((p) => p[0]), ys = pivot.shape.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const boundingWidth = maxX - minX + 1, boundingHeight = maxY - minY + 1;
      const gate = ordinaryGates.find((g) => g.color === pivot.layers[0]);
      const exitFootprints = [];
      // Enumerate small board-footprint coordinates, never a caller's offset.
      for (let top = 0; top <= initial.height - boundingHeight; top++) for (let left = 0; left <= initial.width - boundingWidth; left++) {
        const x = left - minX, y = top - minY;
        if (!integer(x) || !integer(y)) continue;
        const footprint = pivot.shape.map(([dx, dy]) => [x + dx, y + dy]);
        if (!footprint.every((p) => point(p) && playable.has(key(p)))) continue;
        const match = matchingPortalForExitFrontier(initial, footprint, gate);
        if (!match) continue;
        const occupied = new Set(footprint.map(key));
        const blockers = survivors.filter((b) => cells(b).some((p) => occupied.has(key(p)))).map((b) => ({
          blockId: b.id, color: b.layers[0], initialCells: cells(b),
          intersectingCells: cells(b).filter((p) => occupied.has(key(p))),
          exitFrozen: frozenGates.find((g) => g.color === b.layers[0]).frozen,
        }));
        exitFootprints.push({ anchor: [x, y], gateId: gate.id, side: gate.side, footprint, blockerCount: blockers.length, blockers });
      }
      // Absence of an exit pose is not a difficulty certificate.
      if (!exitFootprints.length) continue;
      const mandatoryBlockers = exitFootprints[0].blockers.map((b) => b.blockId).filter((id) =>
        exitFootprints.every((pose) => pose.blockers.some((b) => b.blockId === id)));
      pivots.push({ blockId: pivot.id, gateId: gate.id, lowerBound: Math.min(...exitFootprints.map((p) => p.blockerCount)),
        mandatoryBlockers, exitFootprints });
    }
    if (!pivots.length) return reject("No ordinary rectangular pivot has a legal empty-board exit footprint");
    const best = pivots.reduce((a, b) => b.lowerBound > a.lowerBound ? b : a);
    const mandatoryBlockers = [...new Set(pivots.flatMap((pivot) => pivot.mandatoryBlockers))];
    const mandatoryUnionLowerBound = mandatoryBlockers.length;
    const lowerBound = Math.max(best.lowerBound, mandatoryUnionLowerBound);
    const useUnion = mandatoryUnionLowerBound > best.lowerBound;
    const thresholdProven = lowerBound >= floor;
    return { ...base, status: thresholdProven ? "threshold-proven" : "unproven", thresholdProven,
      lowerBound, pivot: best.blockId, priorClearUpperBound, pivots,
      bestSinglePivotLowerBound: best.lowerBound, mandatoryUnionLowerBound, mandatoryBlockers,
      boundMethod: useUnion ? "mandatory-blocker-union" : "single-pivot-minimum",
      supportingPivots: useUnion ? pivots.filter((pivot) => pivot.mandatoryBlockers.length).map((pivot) => pivot.blockId) : [best.blockId],
      exitFootprints: best.exitFootprints, blockers: [...new Set(best.exitFootprints.flatMap((p) => p.blockers.map((b) => b.blockId)))],
      reasons: [thresholdProven
        ? useUnion
          ? "The deduplicated union of each ordinary pivot's all-exit blocker intersection contains at least floor distinct surviving carriers; each must make a non-clearing drag before its mandatory pivot exits."
          : "Every possible full-footprint exit of a mandatory ordinary pivot requires at least floor distinct surviving opening carriers to move first; each move is a non-clearing drag."
        : "Neither the best single-pivot minimum nor the deduplicated union of all-exit mandatory blocker intersections proves the requested threshold."],
    };
  } catch (error) {
    return reject(`Invalid or unsupported model input: ${error instanceof Error ? error.message : String(error)}`);
  }
}
