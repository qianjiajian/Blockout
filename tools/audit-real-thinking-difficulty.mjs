import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolsDir, "..");

/**
 * Candidate-screening contract. The thresholds are deliberately independent
 * from blockout-d1: a layout must create costly decisions, not merely contain
 * many blocks or counters. Generators can override any threshold per batch.
 */
export const DEFAULT_THINKING_GATE = Object.freeze({
  minRepositionOverhead: 4,
  maxOptimalPreservingDirectExitRatio: 0.7,
  minWrongDirectExitChoices: 4,
  minMedianWrongChoicePenalty: 2,
  minConsequentialDecisionNodes: 3,
  minFirstStageConsequentialDecisionNodes: 1,
  maxUnresolvedChoiceEvaluations: 0,
});

export const DEFAULT_ANALYSIS_BUDGET = Object.freeze({
  globalMaxStates: 5_000_000,
  continuationMaxStates: 500_000,
  maxChoiceEvaluations: 400,
  maxLevelWallClockMs: 20_000,
});

let instrumentedSolverPromise;

const loadInstrumentedSolver = async () => {
  if (instrumentedSolverPromise) return instrumentedSolverPromise;
  instrumentedSolverPromise = (async () => {
    const solverPath = resolve(projectRoot, "src/core/levelSolver.ts");
    let solverSource = await readFile(solverPath, "utf8");
    solverSource = solverSource.replace('from "./types"', 'from "./src/core/types.ts"');
    solverSource += `
      import { LEVELS } from "./src/core/levels.ts";
      export {
        LEVELS,
        initialState as thinkingInitialState,
        stateKey as thinkingStateKey,
        applyDrag as thinkingApplyDrag,
        exitDrags as thinkingExitDrags,
        nextDrags as thinkingNextDrags,
      };
    `;
    const bundle = await build({
      stdin: {
        contents: solverSource,
        resolveDir: projectRoot,
        sourcefile: "instrumented-level-solver.ts",
        loader: "ts",
      },
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      logLevel: "silent",
    });
    const source = Buffer.from(bundle.outputFiles[0].contents).toString("base64");
    return import(`data:text/javascript;base64,${source}`);
  })();
  return instrumentedSolverPromise;
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const round = (value, digits = 4) => (
  value === null || !Number.isFinite(value) ? value : Number(value.toFixed(digits))
);

const activeLayer = (state, blockId) => state.blocks.find((block) => block.id === blockId)?.layers?.[0] ?? null;

const targetKey = (state, drag) => `${drag.blockId}:${activeLayer(state, drag.blockId) ?? "unknown"}`;

const dragSummary = (state, drag) => ({
  blockId: drag.blockId,
  color: activeLayer(state, drag.blockId),
  kind: drag.exitSide ? "clear" : "reposition",
  exitSide: drag.exitSide ?? null,
  destination: drag.path.at(-1) ?? null,
  gridSteps: drag.path.length,
});

const continuationFrom = (level, state) => ({
  ...level,
  id: level.id + 1_000_000,
  name: `${level.name}-thinking-continuation`,
  parMoves: undefined,
  gates: state.gates.map((gate) => ({ ...gate })),
  blocks: state.blocks.map((block) => ({
    ...block,
    shape: block.shape.map((point) => [...point]),
    layers: [...block.layers],
  })),
  shutters: state.shutters.map((shutter) => ({ ...shutter })),
});

const counterSnapshot = (state) => ({
  gates: new Map(state.gates.map((gate) => [gate.id, gate.frozen])),
  blocks: new Map(state.blocks.map((block) => [block.id, block.frozen])),
  shutters: new Map(state.shutters.map((shutter) => [shutter.id, shutter.count])),
});

const counterChanges = (before, after) => {
  const changes = [];
  for (const kind of ["gates", "blocks", "shutters"]) {
    for (const [id, value] of before[kind]) {
      const next = after[kind].get(id);
      if (next !== undefined && next !== value) changes.push({ kind: kind.slice(0, -1), id, from: value, to: next });
    }
  }
  return changes;
};

const initialCounterDependencies = (state) => [
  ...state.gates.filter((gate) => gate.frozen > 0).map((gate) => ({ kind: "gate", id: gate.id, count: gate.frozen })),
  ...state.blocks.filter((block) => block.frozen > 0).map((block) => ({ kind: "block", id: block.id, count: block.frozen })),
  ...state.shutters.filter((shutter) => shutter.count > 0).map((shutter) => ({ kind: "shutter", id: shutter.id, count: shutter.count })),
];

const screeningResult = (metrics, thresholds) => {
  const checks = [
    {
      id: "reposition-overhead",
      pass: metrics.optimal.repositionDrags >= thresholds.minRepositionOverhead,
      actual: metrics.optimal.repositionDrags,
      expected: `>= ${thresholds.minRepositionOverhead}`,
    },
    {
      id: "direct-exit-optimality",
      pass: metrics.directExitChoices.optimalPreservingRatio !== null
        && metrics.directExitChoices.optimalPreservingRatio <= thresholds.maxOptimalPreservingDirectExitRatio,
      actual: metrics.directExitChoices.optimalPreservingRatio,
      expected: `<= ${thresholds.maxOptimalPreservingDirectExitRatio}`,
    },
    {
      id: "wrong-choice-volume",
      pass: metrics.directExitChoices.harmfulChoices >= thresholds.minWrongDirectExitChoices,
      actual: metrics.directExitChoices.harmfulChoices,
      expected: `>= ${thresholds.minWrongDirectExitChoices}`,
    },
    {
      id: "wrong-choice-penalty",
      pass: metrics.directExitChoices.deadEnds > 0
        || (metrics.directExitChoices.medianWrongPenalty !== null
          && metrics.directExitChoices.medianWrongPenalty >= thresholds.minMedianWrongChoicePenalty),
      actual: {
        medianFinitePenalty: metrics.directExitChoices.medianWrongPenalty,
        deadEnds: metrics.directExitChoices.deadEnds,
      },
      expected: `median finite penalty >= ${thresholds.minMedianWrongChoicePenalty}, or at least one dead end`,
    },
    {
      id: "consequential-decisions",
      pass: metrics.decisionNodes.consequential >= thresholds.minConsequentialDecisionNodes,
      actual: metrics.decisionNodes.consequential,
      expected: `>= ${thresholds.minConsequentialDecisionNodes}`,
    },
    {
      id: "first-stage-decisions",
      pass: metrics.firstStage.consequentialDecisionNodes >= thresholds.minFirstStageConsequentialDecisionNodes,
      actual: metrics.firstStage.consequentialDecisionNodes,
      expected: `>= ${thresholds.minFirstStageConsequentialDecisionNodes}`,
    },
    {
      id: "analysis-coverage",
      pass: metrics.directExitChoices.unresolved <= thresholds.maxUnresolvedChoiceEvaluations,
      actual: metrics.directExitChoices.unresolved,
      expected: `<= ${thresholds.maxUnresolvedChoiceEvaluations}`,
    },
  ];
  return {
    profile: "thinking-gate-v1",
    pass: checks.every((check) => check.pass),
    checks,
    failedChecks: checks.filter((check) => !check.pass).map((check) => check.id),
  };
};

/**
 * Creates a reusable candidate gate. A generation script should construct this
 * once, then call `analyze(level)` for shortlisted candidates only.
 */
export const createThinkingDifficultyGate = async (options = {}) => {
  const api = await loadInstrumentedSolver();
  const budgets = { ...DEFAULT_ANALYSIS_BUDGET, ...(options.budgets ?? {}) };
  const thresholds = { ...DEFAULT_THINKING_GATE, ...(options.thresholds ?? {}) };

  const analyze = (level, metadata = {}) => {
    const startedAt = performance.now();
    const deadline = startedAt + budgets.maxLevelWallClockMs;
    const optimal = api.solveLevelOptimally(level, budgets.globalMaxStates);
    if (!optimal.solved) {
      return {
        levelId: level.id,
        name: level.name,
        ...metadata,
        analyzed: false,
        failure: optimal.exploredStates >= budgets.globalMaxStates ? "global-solver-budget" : "unsolvable",
        exploredStates: optimal.exploredStates,
        elapsedMs: round(performance.now() - startedAt, 2),
        screening: { profile: "thinking-gate-v1", pass: false, checks: [], failedChecks: ["optimal-solution"] },
      };
    }

    let state = api.thinkingInitialState(level);
    const initialState = state;
    const initialShutterIds = initialState.shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id);
    const authoredDependencies = initialCounterDependencies(initialState);
    const continuationCache = new Map();
    const nodeRows = [];
    const dependencyEvents = [];
    const numericalWrongPenalties = [];
    let evaluatedChoices = 0;
    let skippedChoices = 0;

    const directFor = (candidateState) => api.thinkingExitDrags(level, candidateState);
    const isFirstStage = (candidateState, index) => initialShutterIds.length
      ? initialShutterIds.some((id) => (candidateState.shutters.find((shutter) => shutter.id === id)?.count ?? 0) > 0)
      : index === 0;

    for (let routeIndex = 0; routeIndex < optimal.drags.length; routeIndex += 1) {
      const routeDrag = optimal.drags[routeIndex];
      const directDrags = directFor(state);
      const remainingOptimalDrags = optimal.minimumDrags - routeIndex;
      const choices = [];

      for (const drag of directDrags) {
        const nextState = api.thinkingApplyDrag(level, state, drag);
        const nextKey = api.thinkingStateKey(nextState);
        const summary = {
          ...dragSummary(state, drag),
          target: targetKey(state, drag),
          status: "unresolved",
          continuationDrags: null,
          totalRemainingDrags: null,
          penalty: null,
        };
        if (evaluatedChoices >= budgets.maxChoiceEvaluations || performance.now() >= deadline) {
          skippedChoices += 1;
          choices.push(summary);
          continue;
        }
        evaluatedChoices += 1;
        let continuation = continuationCache.get(nextKey);
        if (!continuation) {
          if (!nextState.blocks.length) {
            continuation = {
              solved: true,
              minimumDrags: 0,
              exploredStates: 0,
              proof: "complete-state",
            };
          } else {
            const continuationLevel = continuationFrom(level, nextState);
            const theoreticalLowerBound = remainingOptimalDrags - 1;
            // A validation route that hits the known global lower bound is an
            // exact proof and is much cheaper than re-running A* for the many
            // harmless reorderings. Only suspicious branches pay for A*.
            const validation = api.solveLevelForValidation(continuationLevel, budgets.continuationMaxStates);
            continuation = validation.solved && validation.minimumDrags === theoreticalLowerBound
              ? { ...validation, proof: "validation-hit-global-lower-bound" }
              : { ...api.solveLevelOptimally(continuationLevel, budgets.continuationMaxStates), proof: "continuation-a-star" };
          }
          continuationCache.set(nextKey, continuation);
        }
        if (!continuation.solved) {
          summary.status = continuation.exploredStates >= budgets.continuationMaxStates ? "unresolved" : "dead-end";
          summary.exploredStates = continuation.exploredStates;
        } else {
          const totalRemainingDrags = 1 + continuation.minimumDrags;
          const penalty = totalRemainingDrags - remainingOptimalDrags;
          summary.status = penalty === 0 ? "optimal-preserving" : "wrong";
          summary.continuationDrags = continuation.minimumDrags;
          summary.totalRemainingDrags = totalRemainingDrags;
          summary.penalty = penalty;
          summary.exploredStates = continuation.exploredStates;
          summary.proof = continuation.proof;
          if (penalty > 0) numericalWrongPenalties.push(penalty);
        }
        choices.push(summary);
      }

      const knownCosts = choices
        .filter((choice) => choice.totalRemainingDrags !== null)
        .map((choice) => choice.totalRemainingDrags);
      const optimalPreserving = choices.filter((choice) => choice.status === "optimal-preserving").length;
      const wrong = choices.filter((choice) => choice.status === "wrong").length;
      const deadEnds = choices.filter((choice) => choice.status === "dead-end").length;
      const unresolved = choices.filter((choice) => choice.status === "unresolved").length;
      const consequential = wrong + deadEnds > 0;
      const routeStateKey = api.thinkingStateKey(api.thinkingApplyDrag(level, state, routeDrag));
      const chosenChoice = choices.find((choice) => {
        const drag = directDrags[choices.indexOf(choice)];
        return drag && api.thinkingStateKey(api.thinkingApplyDrag(level, state, drag)) === routeStateKey;
      });
      const nextState = api.thinkingApplyDrag(level, state, routeDrag);
      const beforeTargets = new Set(directDrags.map((drag) => targetKey(state, drag)));
      const afterDirectDrags = directFor(nextState);
      const afterTargets = new Set(afterDirectDrags.map((drag) => targetKey(nextState, drag)));
      const newlyAvailable = [...afterTargets].filter((target) => !beforeTargets.has(target));
      const changes = counterChanges(counterSnapshot(state), counterSnapshot(nextState));
      if (newlyAvailable.length || changes.length) {
        dependencyEvents.push({
          actionIndex: routeIndex + 1,
          source: dragSummary(state, routeDrag),
          newlyAvailableDirectExits: newlyAvailable,
          counterChanges: changes,
        });
      }

      nodeRows.push({
        routeIndex,
        phase: isFirstStage(state, routeIndex) ? "first" : "later",
        remainingOptimalDrags,
        routeAction: dragSummary(state, routeDrag),
        routeActionWasDirectChoice: Boolean(chosenChoice),
        directExitChoiceCount: choices.length,
        optimalPreserving,
        wrong,
        deadEnds,
        unresolved,
        consequential,
        distinctKnownCosts: new Set(knownCosts).size,
        choices,
      });
      state = nextState;
    }

    const allChoices = nodeRows.flatMap((node) => node.choices);
    const knownChoices = allChoices.filter((choice) => choice.status !== "unresolved");
    const preservingChoices = allChoices.filter((choice) => choice.status === "optimal-preserving");
    const wrongChoices = allChoices.filter((choice) => choice.status === "wrong");
    const deadEndChoices = allChoices.filter((choice) => choice.status === "dead-end");
    const unresolvedChoices = allChoices.filter((choice) => choice.status === "unresolved");
    const firstStageNodes = nodeRows.filter((node) => node.phase === "first");
    const firstStageChoices = firstStageNodes.flatMap((node) => node.choices);
    const firstKnown = firstStageChoices.filter((choice) => choice.status !== "unresolved");
    const firstPreserving = firstStageChoices.filter((choice) => choice.status === "optimal-preserving");
    const firstWrongPenalties = firstStageChoices
      .map((choice) => choice.penalty)
      .filter((penalty) => penalty !== null && penalty > 0);

    const metrics = {
      levelId: level.id,
      name: level.name,
      ...metadata,
      analyzed: true,
      optimal: {
        minimumDrags: optimal.minimumDrags,
        clearDrags: optimal.clearLoad,
        repositionDrags: optimal.repositionOverhead,
        exploredStates: optimal.exploredStates,
      },
      directExitChoices: {
        total: allChoices.length,
        evaluated: allChoices.length - unresolvedChoices.length,
        optimalPreserving: preservingChoices.length,
        optimalPreservingRatio: knownChoices.length ? round(preservingChoices.length / knownChoices.length) : null,
        wrongChoices: wrongChoices.length,
        deadEnds: deadEndChoices.length,
        harmfulChoices: wrongChoices.length + deadEndChoices.length,
        unresolved: unresolvedChoices.length,
        medianWrongPenalty: median(numericalWrongPenalties),
        maxWrongPenalty: numericalWrongPenalties.length ? Math.max(...numericalWrongPenalties) : null,
      },
      firstStage: {
        definition: initialShutterIds.length ? "while-any-initial-shutter-remains-closed" : "opening-state-only",
        routeNodes: firstStageNodes.length,
        directExitChoices: firstStageChoices.length,
        evaluatedChoices: firstKnown.length,
        openingDirectExitChoices: nodeRows[0]?.directExitChoiceCount ?? 0,
        branchNodes: firstStageNodes.filter((node) => node.directExitChoiceCount >= 2).length,
        consequentialDecisionNodes: firstStageNodes.filter((node) => node.consequential).length,
        optimalPreservingRatio: firstKnown.length ? round(firstPreserving.length / firstKnown.length) : null,
        medianWrongPenalty: median(firstWrongPenalties),
      },
      decisionNodes: {
        routeNodes: nodeRows.length,
        branch: nodeRows.filter((node) => node.directExitChoiceCount >= 2).length,
        consequential: nodeRows.filter((node) => node.consequential).length,
        meaningfulCostBranches: nodeRows.filter((node) => node.distinctKnownCosts >= 2 || node.deadEnds > 0).length,
        setupRequiredDespiteAvailableExit: nodeRows.filter((node) => !node.routeAction.exitSide && node.directExitChoiceCount > 0).length,
        forcedSingleDirectExit: nodeRows.filter((node) => node.directExitChoiceCount === 1).length,
        noDirectExit: nodeRows.filter((node) => node.directExitChoiceCount === 0).length,
      },
      dependencies: {
        authoredCounterTargets: authoredDependencies.length,
        maxAuthoredCounterDepth: authoredDependencies.length ? Math.max(...authoredDependencies.map((entry) => entry.count)) : 0,
        authored: authoredDependencies,
        dynamicEvents: dependencyEvents.length,
        dynamicUnlockEdges: dependencyEvents.reduce((sum, event) => sum + event.newlyAvailableDirectExits.length, 0),
        latestUnlockAction: dependencyEvents.length ? Math.max(...dependencyEvents.map((event) => event.actionIndex)) : 0,
        events: dependencyEvents,
      },
      coverage: {
        choiceEvaluationLimit: budgets.maxChoiceEvaluations,
        evaluatedChoiceSolves: evaluatedChoices,
        cacheEntries: continuationCache.size,
        skippedByBudget: skippedChoices,
        continuationStateLimit: budgets.continuationMaxStates,
        levelWallClockLimitMs: budgets.maxLevelWallClockMs,
      },
      elapsedMs: round(performance.now() - startedAt, 2),
      routeNodes: nodeRows,
    };
    metrics.screening = screeningResult(metrics, thresholds);
    return metrics;
  };

  return {
    budgets,
    thresholds,
    analyze,
    accepts: (level, metadata = {}) => analyze(level, metadata).screening.pass,
  };
};

