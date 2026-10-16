export const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
/** A block has one body stage plus at most one removable outer shell. */
export const MAX_BLOCK_LAYERS = 2;

export type BlockColor = (typeof COLORS)[number];
export type Side = "top" | "right" | "bottom" | "left";
export type MovementAxis = "horizontal" | "vertical";
export type Difficulty = "easy" | "normal" | "hard" | "super";
export type ExitAttemptStatus = "ok" | "inactive" | "not-at-edge" | "no-gate" | "wrong-color" | "frozen-gate" | "star-gate-required" | "blocked-path";
export type Point = readonly [number, number];

/**
 * One physical aperture on an exposed board boundary.
 *
 * `origin` is the first playable mouth cell in increasing tangent order;
 * `side` points from those playable cells into adjacent void/outside space.
 */
export interface GatePortalSpec {
  side: Side;
  origin: Point;
  size: number;
}

/**
 * A visual/physical split between adjacent rows or columns in one logical
 * board grid. `offset` is the first row/column after the split; `start` and
 * `size` select the tangent rail span. Cells remain playable on both sides,
 * but blocks cannot occupy or translate across the split.
 */
export interface BoardSeamSpec {
  orientation: "horizontal" | "vertical";
  offset: number;
  start: number;
  size: number;
}

export interface GateSpec {
  id: string;
  side: Side;
  offset: number;
  size: number;
  color: BlockColor;
  /** Positive clear countdown. Omit this field for an ordinary, unfrozen exit. */
  frozen?: number;
  /** Star blocks must use a star-marked gate; ordinary blocks may use either. */
  star?: boolean;
  /**
   * Authoritative physical apertures. Omit for a legacy outer-rectangle gate.
   * Every portal owned by this record shares its colour, ice and star state.
   * Compatibility fields side/offset/size mirror portal 0 when present.
   */
  portals?: GatePortalSpec[];
}

export interface BlockSpec {
  id: string;
  x: number;
  y: number;
  shape: Point[];
  color: BlockColor;
  /** Clear order from outermost color to the body color; length must be 1–2. */
  layers?: BlockColor[];
  frozen?: number;
  shutterId?: string;
  /** Arrow-block rule: the piece may only translate along this board axis. */
  movementAxis?: MovementAxis;
  /** Key token released when this block is completely removed. */
  keyId?: string;
  /** The block stays immobile until enough matching key tokens are released. */
  lockedBy?: string;
  /** Remaining matching-key requirement; defaults to one when lockedBy exists. */
  lockCount?: number;
  star?: boolean;
  /**
   * Per-block countdown in seconds. Revised rules arm only operable blocks,
   * fail at zero and remove the timer with its shell. Legacy levels retain
   * the level-clock / explicitly-authored-failure behavior.
   */
  timedBombSeconds?: number;
  /**
   * Source-observed circular double-arrow badge. This is intentionally only
   * presentation metadata until a distinct interaction rule is evidenced.
   */
  rotationBadge?: boolean;
}

/**
 * A directional exit whose availability flips after every complete block
 * removal. Revised rules also toggle after removing an outer shell; v1.3
 * applies that toggle when the corresponding departure animation completes.
 * v1.5 only includes doors already thawed before that event reduces counters.
 */
export interface FlipDoorSpec extends GateSpec {
  initiallyOpen: boolean;
}

export interface FlipDoorState extends FlipDoorSpec {
  open: boolean;
  frozen: number;
}

/** Board cells that only accept a block whose current outer colour matches. */
export interface ColoredGridSpec {
  id: string;
  color: BlockColor;
  cells: Point[];
}

export interface ShutterSpec {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  /**
   * `staging` is internal batch-release metadata. It reuses the counter
   * lifecycle without exposing a player-facing shutter/generator and its
   * rectangle never reserves physical board space.
   */
  skin?: "shutter" | "generator" | "staging" | "lift" | "staged-frame";
  /**
   * Optional exact removal cohort. Internal staging chains, lift layers and
   * fixed staged frames use this to advance only when named blocks leave the
   * board; ordinary countdown covers omit it and react to every clear.
   */
  triggerBlockIds?: string[];
}

/**
 * A board-external dispenser with an ordered, hidden cargo queue.
 *
 * `side`/`offset` locate the visible machine on the board rim. `spawn` is the
 * top-left anchor of its inward 3×3 staging template. Each queued block keeps
 * its own relative shape offset inside that template, and its final footprint
 * must include the center mouth cell. Queue blocks are authored in
 * `LevelSpec.blocks`, but stay outside the live board until released.
 */
