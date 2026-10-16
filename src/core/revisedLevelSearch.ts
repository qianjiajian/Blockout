import { PuzzleModel } from "./PuzzleModel";
import { usesRevisedMechanisms } from "./mechanismRules";
import type { LevelSpec, Point, PuzzleSnapshot, Side } from "./types";
import { choosePortalReleaseCandidate, matchingContinuousExitPortals } from "../game/continuousDrag";

export interface RevisedSearchDrag {
  blockId: string;
  /** Adjacent grid anchors visited while holding this one block; turns are allowed. */
  path: Point[];
  /** A successful removal/peel ends this drag. */
  exitSide?: Side;
}

export interface RevisedSearchOptions {
  maxStates?: number;
  /** Maximum distinct spatial states explored while holding one block. */
  maxDragStates?: number;
  /** Includes failed move/exit attempts, not only discovered states. */
  maxTransitions?: number;
  maxMilliseconds?: number;
}

export interface RevisedRouteReplay {
  valid: boolean;
  complete: boolean;
  effectiveDrags: number;
  nonClearingDrags: number;
  clearEvents: number;
  finalStateKey?: string;
  error?: string;
}

export type RevisedSearchTermination = "witness" | "unsupported" | "invalid"
  | "max-states" | "max-drag-states" | "max-transitions" | "deadline" | "search-exhausted";

export interface RevisedLevelSearchResult {
  status: "witness" | "unknown" | "unsupported" | "invalid";
  termination: RevisedSearchTermination;
  rulesProfile: LevelSpec["mechanismRules"];
  witnessFound: boolean;
  /** Never an optimality, difficulty-floor, clock or three-star certificate. */
  evidence: "spatial-witness-only";
  lowerBoundCertified: false;
  timeValidated: false;
  pointerReplayValidated: false;
  pointerPolicy: "first-shape-cell-center-and-unit-steps";
  exploredStates: number;
  discoveredStates: number;
  attemptedTransitions: number;
  drags: RevisedSearchDrag[];
  replay?: RevisedRouteReplay;
  reasons: string[];
}

const STEPS: readonly Point[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/**
 * Key for states of one fixed input level, NOT a portable data hash/certificate.
 * Keep complete block/queue records, counters, door toggles, reveal flags and
 * machine inventory. Only the accumulated move count is irrelevant to future
 * spatial legality; including it would turn harmless cycles into infinite states.
 */
export const revisedSpatialStateKey = (snapshot: PuzzleSnapshot): string => {
  const { moves: _moves, ...state } = snapshot;
  return JSON.stringify(state);
};

const unsupportedReasons = (level: LevelSpec): string[] => {
  const reasons: string[] = [];
  if (!usesRevisedMechanisms(level)) reasons.push("Explicit revised mechanism profile required.");
  if (level.blocks.some((block) => block.timedBombSeconds !== undefined
    && block.timedBombSeconds <= level.timeSeconds)) {
    reasons.push("Bomb deadlines require a time-aware route verifier; this search does not disable or ignore them.");
  }
  if (level.generators?.some((machine) => machine.trigger === "time")) reasons.push("Timed generators are unsupported.");
  if (level.elevators?.length || level.conveyors?.length) reasons.push("Legacy autonomous moving platforms/conveyors are unsupported.");
  if (level.shutters?.some((cover) => cover.skin === "staging" || cover.skin === "staged-frame" || cover.skin === "generator")) {
    reasons.push("Legacy staging/generator shutter skins are not revised mechanisms.");
  }
  if (level.blocks.some((block) => block.rotationBadge)) reasons.push("Legacy rotation badges are unsupported.");
  return reasons;
};

/**
 * Canonical pointer policy: grab the first actual shape cell's center and move
 * by one grid cell per sample. Use the UI's actual portal chooser, including
 * its direction/side/distance tie-breaking, not arbitrary eligible exits.
 * Generator animations may require waiting and releasing at this anchor; the
 * search conservatively ends at first available contact rather than exploring
 * animation-dependent escape paths. This is not a physical Pointer replay.
 */
const automaticExitSide = (model: PuzzleModel, blockId: string, previous?: Point): Side | undefined => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return undefined;
  const sides = model.possibleExitSides(block);
  if (!sides.length) return undefined;
  const snapshot = model.snapshot();
  const candidates = matchingContinuousExitPortals(snapshot, block, sides);
  const [grabX, grabY] = block.shape[0];
  const pointer = { x: block.x + grabX + 0.5, y: block.y + grabY + 0.5 };
  const inferred: Side | undefined = previous
    ? block.x < previous[0] ? "left" : block.x > previous[0] ? "right"
      : block.y < previous[1] ? "top" : block.y > previous[1] ? "bottom" : undefined
    : undefined;
  return choosePortalReleaseCandidate(candidates, pointer, {
    innerX: 0, innerY: 0, innerWidth: snapshot.width, innerHeight: snapshot.height, cell: 1,
  }, inferred)?.portal.side;
};

