import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const experimentDir = resolve(root, "playtest-results/experiments/difficulty-bands-2026-09-06");
const targetCurvePath = resolve(experimentDir, "baseline/blockout-original-difficulty-curve.json");
const runLabel = (process.env.DIFFICULTY_CANDIDATE_LABEL ?? "")
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, "-")
  .replace(/^-+|-+$/g, "");
const outputPath = resolve(
  experimentDir,
  `playable-trim-candidates${runLabel ? `-${runLabel}` : ""}.json`,
);

const maxStates = positiveInteger(process.env.DIFFICULTY_CANDIDATE_MAX_STATES, 120_000);
const maxRemovals = positiveInteger(process.env.DIFFICULTY_CANDIDATE_MAX_REMOVALS, Number.MAX_SAFE_INTEGER);
const targetTolerance = nonNegativeNumber(process.env.DIFFICULTY_CANDIDATE_TOLERANCE, 0.05);
const requestedIds = parseLevelIds(process.env.LEVEL_IDS);
const calibration = { slope: 0.826935, intercept: 13.161835 };

function positiveInteger(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Expected a positive integer, got ${raw}`);
  return value;
}

function nonNegativeNumber(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Expected a non-negative number, got ${raw}`);
  return value;
}

function parseLevelIds(raw) {
  if (!raw?.trim()) return undefined;
  const ids = [...new Set(raw.split(",").map(Number))];
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 1 || id > 100)) {
    throw new Error(`LEVEL_IDS must be a comma-separated subset of 1..100, got ${raw}`);
  }
  return ids;
}

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      import { solveLevelForValidation } from "./src/core/levelSolver.ts";
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { LEVELS, scoreBlockOutLevel, solveLevelForValidation, PuzzleModel, validateLevel };
    `,
    resolveDir: root,
    sourcefile: "difficulty-band-candidate-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const {
  LEVELS,
  scoreBlockOutLevel,
  solveLevelForValidation,
  PuzzleModel,
  validateLevel,
} = await import(moduleUrl);

const targetCurve = JSON.parse(await readFile(targetCurvePath, "utf8"));
const competitorScores = new Map(
  (targetCurve.per_level ?? []).map((row) => [row.level_id, Number(row.competitor_score)]),
);
if (competitorScores.size !== LEVELS.length) {
  throw new Error(`Expected ${LEVELS.length} competitor scores in ${targetCurvePath}, got ${competitorScores.size}`);
}

const round = (value, digits = 2) => Number(value.toFixed(digits));
const keyOf = (x, y) => `${x},${y}`;
const pointOf = (key) => key.split(",").map(Number);
const sortedPoints = (keys) => [...keys]
  .map(pointOf)
  .sort((a, b) => a[1] - b[1] || a[0] - b[0]);

function allPlayable(level) {
  if (level.playable?.length) return new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const playable = new Set();
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => keyOf(x, y)));
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!blocked.has(keyOf(x, y))) playable.add(keyOf(x, y));
    }
  }
  return playable;
}

function candidateLevel(level, playable) {
  return {
    ...level,
    playable: sortedPoints(playable),
  };
}

function score(level) {
  const raw = scoreBlockOutLevel(level);
  return {
    raw: raw.score,
    calibrated: round(calibration.intercept + calibration.slope * raw.score),
    components: raw.components,
    evidence: raw.evidence,
  };
}

function difficultyBand(value) {
  if (value < 45) return "below-entry";
  if (value < 50) return "entry";
  if (value < 60) return "normal";
  if (value < 70) return "advanced";
  if (value < 80) return "hard";
  return "extreme";
}

function validationSummary(solution) {
  return {
    solved: solution.solved,
    drags: solution.minimumDrags,
    clearLoad: solution.clearLoad,
    repositionOverhead: solution.repositionOverhead,
    gridSteps: solution.gridSteps,
    turns: solution.turns,
    exploredStates: solution.exploredStates,
  };
}

function addCell(required, reasons, level, x, y, reason) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return;
  const key = keyOf(x, y);
  required.add(key);
  const entries = reasons.get(key) ?? new Set();
  entries.add(reason);
  reasons.set(key, entries);
}

function addRectangle(required, reasons, level, x, y, width, height, reason) {
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) addCell(required, reasons, level, x + dx, y + dy, reason);
  }
}

function addBlockAt(required, reasons, level, block, x, y, reason) {
  for (const [dx, dy] of block.shape) addCell(required, reasons, level, x + dx, y + dy, reason);
}

function addSnapshotBlocks(required, reasons, level, snapshot, reason) {
  for (const block of snapshot.blocks) addBlockAt(required, reasons, level, block, block.x, block.y, reason);
}

function replayRoute(level, drags, hooks = {}) {
  const model = new PuzzleModel(level);
  hooks.snapshot?.(model.snapshot(), "route-initial-block");
  for (let dragIndex = 0; dragIndex < drags.length; dragIndex += 1) {
    const drag = drags[dragIndex];
    const block = model.getBlock(drag.blockId);
    if (!block) return { ok: false, error: `drag ${dragIndex}: missing block ${drag.blockId}` };
    hooks.block?.(block, block.x, block.y, "route-drag-origin");
    for (let pathIndex = 0; pathIndex < drag.path.length; pathIndex += 1) {
      const [x, y] = drag.path[pathIndex];
      hooks.block?.(block, x, y, "route-drag-path");
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        return { ok: false, error: `drag ${dragIndex} path ${pathIndex}: ${drag.blockId} cannot move to ${x},${y}` };
      }
      hooks.snapshot?.(model.snapshot(), "route-step-block");
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) return { ok: false, error: `drag ${dragIndex}: ${drag.blockId} cannot exit ${drag.exitSide}` };
      hooks.snapshot?.(model.snapshot(), "route-counter-result-block");
    }
  }
  const snapshot = model.snapshot();
  return {
    ok: snapshot.complete,
    error: snapshot.complete ? undefined : "route ended before the level completed",
  };
}

function protectStaticFootprints(level, required, reasons) {
  for (const block of level.blocks) {
    addBlockAt(required, reasons, level, block, block.x, block.y, "initial-block");
  }

  for (const gate of level.gates) {
    for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
      const [x, y] = gate.side === "top" ? [offset, 0]
        : gate.side === "bottom" ? [offset, level.height - 1]
          : gate.side === "left" ? [0, offset]
            : [level.width - 1, offset];
      addCell(required, reasons, level, x, y, "gate-mouth");
    }
  }

  for (const shutter of level.shutters ?? []) {
    addRectangle(
      required,
      reasons,
      level,
      shutter.x,
      shutter.y,
      shutter.width,
      shutter.height,
      "shutter-footprint",
    );
  }

  for (const elevator of level.elevators ?? []) {
    const carriedBlock = level.blocks.find((block) => block.id === elevator.blockId);
    let x = elevator.fromX;
    let y = elevator.fromY;
    while (true) {
      addRectangle(required, reasons, level, x, y, elevator.width, elevator.height, "elevator-footprint");
      if (carriedBlock) addBlockAt(required, reasons, level, carriedBlock, x, y, "elevator-carried-block");
      if (x === elevator.toX && y === elevator.toY) break;
      x += Math.sign(elevator.toX - x);
      y += Math.sign(elevator.toY - y);
    }
  }

  for (const conveyor of level.conveyors ?? []) {
    addRectangle(
      required,
      reasons,
      level,
      conveyor.x,
      conveyor.y,
      conveyor.width,
      conveyor.height,
      "conveyor-footprint",
    );
  }

  for (const authored of [
    level.onboardingHint ? { ...level.onboardingHint, reason: "onboarding-hint" } : undefined,
    level.strategyNudge ? { ...level.strategyNudge, reason: "strategy-nudge" } : undefined,
  ].filter(Boolean)) {
    const block = level.blocks.find((candidate) => candidate.id === authored.blockId);
    if (!block) continue;
    addBlockAt(required, reasons, level, block, block.x, block.y, authored.reason);
    for (const [x, y] of authored.path) addBlockAt(required, reasons, level, block, x, y, authored.reason);
  }
}

function protectedRoute(level, solution) {
  const required = new Set();
  const reasons = new Map();
  protectStaticFootprints(level, required, reasons);
  const replay = replayRoute(level, solution.drags, {
    block: (block, x, y, reason) => addBlockAt(required, reasons, level, block, x, y, reason),
    snapshot: (snapshot, reason) => addSnapshotBlocks(required, reasons, level, snapshot, reason),
  });
  if (!replay.ok) throw new Error(`Lv${level.id} baseline validation route did not replay: ${replay.error}`);

  const reasonCounts = {};
  for (const entries of reasons.values()) {
    for (const reason of entries) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  return { required, reasonCounts };
}

const neighbors = (x, y) => [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]];

function remainsConnected(playable, removedKey) {
  if (playable.size <= 1) return false;
  const start = [...playable].find((key) => key !== removedKey);
  if (!start) return false;
  const seen = new Set([start]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = pointOf(queue[index]);
    for (const [nx, ny] of neighbors(x, y)) {
      const key = keyOf(nx, ny);
      if (key === removedKey || !playable.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push(key);
    }
  }
  return seen.size === playable.size - 1;
}

function exposedToVoid(level, playable, key) {
  const [x, y] = pointOf(key);
  return neighbors(x, y).some(([nx, ny]) => (
    nx < 0 || ny < 0 || nx >= level.width || ny >= level.height || !playable.has(keyOf(nx, ny))
  ));
}

function removalCandidates(level, playable, required, rejected) {
  const initialCells = new Set();
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) initialCells.add(keyOf(block.x + dx, block.y + dy));
  }
  const centerX = (level.width - 1) / 2;
  const centerY = (level.height - 1) / 2;
  return [...playable]
    .filter((key) => !required.has(key) && !rejected.has(key) && exposedToVoid(level, playable, key))
    .filter((key) => remainsConnected(playable, key))
    .sort((a, b) => {
      const [ax, ay] = pointOf(a);
      const [bx, by] = pointOf(b);
      const aNeighbors = neighbors(ax, ay).filter(([x, y]) => playable.has(keyOf(x, y))).length;
      const bNeighbors = neighbors(bx, by).filter(([x, y]) => playable.has(keyOf(x, y))).length;
      const aRadius = Math.abs(ax - centerX) + Math.abs(ay - centerY);
      const bRadius = Math.abs(bx - centerX) + Math.abs(by - centerY);
      const aInitialDistance = initialCells.size
        ? Math.min(...[...initialCells].map((key) => {
          const [x, y] = pointOf(key);
          return Math.abs(ax - x) + Math.abs(ay - y);
        }))
        : 0;
      const bInitialDistance = initialCells.size
        ? Math.min(...[...initialCells].map((key) => {
          const [x, y] = pointOf(key);
          return Math.abs(bx - x) + Math.abs(by - y);
        }))
        : 0;
      return aNeighbors - bNeighbors
        || bInitialDistance - aInitialDistance
        || bRadius - aRadius
        || ay - by
        || ax - bx;
    });
}

function validateCandidate(level) {
  try {
    validateLevel(level);
    // Construction catches runtime-model invariants in addition to the explicit validator.
    new PuzzleModel(level);
  } catch (error) {
    return { ok: false, stage: "PuzzleModel", error: error instanceof Error ? error.message : String(error) };
  }
  const solution = solveLevelForValidation(level, maxStates);
  if (!solution.solved) {
    return {
      ok: false,
      stage: "validation-solver",
      error: `unsolved after ${solution.exploredStates} states`,
      solution,
    };
  }
  const replay = replayRoute(level, solution.drags);
  if (!replay.ok) return { ok: false, stage: "PuzzleModel-replay", error: replay.error, solution };
  return { ok: true, solution };
}

function compactCandidate(level, originalPlayable, result) {
  const playable = new Set(result.level.playable.map(([x, y]) => keyOf(x, y)));
  return {
    playable: result.level.playable,
    removed_cells: sortedPoints([...originalPlayable].filter((key) => !playable.has(key))),
    removed_cell_count: originalPlayable.size - playable.size,
    score: result.score,
    exact_target_delta: round(result.score.calibrated - result.target, 2),
    target_band_reached: difficultyBand(result.score.calibrated) === difficultyBand(result.target),
    validation: validationSummary(result.solution),
  };
}

async function searchLevel(level, competitorScore) {
  validateLevel(level);
  const originalPlayable = allPlayable(level);
  const baselineScore = score(level);
  const target = round(Math.max(45, competitorScore, baselineScore.calibrated));
  const baselineSolution = solveLevelForValidation(level, maxStates);
  if (!baselineSolution.solved) {
    return {
      level_id: level.id,
      status: "baseline-unsolved",
      target: {
        floor: 45,
        competitor_score: competitorScore,
        calibrated_score: target,
        band: difficultyBand(target),
      },
      baseline: { score: baselineScore, validation: validationSummary(baselineSolution) },
    };
  }
  const routeProtection = protectedRoute(level, baselineSolution);
  const requiredInPlayable = new Set([...routeProtection.required].filter((key) => originalPlayable.has(key)));
  const baselineResult = {
    level: candidateLevel(level, originalPlayable),
    score: baselineScore,
    solution: baselineSolution,
    target,
  };
  if (baselineScore.calibrated >= target) {
    return {
      level_id: level.id,
      status: "unchanged",
      target: {
        floor: 45,
        competitor_score: competitorScore,
        calibrated_score: target,
        band: difficultyBand(target),
      },
      baseline: {
        playable_cells: originalPlayable.size,
        score: baselineScore,
        validation: validationSummary(baselineSolution),
      },
      route_protection: {
        protected_playable_cells: requiredInPlayable.size,
        removable_playable_cells: originalPlayable.size - requiredInPlayable.size,
        reason_cell_counts: routeProtection.reasonCounts,
      },
      candidate: compactCandidate(level, originalPlayable, baselineResult),
      search: { accepted_steps: 0, attempted_cells: 0, rejected: {} },
    };
  }

  let playable = new Set(originalPlayable);
  let current = baselineResult;
  const acceptedSteps = [];
  const rejected = new Set();
  const rejectedCounts = {};
  let attemptedCells = 0;

  while (acceptedSteps.length < maxRemovals && current.score.calibrated < target) {
    const candidates = removalCandidates(level, playable, requiredInPlayable, rejected);
    if (!candidates.length) break;
    let accepted;
    for (const key of candidates) {
      attemptedCells += 1;
      const nextPlayable = new Set(playable);
      nextPlayable.delete(key);
      const nextLevel = candidateLevel(level, nextPlayable);
      const checked = validateCandidate(nextLevel);
      if (!checked.ok) {
        rejected.add(key);
        rejectedCounts[checked.stage] = (rejectedCounts[checked.stage] ?? 0) + 1;
        continue;
      }
      const nextScore = score(nextLevel);
      accepted = {
        key,
        playable: nextPlayable,
        result: { level: nextLevel, score: nextScore, solution: checked.solution, target },
      };
      break;
    }
    if (!accepted) break;
    playable = accepted.playable;
    current = accepted.result;
    acceptedSteps.push({
      removed_cell: pointOf(accepted.key),
      playable_cells: playable.size,
      calibrated_score: current.score.calibrated,
      validation_drags: current.solution.minimumDrags,
      explored_states: current.solution.exploredStates,
    });
  }

  const targetReached = current.score.calibrated >= target;
  const exactReached = targetReached && current.score.calibrated - target <= targetTolerance;
  const targetBandReached = difficultyBand(current.score.calibrated) === difficultyBand(target);
  const exhausted = current.score.calibrated < target && removalCandidates(level, playable, requiredInPlayable, rejected).length === 0;
  return {
    level_id: level.id,
    status: exactReached ? "exact-target-reached"
      : targetReached ? "target-reached-with-discrete-overshoot"
        : exhausted ? "route-preserving-trim-exhausted"
          : acceptedSteps.length >= maxRemovals ? "max-removals-reached"
            : "search-stopped",
    target: {
      floor: 45,
      competitor_score: competitorScore,
      calibrated_score: target,
      band: difficultyBand(target),
      tolerance: targetTolerance,
    },
    baseline: {
      playable_cells: originalPlayable.size,
      score: baselineScore,
      validation: validationSummary(baselineSolution),
    },
    route_protection: {
      protected_playable_cells: requiredInPlayable.size,
      removable_playable_cells: originalPlayable.size - requiredInPlayable.size,
      reason_cell_counts: routeProtection.reasonCounts,
    },
    candidate: compactCandidate(level, originalPlayable, current),
    search: {
      accepted_steps: acceptedSteps.length,
      attempted_cells: attemptedCells,
      rejected: rejectedCounts,
      steps: acceptedSteps,
      target_band_reached: targetBandReached,
    },
  };
}

const ids = requestedIds ?? LEVELS.map((level) => level.id);
const results = [];
for (const id of ids) {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Missing Lv${id}`);
  const competitorScore = competitorScores.get(id);
  if (!Number.isFinite(competitorScore)) throw new Error(`Missing competitor score for Lv${id}`);
  process.stdout.write(`Searching Lv${id}... `);
  const result = await searchLevel(level, competitorScore);
  results.push(result);
  console.log(`${result.status}; ${result.baseline.score.calibrated} -> ${result.candidate?.score.calibrated ?? "n/a"} / target ${result.target.calibrated_score}`);
}

