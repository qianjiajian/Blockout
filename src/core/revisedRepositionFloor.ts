import { PuzzleModel } from "./PuzzleModel";
import type { GatePortalSpec, GateSpec, LevelSpec, Point, PuzzleSnapshot, Side } from "./types";
import { boardCellsSeparatedBySeam } from "./boardSeams";
import { replayRevisedRoute, searchRevisedLevel } from "./revisedLevelSearch";

export interface RevisedRepositionDrag {
  blockId: string;
  path: Point[];
  exitSide?: Side;
}

export interface RevisedRepositionFloorOptions {
  floor: number;
  maxStates?: number;
  maxDragStates?: number;
  maxTransitions?: number;
  maxMilliseconds?: number;
}

export interface RevisedRepositionFloorResult {
  status: "threshold-proven" | "relaxed-shortcut" | "unknown" | "unsupported" | "invalid";
  termination: "below-threshold-exhausted" | "relaxed-completion" | "max-states"
    | "max-drag-states" | "max-transitions" | "deadline" | "unsupported" | "invalid";
  floor: number;
  thresholdProven: boolean;
  abstraction: "optional-exit-unit-step-gesture-superset-v1" | "seam-chambers-composition-v1";
  /** This is not a portable certificate until the caller binds input/rule/tool hashes. */
  hashBindingRequired: true;
  solvabilityValidated: false;
  pointerReplayValidated: false;
  timeValidated: false;
  releaseApproved: false;
  exploredStates: number;
  discoveredStates: number;
  attemptedTransitions: number;
  improvedStateCosts: number;
  relaxedNonClearingDrags?: number;
  relaxedRoute?: RevisedRepositionDrag[];
  composition?: { componentCount: number; componentFloorSum: number; componentFloors: number[] };
  reasons: string[];
}

/**
 * A proof for a level made of physically disconnected, seam-separated
 * chambers.  This is deliberately a separate certificate from the ordinary
 * global 0-1 search: each chamber is solved on its own exact LevelSpec and
 * the resulting lower bounds are summed only when no cross-chamber state can
 * change (no counters, doors, queues or other global mechanisms).
 */
export interface RevisedIndependentComponentProof {
  componentIndex: number;
  bounds: { minX: number; minY: number; width: number; height: number };
  blockIds: string[];
  lowerBound: number;
  atomic: RevisedRepositionFloorResult;
}

export interface RevisedIndependentFloorResult {
  status: "threshold-proven" | "unknown" | "unsupported" | "invalid" | "not-applicable";
  termination: RevisedRepositionFloorResult["termination"] | "not-applicable";
  floor: number;
  thresholdProven: boolean;
  abstraction: "static-seam-component-sum-v1";
  hashBindingRequired: true;
  solvabilityValidated: false;
  pointerReplayValidated: false;
  timeValidated: false;
  releaseApproved: false;
  componentFloorSum: number;
  components: RevisedIndependentComponentProof[];
  route?: RevisedRepositionDrag[];
  replay?: { valid: boolean; complete: boolean; effectiveDrags: number; nonClearingDrags: number; clearEvents: number; error?: string };
  reasons: string[];
}

const STEPS: readonly Point[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

const stateKey = (snapshot: PuzzleSnapshot): string => {
  const { moves: _moves, ...state } = snapshot;
  return JSON.stringify(state);
};

interface Node {
  model: PuzzleModel;
  key: string;
  cost: number;
  parent: number;
  drag?: RevisedRepositionDrag;
}

class BudgetReached extends Error {
  constructor(readonly reason: "max-states" | "max-drag-states" | "max-transitions" | "deadline") {
    super(reason);
  }
}

const positiveInteger = (value: number | undefined, fallback: number, label: string): number => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1) throw new Error(`${label} must be a positive safe integer.`);
  return result;
};