/** Model transaction plus the current UI's mandatory first-contact exit rule. */
const performDrag = (model: PuzzleModel, drag: RevisedSearchDrag): string | undefined => {
  model.beginAction();
  let automatic = automaticExitSide(model, drag.blockId);
  if (automatic && drag.path.length) return `Pointer-down auto-exit of ${drag.blockId} must precede movement.`;
  for (let index = 0; index < drag.path.length; index += 1) {
    const [x, y] = drag.path[index];
    const block = model.getBlock(drag.blockId);
    const previous: Point | undefined = block ? [block.x, block.y] : undefined;
    if (!model.moveBlockStep(drag.blockId, x, y)) return `Rejected move of ${drag.blockId} to ${x},${y}.`;
    automatic = automaticExitSide(model, drag.blockId, previous);
    if (automatic && index !== drag.path.length - 1) return `First-contact auto-exit of ${drag.blockId} must end this drag.`;
  }
  if (automatic !== drag.exitSide) return `Exit of ${drag.blockId} does not match canonical pointer auto-exit (${automatic ?? "none"}).`;
  if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
    return `Rejected ${drag.exitSide} exit of ${drag.blockId}.`;
  }
  if (!model.commitAction()) return `Drag of ${drag.blockId} has no effective mutation.`;
  return undefined;
};

/** Independent, fresh-model replay. No simulated elapsed time or booster use. */
export const replayRevisedRoute = (
  level: LevelSpec,
  drags: readonly RevisedSearchDrag[],
): RevisedRouteReplay => {
  const result: RevisedRouteReplay = { valid: false, complete: false, effectiveDrags: 0, nonClearingDrags: 0, clearEvents: 0 };
  const unsupported = unsupportedReasons(level);
  if (unsupported.length) return { ...result, error: unsupported.join(" ") };
  try {
    const model = new PuzzleModel(level);
    model.startCountdown();
    for (const drag of drags) {
      const before = model.snapshot();
      const error = performDrag(model, drag);
      if (error) return { ...result, error };
      const after = model.snapshot();
      if (after.failed || after.moves !== before.moves + 1) return { ...result, error: "Invalid committed action or failed model state." };
      result.effectiveDrags += 1;
      const clears = after.cleared - before.cleared;
      result.clearEvents += clears;
      if (clears === 0) result.nonClearingDrags += 1;
    }
    const final = model.snapshot();
    return { ...result, valid: true, complete: final.complete, finalStateKey: revisedSpatialStateKey(final) };
  } catch (error) {
    return { ...result, error: error instanceof Error ? error.message : String(error) };
  }
};

interface SearchNode {
  model: PuzzleModel;
  parent: number;
  drag?: RevisedSearchDrag;
  depth: number;
  remainingLayers: number;
}

class SearchBudgetReached extends Error {
  constructor(readonly termination: RevisedSearchTermination) { super(termination); }
}

const positiveBudget = (value: number | undefined, fallback: number, label: string): number => {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new Error(`${label} must be a positive safe integer.`);
  return resolved;
};

/**
 * Bounded greedy WITNESS search through the authoritative model. Each inner
 * search holds one block across arbitrary orthogonal turns; every unit step
 * retains immediate generator/lift effects. First available portal contact
 * ends a drag, using a canonical actual-cell grab and the same chooser as UI.
 * This restricted, budgeted action exploration deliberately never certifies a
 * minimum drag count, a necessary-reposition lower bound or unsatisfiability.
 * No clock ticks are invented: ordinary level-time/three-star feasibility is
 * still unverified, and time-dependent bombs are explicitly unsupported. Real
 * Pointer replay (including animation waits/input locks) is also unverified;
 * this canonical subset cannot certify exhaustive reachability or a bound.
 */