export interface GeneratorSpec {
  id: string;
  side: Side;
  offset: number;
  /** Competitor-authored visual footprint along the board rim. */
  rimSpan?: 3;
  /**
   * `rim` replaces three exposed board rails. `outboard` keeps the same
   * three-cell machine outside an edge whose rails are already all occupied
   * by exits, so the device never hides an exit or blocks a playable cell.
   */
  rimMount?: "rim" | "outboard";
  /**
   * Optional local outline anchor for irregular boards. Coordinates identify
   * the centre of the middle rim rail; quarter turns are clockwise from top.
   * Gameplay spawning remains controlled exclusively by `spawn`.
   */
  rimAnchor?: {
    x: number;
    y: number;
    quarterTurns: 0 | 1 | 2 | 3;
  };
  spawn: Point;
  queueBlockIds: string[];
  /** Move-triggered is the classic side dispenser; timed is the Lv70 feeder. */
  trigger?: "move" | "time";
  /**
   * Positive seconds between timed release attempts after a successful
   * dispatch. Required when trigger is `time`. A blocked spawn holds the
   * feeder ready instead of consuming this interval.
   */
  intervalSeconds?: number;
  /**
   * Positive seconds from the first successful player operation to the first
   * release attempt. Defaults to intervalSeconds. The feeder is dormant while
   * PuzzleSnapshot.started is false.
   */
  initialDelaySeconds?: number;
}

/** Covers occupy cells; internal staging, Lift layers, and staged frames do not. */
export const shutterHasPhysicalFootprint = (
  shutter: Pick<ShutterSpec, "count" | "skin">,
): boolean => shutter.count > 0
  && shutter.skin !== "staging"
  && shutter.skin !== "lift"
  && shutter.skin !== "staged-frame";

export const STAGING_SEMANTICS_VERSION = "nonspatial-block-removal-v1" as const;

export interface ElevatorSpec {
  id: string;
  blockId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width: number;
  height: number;
  periodSeconds: number;
}

export interface ElevatorState extends ElevatorSpec {
  x: number;
  y: number;
  direction: 1 | -1;
  elapsed: number;
}

export interface ConveyorSpec {
  id: string;
  blockId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Side;
}

export interface LevelSpec {
  /** Explicit opt-in; omitted historical levels retain their original semantics. */
  mechanismRules?: "revised-2026-09-21" | "revised-2026-09-21-v1.1" | "revised-2026-09-21-v1.2" | "revised-2026-09-23-v1.3" | "revised-2026-09-23-v1.4" | "revised-2026-09-27-v1.5";
  id: number;
  name: string;
  difficulty: Difficulty;
  timeSeconds: number;
  /** Historical map metadata; actual clear coins use the account-level completionRewards policy. */
  reward: number;
  parMoves?: number;
  /** Exact pre-remake displayed target, when a new layout would trigger the
   * legacy par-outlier heuristic. Preserves scoring; not a difficulty claim. */
  preservedMoveTarget?: number;
  width: number;
  height: number;
  /** Explicit playable-cell mask. Omit only for legacy rectangular fixtures. */
  playable?: Point[];
  blocked?: Point[];
  /** Physical gaps between adjacent playable cells in the same logical grid. */
  seams?: BoardSeamSpec[];
  gates: GateSpec[];
  blocks: BlockSpec[];
  flipDoors?: FlipDoorSpec[];
  coloredGrids?: ColoredGridSpec[];
  /**
   * Omit when the source only proves a visible countdown. `fail` must be
   * authored explicitly because failure-at-zero is not safe to infer.
   */
  bombFailurePolicy?: "fail";
  shutters?: ShutterSpec[];
  generators?: GeneratorSpec[];
  elevators?: ElevatorSpec[];
  conveyors?: ConveyorSpec[];
  /**
   * Authored campaign targets. These are planning constraints, not measured
   * solver results; validation/proof evidence is kept in the generated audit.
   */
  designTargets?: {
    formulaVersion: "blockout-d1";
    calibratedDifficulty: number;
    minimumRepositionOverhead: number | null;
  };
  /**
   * Optional auditable composition certificate used by independently-authored
   * daily layouts. It has no gameplay effect: it records a seam-separated
   * partition whose component proofs can be checked and summed without
   * claiming that a bounded monolithic search exhausted the full board.
   */
  dailyProof?: {
    kind: "seam-chambers-v1" | "seam-component-v1";
    componentWidth: number;
    componentHeight: number;
    componentCount: number;
    componentFloor: number;
    /** Optional isolated mechanism chamber; it is excluded from the sum but
     * included in the exact route replay. */
    marker?: { yStart: number; height: number; mechanism: string };
  };
  /** Authored first-session gesture. Path entries are successive block origins. */
  onboardingHint?: {
    blockId: string;
    path: Point[];
  };
  /** One-step rescue shown only after repeated moves without a clear. */
  strategyNudge?: {
    blockId: string;
    from: Point;
    path: Point[];
    afterMoves: number;
  };
  /** Non-directional rescue focus shown after repeated moves without a clear. */
  strategyFocus?: {
    blockId: string;
    afterMoves: number;
  };
  /**
   * Authorised level-specific rescue: once the board has no available exits,
   * guide the player to remove the named block with the rocket booster.
   */
  rocketRescue?: {
    trigger: "no-exit-deadlock";
    targetBlockId: string;
    deadlockBlockId: string;
    deadlockPosition: Point;
  };
  /**
   * Authorised Lv10 rescue: the named frozen block is held at one until the
   * pulse booster is used, then the player is guided to move that block.
   */
  pulseRescue?: {
    trigger: "frozen-one";
    targetBlockId: string;
    targetPosition: Point;
    requiredFrozen: number;
  };
  featureIntro?: {
    title: string;
    description: string;
    kind: "ice-door" | "ice-block" | "layer" | "shutter" | "generator" | "arrow-block" | "lift" | "timed-generator" | "key-lock" | "staged-frame" | "elevator" | "conveyor" | "star";
  };
  /** Explicit user-authorized mechanism adaptation recorded with a reviewed map. */
  mechanismAdaptation?: {
    userAuthorized: string;
    change: string;
    /** Independent source observations supporting the authored differences. */
    sourceFactsFile?: string;
    preservedShutterIds?: string[];
  };
}