/**
 * A LOWER-BOUND relaxation, deliberately separate from the restricted pointer
 * witness search. All UI grid steps/turns and successful exits are included;
 * exit contact is optional and all eligible sides are available, so this graph
 * can have routes that no real pointer can execute. Animation/grab restrictions
 * are also relaxed. It never establishes actual solvability from such a route.
 *
 * One held-block closure retains the complete authoritative world after each
 * step (including deterministic reveal/FIFO dispatch). A committed gesture is
 * cost 1 iff it clears neither a body nor a shell; clear/peel gestures cost 0.
 * 0-1 BFS exhausts ALL states below the requested floor, including zero-cost
 * successors. Interrupted inner closures or outer search are always unknown.
 *
 * Timing-dependent mechanisms are refused in this qualification. In v1.4,
 * no boosters are offered, so time-freeze does not add any action. v1.4 flip
 * doors are refused: immediate headless completion need not contain every GUI
 * interleaving while departure animations are pending. With no flip doors,
 * v1.4 registers no pending departure events and retains the spatial transition
 * semantics exercised by this checker. No
 * input is edited and no timers are advanced. Main level-time feasibility and
 * all pointer/three-star/release gates remain separate. Undo/cancel add no
 * new spatial states in this supported domain: restored excursions can be
 * erased from a nonnegative-cost path. Hash binding belongs to the caller.
 */