export const searchRevisedLevel = (
  level: LevelSpec,
  options: RevisedSearchOptions = {},
): RevisedLevelSearchResult => {
  const result: RevisedLevelSearchResult = {
    status: "unknown", termination: "search-exhausted", rulesProfile: level.mechanismRules,
    witnessFound: false, evidence: "spatial-witness-only", lowerBoundCertified: false, timeValidated: false,
    pointerReplayValidated: false, pointerPolicy: "first-shape-cell-center-and-unit-steps",
    exploredStates: 0, discoveredStates: 0, attemptedTransitions: 0, drags: [], reasons: [],
  };
  const unsupported = unsupportedReasons(level);
  if (unsupported.length) return { ...result, status: "unsupported", termination: "unsupported", reasons: unsupported };
  try {
    const maxStates = positiveBudget(options.maxStates, 2_500, "maxStates");
    const maxDragStates = positiveBudget(options.maxDragStates, 512, "maxDragStates");
    const maxTransitions = positiveBudget(options.maxTransitions, 100_000, "maxTransitions");
    const maxMilliseconds = positiveBudget(options.maxMilliseconds, 5_000, "maxMilliseconds");
    const deadline = Date.now() + maxMilliseconds;
    const spendTransition = (): void => {
      if (Date.now() >= deadline) throw new SearchBudgetReached("deadline");
      if (result.attemptedTransitions >= maxTransitions) throw new SearchBudgetReached("max-transitions");
      result.attemptedTransitions += 1;
    };
    const initial = new PuzzleModel(level);
    initial.startCountdown();
    const layers = (model: PuzzleModel): number => {
      const state = model.snapshot();
      return [...state.blocks, ...state.queuedBlocks].reduce((sum, block) => sum + block.layers.length, 0);
    };
    const nodes: SearchNode[] = [{ model: initial, parent: -1, depth: 0, remainingLayers: layers(initial) }];
    const open = [0];
    const seen = new Set([revisedSpatialStateKey(initial.snapshot())]);
    result.discoveredStates = 1;
    const routeTo = (index: number): RevisedSearchDrag[] => {
      const drags: RevisedSearchDrag[] = [];
      while (nodes[index].parent !== -1) {
        drags.push(nodes[index].drag!);
        index = nodes[index].parent;
      }
      return drags.reverse();
    };
    const witness = (drags: RevisedSearchDrag[]): RevisedLevelSearchResult => {
      const replay = replayRevisedRoute(level, drags);
      if (!replay.valid || !replay.complete) {
        return { ...result, status: "invalid", termination: "invalid", replay, reasons: ["Fresh model replay rejected the proposed witness.", replay.error ?? "Replay incomplete."] };
      }
      return { ...result, status: "witness", termination: "witness", witnessFound: true, drags, replay };
    };
    if (initial.snapshot().complete) return witness([]);
    let found: RevisedSearchDrag[] | undefined;
    const enqueue = (parent: number, drag: RevisedSearchDrag): void => {
      // clone intentionally does not carry the held-action baseline. Replay
      // from the committed parent to preserve one atomic, count-once gesture.
      const model = nodes[parent].model.clone();
      for (let index = 0; index < drag.path.length + Number(Boolean(drag.exitSide)); index += 1) spendTransition();
      const error = performDrag(model, drag);
      if (error) throw new Error(error);
      const snapshot = model.snapshot();
      const key = revisedSpatialStateKey(snapshot);
      if (seen.has(key)) return;
      if (seen.size >= maxStates) throw new SearchBudgetReached("max-states");
      seen.add(key);
      result.discoveredStates = seen.size;
      if (snapshot.complete) { found = [...routeTo(parent), drag]; return; }
      nodes.push({ model, parent, drag, depth: nodes[parent].depth + 1, remainingLayers: layers(model) });
      open.push(nodes.length - 1);
    };

    while (open.length) {
      if (Date.now() >= deadline) throw new SearchBudgetReached("deadline");
      // Prefer clear progress, then shorter witness routes. Not an admissible
      // optimality metric and intentionally not labelled a proof heuristic.
      let best = 0;
      for (let index = 1; index < open.length; index += 1) {
        const candidate = nodes[open[index]];
        const current = nodes[open[best]];
        if (candidate.remainingLayers < current.remainingLayers
          || (candidate.remainingLayers === current.remainingLayers && candidate.depth < current.depth)) best = index;
      }
      const parent = open.splice(best, 1)[0];
      const source = nodes[parent].model;
      result.exploredStates += 1;
      for (const selected of source.snapshot().blocks) {
        if (!source.isBlockActive(selected)) continue;
        const inner: Array<{ model: PuzzleModel; path: Point[] }> = [{ model: source, path: [] }];
        const innerSeen = new Set([revisedSpatialStateKey(source.snapshot())]);
        for (let cursor = 0; cursor < inner.length; cursor += 1) {
          const current = inner[cursor];
          const held = current.model.getBlock(selected.id);
          if (!held) continue;
          const previous = current.path.length > 1 ? current.path[current.path.length - 2]
            : current.path.length ? [selected.x, selected.y] as Point : undefined;
          spendTransition();
          const automatic = automaticExitSide(current.model, held.id, previous);
          if (automatic) {
            enqueue(parent, { blockId: held.id, path: current.path, exitSide: automatic });
            if (found) return witness(found);
            continue;
          }
          if (current.path.length) enqueue(parent, { blockId: held.id, path: current.path });
          for (const [dx, dy] of STEPS) {
            spendTransition();
            const next = current.model.clone();
            next.beginAction();
            const target: Point = [held.x + dx, held.y + dy];
            if (!next.moveBlockStep(held.id, ...target)) continue;
            const key = revisedSpatialStateKey(next.snapshot());
            if (innerSeen.has(key)) continue;
            if (innerSeen.size >= maxDragStates) throw new SearchBudgetReached("max-drag-states");
            innerSeen.add(key);
            inner.push({ model: next, path: [...current.path, target] });
          }
        }
      }
    }
    return { ...result, reasons: ["No witness found in this search; not an unsatisfiability or difficulty certificate."] };
  } catch (error) {
    if (error instanceof SearchBudgetReached) return { ...result, termination: error.termination, reasons: ["Search budget reached; feasibility remains unknown."] };
    return { ...result, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)] };
  }
};
