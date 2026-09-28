import type { LevelSpec } from "./types";

/**
 * The three result conditions are deliberately kept outside the renderer.  A
 * level can therefore change its art without changing the scoring contract,
 * and generated levels (which do not carry an authored `parMoves`) still get
 * a deterministic, data-derived target.
 */
export interface LevelStarTargets {
  moveTarget: number;
  timeTargetSeconds: number;
}

export interface LevelStarAttempt {
  moves: number;
  elapsedSeconds: number;
}

export interface LevelStarEvaluation extends LevelStarAttempt {
  passed: true;
  moveTarget: number;
  timeTargetSeconds: number;
  moveAchieved: boolean;
  timeAchieved: boolean;
  earnedStars: number;
}

const DIFFICULTY_MOVE_FACTORS: Readonly<Record<LevelSpec["difficulty"], number>> = {
  // Compatibility default only; authored rhythm remakes pin their old targets.
  easy: 0.2,
  normal: 0.2,
  hard: 0.3,
  super: 0.4,
};

const positiveInteger = (value: number | undefined, fallback: number): number => (
  Number.isFinite(value) && (value ?? 0) > 0
    ? Math.max(1, Math.round(value as number))
    : fallback
);

/** Number of removal actions represented by the authored block catalog. */
export const levelClearLoad = (level: Pick<LevelSpec, "blocks">): number => (
  // Generator cargo is authored in `blocks` too (it simply starts outside the
  // live board), so counting the catalog already includes every eventual drag.
  level.blocks.reduce((sum, block) => sum + Math.max(1, block.layers?.length ?? 1), 0)
);

const mechanismMoveOverhead = (level: LevelSpec): number => {
  const iceCount = level.blocks.reduce((sum, block) => sum + (block.frozen && block.frozen > 0 ? 1 : 0), 0)
    + level.gates.reduce((sum, gate) => sum + (gate.frozen && gate.frozen > 0 ? 1 : 0), 0);
  const layeredExtra = level.blocks.reduce((sum, block) => sum + Math.max(0, (block.layers?.length ?? 1) - 1), 0);
  const locks = level.blocks.reduce((sum, block) => sum + (block.lockedBy ? 1 : 0), 0);
  const keys = level.blocks.reduce((sum, block) => sum + (block.keyId ? 1 : 0), 0);
  const bombs = level.blocks.reduce((sum, block) => sum + (block.timedBombSeconds !== undefined ? 1 : 0), 0);
  return iceCount
    + layeredExtra * 2
    + (level.shutters?.length ?? 0) * 2
    + (level.generators?.length ?? 0) * 3
    + (level.flipDoors?.length ?? 0) * 2
    + (level.coloredGrids?.length ?? 0) * 2
    + locks * 2
    + keys
    + (level.elevators?.length ?? 0) * 2
    + (level.conveyors?.length ?? 0) * 2
    + bombs;
};

/**
 * Returns the move threshold shown on the result card.
 *
 * Levels 1–100 have an authored par target.  Levels 101–200 are compact
 * generated data and intentionally omit that optional field; their target is
 * derived from clear load, difficulty and the authored mechanics instead of
 * importing a solver into the runtime bundle.
 */
export const moveTargetForLevel = (level: LevelSpec): number => {
  // An explicitly preserved pre-remake target must not be recalculated from
  // the replacement block inventory. Unmarked levels keep the old heuristic.
  if (Number.isSafeInteger(level.preservedMoveTarget) && (level.preservedMoveTarget ?? 0) > 0) {
    return level.preservedMoveTarget!;
  }
  const clearLoad = levelClearLoad(level);
  const authoredFloor = Math.max(0, Math.round(level.designTargets?.minimumRepositionOverhead ?? 0));
  const factor = DIFFICULTY_MOVE_FACTORS[level.difficulty];
  const structuralTarget = Math.max(
    clearLoad + 1,
    Math.ceil(clearLoad * (1 + factor)) + mechanismMoveOverhead(level),
  );
  if (level.parMoves !== undefined && Number.isFinite(level.parMoves)) {
    const authored = Math.max(1, Math.round(level.parMoves));
    // Authored par values are the source of truth for the first 100 levels.
    // A handful of legacy values count path samples rather than player drags
    // (for example Lv15=536); replace only those clear outliers.  A calibrated
    // minimum reposition floor may still lift an authored value when the
    // campaign contract says that the level needs that much setup movement.
    if (authored > structuralTarget * 3) return structuralTarget;
    return Math.max(1, authored, authoredFloor > 0 ? clearLoad + authoredFloor : 1);
  }
  return structuralTarget;
};

/**
 * Time targets are independent of the fail clock.  The 72% pacing band leaves
 * room for the result animation while still making the third star a real
 * speed objective on every level.  The five-second margin prevents a target
 * from ever displaying the full fail timer.
 */
export const timeTargetForLevel = (level: Pick<LevelSpec, "timeSeconds">): number => {
  const total = positiveInteger(level.timeSeconds, 60);
  const upperBound = Math.max(1, total - 1);
  return Math.max(1, Math.min(upperBound, Math.max(20, Math.floor(total * 0.72))));
};

export const levelStarTargets = (level: LevelSpec): LevelStarTargets => ({
  moveTarget: moveTargetForLevel(level),
  timeTargetSeconds: timeTargetForLevel(level),
});

export const evaluateLevelStars = (
  level: LevelSpec,
  attempt: LevelStarAttempt,
): LevelStarEvaluation => {
  const targets = levelStarTargets(level);
  const moves = Math.max(0, Math.round(attempt.moves));
  const elapsedSeconds = Math.max(0, Math.ceil(attempt.elapsedSeconds));
  const moveAchieved = moves <= targets.moveTarget;
  const timeAchieved = elapsedSeconds <= targets.timeTargetSeconds;
  return {
    moves,
    elapsedSeconds,
    passed: true,
    ...targets,
    moveAchieved,
    timeAchieved,
    earnedStars: 1 + (moveAchieved ? 1 : 0) + (timeAchieved ? 1 : 0),
  };
};
