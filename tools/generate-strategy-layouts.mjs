import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const fromLevel = Math.max(1, Number(process.env.STRATEGY_LEVEL_FROM) || 1);
const toLevel = Math.min(100, Number(process.env.STRATEGY_LEVEL_TO) || 100);
const maxDepth = Math.max(4, Number(process.env.STRATEGY_MAX_DEPTH) || 12);
const beamWidth = Math.max(4, Number(process.env.STRATEGY_BEAM_WIDTH) || 10);
const layoutVersion = Math.max(1, Number(process.env.STRATEGY_LAYOUT_VERSION) || 5);
const targetDrags = Math.max(0, Number(process.env.STRATEGY_TARGET_DRAGS) || 0);
const targetToleranceValue = Number(process.env.STRATEGY_TARGET_TOLERANCE);
const targetTolerance = Math.max(0, Number.isFinite(targetToleranceValue) ? targetToleranceValue : 1);
const routeChecksPerDepth = Math.max(1, Number(process.env.STRATEGY_ROUTE_CHECKS_PER_DEPTH) || 8);
const solverMode = process.env.STRATEGY_SOLVER_MODE === "optimal" ? "optimal" : "validation";
const maximumDirectClearable = Math.max(0, Number(process.env.STRATEGY_MAX_DIRECT_CLEARABLE) || 0);
const minimumRouteOverhead = Math.max(0, Number(process.env.STRATEGY_MIN_ROUTE_OVERHEAD) || 3);
const requestedIds = (process.env.STRATEGY_LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
const levelIds = requestedIds.length
  ? [...new Set(requestedIds)].sort((a, b) => a - b)
  : Array.from({ length: toLevel - fromLevel + 1 }, (_, index) => fromLevel + index);
const runName = (process.env.STRATEGY_RUN_NAME ?? `${levelIds[0]}-${levelIds.at(-1)}`).replace(/[^a-zA-Z0-9_-]/g, "-");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(playtestUrl, { waitUntil: "networkidle" });
const results = [];

for (const levelId of levelIds) {
  const result = await page.evaluate(async ({
    levelId: id,
    maxDepth: depthLimit,
    beamWidth: widthLimit,
    layoutVersion: version,
    targetDrags: desiredDrags,
    targetTolerance: tolerance,
    routeChecksPerDepth: checksPerDepth,
    solverMode: routeSolverMode,
    maximumDirectClearable: directClearableLimit,
    minimumRouteOverhead: overheadFloor,
  }) => {
    const [{ getLevel }, { PuzzleModel }, { solveLevelForValidation, solveLevelOptimally }, { openingStrategyMetrics }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/PuzzleModel.ts"),
      import("/src/core/levelSolver.ts"),
      import("/src/core/levelStrategyMetrics.ts"),
    ]);
    const source = getLevel(id);
    const fixedDeviceIds = new Set([
      ...(source.elevators ?? []).map((device) => device.blockId),
      ...(source.conveyors ?? []).map((device) => device.blockId),
    ]);
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const cloneLevel = (level) => ({
      ...level,
      // Hints bind to authored coordinates and are re-synchronized after a
      // winning layout is selected. Keeping them during the reversible search
      // would make otherwise legal candidate positions fail validation.
      onboardingHint: undefined,
      strategyNudge: undefined,
      strategyFocus: undefined,
      gates: level.gates.map((gate) => ({ ...gate })),
      blocks: level.blocks.map((block) => ({
        ...block,
        shape: block.shape.map(([x, y]) => [x, y]),
        layers: block.layers ? [...block.layers] : undefined,
      })),
      shutters: level.shutters?.map((shutter) => ({ ...shutter })),
      playable: level.playable?.map(([x, y]) => [x, y]),
    });
    const signature = (level) => level.blocks
      .map((block) => `${block.id}@${block.x},${block.y}`)
      .sort()
      .join("|");
    const signatureNoise = (value) => {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) % 97;
    };
    const summary = (level) => openingStrategyMetrics(level);
    const targetFor = (metrics) => ({
      forced: Math.min(3, metrics.actionable),
      movable: Math.min(2, metrics.actionable),
      contacts: Math.min(3, Math.max(0, metrics.active - 1)),
    });
    const openingPasses = (metrics) => {
      const target = targetFor(metrics);
      return metrics.active >= 4
        && metrics.directClearable <= directClearableLimit
        && metrics.forcedRepositions >= target.forced
        && metrics.oneStepMovable >= target.movable
        && metrics.contacts >= target.contacts
        && metrics.matchingEdgeStarts === 0;
    };
    const score = (metrics, stateSignature) => {
      const target = targetFor(metrics);
      return (metrics.directClearable === 0 ? 5000 : -metrics.directClearable * 1400)
        + Math.min(metrics.forcedRepositions, target.forced) * 240
        + Math.min(metrics.oneStepMovable, target.movable) * 180
        + Math.min(metrics.contacts, target.contacts) * 160
        + metrics.contacts * 12
        + metrics.distinctBlockedTargets * 45
        - metrics.matchingEdgeStarts * 1600
        + signatureNoise(stateSignature) / 100;
    };
    const movedLevel = (level, blockId, dx, dy) => {
      if (fixedDeviceIds.has(blockId)) return undefined;
      const model = new PuzzleModel(level);
      const block = model.getBlock(blockId);
      if (!block || !model.isBlockActive(block)) return undefined;
      if (!model.moveBlockStep(blockId, block.x + dx, block.y + dy)) return undefined;
      const moved = model.getBlock(blockId);
      if (!moved) return undefined;
      return {
        ...level,
        blocks: level.blocks.map((candidate) => candidate.id === blockId
          ? { ...candidate, x: moved.x, y: moved.y }
          : candidate),
      };
    };
    const routeAssessment = (level) => {
      const route = routeSolverMode === "optimal"
        ? solveLevelOptimally(level, 500_000)
        : solveLevelForValidation(level, 240_000);
      const baselinePasses = route.solved && route.repositionOverhead >= overheadFloor && route.turns >= 3;
      const desiredOverhead = desiredDrags > 0
        ? Math.max(overheadFloor, desiredDrags - route.clearLoad)
        : overheadFloor;
      const dragError = desiredDrags > 0 ? Math.abs(route.minimumDrags - desiredDrags) : 0;
      const overheadError = desiredDrags > 0 ? Math.abs(route.repositionOverhead - desiredOverhead) : 0;
      const targetMatched = desiredDrags <= 0
        || (dragError <= tolerance && overheadError <= tolerance);
      return {
        route,
        baselinePasses,
        targetMatched,
        targetError: dragError * 4 + overheadError,
        passes: baselinePasses && targetMatched,
      };
    };

    const initial = cloneLevel(source);
    const initialMetrics = summary(initial);
    const initialRoute = routeAssessment(initial);
    if (openingPasses(initialMetrics) && initialRoute.passes) {
      return {
        levelId: id,
        layoutVersion: version,
        changed: false,
        deviceSafe: true,
        searchDepth: 0,
        metrics: initialMetrics,
        route: initialRoute.route,
        targetMatched: initialRoute.targetMatched,
        routeTargetError: initialRoute.targetError,
        positions: Object.fromEntries(initial.blocks.map((block) => [block.id, [block.x, block.y]])),
      };
    }

    const seen = new Set([signature(initial)]);
    let beam = [{ level: initial, path: [], metrics: initialMetrics, score: score(initialMetrics, signature(initial)) }];
    let best = beam[0];
    let solvedCandidate;
    let bestRouteCandidate = openingPasses(initialMetrics) && initialRoute.baselinePasses
      ? { ...beam[0], route: initialRoute.route, assessment: initialRoute, depth: 0 }
      : undefined;
    for (let depth = 1; depth <= depthLimit && !solvedCandidate; depth += 1) {
      const expanded = [];
      for (const state of beam) {
        for (const block of state.level.blocks) {
          for (const [dx, dy] of directions) {
            const next = movedLevel(state.level, block.id, dx, dy);
            if (!next) continue;
            const nextSignature = signature(next);
            if (seen.has(nextSignature)) continue;
            seen.add(nextSignature);
            const metrics = summary(next);
            const candidate = {
              level: next,
              path: [...state.path, { blockId: block.id, dx, dy }],
              metrics,
              score: score(metrics, nextSignature),
            };
            expanded.push(candidate);
            if (candidate.score > best.score) best = candidate;
          }
        }
      }
      expanded.sort((a, b) => b.score - a.score || signature(a.level).localeCompare(signature(b.level)));
      beam = expanded.slice(0, widthLimit);
      const openingCandidates = beam.filter((candidate) => openingPasses(candidate.metrics)).slice(0, checksPerDepth);
      for (const candidate of openingCandidates) {
        const checked = routeAssessment(candidate.level);
        if (checked.baselinePasses && (!bestRouteCandidate
          || checked.targetError < bestRouteCandidate.assessment.targetError
          || (checked.targetError === bestRouteCandidate.assessment.targetError
            && candidate.metrics.contacts > bestRouteCandidate.metrics.contacts))) {
          bestRouteCandidate = { ...candidate, route: checked.route, assessment: checked, depth };
        }
        if (checked.passes) {
          solvedCandidate = { ...candidate, route: checked.route, assessment: checked, depth };
          break;
        }
      }
      if (!beam.length) break;
    }

    const selected = solvedCandidate ?? bestRouteCandidate ?? best;
    const checked = solvedCandidate || bestRouteCandidate
      ? selected.assessment
      : routeAssessment(selected.level);
    return {
      levelId: id,
      layoutVersion: version,
      changed: signature(selected.level) !== signature(initial),
      deviceSafe: true,
      searchDepth: solvedCandidate?.depth ?? selected.path.length,
      baselinePassed: openingPasses(selected.metrics) && checked.passes,
      targetMatched: checked.targetMatched,
      routeTargetError: checked.targetError,
      metrics: selected.metrics,
      route: checked.route,
      path: selected.path,
      positions: Object.fromEntries(selected.level.blocks.map((block) => [block.id, [block.x, block.y]])),
    };
  }, {
    levelId,
    maxDepth,
    beamWidth,
    layoutVersion,
    targetDrags,
    targetTolerance,
    routeChecksPerDepth,
    solverMode,
    maximumDirectClearable,
    minimumRouteOverhead,
  });
  results.push(result);
  await writeFile(resolve(output, `round57-strategy-layouts-${runName}.json`), `${JSON.stringify({
    levelIds,
    maxDepth,
    beamWidth,
    layoutVersion,
    targetDrags,
    targetTolerance,
    routeChecksPerDepth,
    solverMode,
    maximumDirectClearable,
    minimumRouteOverhead,
    levels: results,
  }, null, 2)}\n`, "utf8");
  console.log(`${result.baselinePassed === false ? "MISS" : "PASS"} Lv${levelId} depth=${result.searchDepth} direct=${result.metrics.directClearable} drags=${result.route.minimumDrags} overhead=${result.route.repositionOverhead} turns=${result.route.turns}`);
}

await browser.close();
const misses = results.filter((result) => result.baselinePassed === false);
console.log(`Generated ${results.length} layouts; ${misses.length} need deeper/manual design${misses.length ? `: ${misses.map((item) => item.levelId).join(",")}` : ""}.`);
