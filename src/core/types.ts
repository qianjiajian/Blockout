export const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
/** A block has one body stage plus at most one removable outer shell. */
export const MAX_BLOCK_LAYERS = 2;

export type BlockColor = (typeof COLORS)[number];
export type Side = "top" | "right" | "bottom" | "left";
export type Difficulty = "normal" | "hard" | "super";
export type ExitAttemptStatus = "ok" | "inactive" | "not-at-edge" | "no-gate" | "wrong-color" | "frozen-gate" | "star-gate-required";
export type Point = readonly [number, number];

export interface GateSpec {
  id: string;
  side: Side;
  offset: number;
  size: number;
  color: BlockColor;
  frozen?: number;
  /** Star blocks must use a star-marked gate; ordinary blocks may use either. */
  star?: boolean;
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
  star?: boolean;
}

export interface ShutterSpec {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  skin?: "shutter" | "generator";
}

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
  id: number;
  name: string;
  difficulty: Difficulty;
  timeSeconds: number;
  reward: number;
  parMoves?: number;
  width: number;
  height: number;
  /** Explicit playable-cell mask. Omit only for legacy rectangular fixtures. */
  playable?: Point[];
  blocked?: Point[];
  gates: GateSpec[];
  blocks: BlockSpec[];
  shutters?: ShutterSpec[];
  elevators?: ElevatorSpec[];
  conveyors?: ConveyorSpec[];
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
  featureIntro?: {
    title: string;
    description: string;
    kind: "ice-door" | "ice-block" | "layer" | "shutter" | "generator" | "elevator" | "conveyor" | "star";
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
}

export interface PuzzleSnapshot {
  levelId: number;
  width: number;
  height: number;
  playable: Point[];
  blocked: Point[];
  gates: GateState[];
  blocks: BlockState[];
  shutters: ShutterState[];
  elevators: ElevatorState[];
  conveyors: ConveyorSpec[];
  cleared: number;
  moves: number;
  remainingSeconds: number;
  started: boolean;
  complete: boolean;
  failed: boolean;
}

export interface ExitResult {
  ok: boolean;
  blockId?: string;
  color?: BlockColor;
  side?: Side;
  layerRemoved?: boolean;
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