const report = {
  generated_at: new Date().toISOString(),
  generator: "tools/generate-difficulty-band-candidates.mjs",
  writes: "This tool writes only this report under playtest-results/experiments/difficulty-bands-2026-09-06/ and never mutates src/core.",
  method: {
    target: "max(45, competitor_score, current calibrated score)",
    calibration,
    playable_trim: "Deterministic exterior erosion of cells outside the current validation route and protected mechanic footprints.",
    route_protection: [
      "all initial block cells (including hidden blocks)",
      "all block-shape cells at every current validation-route origin and path step",
      "all post-clear block cells, including conveyor movement",
      "gate mouths, shutter footprints, elevator travel footprints, conveyor footprints",
      "onboarding and strategy-nudge paths",
    ],
    per_step_checks: [
      "4-neighbor playable mask remains connected",
      "validateLevel and PuzzleModel construction",
      `solveLevelForValidation(maxStates=${maxStates}) reports solved`,
      "returned solution replays to completion through PuzzleModel",
    ],
    target_tolerance: targetTolerance,
    max_removals: maxRemovals === Number.MAX_SAFE_INTEGER ? null : maxRemovals,
  },
  source: {
    levels: "src/core/levels.ts",
    competitor_curve: "playtest-results/experiments/difficulty-bands-2026-09-06/baseline/blockout-original-difficulty-curve.json",
  },
  summary: {
    requested_levels: ids.length,
    changed_candidates: results.filter((result) => (result.candidate?.removed_cell_count ?? 0) > 0).length,
    exact_targets_reached: results.filter((result) => result.status === "exact-target-reached").length,
    target_bands_reached: results.filter((result) => result.candidate?.target_band_reached).length,
    baseline_unsolved: results.filter((result) => result.status === "baseline-unsolved").length,
  },
  levels: results,
};

await mkdir(experimentDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