const parseLevelIds = (value) => {
  const ids = new Set();
  for (const token of value.split(",")) {
    const match = token.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!match) continue;
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    for (let id = Math.min(from, to); id <= Math.max(from, to); id += 1) ids.add(id);
  }
  return ids;
};

const candidateLevelsFromJson = (value, candidateLimit) => {
  const results = [];
  const add = (level, metadata = {}) => {
    if (level?.blocks && level?.gates && Number.isFinite(level.id)) results.push({ level, metadata });
  };
  if (Array.isArray(value)) {
    for (const [groupIndex, entry] of value.entries()) {
      if (entry?.candidates) {
        entry.candidates.slice(0, candidateLimit).forEach((candidate, candidateIndex) => add(candidate.level, { groupIndex, candidateIndex }));
      } else add(entry, { candidateIndex: groupIndex });
    }
  } else if (value?.levels) {
    value.levels.forEach((level, candidateIndex) => add(level, { candidateIndex }));
  } else if (value?.level) add(value.level);
  else add(value);
  return results;
};

const cli = async () => {
  const named = Object.fromEntries(process.argv.slice(2).flatMap((entry) => {
    const match = entry.match(/^--([^=]+)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  const levelIds = parseLevelIds(named.levels ?? process.env.LEVEL_IDS ?? "5-10");
  const candidateLimit = Number(named["candidate-limit"] ?? process.env.CANDIDATE_LIMIT ?? 1);
  const gate = await createThinkingDifficultyGate({
    budgets: {
      globalMaxStates: Number(process.env.THINKING_GLOBAL_STATES ?? DEFAULT_ANALYSIS_BUDGET.globalMaxStates),
      continuationMaxStates: Number(process.env.THINKING_CONTINUATION_STATES ?? DEFAULT_ANALYSIS_BUDGET.continuationMaxStates),
      maxChoiceEvaluations: Number(process.env.THINKING_MAX_CHOICES ?? DEFAULT_ANALYSIS_BUDGET.maxChoiceEvaluations),
      maxLevelWallClockMs: Number(process.env.THINKING_LEVEL_MS ?? DEFAULT_ANALYSIS_BUDGET.maxLevelWallClockMs),
    },
    thresholds: {
      minRepositionOverhead: Number(process.env.THINKING_MIN_REPOSITION ?? DEFAULT_THINKING_GATE.minRepositionOverhead),
      maxOptimalPreservingDirectExitRatio: Number(process.env.THINKING_MAX_OPTIMAL_RATIO ?? DEFAULT_THINKING_GATE.maxOptimalPreservingDirectExitRatio),
      minWrongDirectExitChoices: Number(process.env.THINKING_MIN_WRONG_CHOICES ?? DEFAULT_THINKING_GATE.minWrongDirectExitChoices),
      minMedianWrongChoicePenalty: Number(process.env.THINKING_MIN_MEDIAN_PENALTY ?? DEFAULT_THINKING_GATE.minMedianWrongChoicePenalty),
      minConsequentialDecisionNodes: Number(process.env.THINKING_MIN_DECISIONS ?? DEFAULT_THINKING_GATE.minConsequentialDecisionNodes),
      minFirstStageConsequentialDecisionNodes: Number(process.env.THINKING_MIN_FIRST_STAGE_DECISIONS ?? DEFAULT_THINKING_GATE.minFirstStageConsequentialDecisionNodes),
      maxUnresolvedChoiceEvaluations: Number(process.env.THINKING_MAX_UNRESOLVED ?? DEFAULT_THINKING_GATE.maxUnresolvedChoiceEvaluations),
    },
  });
  const api = await loadInstrumentedSolver();
  let candidates;
  const input = named.input ?? process.env.THINKING_CANDIDATE_FILE;
  if (input) {
    const inputPath = resolve(projectRoot, input);
    candidates = candidateLevelsFromJson(JSON.parse(await readFile(inputPath, "utf8")), candidateLimit)
      .filter(({ level }) => !levelIds.size || levelIds.has(level.id));
  } else {
    candidates = api.LEVELS.filter((level) => levelIds.has(level.id)).map((level) => ({ level, metadata: { source: "runtime" } }));
  }
  const levels = candidates.map(({ level, metadata }) => gate.analyze(level, metadata));
  const report = {
    version: "thinking-gate-v1",
    generatedAt: new Date().toISOString(),
    source: input ?? "src/core/levels.ts runtime Lv5-10",
    budgets: gate.budgets,
    thresholds: gate.thresholds,
    summary: {
      analyzed: levels.filter((level) => level.analyzed).length,
      passed: levels.filter((level) => level.screening.pass).length,
      failed: levels.filter((level) => !level.screening.pass).length,
      elapsedMs: round(levels.reduce((sum, level) => sum + level.elapsedMs, 0), 2),
    },
    levels,
  };
  const outputPath = resolve(projectRoot, named.output ?? process.env.THINKING_OUTPUT ?? "playtest-results/experiments/real-thinking-difficulty/lv5-10-baseline.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  for (const level of levels) {
    if (!level.analyzed) {
      console.log(`Lv${level.levelId} FAIL ${level.failure} (${level.elapsedMs}ms)`);
      continue;
    }
    console.log(
      `Lv${level.levelId} ${level.screening.pass ? "PASS" : "FAIL"}`
      + ` optimal=${level.optimal.minimumDrags} clear=${level.optimal.clearDrags} reposition=${level.optimal.repositionDrags}`
      + ` direct=${level.directExitChoices.optimalPreserving}/${level.directExitChoices.total}`
      + ` ratio=${level.directExitChoices.optimalPreservingRatio}`
      + ` wrongPenalty=${level.directExitChoices.medianWrongPenalty}/${level.directExitChoices.maxWrongPenalty}`
      + ` dead=${level.directExitChoices.deadEnds} decisions=${level.decisionNodes.consequential}`
      + ` first=${level.firstStage.consequentialDecisionNodes} unresolved=${level.directExitChoices.unresolved}`
      + ` (${level.elapsedMs}ms)`,
    );
  }
  console.log(`Wrote ${outputPath}`);
  if (named["fail-on-reject"] === "true" && report.summary.failed) process.exitCode = 2;
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await cli();
