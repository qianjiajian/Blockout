import type {
  BlockState,
  BoardSeamSpec,
  ColoredGridSpec,
  ConveyorSpec,
  ElevatorState,
  ExitAttemptStatus,
  ExitResult,
  FlipDoorState,
  GateState,
  GateSpec,
  GatePortalSpec,
  GeneratorState,
  LevelSpec,
  Point,
  PuzzleSnapshot,
  ShutterState,
  Side,
} from "./types";
import { MAX_BLOCK_LAYERS, shutterHasPhysicalFootprint } from "./types";
import { isIceEligibleBlockShape } from "./blockShape";
import {
  exitFrontierFacesBoundary,
  resolveMatchingGatePortal,
  type MatchedGatePortal,
} from "./blockExitFrontier";
import { validateGatePortalGeometry } from "./gatePortals";
import { assertRevisedMechanismContract } from "./revisedMechanismContract";
import { usesExitAnimationCompletion, usesFrozenFlipDoorEligibility, usesRevisedMechanisms } from "./mechanismRules";
import {
  cloneBoardSeams,
  footprintCrossesBoardSeam,
  translationCrossesBoardSeam,
  validateBoardSeams,
} from "./boardSeams";

const clonePoints = (points: Point[]): Point[] => points.map(([x, y]) => [x, y] as const);

const cloneGate = <T extends GateSpec>(gate: T): T => ({
  ...gate,
  portals: gate.portals?.map((portal) => ({
    ...portal,
    origin: [...portal.origin] as Point,
  })),
});

const rectangularCells = (width: number, height: number): Point[] => {
  const cells: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x, y]);
  }
  return cells;
};

const movementAxisAllowsExit = (movementAxis: BlockState["movementAxis"], side: Side): boolean => (
  movementAxis === undefined
    || (movementAxis === "horizontal" && (side === "left" || side === "right"))
    || (movementAxis === "vertical" && (side === "top" || side === "bottom"))
);

const EXIT_SWEEP_EPSILON = 1e-6;

const intervalsOverlap = (
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
): boolean => start < otherEnd - EXIT_SWEEP_EPSILON
  && end > otherStart + EXIT_SWEEP_EPSILON;

/** True when a unit cell intersects an obstacle during one-axis translation. */
const translatedIntervalOverlaps = (
  start: number,
  otherStart: number,
  distance: number,
  negativeDirection: boolean,
): boolean => {
  const enter = negativeDirection
    ? start - otherStart - 1
    : otherStart - start - 1;
  const leave = negativeDirection
    ? start + 1 - otherStart
    : otherStart + 1 - start;
  return Math.max(0, enter) < Math.min(distance, leave) - EXIT_SWEEP_EPSILON;
};

export interface HeldBlockReservation {
  blockId: string;
  x: number;
  y: number;
  shape: Point[];
  rollbackX?: number;
  rollbackY?: number;
}

export interface PuzzleModelOptions {
  /** Renderers finish v1.3 departures explicitly; headless models have no animation delay. */
  deferExitCompletion?: boolean;
}

let nextExitAnimationNamespace = 1;

export class PuzzleModel {
  readonly level: LevelSpec;
  private playable: Point[];
  private playableKeys: Set<string>;
  private blocked: Point[];
  private blockedKeys: Set<string>;
  private seams: BoardSeamSpec[];
  private gates: GateState[];
  private flipDoors: FlipDoorState[];
  private coloredGrids: ColoredGridSpec[];
  private blocks: BlockState[];
  private queuedBlocks: BlockState[];
  private shutters: ShutterState[];
  private generators: GeneratorState[];
  private elevators: ElevatorState[];
  private conveyors: ConveyorSpec[];
  private cleared = 0;
  private moves = 0;
  private remainingSeconds: number;
  private timeFreezeSeconds = 0;
  private started = false;
  private autonomousStarted = false;
  private complete = false;
  private failed = false;
  private history: PuzzleSnapshot[] = [];
  private pendingHistory?: PuzzleSnapshot;
  /** Only explicit player mutations make an action undoable/count as a move. */
  private pendingActionMutated = false;
  /** Generator release checks run once, after a spatial player action commits. */
  private pendingGeneratorCheck = false;
  /** Actual enabled bomb time spent inside the current player transaction. */
  private pendingBombElapsed = new Map<string, number>();
  /** Unfrozen countdown time inside the current action, preserved on cancellation. */
  private pendingWallSeconds = 0;
  private readonly exitAnimationNamespace = nextExitAnimationNamespace++;
  private nextExitAnimationSequence = 1;
  private pendingExitAnimations = new Set<string>();
  private pendingExitFlipDoorIds = new Map<string, string[]>();
  private readonly options: PuzzleModelOptions;

  private get revisedRules(): boolean {
    return usesRevisedMechanisms(this.level);
  }

  constructor(level: LevelSpec, options: PuzzleModelOptions = {}) {
    validateLevel(level);
    this.level = level;
    this.options = { ...options };
    this.playable = clonePoints(level.playable ?? rectangularCells(level.width, level.height));
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(level.blocked ?? []);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.seams = cloneBoardSeams(level.seams);
    this.gates = level.gates.map((gate) => ({ ...cloneGate(gate), frozen: gate.frozen ?? 0 }));
    this.flipDoors = (level.flipDoors ?? []).map((door) => ({
      ...cloneGate(door),
      frozen: door.frozen ?? 0,
      open: door.initiallyOpen,
    }));
    this.coloredGrids = (level.coloredGrids ?? []).map((grid) => ({
      ...grid,
      cells: clonePoints(grid.cells),
    }));
    const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
    const hydratedBlocks = level.blocks.map((block) => ({
      ...block,
      shape: clonePoints(block.shape),
      layers: block.layers ? [...block.layers] : [block.color],
      frozen: block.frozen ?? 0,
    }));
    this.blocks = hydratedBlocks.filter((block) => !queuedIds.has(block.id));
    this.queuedBlocks = hydratedBlocks.filter((block) => queuedIds.has(block.id));
    this.shutters = (level.shutters ?? []).map((shutter) => ({
      ...shutter,
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
      ...(this.revisedRules ? { revealed: false } : {}),
    }));
    this.generators = (level.generators ?? []).map((generator) => ({
      ...generator,
      spawn: [...generator.spawn] as Point,
      queueBlockIds: [...generator.queueBlockIds],
      head: 0,
      remaining: generator.queueBlockIds.length,
      nextBlockId: generator.queueBlockIds[0],
      elapsed: 0,
    }));
    this.elevators = (level.elevators ?? []).map((elevator) => ({
      ...elevator,
      x: elevator.fromX,
      y: elevator.fromY,
      direction: 1,
      elapsed: 0,
    }));
    this.conveyors = (level.conveyors ?? []).map((conveyor) => ({ ...conveyor }));
    this.remainingSeconds = level.timeSeconds;
    if (this.revisedRules) this.settleRevisedSpace();
  }