export const checkRevisedRepositionFloor = (
  level: LevelSpec,
  options: RevisedRepositionFloorOptions,
): RevisedRepositionFloorResult => {
  const result: RevisedRepositionFloorResult = {
    status: "unknown", termination: "below-threshold-exhausted", floor: options.floor,
    thresholdProven: false, abstraction: "optional-exit-unit-step-gesture-superset-v1",
    hashBindingRequired: true, solvabilityValidated: false, pointerReplayValidated: false,
    timeValidated: false, releaseApproved: false, exploredStates: 0, discoveredStates: 0,
    attemptedTransitions: 0, improvedStateCosts: 0, reasons: [],
  };
  if (level.dailyProof?.kind === "seam-chambers-v1") {
    const composed = checkRevisedIndependentSeamFloor(level, options);
    if (composed.status === "not-applicable") {
      return { ...result, status: "unsupported", termination: "unsupported", abstraction: "seam-chambers-composition-v1", reasons: composed.reasons };
    }
    return {
      ...result,
      status: composed.status === "threshold-proven" ? "threshold-proven" : composed.status,
      termination: composed.termination === "not-applicable" ? "unsupported" : composed.termination,
      thresholdProven: composed.thresholdProven,
      abstraction: "seam-chambers-composition-v1",
      exploredStates: composed.components.reduce((sum, component) => sum + component.atomic.exploredStates, 0),
      discoveredStates: composed.components.reduce((sum, component) => sum + component.atomic.discoveredStates, 0),
      attemptedTransitions: composed.components.reduce((sum, component) => sum + component.atomic.attemptedTransitions, 0),
      relaxedNonClearingDrags: composed.componentFloorSum,
      relaxedRoute: composed.route,
      composition: {
        componentCount: composed.components.length,
        componentFloorSum: composed.componentFloorSum,
        componentFloors: composed.components.map((component) => component.lowerBound),
      },
      reasons: composed.reasons,
    };
  }
  const unsupported: string[] = [];
  if (!["revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.4", "revised-2026-09-27-v1.5"].includes(level.mechanismRules ?? "")) {
    unsupported.push("Only explicitly qualified revised profiles are supported.");
  }
  // A daily marker may contain one already-open flip door in an otherwise
  // isolated chamber.  Its route has no competing departure to interleave;
  // closed/frozen doors remain outside this lower-bound qualification.
  if (["revised-2026-09-23-v1.4", "revised-2026-09-27-v1.5"].includes(level.mechanismRules ?? "")
    && level.flipDoors?.some((door) => !door.initiallyOpen || (door.frozen ?? 0) > 0)) {
    unsupported.push("Closed or frozen flip-door animation interleavings are not qualified for this bound tool.");
  }
  // A bomb marker with a deadline beyond the authored level clock cannot
  // expire during any time-feasible run.  The bound/replay tools still do not
  // validate elapsed time; they only avoid falsely rejecting this isolated,
  // inert timer.  Shorter deadlines remain unsupported.
  if (level.blocks.some((block) => block.timedBombSeconds !== undefined
    && block.timedBombSeconds <= level.timeSeconds)) {
    unsupported.push("Bomb clocks are not yet qualified for this bound tool.");
  }
  if (level.generators?.some((generator) => generator.trigger === "time"
    || generator.intervalSeconds !== undefined || generator.initialDelaySeconds !== undefined)) unsupported.push("Clock-driven generators are unsupported.");
  if (level.elevators?.length || level.conveyors?.length) unsupported.push("Legacy autonomous platforms/conveyors are unsupported.");
  if (level.blocks.some((block) => block.rotationBadge)) unsupported.push("Legacy rotation metadata is unsupported.");
  if (level.shutters?.some((cover) => cover.skin === "staging" || cover.skin === "staged-frame" || cover.skin === "generator")) {
    unsupported.push("Legacy nonspatial staging/generator covers are unsupported.");
  }
  if (unsupported.length) return { ...result, status: "unsupported", termination: "unsupported", reasons: unsupported };
  try {
    const floor = positiveInteger(options.floor, 0, "floor");
    const maxStates = positiveInteger(options.maxStates, 5000, "maxStates");
    const maxDragStates = positiveInteger(options.maxDragStates, 1000, "maxDragStates");
    const maxTransitions = positiveInteger(options.maxTransitions, 250000, "maxTransitions");
    const milliseconds = positiveInteger(options.maxMilliseconds, 5000, "maxMilliseconds");
    const deadline = Date.now() + milliseconds;
    const checkDeadline = (): void => { if (Date.now() >= deadline) throw new BudgetReached("deadline"); };
    const spend = (): void => {
      checkDeadline();
      if (result.attemptedTransitions >= maxTransitions) throw new BudgetReached("max-transitions");
      result.attemptedTransitions += 1;
    };
    const initial = new PuzzleModel(structuredClone(level));
    initial.startCountdown();
    const initialKey = stateKey(initial.snapshot());
    const nodes: Node[] = [{ model: initial, key: initialKey, cost: 0, parent: -1 }];
    const distances = new Map<string, number>([[initialKey, 0]]);
    // Integer-index deque: push-front zero-cost, push-back unit-cost. Stale
    // higher-cost entries are retained in the deque but never expanded.
    const deque = new Map<number, number>([[0, 0]]);
    let front = 0, back = 1;
    result.discoveredStates = 1;
    const routeTo = (index: number): RevisedRepositionDrag[] => {
      const route: RevisedRepositionDrag[] = [];
      while (nodes[index].parent >= 0) {
        route.push(nodes[index].drag!);
        index = nodes[index].parent;
      }
      return route.reverse();
    };
    const enqueue = (parent: number, drag: RevisedRepositionDrag): void => {
      // clone() intentionally loses pending action history. Replay from the
      // committed parent so a return-to-origin reveal still commits once.
      const model = nodes[parent].model.clone();
      const before = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) {
        spend();
        if (!model.moveBlockStep(drag.blockId, x, y)) throw new Error("Relaxed gesture replay rejected a step.");
      }
      if (drag.exitSide) {
        spend();
        if (!model.tryExit(drag.blockId, drag.exitSide).ok) throw new Error("Relaxed gesture replay rejected an exit.");
      }
      if (!model.commitAction()) throw new Error("Relaxed gesture had no effective mutation.");
      const after = model.snapshot();
      if (after.failed || after.moves !== before.moves + 1 || after.cleared < before.cleared) throw new Error("Invalid relaxed gesture state.");
      const edgeCost = Number(after.cleared === before.cleared);
      const cost = nodes[parent].cost + edgeCost;
      if (cost >= floor) return;
      const key = stateKey(after);
      const prior = distances.get(key);
      if (prior !== undefined && prior <= cost) return;
      if (prior === undefined && distances.size >= maxStates) throw new BudgetReached("max-states");
      if (prior !== undefined) result.improvedStateCosts += 1;
      distances.set(key, cost);
      result.discoveredStates = distances.size;
      nodes.push({ model, key, cost, parent, drag });
      const index = nodes.length - 1;
      if (edgeCost === 0) deque.set(--front, index);
      else deque.set(back++, index);
    };
    while (front < back) {
      checkDeadline();
      const parent = deque.get(front)!;
      deque.delete(front++);
      const node = nodes[parent];
      if (distances.get(node.key) !== node.cost) continue;
      result.exploredStates += 1;
      if (node.model.snapshot().complete) return {
        ...result, status: "relaxed-shortcut", termination: "relaxed-completion",
        relaxedNonClearingDrags: node.cost, relaxedRoute: routeTo(parent),
        reasons: ["A completion below the floor exists only in the relaxed graph; actual difficulty/solvability requires independent pointer and time validation."],
      };
      for (const selected of node.model.snapshot().blocks) {
        if (!node.model.isBlockActive(selected)) continue;
        const inner: Array<{ model: PuzzleModel; path: Point[] }> = [{ model: node.model, path: [] }];
        const innerSeen = new Set([node.key]);
        for (let cursor = 0; cursor < inner.length; cursor += 1) {
          checkDeadline();
          const current = inner[cursor];
          const held = current.model.getBlock(selected.id);
          if (!held) throw new Error("Held block disappeared without an exit.");
          if (current.path.length) enqueue(parent, { blockId: held.id, path: current.path });
          // Do not stop on a matching gate: optional contact is the crucial
          // super-set relaxation of all grab points and pointer-up snapping.
          for (const side of SIDES) {
            spend();
            if (current.model.exitAttemptStatus(held.id, side) === "ok") enqueue(parent, { blockId: held.id, path: current.path, exitSide: side });
          }
          for (const [dx, dy] of STEPS) {
            spend();
            const next = current.model.clone();
            next.beginAction();
            const target: Point = [held.x + dx, held.y + dy];
            if (!next.moveBlockStep(held.id, ...target)) continue;
            const key = stateKey(next.snapshot());
            if (innerSeen.has(key)) continue;
            if (innerSeen.size >= maxDragStates) throw new BudgetReached("max-drag-states");
            innerSeen.add(key);
            inner.push({ model: next, path: [...current.path, target] });
          }
        }
      }
    }
    return { ...result, status: "threshold-proven", thresholdProven: true,
      reasons: ["All relaxed states of cost strictly below the floor were exhausted without completion. This proves only the threshold; it does not prove the level solvable or approved."],
    };
  } catch (error) {
    if (error instanceof BudgetReached) return { ...result, status: "unknown", termination: error.reason,
      reasons: ["Search interrupted before complete below-threshold exhaustion; no bound was certified."],
    };
    return { ...result, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)] };
  }
};

