import type {
  BlockState,
  ConveyorSpec,
  ElevatorState,
  ExitAttemptStatus,
  ExitResult,
  GateState,
  LevelSpec,
  Point,
  PuzzleSnapshot,
  ShutterState,
  Side,
} from "./types";
import { MAX_BLOCK_LAYERS } from "./types";
import { isIceEligibleBlockShape } from "./blockShape";

const clonePoints = (points: Point[]): Point[] => points.map(([x, y]) => [x, y] as const);

const rectangularCells = (width: number, height: number): Point[] => {
  const cells: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x, y]);
  }
  return cells;
};

export interface HeldBlockReservation {
  blockId: string;
  x: number;
  y: number;
  shape: Point[];
  rollbackX?: number;
  rollbackY?: number;
}

export class PuzzleModel {
  readonly level: LevelSpec;
  private playable: Point[];
  private playableKeys: Set<string>;
  private blocked: Point[];
  private blockedKeys: Set<string>;
  private gates: GateState[];
  private blocks: BlockState[];
  private shutters: ShutterState[];
  private elevators: ElevatorState[];
  private conveyors: ConveyorSpec[];
  private cleared = 0;
  private moves = 0;
  private remainingSeconds: number;
  private started = false;
  private complete = false;
  private failed = false;
  private history: PuzzleSnapshot[] = [];
  private pendingHistory?: PuzzleSnapshot;
  /** Only explicit player mutations make an action undoable/count as a move. */
  private pendingActionMutated = false;

  constructor(level: LevelSpec) {
    validateLevel(level);
    this.level = level;
    this.playable = clonePoints(level.playable ?? rectangularCells(level.width, level.height));
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(level.blocked ?? []);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.gates = level.gates.map((gate) => ({ ...gate, frozen: gate.frozen ?? 0 }));
    this.blocks = level.blocks.map((block) => ({
      ...block,
      shape: clonePoints(block.shape),
      layers: block.layers ? [...block.layers] : [block.color],
      frozen: block.frozen ?? 0,
    }));
    this.shutters = (level.shutters ?? []).map((shutter) => ({ ...shutter }));
    this.elevators = (level.elevators ?? []).map((elevator) => ({
      ...elevator,
      x: elevator.fromX,
      y: elevator.fromY,
      direction: 1,
      elapsed: 0,
    }));
    this.conveyors = (level.conveyors ?? []).map((conveyor) => ({ ...conveyor }));
    this.remainingSeconds = level.timeSeconds;
  }