  snapshot(): PuzzleSnapshot {
    return {
      ...(this.revisedRules ? { mechanismRules: this.level.mechanismRules } : {}),
      levelId: this.level.id,
      width: this.level.width,
      height: this.level.height,
      playable: clonePoints(this.playable),
      blocked: clonePoints(this.blocked),
      seams: cloneBoardSeams(this.seams),
      gates: this.gates.map(cloneGate),
      flipDoors: this.flipDoors.map(cloneGate),
      ...(this.pendingExitAnimations.size ? { pendingExitAnimations: [...this.pendingExitAnimations] } : {}),
      ...(this.pendingExitFlipDoorIds.size ? {
        pendingExitFlipDoorIds: Object.fromEntries([...this.pendingExitFlipDoorIds].map(([id, doors]) => [id, [...doors]])),
      } : {}),
      coloredGrids: this.coloredGrids.map((grid) => ({ ...grid, cells: clonePoints(grid.cells) })),
      blocks: this.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] })),
      queuedBlocks: this.queuedBlocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] })),
      shutters: this.shutters.map((shutter) => ({
        ...shutter,
        triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
      })),
      generators: this.generators.map((generator) => ({
        ...generator,
        spawn: [...generator.spawn] as Point,
        queueBlockIds: [...generator.queueBlockIds],
      })),
      elevators: this.elevators.map((elevator) => ({ ...elevator })),
      conveyors: this.conveyors.map((conveyor) => ({ ...conveyor })),
      cleared: this.cleared,
      moves: this.moves,
      remainingSeconds: this.remainingSeconds,
      timeFreezeSeconds: this.timeFreezeSeconds,
      started: this.started,
      autonomousStarted: this.autonomousStarted,
      complete: this.complete,
      failed: this.failed,
    };
  }

  clone(): PuzzleModel {
    const copy = new PuzzleModel(this.level, this.options);
    copy.restore(this.snapshot());
    return copy;
  }

  private restore(snapshot: PuzzleSnapshot): void {
    this.playable = clonePoints(snapshot.playable);
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(snapshot.blocked);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.seams = cloneBoardSeams(snapshot.seams);
    this.gates = snapshot.gates.map(cloneGate);
    this.flipDoors = snapshot.flipDoors.map(cloneGate);
    const needsEligibility = usesFrozenFlipDoorEligibility(this.level);
    // Missing v1.5 event metadata cannot be reconstructed from the current ice
    // state: discard such stale callbacks instead of accidentally replaying them.
    this.pendingExitAnimations = new Set((snapshot.pendingExitAnimations ?? []).filter((id) => (
      !needsEligibility || Array.isArray(snapshot.pendingExitFlipDoorIds?.[id])
    )));
    this.pendingExitFlipDoorIds = new Map(needsEligibility
      ? [...this.pendingExitAnimations].map((id) => [id, [...snapshot.pendingExitFlipDoorIds![id]]]) : []);
    this.coloredGrids = snapshot.coloredGrids.map((grid) => ({
      ...grid,
      cells: clonePoints(grid.cells),
    }));
    this.blocks = snapshot.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] }));
    this.queuedBlocks = snapshot.queuedBlocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] }));
    this.shutters = snapshot.shutters.map((shutter) => ({
      ...shutter,
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
    }));
    this.generators = snapshot.generators.map((generator) => ({
      ...generator,
      spawn: [...generator.spawn] as Point,
      queueBlockIds: [...generator.queueBlockIds],
    }));
    this.elevators = snapshot.elevators.map((elevator) => ({ ...elevator }));
    this.conveyors = snapshot.conveyors.map((conveyor) => ({ ...conveyor }));
    this.cleared = snapshot.cleared;
    this.moves = snapshot.moves;
    this.remainingSeconds = snapshot.remainingSeconds;
    this.timeFreezeSeconds = snapshot.complete || snapshot.failed ? 0 : (snapshot.timeFreezeSeconds ?? 0);
    this.started = snapshot.started;
    this.autonomousStarted = snapshot.autonomousStarted;
    this.complete = snapshot.complete;
    this.failed = snapshot.failed;
  }

  beginAction(): void {
    if (this.revisedRules && (this.complete || this.failed)) return;
    if (!this.pendingHistory) {
      this.pendingHistory = this.snapshot();
      this.pendingActionMutated = false;
      this.pendingBombElapsed.clear();
      this.pendingWallSeconds = 0;
    }
  }

  commitAction(countMove = true): boolean {
    if (!this.pendingHistory) return false;
    const changed = this.pendingActionMutated;
    if (changed) {
      if (this.pendingGeneratorCheck && !this.revisedRules) this.releaseOneFromEachReadyGenerator();
      this.history.push(this.pendingHistory);
      if (this.history.length > 20) this.history.shift();
      if (countMove) this.moves += 1;
      this.pendingHistory = undefined;
      this.pendingActionMutated = false;
      this.pendingGeneratorCheck = false;
      this.pendingBombElapsed.clear();
      return true;
    }
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
    return false;
  }

  cancelAction(): void {
    // A no-op hold may span timer/elevator ticks. Discarding that pending
    // action must not rewind the live world. A real player mutation still
    // restores atomically, preserving booster and interrupted-drag semantics.
    // If the level was already running, keep wall-clock time monotonic while
    // the board is restored; cancelling input must never refund thinking time.
    if (this.pendingHistory && this.pendingActionMutated) {
      const baseline = this.pendingHistory;
      const live = this.snapshot();
      const liveRemainingSeconds = this.remainingSeconds;
      const liveFailed = this.failed;
      this.restore(baseline);
      const liveWorldAdvanced = baseline.started
        || liveRemainingSeconds < baseline.remainingSeconds
        || this.pendingWallSeconds > 0
        || liveFailed;
      if (liveWorldAdvanced) {
        this.remainingSeconds = Math.max(0, Math.min(
          baseline.remainingSeconds - (this.revisedRules ? this.pendingWallSeconds : 0),
          liveRemainingSeconds,
        ));
        this.started = baseline.started || live.started;
        this.autonomousStarted = baseline.autonomousStarted || live.autonomousStarted;
        this.restoreTimedBombProgress(baseline, live);
        this.failed = liveFailed || this.remainingSeconds <= 0 || this.hasFailedBomb();
        this.restoreAutonomousElevatorProgress(baseline, live);
        if (this.failed) {
          this.discardPendingExitAnimations();
          this.clearTimeFreeze();
        }
      }
    }
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.restore(previous);
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
    return true;
  }

  private markActionMutated(): void {
    if (this.pendingHistory) this.pendingActionMutated = true;
  }

  private markSpatialActionMutated(): void {
    this.markActionMutated();
    if (this.revisedRules) this.settleRevisedSpace();
    else if (this.pendingHistory) this.pendingGeneratorCheck = true;
  }

  private restoreAutonomousElevatorProgress(baseline: PuzzleSnapshot, live: PuzzleSnapshot): void {
    for (const elevator of this.elevators) {
      const baselineElevator = baseline.elevators.find((candidate) => candidate.id === elevator.id);
      const liveElevator = live.elevators.find((candidate) => candidate.id === elevator.id);
      if (!baselineElevator || !liveElevator) continue;
      const block = this.getBlock(elevator.blockId);
      const baselineBlock = baseline.blocks.find((candidate) => candidate.id === elevator.blockId);
      const carriedAtStart = Boolean(block && baselineBlock
        && baselineBlock.x === baselineElevator.x && baselineBlock.y === baselineElevator.y);
      if (carriedAtStart && block && baselineBlock) {
        const targetX = baselineBlock.x + liveElevator.x - baselineElevator.x;
        const targetY = baselineBlock.y + liveElevator.y - baselineElevator.y;
        // Prefer keeping cargo on the live platform, but never rewind the
        // autonomous platform if another restored block now occupies that
        // cell. In that rare conflict the cargo safely detaches at baseline.
        if (this.canTranslate(block, targetX, targetY)) {
          block.x = targetX;
          block.y = targetY;
        }
      }
      Object.assign(elevator, liveElevator);
    }
  }

  /** Cancelling a held gesture must not rewind any visible bomb clock. */
  private restoreTimedBombProgress(baseline: PuzzleSnapshot, live: PuzzleSnapshot): void {
    if (this.revisedRules) {
      for (const block of [...this.blocks, ...this.queuedBlocks]) {
        if (block.timedBombSeconds === undefined) continue;
        const spent = this.blocks.includes(block) && this.isBlockActive(block)
          ? this.pendingWallSeconds : (this.pendingBombElapsed.get(block.id) ?? 0);
        block.timedBombSeconds = Math.max(0, block.timedBombSeconds - spent);
      }
      return;
    }
    const liveBombs = new Map(live.blocks.map((block) => [block.id, block.timedBombSeconds]));
    const elapsed = Math.max(0, baseline.remainingSeconds - live.remainingSeconds);
    for (const block of this.blocks) {
      const liveSeconds = liveBombs.get(block.id);
      if (block.timedBombSeconds === undefined) continue;
      block.timedBombSeconds = Math.min(
        block.timedBombSeconds,
        liveSeconds ?? Math.max(0, block.timedBombSeconds - elapsed),
      );
    }
  }

  start(): void {
    // A successful player mutation activates both the level countdown and
    // autonomous board mechanisms. A first-time feature card can start only
    // the countdown through startCountdown(), without treating dismissal as
    // a gameplay action.
    if (!this.complete && !this.failed) {
      this.started = true;
      this.autonomousStarted = true;
    }
  }

  startCountdown(): void {
    if (!this.complete && !this.failed) this.started = true;
  }

  tick(deltaSeconds: number, held?: HeldBlockReservation): boolean {
    if (!this.started || this.complete || this.failed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return false;
    const frozenSeconds = Math.min(this.timeFreezeSeconds, deltaSeconds);
    const countdownSeconds = deltaSeconds - frozenSeconds;
    this.consumeTimeFreeze(frozenSeconds);
    if (this.pendingHistory) this.pendingWallSeconds += countdownSeconds;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - countdownSeconds);
    for (const block of this.blocks) {
      if (block.timedBombSeconds === undefined || (this.revisedRules && !this.isBlockActive(block))) continue;
      if (this.pendingHistory && this.revisedRules) {
        this.pendingBombElapsed.set(block.id, (this.pendingBombElapsed.get(block.id) ?? 0) + Math.min(countdownSeconds, block.timedBombSeconds));
      }
      block.timedBombSeconds = Math.max(0, block.timedBombSeconds - countdownSeconds);
    }
    if (this.revisedRules && (this.remainingSeconds <= 0 || this.hasFailedBomb())) {
      this.failed = true;
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
      return false;
    }
    const elevatorChanged = this.autonomousStarted && this.advanceElevators(deltaSeconds, held);
    const feederChanged = this.autonomousStarted && this.advanceTimedGenerators(deltaSeconds, held);
    const spatialChanged = elevatorChanged || feederChanged;
    if (this.remainingSeconds <= 0 || this.hasFailedBomb()) {
      this.failed = true;
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
    }
    return spatialChanged;
  }

  /** A time booster is available in legacy and revised levels; it never adds clock time. */
  freezeTime(seconds: number): boolean {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.timeFreezeSeconds > 0
      || this.complete || this.failed || this.remainingSeconds <= 0 || this.hasFailedBomb()) return false;
    this.timeFreezeSeconds = seconds;
    // Even a first legacy action must consume the effect now, not bank it until
    // the first drag. Autonomous mechanisms continue under the ordinary clock.
    this.start();
    this.markActionMutated();
    return true;
  }

  private consumeTimeFreeze(seconds: number): void {
    if (seconds <= 0) return;
    this.timeFreezeSeconds = Math.max(0, this.timeFreezeSeconds - seconds);
    // Age only the effect balance in old snapshots. Undo keeps its existing
    // board/timer semantics but cannot refund already-spent freeze time or
    // resurrect an expired earlier use after a later use is undone.
    for (const snapshot of this.history) {
      snapshot.timeFreezeSeconds = Math.max(0, (snapshot.timeFreezeSeconds ?? 0) - seconds);
    }
    if (this.pendingHistory) {
      this.pendingHistory.timeFreezeSeconds = Math.max(0, (this.pendingHistory.timeFreezeSeconds ?? 0) - seconds);
    }
  }

  private clearTimeFreeze(): void {
    this.timeFreezeSeconds = 0;
    for (const snapshot of this.history) snapshot.timeFreezeSeconds = 0;
    if (this.pendingHistory) this.pendingHistory.timeFreezeSeconds = 0;
  }

  addTime(seconds: number): boolean {
    const beforeSeconds = this.remainingSeconds;
    const beforeFailed = this.failed;
    this.remainingSeconds = Math.min(this.level.timeSeconds + 120, this.remainingSeconds + seconds);
    this.failed = this.hasFailedBomb();
    if (this.failed) {
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
    }
    const changed = this.remainingSeconds !== beforeSeconds || this.failed !== beforeFailed;
    if (changed) this.markActionMutated();
    return changed;
  }

  getBlock(id: string): BlockState | undefined {
    return this.blocks.find((block) => block.id === id);
  }

  private hasFailedBomb(): boolean {
    return (this.revisedRules || this.level.bombFailurePolicy === "fail")
      && this.blocks.some((block) => block.timedBombSeconds !== undefined && block.timedBombSeconds <= 0
        && (!this.revisedRules || this.isBlockActive(block)));
  }

  private isBlockVisible(block: BlockState): boolean {
    if (!block.shutterId) return true;
    const shutter = this.shutters.find((item) => item.id === block.shutterId);
    return !shutter || (this.revisedRules ? shutter.revealed === true : shutter.count <= 0);
  }

  isBlockActive(block: BlockState): boolean {
    if (block.frozen > 0) return false;
    if (block.lockedBy) return false;
    return this.isBlockVisible(block);
  }

  blockCells(block: BlockState, x = block.x, y = block.y): Point[] {
    return block.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  }

  canPlace(block: BlockState, x: number, y: number): boolean {
    if (!this.isBlockActive(block)) return false;
    const activeColor = block.layers[0] ?? block.color;
    const occupied = new Set<string>();
    for (const other of this.blocks) {
      if (other.id === block.id) continue;
      if (!this.isBlockVisible(other)) continue;
      for (const [ox, oy] of this.blockCells(other)) occupied.add(`${ox},${oy}`);
    }
    for (const shutter of this.shutters) {
      if (!this.coverOccupiesBoard(shutter)) continue;
      for (let sy = shutter.y; sy < shutter.y + shutter.height; sy += 1) {
        for (let sx = shutter.x; sx < shutter.x + shutter.width; sx += 1) occupied.add(`${sx},${sy}`);
      }
    }
    const cells = this.blockCells(block, x, y);
    return !footprintCrossesBoardSeam(this.level, cells)
      && cells.every(([cx, cy]) => (
      cx >= 0 && cy >= 0 && cx < this.level.width && cy < this.level.height
      && this.playableKeys.has(`${cx},${cy}`)
      && !this.blockedKeys.has(`${cx},${cy}`)
      && !occupied.has(`${cx},${cy}`)
      && !this.coloredGrids.some((grid) => (
        grid.color !== activeColor && grid.cells.some(([gx, gy]) => gx === cx && gy === cy)
      ))
      ));
  }

  private canTranslate(block: BlockState, targetX: number, targetY: number): boolean {
    return !translationCrossesBoardSeam(
      this.level,
      this.blockCells(block),
      targetX - block.x,
      targetY - block.y,
    ) && this.canPlace(block, targetX, targetY);
  }

  moveBlock(id: string, targetX: number, targetY: number): boolean {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return false;
    targetX = Math.round(targetX);
    targetY = Math.round(targetY);
    if (block.x === targetX && block.y === targetY) return false;

    let x = block.x;
    let y = block.y;
    let moved = false;
    for (let step = 0; step < this.level.width + this.level.height + 4; step += 1) {
      const dx = targetX - x;
      const dy = targetY - y;
      if (dx === 0 && dy === 0) break;
      const horizontal: readonly [number, number] = [x + Math.sign(dx), y];
      const vertical: readonly [number, number] = [x, y + Math.sign(dy)];
      const candidates = (Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal])
        .filter(([nx, ny]) => block.movementAxis === "horizontal" ? ny === y
          : block.movementAxis === "vertical" ? nx === x
            : true);
      let advanced = false;
      for (const [nx, ny] of candidates) {
        if ((nx === x && ny === y)
          || translationCrossesBoardSeam(
            this.level,
            this.blockCells(block, x, y),
            nx - x,
            ny - y,
          )
          || !this.canPlace(block, nx, ny)) continue;
        x = nx;
        y = ny;
        if (this.revisedRules) {
          block.x = x;
          block.y = y;
          this.settleRevisedSpace();
        }
        moved = true;
        advanced = true;
        break;
      }
      if (!advanced) break;
    }
    if (!moved) return false;
    block.x = x;
    block.y = y;
    this.start();
    this.markSpatialActionMutated();
    return true;
  }

  /** Move exactly one orthogonal grid cell without choosing a route for the player. */
  moveBlockStep(id: string, targetX: number, targetY: number): boolean {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return false;
    if (!Number.isInteger(targetX) || !Number.isInteger(targetY)) return false;
    if (Math.abs(targetX - block.x) + Math.abs(targetY - block.y) !== 1) return false;
    if (block.movementAxis === "horizontal" && targetY !== block.y) return false;
    if (block.movementAxis === "vertical" && targetX !== block.x) return false;
    if (!this.canTranslate(block, targetX, targetY)) return false;
    block.x = targetX;
    block.y = targetY;
    this.start();
    this.markSpatialActionMutated();
    return true;
  }

  /**
   * Checks the whole rigid piece's continuous departure from the board.
   *
   * Exit matching proves that the frontier and the complete tangent span fit
   * the aperture. It does not prove that the piece can sweep through the
   * aperture without touching another visible piece or a physical cover. Keep
   * this check in the model so pointer, headless, and solver exits share the
   * same collision contract.
   */
  private exitPathIsClear(block: BlockState, side: Side, portal: GatePortalSpec): boolean {
    const negativeDirection = side === "left" || side === "top";
    const normalStart = side === "left" || side === "right" ? block.x : block.y;
    const normalOffsets = block.shape.map(([x, y]) => side === "left" || side === "right" ? x : y);
    const maxOffset = Math.max(...normalOffsets);
    const minOffset = Math.min(...normalOffsets);
    const portalBoundary = side === "left" || side === "top"
      ? (side === "left" ? portal.origin[0] : portal.origin[1])
      : (side === "right" ? portal.origin[0] + 1 : portal.origin[1] + 1);
    const distance = negativeDirection
      ? normalStart + maxOffset + 1 - portalBoundary
      : portalBoundary - (normalStart + minOffset);
    if (!(distance > EXIT_SWEEP_EPSILON)) return true;

    const obstacleCells: Point[] = [];
    for (const other of this.blocks) {
      if (other.id === block.id || !this.isBlockVisible(other)) continue;
      obstacleCells.push(...this.blockCells(other));
    }
    for (const shutter of this.shutters) {
      if (!this.coverOccupiesBoard(shutter)) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
          obstacleCells.push([x, y]);
        }
      }
    }

    const activeColor = block.layers[0] ?? block.color;
    for (const grid of this.coloredGrids) {
      if (grid.color === activeColor) continue;
      obstacleCells.push(...grid.cells);
    }

    for (const [dx, dy] of block.shape) {
      const cellNormal = (side === "left" || side === "right" ? block.x + dx : block.y + dy);
      const cellTangent = (side === "left" || side === "right" ? block.y + dy : block.x + dx);
      for (const [obstacleX, obstacleY] of obstacleCells) {
        const obstacleNormal = side === "left" || side === "right" ? obstacleX : obstacleY;
        const obstacleTangent = side === "left" || side === "right" ? obstacleY : obstacleX;
        if (!intervalsOverlap(cellTangent, cellTangent + 1, obstacleTangent, obstacleTangent + 1)) {
          continue;
        }
        if (translatedIntervalOverlaps(cellNormal, obstacleNormal, distance, negativeDirection)) {
          return false;
        }
      }
    }
    return true;
  }

  possibleExitSides(block: BlockState): Side[] {
    return (["top", "right", "bottom", "left"] as Side[])
      .filter((side) => this.exitAttemptStatus(block.id, side) === "ok");
  }

  private resolveExitAttempt(
    block: BlockState,
    side: Side,
  ): { status: ExitAttemptStatus; match?: MatchedGatePortal<GateState | FlipDoorState> } {
    if (!this.isBlockActive(block) || (this.revisedRules && (this.complete || this.failed))) return { status: "inactive" };
    const cells = this.blockCells(block);
    if (!exitFrontierFacesBoundary(this.level, cells, side)) return { status: "not-at-edge" };
    // A horizontal arrow piece can only cross a left/right boundary; a
    // vertical arrow piece can only cross a top/bottom boundary.
    if (!movementAxisAllowsExit(block.movementAxis, side)) return { status: "no-gate" };
    const match = resolveMatchingGatePortal(this.level, cells, side, this.gates, this.flipDoors);
    if (!match) return { status: "no-gate" };
    const activeColor = block.layers[0] ?? block.color;
    if (match.gate.color !== activeColor) return { status: "wrong-color", match };
    if (match.gate.frozen > 0) return { status: "frozen-gate", match };
    if (match.gateKind === "flipDoor" && !(match.gate as FlipDoorState).open) {
      return { status: "no-gate", match };
    }
    if (block.star && !match.gate.star) return { status: "star-gate-required", match };
    if (!this.exitPathIsClear(block, side, match.portal)) return { status: "blocked-path", match };
    return { status: "ok", match };
  }

  exitAttemptStatus(id: string, side: Side): ExitAttemptStatus {
    const block = this.getBlock(id);
    if (!block) return "inactive";
    return this.resolveExitAttempt(block, side).status;
  }

  tryExit(id: string, side: Side): ExitResult {
    const block = this.getBlock(id);
    if (!block) return { ok: false };
    const resolution = this.resolveExitAttempt(block, side);
    if (resolution.status !== "ok" || !resolution.match) return { ok: false };
    const activeColor = block.layers[0] ?? block.color;
    const resolvedTarget = {
      gateId: resolution.match.gateId,
      portalIndex: resolution.match.portalIndex,
    };
    this.start();
    this.markActionMutated();
    const eligibleFlipDoorIds = this.captureFlipDoorEligibility();

    if (block.layers.length > 1) {
      block.layers.shift();
      block.color = block.layers[0];
      if (this.revisedRules) delete block.timedBombSeconds;
      this.cleared += 1;
      if (this.advanceCounters(id, false) && this.pendingHistory) this.pendingGeneratorCheck = true;
      let exitAnimationId: string | undefined;
      if (this.revisedRules) {
        exitAnimationId = this.registerExitCompletion(eligibleFlipDoorIds);
        this.settleRevisedSpace();
      }
      return { ok: true, blockId: id, color: activeColor, side, ...resolvedTarget,
        ...(exitAnimationId ? { exitAnimationId } : {}), layerRemoved: true, complete: false };
    }

    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.releaseKey(block.keyId);
    this.cleared += 1;
    this.advanceCounters(id, true);
    const exitAnimationId = this.registerExitCompletion(eligibleFlipDoorIds);
    if (this.revisedRules) this.settleRevisedSpace();
    else if (this.pendingHistory) this.pendingGeneratorCheck = true;
    this.updateComplete();
    return { ok: true, blockId: id, color: activeColor, side, ...resolvedTarget,
      ...(exitAnimationId ? { exitAnimationId } : {}), complete: this.complete };
  }

  removeBlockWithBooster(id: string): ExitResult {
    if (this.revisedRules && (this.complete || this.failed)) return { ok: false };
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return { ok: false };
    const color = block.layers[0] ?? block.color;
    const eligibleFlipDoorIds = this.captureFlipDoorEligibility();
    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.releaseKey(block.keyId);
    this.cleared += 1;
    this.advanceCounters(id, true);
    const exitAnimationId = this.registerExitCompletion(eligibleFlipDoorIds);
    this.markSpatialActionMutated();
    this.updateComplete();
    return { ok: true, blockId: id, color, ...(exitAnimationId ? { exitAnimationId } : {}), complete: this.complete };
  }

  thawAll(amount = 1): boolean {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    let changed = false;
    for (const gate of this.gates) {
      if (gate.frozen > 0) {
        const next = Math.max(0, gate.frozen - amount);
        if (next !== gate.frozen) changed = true;
        gate.frozen = next;
      }
    }
    for (const door of this.flipDoors) {
      if (door.frozen > 0) {
        const next = Math.max(0, door.frozen - amount);
        if (next !== door.frozen) changed = true;
        door.frozen = next;
      }
    }
    for (const block of this.blocks) {
      if (this.revisedRules && !this.isBlockVisible(block)) continue;
      if (block.frozen > 0) {
        const next = Math.max(0, block.frozen - amount);
        if (next !== block.frozen) changed = true;
        block.frozen = next;
      }
    }
    for (const shutter of this.shutters) {
      // Cohort-gated staging devices cannot be bypassed by a countdown pulse.
      if (shutter.skin !== "staging"
        && shutter.skin !== "lift"
        && shutter.skin !== "staged-frame"
        && shutter.count > 0) {
        const next = Math.max(0, shutter.count - amount);
        if (next !== shutter.count) changed = true;
        shutter.count = next;
      }
    }
    if (changed) {
      this.markActionMutated();
      if (this.revisedRules) this.settleRevisedSpace();
    }
    return changed;
  }

  private advanceCounters(clearedId: string, blockRemoved: boolean): boolean {
    for (const gate of this.gates) gate.frozen = Math.max(0, gate.frozen - 1);
    for (const door of this.flipDoors) door.frozen = Math.max(0, door.frozen - 1);
    for (const block of this.blocks) {
      if (this.revisedRules && !this.isBlockVisible(block)) continue;
      if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
    }
    for (const shutter of this.shutters) {
      if (this.revisedRules && shutter.skin === "lift") continue;
      // Cohort-gated stages count whole blocks, never removable outer shells.
      if ((shutter.skin === "staging" || shutter.skin === "lift" || shutter.skin === "staged-frame")
        && !blockRemoved) continue;
      if (shutter.triggerBlockIds && !shutter.triggerBlockIds.includes(clearedId)) continue;
      shutter.count = Math.max(0, shutter.count - 1);
    }
    return this.advanceConveyors();
  }

  private captureFlipDoorEligibility(): string[] | undefined {
    return usesFrozenFlipDoorEligibility(this.level)
      ? this.flipDoors.filter((door) => door.frozen <= 0).map((door) => door.id) : undefined;
  }

  private toggleFlipDoors(eligibleIds?: readonly string[]): void {
    for (const door of this.flipDoors) {
      if (eligibleIds === undefined || eligibleIds.includes(door.id)) door.open = !door.open;
    }
  }

  private registerExitCompletion(eligibleIds?: string[]): string | undefined {
    // Levels without flip doors keep their existing visual/celebration timing.
    if (!this.flipDoors.length) return undefined;
    if (!usesExitAnimationCompletion(this.level)) {
      this.toggleFlipDoors(eligibleIds);
      return undefined;
    }
    // Sequence numbers never rewind with history, preventing cancelled callbacks
    // from completing a later departure that happens to remove the same block.
    const id = `exit-${this.exitAnimationNamespace}-${this.nextExitAnimationSequence++}`;
    this.pendingExitAnimations.add(id);
    if (eligibleIds !== undefined) this.pendingExitFlipDoorIds.set(id, [...eligibleIds]);
    if (!this.options.deferExitCompletion) this.completeExitAnimation(id);
    return id;
  }

  private settleExitInSnapshot(snapshot: PuzzleSnapshot, id: string, toggle: boolean): void {
    if (!snapshot.pendingExitAnimations?.includes(id)) return;
    const remaining = snapshot.pendingExitAnimations.filter((pending) => pending !== id);
    if (remaining.length) snapshot.pendingExitAnimations = remaining;
    else delete snapshot.pendingExitAnimations;
    const eligibleIds = snapshot.pendingExitFlipDoorIds?.[id];
    if (toggle) {
      for (const door of snapshot.flipDoors) {
        if (!usesFrozenFlipDoorEligibility(this.level) || eligibleIds?.includes(door.id)) door.open = !door.open;
      }
    }
    if (snapshot.pendingExitFlipDoorIds) {
      delete snapshot.pendingExitFlipDoorIds[id];
      if (!Object.keys(snapshot.pendingExitFlipDoorIds).length) delete snapshot.pendingExitFlipDoorIds;
    }
  }

  /** Completes one registered departure, including the final winning departure. */
  completeExitAnimation(id: string): boolean {
    if (!this.pendingExitAnimations.has(id)) return false;
    if (this.failed) {
      this.discardPendingExitAnimations();
      return false;
    }
    this.pendingExitAnimations.delete(id);
    this.toggleFlipDoors(usesFrozenFlipDoorEligibility(this.level) ? (this.pendingExitFlipDoorIds.get(id) ?? []) : undefined);
    this.pendingExitFlipDoorIds.delete(id);
    // An earlier departure may finish during a later gesture. Carry that
    // completion through snapshots which already contained it, so cancelling or
    // undoing the later gesture cannot revive an animation which no longer exists.
    for (const snapshot of this.history) this.settleExitInSnapshot(snapshot, id, true);
    if (this.pendingHistory) this.settleExitInSnapshot(this.pendingHistory, id, true);
    return true;
  }

  private discardPendingExitAnimations(): void {
    for (const id of this.pendingExitAnimations) {
      for (const snapshot of this.history) this.settleExitInSnapshot(snapshot, id, false);
      if (this.pendingHistory) this.settleExitInSnapshot(this.pendingHistory, id, false);
    }
    this.pendingExitAnimations.clear();
    this.pendingExitFlipDoorIds.clear();
  }

  private updateComplete(): void {
    this.complete = this.blocks.length === 0 && this.queuedBlocks.length === 0;
    if (this.complete) this.clearTimeFreeze();
  }

  private coverOccupiesBoard(shutter: ShutterState): boolean {
    return shutterHasPhysicalFootprint(this.revisedRules && !shutter.revealed
      ? { ...shutter, count: Math.max(1, shutter.count) }
      : shutter);
  }

  /** An entire hidden layer enters atomically, including frozen/locked pieces. */
  private canRevealBatch(shutter: ShutterState): boolean {
    const occupied = new Set<string>();
    for (const block of this.blocks) {
      if (!this.isBlockVisible(block)) continue;
      for (const [x, y] of this.blockCells(block)) occupied.add(`${x},${y}`);
    }
    for (const cover of this.shutters) {
      if (cover.id === shutter.id || !this.coverOccupiesBoard(cover)) continue;
      for (let y = cover.y; y < cover.y + cover.height; y += 1) {
        for (let x = cover.x; x < cover.x + cover.width; x += 1) occupied.add(`${x},${y}`);
      }
    }
    for (const block of this.blocks.filter((candidate) => candidate.shutterId === shutter.id)) {
      const cells = this.blockCells(block);
      if (footprintCrossesBoardSeam(this.level, cells)) return false;
      for (const [x, y] of cells) {
        const key = `${x},${y}`;
        if (!this.playableKeys.has(key) || this.blockedKeys.has(key) || occupied.has(key)) return false;
        if (this.coloredGrids.some((grid) => grid.color !== (block.layers[0] ?? block.color)
          && grid.cells.some(([gx, gy]) => gx === x && gy === y))) return false;
        occupied.add(key);
      }
    }
    return true;
  }

  /** Every successful iteration consumes a finite hidden layer or queue head. */
  private settleRevisedSpace(): void {
    if (!this.revisedRules || this.failed || this.complete) return;
    let changed: boolean;
    do {
      changed = false;
      for (const shutter of this.shutters) {
        if (shutter.revealed) continue;
        if (shutter.skin === "lift") {
          const covered = this.blocks.some((block) => this.isBlockVisible(block)
            && this.blockCells(block).some(([x, y]) => x >= shutter.x && x < shutter.x + shutter.width
              && y >= shutter.y && y < shutter.y + shutter.height));
          if (covered) continue;
        } else if (shutter.count > 0) continue;
        if (!this.canRevealBatch(shutter)) continue;
        shutter.count = 0;
        shutter.revealed = true;
        changed = true;
      }
      for (const generator of this.generators) {
        if ((generator.trigger ?? "move") === "move" && this.releaseGeneratorHead(generator)) changed = true;
      }
    } while (changed);
    this.updateComplete();
  }

  /**
   * Each independent machine gets one release attempt per committed spatial
   * action. A blocked footprint leaves both the queue head and count intact.
   */
  private releaseOneFromEachReadyGenerator(): void {
    for (const generator of this.generators) {
      if ((generator.trigger ?? "move") !== "move") continue;
      this.releaseGeneratorHead(generator);
    }
    this.updateComplete();
  }

  private releaseGeneratorHead(generator: GeneratorState, held?: HeldBlockReservation): boolean {
    if (generator.remaining <= 0 || !generator.nextBlockId) return false;
    const queuedIndex = this.queuedBlocks.findIndex((block) => block.id === generator.nextBlockId);
    if (queuedIndex < 0) return false;
    const queued = this.queuedBlocks[queuedIndex];
    const candidate: BlockState = {
      ...queued,
      x: generator.spawn[0],
      y: generator.spawn[1],
      shape: clonePoints(queued.shape),
      layers: [...queued.layers],
    };
    // A frozen or key-locked queued block still materializes and occupies its
    // footprint; only player movement is disabled by those constraints.
    const placementProbe: BlockState = {
      ...candidate,
      frozen: 0,
      lockedBy: undefined,
      shutterId: undefined,
    };
    if (!this.canPlace(placementProbe, placementProbe.x, placementProbe.y)) return false;
    if (generator.trigger === "time" && (
      this.overlapsHeldReservation(candidate, candidate.x, candidate.y, held)
      || !this.timedCargoFitsRollback(candidate)
    )) return false;
    this.queuedBlocks.splice(queuedIndex, 1);
    this.blocks.push(candidate);
    generator.head += 1;
    generator.remaining = generator.queueBlockIds.length - generator.head;
    generator.nextBlockId = generator.queueBlockIds[generator.head];
    if (generator.trigger === "time" && this.pendingHistory) {
      const baselineIndex = this.pendingHistory.queuedBlocks.findIndex((block) => block.id === candidate.id);
      if (baselineIndex >= 0) {
        const [baselineCargo] = this.pendingHistory.queuedBlocks.splice(baselineIndex, 1);
        // Keep pre-action locks/attributes: cancelling the player's key clear
        // must still restore those, independently of autonomous delivery.
        this.pendingHistory.blocks.push({ ...baselineCargo, x: candidate.x, y: candidate.y });
      }
    }
    this.updateComplete();
    return true;
  }

  private timedCargoFitsRollback(candidate: BlockState): boolean {
    const baseline = this.pendingHistory;
    if (!baseline) return true;
    const occupied = new Set<string>();
    for (const block of baseline.blocks) {
      if (block.shutterId && baseline.shutters.some((shutter) => shutter.id === block.shutterId && shutter.count > 0)) continue;
      for (const [x, y] of this.blockCells(block)) occupied.add(`${x},${y}`);
    }
    for (const shutter of baseline.shutters) {
      if (!shutterHasPhysicalFootprint(shutter)) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(`${x},${y}`);
      }
    }
    return this.blockCells(candidate).every(([x, y]) => !occupied.has(`${x},${y}`));
  }

  private advanceTimedGenerators(deltaSeconds: number, held?: HeldBlockReservation): boolean {
    let changed = false;
    for (const generator of this.generators) {
      if (generator.trigger !== "time" || generator.remaining <= 0) continue;
      const interval = generator.intervalSeconds ?? 1;
      generator.elapsed += deltaSeconds;
      // A backgrounded tab or a slow frame can cross several feeder beats at
      // once. Consume every elapsed beat while the next spawn footprint is
      // free; otherwise keep one beat banked so the feeder resumes promptly
      // after the blocking piece moves without producing an unbounded burst.
      while (generator.remaining > 0) {
        const threshold = generator.head === 0
          ? generator.initialDelaySeconds ?? interval
          : interval;
        if (generator.elapsed + 1e-9 < threshold) break;
        if (!this.releaseGeneratorHead(generator, held)) {
          generator.elapsed = Math.min(generator.elapsed, threshold);
          break;
        }
        generator.elapsed = Math.max(0, generator.elapsed - threshold);
        changed = true;
      }
      if (this.pendingHistory) {
        const baselineGenerator = this.pendingHistory.generators.find((item) => item.id === generator.id);
        if (baselineGenerator) Object.assign(baselineGenerator, {
          head: generator.head,
          remaining: generator.remaining,
          nextBlockId: generator.nextBlockId,
          elapsed: generator.elapsed,
        });
      }
    }
    return changed;
  }

  private releaseKey(keyId: string | undefined): void {
    if (!keyId) return;
    for (const block of this.blocks) {
      if (block.lockedBy !== keyId) continue;
      const remaining = Math.max(0, (block.lockCount ?? 1) - 1);
      if (remaining > 0) block.lockCount = remaining;
      else {
        block.lockedBy = undefined;
        block.lockCount = undefined;
      }
    }
    for (const block of this.queuedBlocks) {
      if (block.lockedBy !== keyId) continue;
      const remaining = Math.max(0, (block.lockCount ?? 1) - 1);
      if (remaining > 0) block.lockCount = remaining;
      else {
        block.lockedBy = undefined;
        block.lockCount = undefined;
      }
    }
  }

  private advanceElevators(deltaSeconds: number, held?: HeldBlockReservation): boolean {
    let spatialChanged = false;
    for (const elevator of this.elevators) {
      elevator.elapsed += deltaSeconds;
      if (elevator.elapsed < elevator.periodSeconds) continue;
      elevator.elapsed %= elevator.periodSeconds;
      const destinationX = elevator.direction > 0 ? elevator.toX : elevator.fromX;
      const destinationY = elevator.direction > 0 ? elevator.toY : elevator.fromY;
      const stepX = Math.sign(destinationX - elevator.x);
      const stepY = Math.sign(destinationY - elevator.y);
      if (stepX === 0 && stepY === 0) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
        continue;
      }
      const block = this.getBlock(elevator.blockId);
      const carrying = block?.x === elevator.x && block?.y === elevator.y && held?.blockId !== block.id;
      const targetX = block ? block.x + stepX : 0;
      const targetY = block ? block.y + stepY : 0;
      if (carrying && block && (
        !this.canTranslate(block, targetX, targetY)
        || this.overlapsHeldReservation(block, targetX, targetY, held)
      )) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
        continue;
      }
      elevator.x += stepX;
      elevator.y += stepY;
      spatialChanged = true;
      if (carrying && block) {
        block.x += stepX;
        block.y += stepY;
      }
      if (elevator.x === destinationX && elevator.y === destinationY) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
      }
    }
    return spatialChanged;
  }

  private overlapsHeldReservation(
    moving: BlockState,
    targetX: number,
    targetY: number,
    held?: HeldBlockReservation,
  ): boolean {
    if (!held || held.blockId === moving.id) return false;
    const epsilon = 1e-3;
    const heldAnchors: Array<readonly [number, number]> = [[held.x, held.y]];
    if (held.rollbackX !== undefined && held.rollbackY !== undefined) {
      heldAnchors.push([held.rollbackX, held.rollbackY]);
    }
    return moving.shape.some(([dx, dy]) => {
      const x = targetX + dx;
      const y = targetY + dy;
      return heldAnchors.some(([anchorX, anchorY]) => (
        held.shape.some(([heldDx, heldDy]) => {
          const heldX = anchorX + heldDx;
          const heldY = anchorY + heldDy;
          return x < heldX + 1 - epsilon
            && x + 1 > heldX + epsilon
            && y < heldY + 1 - epsilon
            && y + 1 > heldY + epsilon;
        })
      ));
    });
  }

  private advanceConveyors(): boolean {
    let changed = false;
    const vectors: Record<Side, readonly [number, number]> = {
      top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0],
    };
    for (const conveyor of this.conveyors) {
      const block = this.getBlock(conveyor.blockId);
      if (!block || !this.isBlockActive(block)) continue;
      const cells = this.blockCells(block);
      const onBelt = cells.every(([x, y]) => (
        x >= conveyor.x && x < conveyor.x + conveyor.width
        && y >= conveyor.y && y < conveyor.y + conveyor.height
      ));
      if (!onBelt) continue;
      const [dx, dy] = vectors[conveyor.direction];
      if (this.canTranslate(block, block.x + dx, block.y + dy)) {
        block.x += dx;
        block.y += dy;
        changed = true;
      }
    }
    return changed;
  }
}