const componentKey = ([x, y]: Point): string => `${x},${y}`;

const translatePoint = ([x, y]: Point, minX: number, minY: number): Point => [x - minX, y - minY];

const gatePortals = (gate: GateSpec, width: number, height: number): GatePortalSpec[] => {
  if (gate.portals?.length) return gate.portals.map((portal) => ({ ...portal, origin: [...portal.origin] as Point }));
  const origin: Point = gate.side === "left" ? [0, gate.offset]
    : gate.side === "right" ? [width - 1, gate.offset]
      : gate.side === "top" ? [gate.offset, 0] : [gate.offset, height - 1];
  return [{ side: gate.side, origin, size: gate.size }];
};

const translatedGate = (
  gate: GateSpec,
  width: number,
  height: number,
  minX: number,
  minY: number,
): GateSpec => {
  const portals = gatePortals(gate, width, height).map((portal) => ({
    ...portal,
    origin: translatePoint(portal.origin, minX, minY),
  }));
  const first = portals[0];
  return {
    ...gate,
    offset: first.side === "left" || first.side === "right" ? first.origin[1] : first.origin[0],
    portals,
  };
};

/** Translate a rectangular shutter into a component-local coordinate space. */
const translatedShutter = (
  shutter: NonNullable<LevelSpec["shutters"]>[number],
  minX: number,
  minY: number,
): NonNullable<LevelSpec["shutters"]>[number] => ({
  ...shutter,
  x: shutter.x - minX,
  y: shutter.y - minY,
  // Block ids are intentionally preserved inside an atomic component.  The
  // containing block records are copied below with the same ids, so hidden
  // batches and exact trigger cohorts remain referentially intact.
  triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
});