  snapshot(): PuzzleSnapshot {
    return {
      levelId: this.level.id,
      width: this.level.width,
      height: this.level.height,
      playable: clonePoints(this.playable),
      blocked: clonePoints(this.blocked),
      gates: this.gates.map((gate) => ({ ...gate })),
      blocks: this.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] })),
      shutters: this.shutters.map((shutter) => ({ ...shutter })),
      elevators: this.elevators.map((elevator) => ({ ...elevator })),
      conveyors: this.conveyors.map((conveyor) => ({ ...conveyor })),
      cleared: this.cleared,
      moves: this.moves,
      remainingSeconds: this.remainingSeconds,
      started: this.started,
      complete: this.complete,
      failed: this.failed,
    };
  }

  clone(): PuzzleModel {
    const copy = new PuzzleModel(this.level);
    copy.restore(this.snapshot());
    return copy;
  }

  private restore(snapshot: PuzzleSnapshot): void {
    this.playable = clonePoints(snapshot.playable);
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(snapshot.blocked);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.gates = snapshot.gates.map((gate) => ({ ...gate }));
    this.blocks = snapshot.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] }));
    this.shutters = snapshot.shutters.map((shutter) => ({ ...shutter }));
    this.elevators = snapshot.elevators.map((elevator) => ({ ...elevator }));
    this.conveyors = snapshot.conveyors.map((conveyor) => ({ ...conveyor }));
    this.cleared = snapshot.cleared;
    this.moves = snapshot.moves;
    this.remainingSeconds = snapshot.remainingSeconds;
    this.started = snapshot.started;
    this.complete = snapshot.complete;
    this.failed = snapshot.failed;
  }

  beginAction(): void {
    if (!this.pendingHistory) {
      this.pendingHistory = this.snapshot();
      this.pendingActionMutated = false;
    }
  }

  commitAction(countMove = true): boolean {
    if (!this.pendingHistory) return false;
    const changed = this.pendingActionMutated;
    if (changed) {
      this.history.push(this.pendingHistory);
      if (this.history.length > 20) this.history.shift();
      if (countMove) this.moves += 1;
      this.pendingHistory = undefined;
      this.pendingActionMutated = false;
      return true;
    }
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
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
        || liveFailed;
      if (liveWorldAdvanced) {
        this.remainingSeconds = Math.min(baseline.remainingSeconds, liveRemainingSeconds);
        this.started = baseline.started || live.started;
        this.failed = liveFailed || this.remainingSeconds <= 0;
        this.restoreAutonomousElevatorProgress(baseline, live);
      }
    }
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.restore(previous);
    this.pendingHistory = undefined;
    this.pendingActionMutated = false;
    return true;
  }

  private markActionMutated(): void {
    if (this.pendingHistory) this.pendingActionMutated = true;
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
        if (this.canPlace(block, targetX, targetY)) {
          block.x = targetX;
          block.y = targetY;
        }
      }
      Object.assign(elevator, liveElevator);
    }
  }

  start(): void {
    if (!this.complete && !this.failed) this.started = true;
  }

  tick(deltaSeconds: number, held?: HeldBlockReservation): boolean {
    if (!this.started || this.complete || this.failed) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
    const spatialChanged = this.advanceElevators(deltaSeconds, held);
    if (this.remainingSeconds <= 0) this.failed = true;
    return spatialChanged;
  }

  addTime(seconds: number): boolean {
    const beforeSeconds = this.remainingSeconds;
    const beforeFailed = this.failed;
    this.remainingSeconds = Math.min(this.level.timeSeconds + 120, this.remainingSeconds + seconds);
    this.failed = false;
    const changed = this.remainingSeconds !== beforeSeconds || this.failed !== beforeFailed;
    if (changed) this.markActionMutated();
    return changed;
  }

  getBlock(id: string): BlockState | undefined {
    return this.blocks.find((block) => block.id === id);
  }

  isBlockActive(block: BlockState): boolean {
    if (block.frozen > 0) return false;
    if (!block.shutterId) return true;
    const shutter = this.shutters.find((item) => item.id === block.shutterId);
    return !shutter || shutter.count <= 0;
  }

  blockCells(block: BlockState, x = block.x, y = block.y): Point[] {
    return block.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  }

  canPlace(block: BlockState, x: number, y: number): boolean {
    if (!this.isBlockActive(block)) return false;
    const occupied = new Set<string>();
    for (const other of this.blocks) {
      if (other.id === block.id) continue;
      const closedShutter = other.shutterId
        ? this.shutters.find((item) => item.id === other.shutterId && item.count > 0)
        : undefined;
      if (closedShutter) continue;
      for (const [ox, oy] of this.blockCells(other)) occupied.add(`${ox},${oy}`);
    }
    for (const shutter of this.shutters) {
      if (shutter.count <= 0) continue;
      for (let sy = shutter.y; sy < shutter.y + shutter.height; sy += 1) {
        for (let sx = shutter.x; sx < shutter.x + shutter.width; sx += 1) occupied.add(`${sx},${sy}`);
      }
    }
    return this.blockCells(block, x, y).every(([cx, cy]) => (
      cx >= 0 && cy >= 0 && cx < this.level.width && cy < this.level.height
      && this.playableKeys.has(`${cx},${cy}`)
      && !this.blockedKeys.has(`${cx},${cy}`)
      && !occupied.has(`${cx},${cy}`)
    ));
  }

  moveBlock(id: string, targetX: number, targetY: number): boolean {
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
      const candidates = Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
      let advanced = false;
      for (const [nx, ny] of candidates) {
        if ((nx === x && ny === y) || !this.canPlace(block, nx, ny)) continue;
        x = nx;
        y = ny;
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
    this.markActionMutated();
    return true;
  }

  /** Move exactly one orthogonal grid cell without choosing a route for the player. */
  moveBlockStep(id: string, targetX: number, targetY: number): boolean {
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return false;
    if (!Number.isInteger(targetX) || !Number.isInteger(targetY)) return false;
    if (Math.abs(targetX - block.x) + Math.abs(targetY - block.y) !== 1) return false;
    if (!this.canPlace(block, targetX, targetY)) return false;
    block.x = targetX;
    block.y = targetY;
    this.start();
    this.markActionMutated();
    return true;
  }

  possibleExitSides(block: BlockState): Side[] {
    return (["top", "right", "bottom", "left"] as Side[])
      .filter((side) => this.exitAttemptStatus(block.id, side) === "ok");
  }

  exitAttemptStatus(id: string, side: Side): ExitAttemptStatus {
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return "inactive";
    const cells = this.blockCells(block);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === this.level.height - 1
        : side === "left" ? minX === 0
          : maxX === this.level.width - 1;
    if (!atEdge) return "not-at-edge";

    const gate = this.gates.find((candidate) => {
      if (candidate.side !== side) return false;
      if (side === "top" || side === "bottom") return minX >= candidate.offset && maxX < candidate.offset + candidate.size;
      return minY >= candidate.offset && maxY < candidate.offset + candidate.size;
    });
    if (!gate) return "no-gate";
    const activeColor = block.layers[0] ?? block.color;
    if (gate.color !== activeColor) return "wrong-color";
    if (gate.frozen > 0) return "frozen-gate";
    if (block.star && !gate.star) return "star-gate-required";
    return "ok";
  }

  tryExit(id: string, side: Side): ExitResult {
    const block = this.getBlock(id);
    if (!block || this.exitAttemptStatus(id, side) !== "ok") return { ok: false };
    const activeColor = block.layers[0] ?? block.color;
    this.start();
    this.markActionMutated();

    if (block.layers.length > 1) {
      block.layers.shift();
      block.color = block.layers[0];
      this.cleared += 1;
      this.advanceCounters(id);
      return { ok: true, blockId: id, color: activeColor, side, layerRemoved: true, complete: false };
    }

    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.cleared += 1;
    this.advanceCounters(id);
    this.complete = this.blocks.length === 0;
    return { ok: true, blockId: id, color: activeColor, side, complete: this.complete };
  }

  removeBlockWithBooster(id: string): ExitResult {
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return { ok: false };
    const color = block.layers[0] ?? block.color;
    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.cleared += 1;
    this.advanceCounters(id);
    this.complete = this.blocks.length === 0;
    this.markActionMutated();
    return { ok: true, blockId: id, color, complete: this.complete };
  }

  thawAll(amount = 1): boolean {
    let changed = false;
    for (const gate of this.gates) {
      if (gate.frozen > 0) {
        const next = Math.max(0, gate.frozen - amount);
        if (next !== gate.frozen) changed = true;
        gate.frozen = next;
      }
    }
    for (const block of this.blocks) {
      if (block.frozen > 0) {
        const next = Math.max(0, block.frozen - amount);
        if (next !== block.frozen) changed = true;
        block.frozen = next;
      }
    }
    for (const shutter of this.shutters) {
      if (shutter.count > 0) {
        const next = Math.max(0, shutter.count - amount);
        if (next !== shutter.count) changed = true;
        shutter.count = next;
      }
    }
    if (changed) this.markActionMutated();
    return changed;
  }

  private advanceCounters(clearedId: string): void {
    for (const gate of this.gates) gate.frozen = Math.max(0, gate.frozen - 1);
    for (const block of this.blocks) {
      if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
    }
    for (const shutter of this.shutters) shutter.count = Math.max(0, shutter.count - 1);
    this.advanceConveyors();
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
        !this.canPlace(block, targetX, targetY)
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

  private advanceConveyors(): void {
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
      if (this.canPlace(block, block.x + dx, block.y + dy)) {
        block.x += dx;
        block.y += dy;
      }
    }
  }
}