const RETIRED_MECHANISM_NAMES = new Set<string>();
const RETIRED_LEVEL_FIELDS = new Set([
  "keys", "keyBlocks", "key_blocks", "keyLocks", "key_locks", "arrowBlocks", "arrow_blocks",
]);
const RETIRED_BLOCK_FIELDS = new Set([
  "key", "key_id", "isKey", "is_key", "unlocks", "unlocksGateId", "unlocks_gate_id",
  "lockId", "lock_id", "locked", "locked_by", "requiresKey", "requires_key",
  "requiredKey", "required_key", "arrow", "arrowDirection", "arrow_direction", "direction",
  "moveAxis", "move_axis", "movement_axis", "allowedAxes", "allowed_axes",
  "allowedDirections", "allowed_directions", "directionLock", "direction_lock",
]);
const RETIRED_GATE_FIELDS = new Set([
  "key", "keyId", "key_id", "lockId", "lock_id", "locked", "lockedByKey", "locked_by_key",
  "requiresKey", "requires_key", "requiredKey", "required_key", "unlockKeyId", "unlock_key_id",
]);
const RETIRED_RUNTIME_ID = /(?:^|[-_])legacy-(?:key|arrow-block|belt-lock)(?:$|[-_])/i;

const retiredFieldsIn = (value: object, retired: ReadonlySet<string>): string[] => (
  Object.keys(value).filter((field) => retired.has(field))
);