export interface GateState extends GateSpec {
  frozen: number;
}

export interface BlockState extends Omit<BlockSpec, "layers" | "frozen"> {
  layers: BlockColor[];
  frozen: number;
}

export interface ShutterState extends ShutterSpec {
  count: number;
  /** Revised rules: the whole hidden batch has safely entered the visible board. */
  revealed?: boolean;
}

export interface GeneratorState extends GeneratorSpec {
  /** Index of the next queued block. */
  head: number;
  /** Authoritative player-facing cargo count, including the next queued block. */
  remaining: number;
  /** Cached preview identity; absent when the machine is exhausted. */
  nextBlockId?: string;
  /** Cadence progress since player activation or the previous successful dispatch. */
  elapsed: number;
}

export interface PuzzleSnapshot {
  mechanismRules?: LevelSpec["mechanismRules"];
  levelId: number;
  width: number;
  height: number;
  playable: Point[];
  blocked: Point[];
  seams: BoardSeamSpec[];
  gates: GateState[];
  flipDoors: FlipDoorState[];
  /** v1.3 departures awaiting their one flip-door completion; absent when empty. */
  pendingExitAnimations?: string[];
  /** v1.5 eligibility captured before each departure reduces ice; an empty set is meaningful. */
  pendingExitFlipDoorIds?: Record<string, string[]>;
  coloredGrids: ColoredGridSpec[];
  /** Visible/released blocks only. */
  blocks: BlockState[];
  /** Hidden generator cargo; never participates in board collision. */
  queuedBlocks: BlockState[];
  shutters: ShutterState[];
  generators: GeneratorState[];
  elevators: ElevatorState[];
  conveyors: ConveyorSpec[];
  cleared: number;
  moves: number;
  remainingSeconds: number;
  /** Remaining active-play freeze; pauses the level and bomb clocks, not spatial mechanisms. */
  timeFreezeSeconds: number;
  /** Rescue levels only: an effective pulse in this run unlocks the final ice decrement. */
  pulseRescueUsed?: boolean;
  /** Whether the level countdown is running. */
  started: boolean;
  /** Whether time-driven board mechanisms have been activated by player play. */
  autonomousStarted: boolean;
  complete: boolean;
  failed: boolean;
}

export interface ExitResult {
  ok: boolean;
  blockId?: string;
  color?: BlockColor;
  side?: Side;
  /** Resolved logical exit. Present for successful board exits. */
  gateId?: string;
  /** Resolved physical aperture within the logical exit. */
  portalIndex?: number;
  layerRemoved?: boolean;
  /** v1.3 departure token, completed once by the renderer (or immediately headlessly). */
  exitAnimationId?: string;
  complete?: boolean;
}

export const rect = (width: number, height: number): Point[] => {
  const cells: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x, y]);
  }
  return cells;
};

export const shape = (...rows: string[]): Point[] => {
  const cells: Point[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== ".") cells.push([x, y]);
    });
  });
  return cells;
};