/** Translate one generator while preserving side, queue order, and spawn. */
const translatedGenerator = (
  generator: NonNullable<LevelSpec["generators"]>[number],
  minX: number,
  minY: number,
): NonNullable<LevelSpec["generators"]>[number] => ({
  ...generator,
  offset: generator.side === "top" || generator.side === "bottom"
    ? generator.offset - minX : generator.offset - minY,
  spawn: translatePoint(generator.spawn, minX, minY),
  rimAnchor: generator.rimAnchor ? {
    ...generator.rimAnchor,
    x: generator.rimAnchor.x - minX,
    y: generator.rimAnchor.y - minY,
  } : undefined,
  queueBlockIds: [...generator.queueBlockIds],
});

/** Translate a flip door without dropping its initial open/closed state. */
const translatedFlipDoor = (
  door: NonNullable<LevelSpec["flipDoors"]>[number],
  width: number,
  height: number,
  minX: number,
  minY: number,
): NonNullable<LevelSpec["flipDoors"]>[number] => ({
  ...translatedGate(door, width, height, minX, minY),
  initiallyOpen: door.initiallyOpen,
});

const seamComponents = (level: LevelSpec): Point[][] => {
  const playable = level.playable ?? Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => [x, y] as Point)
  )).flat();
  const allowed = new Set(playable.map(componentKey));
  const visited = new Set<string>();
  const components: Point[][] = [];
  for (const start of playable) {
    const startKey = componentKey(start);
    if (visited.has(startKey)) continue;
    const component: Point[] = [];
    const queue: Point[] = [start];
    visited.add(startKey);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const next of [[current[0] + 1, current[1]], [current[0] - 1, current[1]],
        [current[0], current[1] + 1], [current[0], current[1] - 1]] as Point[]) {
        const key = componentKey(next);
        if (!allowed.has(key) || visited.has(key) || boardCellsSeparatedBySeam(level, current, next)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
};

const hasIndependentGlobalMechanism = (level: LevelSpec): string | undefined => {
  if (!level.seams?.length) return "No board seams were authored.";
  const marker = level.dailyProof?.marker;
  const inMarker = (x: number, y: number): boolean => Boolean(marker && y >= marker.yStart && y < marker.yStart + marker.height);
  const markerOnlyPoints = (points: readonly Point[]): boolean => points.length > 0 && points.every(([x, y]) => inMarker(x, y));
  if (level.flipDoors?.length && !marker) return "Flip doors toggle globally and are not component-separable.";
  if (level.flipDoors?.some((door) => !markerOnlyPoints(gatePortals(door, level.width, level.height).flatMap((portal) => Array.from({ length: portal.size }, (_, index) => portal.side === "left" || portal.side === "right" ? [portal.origin[0], portal.origin[1] + index] as Point : [portal.origin[0] + index, portal.origin[1]] as Point))))) return "A flip door crosses outside the isolated marker chamber.";
  if (level.coloredGrids?.length && level.coloredGrids.some((grid) => !markerOnlyPoints(grid.cells))) return "Colored grids cross the component proof boundary.";
  if (level.shutters?.length && (!marker || level.shutters.some((shutter) => !inMarker(shutter.x, shutter.y) || !inMarker(shutter.x + shutter.width - 1, shutter.y + shutter.height - 1)))) return "Shutters have cross-clear/reveal state outside the isolated marker.";
  if (level.generators?.length && (!marker || level.generators.some((generator) => !inMarker(generator.spawn[0], generator.spawn[1])))) return "Generators have cross-clear/reveal state outside the isolated marker.";
  if (level.elevators?.length || level.conveyors?.length) return "Autonomous platforms are not component-separable.";
  if (level.blocks.some((block) => (block.frozen !== undefined || block.keyId || block.lockedBy || block.timedBombSeconds !== undefined)
    && (!marker || block.y < marker.yStart || block.y >= marker.yStart + marker.height))) return "Frozen, key-locked and timed blocks are excluded outside the isolated marker.";
  if (level.gates.some((gate) => gate.frozen !== undefined && (!marker || gate.offset < marker.yStart || gate.offset >= marker.yStart + marker.height))) return "Frozen gates have global clear countdown semantics outside the isolated marker.";
  if (level.rocketRescue || level.pulseRescue || level.strategyNudge || level.strategyFocus) {
    return "Rescue/strategy triggers are excluded from the static component sum.";
  }
  return undefined;
};

/**
 * Qualify a static seam-separated board by proving each chamber independently
 * and adding the exact lower bounds.  The composition is sound only for the
 * deliberately narrow static domain checked above; dynamic/global mechanics
 * return `unsupported` instead of being approximated.
 */
export const checkRevisedIndependentSeamFloor = (
  level: LevelSpec,
  options: RevisedRepositionFloorOptions,
): RevisedIndependentFloorResult => {
  const base: RevisedIndependentFloorResult = {
    status: "not-applicable", termination: "not-applicable", floor: options.floor,
    thresholdProven: false, abstraction: "static-seam-component-sum-v1", hashBindingRequired: true,
    solvabilityValidated: false, pointerReplayValidated: false, timeValidated: false, releaseApproved: false,
    componentFloorSum: 0, components: [], reasons: [],
  };
  const unsupported = hasIndependentGlobalMechanism(level);
  if (unsupported) return { ...base, status: level.seams?.length ? "unsupported" : "not-applicable", termination: level.seams?.length ? "unsupported" : "not-applicable", reasons: [unsupported] };
  const components = seamComponents(level).filter((component) => {
    const keys = new Set(component.map(componentKey));
    return level.blocks.some((block) => block.shape.every(([dx, dy]) => keys.has(`${block.x + dx},${block.y + dy}`)));
  });
  if (components.length < 2) return { ...base, reasons: ["At least two non-empty seam-separated components are required."] };

  const componentOfCell = new Map<string, number>();
  components.forEach((component, index) => component.forEach((point) => componentOfCell.set(componentKey(point), index)));
  const blockComponents = level.blocks.map((block) => new Set(block.shape.map(([dx, dy]) => componentOfCell.get(`${block.x + dx},${block.y + dy}`))));
  if (blockComponents.some((owners) => owners.size !== 1 || owners.has(undefined))) {
    return { ...base, status: "invalid", termination: "invalid", reasons: ["A block crosses a seam or lies outside the seam components."] };
  }
  // Flip doors are exits too.  Treat them as gate records for seam ownership
  // so an isolated initially-open door can be proved in its own chamber rather
  // than incorrectly reported as a component with no boundary gate.
  const allGateRecords: Array<GateSpec & { initiallyOpen?: boolean }> = [
    ...level.gates,
    ...(level.flipDoors ?? []),
  ];
  const gateComponents = allGateRecords.map((gate) => new Set(gatePortals(gate, level.width, level.height).flatMap((portal) => {
    const points: Point[] = [];
    for (let index = 0; index < portal.size; index += 1) {
      points.push(portal.side === "left" || portal.side === "right"
        ? [portal.origin[0], portal.origin[1] + index]
        : [portal.origin[0] + index, portal.origin[1]]);
    }
    return points.map((point) => componentOfCell.get(componentKey(point)));
  })));
  if (gateComponents.some((owners) => owners.size !== 1 || owners.has(undefined))) {
    return { ...base, status: "invalid", termination: "invalid", reasons: ["A gate mouth crosses a seam or lies outside the seam components."] };
  }

  const proofs: RevisedIndependentComponentProof[] = [];
  const combinedRoute: RevisedRepositionDrag[] = [];
  try {
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      const componentKeys = new Set(component.map(componentKey));
      const minX = Math.min(...component.map(([x]) => x));
      const minY = Math.min(...component.map(([, y]) => y));
      const maxX = Math.max(...component.map(([x]) => x));
      const maxY = Math.max(...component.map(([, y]) => y));
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const blocks = level.blocks.filter((block) => block.shape.every(([dx, dy]) => componentKeys.has(`${block.x + dx},${block.y + dy}`)))
        .map((block) => ({ ...block, x: block.x - minX, y: block.y - minY, shape: block.shape.map(([x, y]) => [x, y] as Point) }));
      const gates = level.gates.filter((gate) => gatePortals(gate, level.width, level.height).every((portal) => {
        const [px, py] = portal.origin;
        for (let index = 0; index < portal.size; index += 1) {
          const point: Point = portal.side === "left" || portal.side === "right" ? [px, py + index] : [px + index, py];
          if (!componentKeys.has(componentKey(point))) return false;
        }
        return true;
      })).map((gate) => translatedGate(gate, level.width, level.height, minX, minY));
      const flipDoors = (level.flipDoors ?? []).filter((door) => gatePortals(door, level.width, level.height).every((portal) => {
        const [px, py] = portal.origin;
        for (let index = 0; index < portal.size; index += 1) {
          const point: Point = portal.side === "left" || portal.side === "right" ? [px, py + index] : [px + index, py];
          if (!componentKeys.has(componentKey(point))) return false;
        }
        return true;
      })).map((door) => translatedFlipDoor(door, level.width, level.height, minX, minY));
      if (!gates.length && !flipDoors.length) throw new Error(`Component ${componentIndex} has no complete boundary gate.`);
      const playable = component.map((point) => translatePoint(point, minX, minY));
      const blocked = (level.blocked ?? []).filter(([x, y]) => componentKeys.has(`${x},${y}`)).map((point) => translatePoint(point, minX, minY));
      const coloredGrids = (level.coloredGrids ?? []).filter((grid) => grid.cells.every(([x, y]) => componentKeys.has(`${x},${y}`)))
        .map((grid) => ({ ...grid, cells: grid.cells.map((point) => translatePoint(point, minX, minY)) }));
      const shutters = (level.shutters ?? []).filter((shutter) => (
        Array.from({ length: shutter.height }, (_, dy) => Array.from({ length: shutter.width }, (_, dx) => [shutter.x + dx, shutter.y + dy] as Point))
          .flat().every((point) => componentKeys.has(componentKey(point)))
      )).map((shutter) => translatedShutter(shutter, minX, minY));
      const generators = (level.generators ?? []).filter((generator) => {
        if (!componentKeys.has(componentKey(generator.spawn))) return false;
        return generator.queueBlockIds.every((id) => {
          const queued = level.blocks.find((block) => block.id === id);
          return Boolean(queued && queued.shape.every(([dx, dy]) => componentKeys.has(`${generator.spawn[0] + dx},${generator.spawn[1] + dy}`)));
        });
      }).map((generator) => translatedGenerator(generator, minX, minY));
      const hasBomb = blocks.some((block) => block.timedBombSeconds !== undefined);
      const atomicLevel: LevelSpec = {
        mechanismRules: level.mechanismRules, id: level.id * 1000 + componentIndex + 1,
        name: `${level.name}·component-${componentIndex + 1}`, difficulty: level.difficulty,
        timeSeconds: level.timeSeconds, reward: 0, width, height, playable, blocked, gates, blocks,
        coloredGrids: coloredGrids.length ? coloredGrids : undefined,
        flipDoors: flipDoors.length ? flipDoors : undefined,
        shutters: shutters.length ? shutters : undefined,
        generators: generators.length ? generators : undefined,
        bombFailurePolicy: hasBomb ? level.bombFailurePolicy : undefined,
      };
      let lowerBound = 0;
      let atomic: RevisedRepositionFloorResult | undefined;
      const maxFloor = Math.max(1, options.floor);
      for (let floor = 1; floor <= maxFloor + 1; floor += 1) {
        const candidate = checkRevisedRepositionFloor(atomicLevel, { ...options, floor });
        if (candidate.status === "threshold-proven") continue;
        if (candidate.status === "relaxed-shortcut") { lowerBound = floor - 1; atomic = candidate; break; }
        return { ...base, status: candidate.status === "unsupported" ? "unsupported" : "unknown", termination: candidate.termination, reasons: [`Component ${componentIndex} proof failed: ${candidate.reasons.join(" ")}`], components: proofs };
      }
      if (!atomic) return { ...base, status: "unknown", termination: "max-states", reasons: [`Component ${componentIndex} proof did not find a relaxed completion within the requested floor budget.`], components: proofs };
      const witness = searchRevisedLevel(atomicLevel, {
        maxStates: options.maxStates,
        maxDragStates: options.maxDragStates,
        maxTransitions: options.maxTransitions,
        maxMilliseconds: options.maxMilliseconds,
      });
      if (!witness.witnessFound) {
        const termination: RevisedIndependentFloorResult["termination"] = witness.termination === "unsupported"
          ? "unsupported"
          : witness.termination === "invalid" ? "invalid"
            : witness.termination === "max-states" || witness.termination === "max-drag-states"
              || witness.termination === "max-transitions" || witness.termination === "deadline"
              ? witness.termination : "max-states";
        return { ...base, status: witness.status === "unsupported" ? "unsupported" : "unknown", termination, reasons: [`Component ${componentIndex} route witness failed: ${witness.reasons.join(" ")}`], components: proofs };
      }
      combinedRoute.push(...witness.drags.map((drag) => ({
        ...drag,
        path: drag.path.map(([x, y]) => [x + minX, y + minY] as Point),
      })));
      proofs.push({ componentIndex, bounds: { minX, minY, width, height }, blockIds: blocks.map((block) => block.id), lowerBound, atomic });
    }
  } catch (error) {
    return { ...base, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)], components: proofs };
  }
  const componentFloorSum = proofs.reduce((sum, proof) => sum + proof.lowerBound, 0);
  if (componentFloorSum < options.floor) return { ...base, status: "unknown", termination: "max-states", componentFloorSum, components: proofs, reasons: [`Independent component lower-bound sum ${componentFloorSum} is below requested floor ${options.floor}.`] };
  const replay = replayRevisedRoute(level, combinedRoute);
  if (!replay.valid || !replay.complete) {
    return { ...base, status: "unknown", termination: "invalid", componentFloorSum, components: proofs, route: combinedRoute, replay,
      reasons: [`Independent lower bounds sum to ${componentFloorSum}, but the concatenated fresh route did not complete.`, replay.error ?? "Route replay incomplete."] };
  }
  return { ...base, status: "threshold-proven", termination: "below-threshold-exhausted", thresholdProven: true, componentFloorSum, components: proofs, route: combinedRoute, replay,
    reasons: [`${proofs.length} seam-separated static components proved independently; lower bounds sum to ${componentFloorSum}; concatenated route replay completed.`] };
};