export const validateLevel = (level: LevelSpec): void => {
  if (level.mechanismRules !== undefined && !usesRevisedMechanisms(level)) {
    throw new Error(`Level ${level.id}: unsupported mechanismRules ${String(level.mechanismRules)}`);
  }
  const rawLevel = level as unknown as Record<string, unknown>;
  const levelFields = retiredFieldsIn(rawLevel, RETIRED_LEVEL_FIELDS);
  const rawMechanisms = Array.isArray(rawLevel.mechanism) ? rawLevel.mechanism : [];
  const rawMechanismConfig = rawLevel.mechanism_config && typeof rawLevel.mechanism_config === "object"
    ? rawLevel.mechanism_config as Record<string, unknown>
    : {};
  const retiredMechanisms = [
    ...rawMechanisms.filter((name): name is string => typeof name === "string" && RETIRED_MECHANISM_NAMES.has(name)),
    ...Object.keys(rawMechanismConfig).filter((name) => RETIRED_MECHANISM_NAMES.has(name)),
  ];
  if (levelFields.length || retiredMechanisms.length) {
    throw new Error(`Level ${level.id}: retired key-lock/arrow-block mechanic is not supported (${[
      ...levelFields,
      ...retiredMechanisms,
    ].join(", ")})`);
  }
  if (level.bombFailurePolicy !== undefined && level.bombFailurePolicy !== "fail") {
    throw new Error(`Level ${level.id}: invalid bombFailurePolicy ${String(level.bombFailurePolicy)}`);
  }
  if (level.width < 2 || level.height < 2) throw new Error(`Level ${level.id}: board is too small`);
  validateBoardSeams(level);
  const ids = new Set<string>();
  const playable = new Set<string>();
  for (const [x, y] of level.playable ?? rectangularCells(level.width, level.height)) {
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
      throw new Error(`Level ${level.id}: playable cell ${key} is out of bounds`);
    }
    if (playable.has(key)) throw new Error(`Level ${level.id}: duplicate playable cell ${key}`);
    playable.add(key);
  }
  if (!playable.size) throw new Error(`Level ${level.id}: board has no playable cells`);
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  const occupied = new Set<string>();
  const shutters = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const queuedByBlock = new Map<string, NonNullable<LevelSpec["generators"]>[number]>();
  const gateCells = new Set<string>();

  for (const generator of level.generators ?? []) {
    if (RETIRED_RUNTIME_ID.test(generator.id)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} uses a retired key-lock identifier`);
    }
    if (ids.has(generator.id)) throw new Error(`Level ${level.id}: duplicate id ${generator.id}`);
    ids.add(generator.id);
    const limit = generator.side === "top" || generator.side === "bottom" ? level.width : level.height;
    if (!Number.isInteger(generator.offset) || generator.offset < 0 || generator.offset >= limit) {
      throw new Error(`Level ${level.id}: generator ${generator.id} rim offset is out of bounds`);
    }
    if (generator.spawn.length !== 2 || !generator.spawn.every(Number.isInteger)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} spawn must be an integer board anchor`);
    }
    if (!generator.queueBlockIds.length) {
      throw new Error(`Level ${level.id}: generator ${generator.id} queue is empty`);
    }
    const trigger = generator.trigger ?? "move";
    if (trigger !== "move" && trigger !== "time") {
      throw new Error(`Level ${level.id}: generator ${generator.id} has invalid trigger ${String(trigger)}`);
    }
    if (trigger === "time" && (!Number.isFinite(generator.intervalSeconds) || (generator.intervalSeconds ?? 0) <= 0)) {
      throw new Error(`Level ${level.id}: timed generator ${generator.id} needs a positive intervalSeconds`);
    }
    if (generator.initialDelaySeconds !== undefined
      && (!Number.isFinite(generator.initialDelaySeconds) || generator.initialDelaySeconds <= 0)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} has invalid initialDelaySeconds`);
    }
    const ownQueue = new Set<string>();
    for (const blockId of generator.queueBlockIds) {
      if (ownQueue.has(blockId)) {
        throw new Error(`Level ${level.id}: generator ${generator.id} repeats queued block ${blockId}`);
      }
      ownQueue.add(blockId);
      if (queuedByBlock.has(blockId)) {
        throw new Error(`Level ${level.id}: queued block ${blockId} belongs to multiple generators`);
      }
      queuedByBlock.set(blockId, generator);
    }
  }

  for (const gate of level.gates) {
    const retiredFields = retiredFieldsIn(gate as unknown as object, RETIRED_GATE_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(gate.id)) {
      throw new Error(`Level ${level.id}: gate ${gate.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(gate.id)) throw new Error(`Level ${level.id}: duplicate id ${gate.id}`);
    ids.add(gate.id);
    if (gate.frozen !== undefined && (!Number.isInteger(gate.frozen) || gate.frozen <= 0)) {
      throw new Error(`Level ${level.id}: gate ${gate.id} must omit frozen for an ordinary exit or use a positive integer countdown`);
    }
    validateGatePortalGeometry(level, gate, { gateId: gate.id, gateKind: "gate" }, gateCells);
  }

  for (const door of level.flipDoors ?? []) {
    const retiredFields = retiredFieldsIn(door as unknown as object, RETIRED_GATE_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(door.id)) {
      throw new Error(`Level ${level.id}: flip door ${door.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(door.id)) throw new Error(`Level ${level.id}: duplicate id ${door.id}`);
    ids.add(door.id);
    if (typeof door.initiallyOpen !== "boolean") {
      throw new Error(`Level ${level.id}: flip door ${door.id} needs a boolean initiallyOpen state`);
    }
    if (door.frozen !== undefined && (!Number.isInteger(door.frozen) || door.frozen <= 0)) {
      throw new Error(`Level ${level.id}: flip door ${door.id} must omit frozen or use a positive integer countdown`);
    }
    validateGatePortalGeometry(level, door, { gateId: door.id, gateKind: "flip door" }, gateCells);
  }

  const coloredGridCells = new Map<string, ColoredGridSpec["color"]>();
  for (const grid of level.coloredGrids ?? []) {
    if (ids.has(grid.id)) throw new Error(`Level ${level.id}: duplicate id ${grid.id}`);
    ids.add(grid.id);
    if (!grid.cells.length) throw new Error(`Level ${level.id}: colored grid ${grid.id} has no cells`);
    const ownCells = new Set<string>();
    for (const [x, y] of grid.cells) {
      const key = `${x},${y}`;
      if (!Number.isInteger(x) || !Number.isInteger(y) || !playable.has(key) || blocked.has(key)) {
        throw new Error(`Level ${level.id}: colored grid ${grid.id} has invalid cell ${key}`);
      }
      if (ownCells.has(key)) throw new Error(`Level ${level.id}: colored grid ${grid.id} repeats cell ${key}`);
      if (coloredGridCells.has(key)) throw new Error(`Level ${level.id}: colored grids overlap at ${key}`);
      ownCells.add(key);
      coloredGridCells.set(key, grid.color);
    }
  }

  for (const block of level.blocks) {
    const generator = queuedByBlock.get(block.id);
    const retiredFields = retiredFieldsIn(block as unknown as object, RETIRED_BLOCK_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(block.id)) {
      throw new Error(`Level ${level.id}: block ${block.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(block.id)) throw new Error(`Level ${level.id}: duplicate id ${block.id}`);
    ids.add(block.id);
    if (block.layers && block.layers.length === 0) {
      throw new Error(`Level ${level.id}: block ${block.id} layers must contain the body color`);
    }
    if ((block.layers?.length ?? 1) > MAX_BLOCK_LAYERS) {
      throw new Error(`Level ${level.id}: block ${block.id} supports at most one extra shell (${MAX_BLOCK_LAYERS} clear stages)`);
    }
    if (block.layers && block.layers.length > 1 && new Set(block.layers).size !== block.layers.length) {
      throw new Error(`Level ${level.id}: block ${block.id} must use distinct outer and inner shell colors`);
    }
    if (block.movementAxis !== undefined
      && block.movementAxis !== "horizontal" && block.movementAxis !== "vertical") {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid movementAxis ${String(block.movementAxis)}`);
    }
    if (block.keyId !== undefined && (!block.keyId.trim() || block.keyId !== block.keyId.trim())) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid keyId`);
    }
    if (block.lockedBy !== undefined && (!block.lockedBy.trim() || block.lockedBy !== block.lockedBy.trim())) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid lockedBy`);
    }
    if (block.lockCount !== undefined
      && (!block.lockedBy || !Number.isInteger(block.lockCount) || block.lockCount < 1)) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid lockCount`);
    }
    if (block.keyId && block.lockedBy === block.keyId) {
      throw new Error(`Level ${level.id}: block ${block.id} cannot be locked by its own key`);
    }
    if (block.timedBombSeconds !== undefined
      && (!Number.isFinite(block.timedBombSeconds) || block.timedBombSeconds <= 0)) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid timedBombSeconds`);
    }
    if (block.rotationBadge !== undefined && typeof block.rotationBadge !== "boolean") {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid rotationBadge marker`);
    }
    if (!block.shape.length) throw new Error(`Level ${level.id}: block ${block.id} has no cells`);
    if (block.frozen !== undefined && (!Number.isInteger(block.frozen) || block.frozen <= 0)) {
      throw new Error(`Level ${level.id}: block ${block.id} must omit frozen when thawed or use a positive integer countdown`);
    }
    if (generator && (block.frozen ?? 0) > 0) {
      throw new Error(`Level ${level.id}: generator ${generator.id} queued block ${block.id} cannot be frozen`);
    }
    if ((block.frozen ?? 0) > 0 && !isIceEligibleBlockShape(block.shape)) {
      throw new Error(`Level ${level.id}: frozen block ${block.id} must use unique integer orthogonally connected cells`);
    }
    if (generator && block.shutterId) {
      throw new Error(`Level ${level.id}: queued block ${block.id} cannot also be shutter-hidden`);
    }
    if (block.shutterId && !shutters.has(block.shutterId)) {
      throw new Error(`Level ${level.id}: block ${block.id} references missing shutter ${block.shutterId}`);
    }
    const effectiveAnchorX = generator?.spawn[0] ?? block.x;
    const effectiveAnchorY = generator?.spawn[1] ?? block.y;
    const effectiveCells = block.shape.map(([dx, dy]) => [effectiveAnchorX + dx, effectiveAnchorY + dy] as Point);
    if (footprintCrossesBoardSeam(level, effectiveCells)) {
      throw new Error(`Level ${level.id}: block ${block.id} crosses a board seam`);
    }
    for (const [dx, dy] of block.shape) {
      const anchorX = effectiveAnchorX;
      const anchorY = effectiveAnchorY;
      const x = anchorX + dx;
      const y = anchorY + dy;
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
        throw new Error(`Level ${level.id}: block ${block.id} is out of bounds at ${key}`);
      }
      if (!playable.has(key)) throw new Error(`Level ${level.id}: block ${block.id} starts outside the board at ${key}`);
      if (blocked.has(key)) throw new Error(`Level ${level.id}: block ${block.id} overlaps wall ${key}`);
      const gridColor = coloredGridCells.get(key);
      const activeColor = block.layers?.[0] ?? block.color;
      if (gridColor !== undefined && gridColor !== activeColor) {
        throw new Error(`Level ${level.id}: block ${block.id} color ${activeColor} mismatches colored grid ${gridColor} at ${key}`);
      }
      if (!block.shutterId && !generator && occupied.has(key)) throw new Error(`Level ${level.id}: overlapping active block cell ${key}`);
      if (!block.shutterId && !generator) occupied.add(key);
    }
  }

  const keyIds = new Set(level.blocks.flatMap((block) => block.keyId ? [block.keyId] : []));
  for (const block of level.blocks) {
    if (block.lockedBy && !keyIds.has(block.lockedBy)) {
      throw new Error(`Level ${level.id}: block ${block.id} references missing key ${block.lockedBy}`);
    }
  }

  for (const [blockId, generator] of queuedByBlock) {
    if (!level.blocks.some((block) => block.id === blockId)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} references missing queued block ${blockId}`);
    }
    if (level.elevators?.some((elevator) => elevator.blockId === blockId)
      || level.conveyors?.some((conveyor) => conveyor.blockId === blockId)) {
      throw new Error(`Level ${level.id}: queued block ${blockId} cannot start on a progression device`);
    }
  }

  if (level.strategyNudge) {
    const { blockId, from, path, afterMoves } = level.strategyNudge;
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`Level ${level.id}: strategy nudge references missing block ${blockId}`);
    if (block.x !== from[0] || block.y !== from[1]) {
      throw new Error(`Level ${level.id}: strategy nudge start does not match block ${blockId}`);
    }
    if (!path.length || afterMoves < 1 || !Number.isInteger(afterMoves)) {
      throw new Error(`Level ${level.id}: strategy nudge must have a path and positive integer threshold`);
    }
  }

  if (level.strategyFocus) {
    const { blockId, afterMoves } = level.strategyFocus;
    if (!level.blocks.some((candidate) => candidate.id === blockId)) {
      throw new Error(`Level ${level.id}: strategy focus references missing block ${blockId}`);
    }
    if (afterMoves < 1 || !Number.isInteger(afterMoves)) {
      throw new Error(`Level ${level.id}: strategy focus must have a positive integer threshold`);
    }
  }

  for (const shutter of level.shutters ?? []) {
    if (RETIRED_RUNTIME_ID.test(shutter.id)) {
      throw new Error(`Level ${level.id}: shutter ${shutter.id} uses a retired key-lock identifier`);
    }
    const requiresExactCohort = (shutter.skin === "lift" && !usesRevisedMechanisms(level))
      || shutter.skin === "staged-frame";
    const supportsExactCohort = requiresExactCohort || shutter.skin === "staging";
    if (requiresExactCohort && shutter.triggerBlockIds === undefined) {
      throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} requires an exact trigger block cohort`);
    }
    if (supportsExactCohort && shutter.triggerBlockIds?.length === 0) {
      throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} trigger block cohort cannot be empty`);
    }
    if (shutter.triggerBlockIds !== undefined) {
      if (!supportsExactCohort) {
        throw new Error(`Level ${level.id}: shutter ${shutter.id} uses triggerBlockIds without an exact-cohort skin`);
      }
      if (new Set(shutter.triggerBlockIds).size !== shutter.triggerBlockIds.length) {
        throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} repeats a trigger block id`);
      }
      if (shutter.triggerBlockIds.length !== shutter.count) {
        throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} count must equal its trigger block cohort`);
      }
      for (const blockId of shutter.triggerBlockIds) {
        const block = level.blocks.find((candidate) => candidate.id === blockId);
        if (!block) {
          throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} references missing trigger block ${blockId}`);
        }
        if (shutter.skin === "staged-frame") {
          if (block.shutterId || queuedByBlock.has(block.id)) {
            throw new Error(`Level ${level.id}: staged frame ${shutter.id} trigger block ${blockId} must be opening-visible`);
          }
          for (const [dx, dy] of block.shape) {
            const x = block.x + dx;
            const y = block.y + dy;
            if (x < shutter.x || x >= shutter.x + shutter.width || y < shutter.y || y >= shutter.y + shutter.height) {
              throw new Error(`Level ${level.id}: staged frame ${shutter.id} does not contain trigger block ${blockId}`);
            }
          }
        }
        if (block.shutterId === shutter.id) {
          throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} cannot wait for its own hidden block ${blockId}`);
        }
      }
    }
    if (shutter.skin === "staged-frame") {
      const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
      if (!hidden.length) throw new Error(`Level ${level.id}: staged frame ${shutter.id} has no hidden batch`);
      for (const block of hidden) {
        for (const [dx, dy] of block.shape) {
          const x = block.x + dx;
          const y = block.y + dy;
          if (x < shutter.x || x >= shutter.x + shutter.width || y < shutter.y || y >= shutter.y + shutter.height) {
            throw new Error(`Level ${level.id}: staged frame ${shutter.id} does not contain hidden block ${block.id}`);
          }
        }
      }
    }
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!playable.has(`${x},${y}`)) throw new Error(`Level ${level.id}: shutter ${shutter.id} covers void at ${x},${y}`);
      }
    }
  }

  const exactCohorts = new Map((level.shutters ?? [])
    .filter((shutter) => shutter.triggerBlockIds !== undefined)
    .map((shutter) => [shutter.id, shutter]));
  const hiddenByBlock = new Map(level.blocks.flatMap((block) => (
    block.shutterId ? [[block.id, block.shutterId] as const] : []
  )));
  const visitedCohorts = new Set<string>();
  const activeCohorts = new Set<string>();
  const visitCohort = (shutterId: string): void => {
    if (visitedCohorts.has(shutterId)) return;
    if (activeCohorts.has(shutterId)) {
      throw new Error(`Level ${level.id}: exact staging cohort dependency cycle includes ${shutterId}`);
    }
    activeCohorts.add(shutterId);
    for (const blockId of exactCohorts.get(shutterId)?.triggerBlockIds ?? []) {
      const dependency = hiddenByBlock.get(blockId);
      if (dependency && exactCohorts.has(dependency)) visitCohort(dependency);
    }
    activeCohorts.delete(shutterId);
    visitedCohorts.add(shutterId);
  };
  for (const shutterId of exactCohorts.keys()) visitCohort(shutterId);

  for (const elevator of level.elevators ?? []) {
    if (RETIRED_RUNTIME_ID.test(elevator.id) || RETIRED_RUNTIME_ID.test(elevator.blockId)) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} uses a retired key-lock/arrow-block identifier`);
    }
    if (ids.has(elevator.id)) throw new Error(`Level ${level.id}: duplicate id ${elevator.id}`);
    ids.add(elevator.id);
    if (!level.blocks.some((block) => block.id === elevator.blockId)) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} references missing block ${elevator.blockId}`);
    }
    if (elevator.periodSeconds <= 0 || elevator.width < 1 || elevator.height < 1) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} has invalid dimensions or period`);
    }
    for (const [x, y] of [[elevator.fromX, elevator.fromY], [elevator.toX, elevator.toY]] as Point[]) {
      for (let dy = 0; dy < elevator.height; dy += 1) {
        for (let dx = 0; dx < elevator.width; dx += 1) {
          if (!playable.has(`${x + dx},${y + dy}`)) throw new Error(`Level ${level.id}: elevator ${elevator.id} leaves the board`);
        }
      }
    }
  }

  for (const conveyor of level.conveyors ?? []) {
    if (RETIRED_RUNTIME_ID.test(conveyor.id) || RETIRED_RUNTIME_ID.test(conveyor.blockId)) {
      throw new Error(`Level ${level.id}: conveyor ${conveyor.id} uses a retired key-lock/arrow-block identifier`);
    }
    if (ids.has(conveyor.id)) throw new Error(`Level ${level.id}: duplicate id ${conveyor.id}`);
    ids.add(conveyor.id);
    if (!level.blocks.some((block) => block.id === conveyor.blockId)) {
      throw new Error(`Level ${level.id}: conveyor ${conveyor.id} references missing block ${conveyor.blockId}`);
    }
    for (let y = conveyor.y; y < conveyor.y + conveyor.height; y += 1) {
      for (let x = conveyor.x; x < conveyor.x + conveyor.width; x += 1) {
        if (!playable.has(`${x},${y}`)) throw new Error(`Level ${level.id}: conveyor ${conveyor.id} covers void at ${x},${y}`);
      }
    }
  }
  if (usesRevisedMechanisms(level)) assertRevisedMechanismContract(level);
};