const RETIRED_MECHANISM_NAMES = new Set(["钥匙方块", "钥匙与锁", "双向箭头方块"]);
const RETIRED_LEVEL_FIELDS = new Set([
  "keys", "keyBlocks", "key_blocks", "keyLocks", "key_locks", "arrowBlocks", "arrow_blocks",
]);
const RETIRED_BLOCK_FIELDS = new Set([
  "key", "keyId", "key_id", "isKey", "is_key", "unlocks", "unlocksGateId", "unlocks_gate_id",
  "lockId", "lock_id", "locked", "lockedBy", "locked_by", "requiresKey", "requires_key",
  "requiredKey", "required_key", "arrow", "arrowDirection", "arrow_direction", "direction",
  "moveAxis", "move_axis", "movementAxis", "movement_axis", "allowedAxes", "allowed_axes",
  "allowedDirections", "allowed_directions", "directionLock", "direction_lock",
]);
const RETIRED_GATE_FIELDS = new Set([
  "key", "keyId", "key_id", "lockId", "lock_id", "locked", "lockedByKey", "locked_by_key",
  "requiresKey", "requires_key", "requiredKey", "required_key", "unlockKeyId", "unlock_key_id",
]);
const RETIRED_RUNTIME_ID = /(?:^|[-_])(key|arrow-block|belt-lock)(?:$|[-_])/i;

