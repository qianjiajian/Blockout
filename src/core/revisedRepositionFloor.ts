import { PuzzleModel } from "./PuzzleModel";
import type { LevelSpec, Point, PuzzleSnapshot, Side } from "./types";

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
  abstraction: "optional-exit-unit-step-gesture-superset-v1";
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
  const unsupported: string[] = [];
  if (!["revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.4"].includes(level.mechanismRules ?? "")) {
    unsupported.push("Only explicitly qualified v1.1/v1.2 and flip-free v1.4 profiles are supported.");
  }
  if (level.mechanismRules === "revised-2026-09-23-v1.4" && level.flipDoors?.length) {
    unsupported.push("v1.4 deferred flip-door animation interleavings are not qualified for this bound tool.");
  }
  if (level.blocks.some((block) => block.timedBombSeconds !== undefined)) unsupported.push("Bomb clocks are not yet qualified for this bound tool.");
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
