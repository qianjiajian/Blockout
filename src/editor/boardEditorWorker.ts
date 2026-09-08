import { LEVELS, getLevelStrict } from "../core/levels";
import { solveLevelOptimally } from "../core/levelSolver";
import { validateLevel } from "../core/PuzzleModel";
import { normalizeRows, pointsToRows, rowsToPoints } from "./boardEditorModel";

interface ValidateRequest {
  levelId: number;
  rows: string[];
  revision: string;
}

export interface BoardEditorSolveResult {
  revision: string;
  solved: boolean;
  accepted: boolean;
  minimumDrags: number;
  clearLoad: number;
  repositionOverhead: number;
  gridSteps: number;
  turns: number;
  exploredStates: number;
  duplicateLevelId?: number;
  errors: string[];
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ValidateRequest>) => void) | null;
  postMessage: (value: BoardEditorSolveResult) => void;
};

scope.onmessage = (event): void => {
  const { levelId, revision } = event.data;
  const level = getLevelStrict(levelId);
  const rows = normalizeRows(event.data.rows, level.width, level.height);
  const errors: string[] = [];
  const candidate = { ...level, playable: rowsToPoints(rows) };

  try {
    validateLevel(candidate);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const signature = `${level.width}x${level.height}:${rows.join("/")}`;
  const duplicateLevel = LEVELS.find((otherLevel) => {
    const otherRows = pointsToRows(otherLevel.playable ?? [], otherLevel.width, otherLevel.height);
    return otherLevel.id !== levelId && `${otherLevel.width}x${otherLevel.height}:${otherRows.join("/")}` === signature;
  });
  if (duplicateLevel) errors.push(`轮廓与第 ${duplicateLevel.id} 关完全相同`);

  if (errors.length) {
    scope.postMessage({
      revision,
      solved: false,
      accepted: false,
      minimumDrags: 0,
      clearLoad: 0,
      repositionOverhead: 0,
      gridSteps: 0,
      turns: 0,
      exploredStates: 0,
      duplicateLevelId: duplicateLevel?.id,
      errors,
    });
    return;
  }

  const result = solveLevelOptimally(candidate);
  if (!result.solved) errors.push(`求解器探索 ${result.exploredStates} 个状态后仍未找到通关路线`);
  if (result.solved && level.difficulty === "hard" && result.repositionOverhead < 1) {
    errors.push("困难关至少需要 1 次必要腾挪；当前轮廓把难度降得过低");
  }
  if (result.solved && level.difficulty === "super" && result.repositionOverhead < 2) {
    errors.push("超难关至少需要 2 次必要腾挪；当前轮廓把难度降得过低");
  }
  if (result.solved && level.id % 10 === 0) {
    const expected = [2, 2, 2, 2, 2, 3, 3, 3, 4, 4][level.id / 10 - 1];
    if (result.repositionOverhead !== expected) errors.push(`章末关必要腾挪应为 ${expected}，当前为 ${result.repositionOverhead}`);
  }

  scope.postMessage({
    revision,
    solved: result.solved,
    accepted: result.solved && errors.length === 0,
    minimumDrags: result.minimumDrags,
    clearLoad: result.clearLoad,
    repositionOverhead: result.repositionOverhead,
    gridSteps: result.gridSteps,
    turns: result.turns,
    exploredStates: result.exploredStates,
    duplicateLevelId: duplicateLevel?.id,
    errors,
  });
};