const retiredFieldsIn = (value: object, retired: ReadonlySet<string>): string[] => (
  Object.keys(value).filter((field) => retired.has(field))
);

export const validateLevel = (level: LevelSpec): void => {
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
  if (level.width < 2 || level.height < 2) throw new Error(`Level ${level.id}: board is too small`);
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
  const gateCells = new Set<string>();

  for (const gate of level.gates) {
    const retiredFields = retiredFieldsIn(gate as unknown as object, RETIRED_GATE_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(gate.id)) {
      throw new Error(`Level ${level.id}: gate ${gate.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(gate.id)) throw new Error(`Level ${level.id}: duplicate id ${gate.id}`);
    ids.add(gate.id);
    const limit = gate.side === "top" || gate.side === "bottom" ? level.width : level.height;
    if (gate.offset < 0 || gate.size < 1 || gate.offset + gate.size > limit) {
      throw new Error(`Level ${level.id}: gate ${gate.id} is out of bounds`);
    }
    for (let coordinate = gate.offset; coordinate < gate.offset + gate.size; coordinate += 1) {
      const key = `${gate.side}:${coordinate}`;
      if (gateCells.has(key)) throw new Error(`Level ${level.id}: gate ${gate.id} overlaps another ${gate.side} gate at ${coordinate}`);
      gateCells.add(key);
      const boardKey = gate.side === "top" ? `${coordinate},0`
        : gate.side === "bottom" ? `${coordinate},${level.height - 1}`
          : gate.side === "left" ? `0,${coordinate}`
            : `${level.width - 1},${coordinate}`;
      if (!playable.has(boardKey)) throw new Error(`Level ${level.id}: gate ${gate.id} opens onto void at ${boardKey}`);
    }
  }

  for (const block of level.blocks) {
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
    if (!block.shape.length) throw new Error(`Level ${level.id}: block ${block.id} has no cells`);
    if ((block.frozen ?? 0) > 0 && !isIceEligibleBlockShape(block.shape)) {
      throw new Error(`Level ${level.id}: frozen block ${block.id} must be a solid bar or rectangle`);
    }
    if (block.shutterId && !shutters.has(block.shutterId)) {
      throw new Error(`Level ${level.id}: block ${block.id} references missing shutter ${block.shutterId}`);
    }
    for (const [dx, dy] of block.shape) {
      const x = block.x + dx;
      const y = block.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
        throw new Error(`Level ${level.id}: block ${block.id} is out of bounds at ${key}`);
      }
      if (!playable.has(key)) throw new Error(`Level ${level.id}: block ${block.id} starts outside the board at ${key}`);
      if (blocked.has(key)) throw new Error(`Level ${level.id}: block ${block.id} overlaps wall ${key}`);
      if (!block.shutterId && occupied.has(key)) throw new Error(`Level ${level.id}: overlapping active block cell ${key}`);
      if (!block.shutterId) occupied.add(key);
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
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!playable.has(`${x},${y}`)) throw new Error(`Level ${level.id}: shutter ${shutter.id} covers void at ${x},${y}`);
      }
    }
  }

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
};
