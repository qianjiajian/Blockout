import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHAPTER_FOUR_PROOF_ROUTES } from "./chapter-four-proof-routes.mjs";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const requestedFrom = Number(process.env.PLAYTEST_LEVEL_FROM);
const requestedTo = Number(process.env.PLAYTEST_LEVEL_TO);
const fromLevel = Number.isInteger(requestedFrom) && requestedFrom >= 1 ? requestedFrom : 1;
const toLevel = Number.isInteger(requestedTo) && requestedTo <= 100 ? requestedTo : 100;
if (fromLevel > toLevel) throw new Error(`Solution report: invalid range Lv${fromLevel}–${toLevel}`);
const isFullCampaign = fromLevel === 1 && toLevel === 100;
const reportPath = isFullCampaign
  ? fileURLToPath(new URL("../playtest-results/round54-100-level-solution-report.json", import.meta.url))
  : fileURLToPath(new URL(`../playtest-results/lv${fromLevel}-${toLevel}-solution-report.json`, import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
// The app streams scene music after boot, so "networkidle" is not a valid
// readiness signal. The report imports its own level modules below and only
// needs the Vite document to be available.
await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
const levelMetadata = await page.evaluate(async ({ from, to }) => {
  const { LEVELS } = await import("/src/core/levels.ts");
  return LEVELS.filter((level) => level.id >= from && level.id <= to).map((level) => ({
    levelId: level.id,
    name: level.name,
    difficulty: level.difficulty,
    clearLoad: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
  }));
}, { from: fromLevel, to: toLevel });
const levels = [];
try {
  for (const metadata of levelMetadata) {
    const certifiedRoute = CHAPTER_FOUR_PROOF_ROUTES[metadata.levelId];
    if (certifiedRoute) {
      const gridSteps = certifiedRoute.reduce((sum, action) => sum + action.path.length, 0);
      const turns = certifiedRoute.reduce((sum, action) => {
        let actionTurns = 0;
        let previousDirection;
        for (let index = 1; index < action.path.length; index += 1) {
          const direction = `${Math.sign(action.path[index][0] - action.path[index - 1][0])},${Math.sign(action.path[index][1] - action.path[index - 1][1])}`;
          if (previousDirection && direction !== previousDirection) actionTurns += 1;
          previousDirection = direction;
        }
        return sum + actionTurns;
      }, 0);
      const result = {
        ...metadata,
        solved: true,
        routeDrags: certifiedRoute.length,
        repositionOverhead: certifiedRoute.length - metadata.clearLoad,
        gridSteps,
        turns,
        exploredStates: 0,
        solveDurationMs: 0,
        routeSource: "permanent_chapter_four_certificate",
      };
      levels.push(result);
      console.log(`CERTIFIED Lv${result.levelId} drags=${result.routeDrags} repositions=${result.repositionOverhead}`);
      continue;
    }
    const levelId = metadata.levelId;
    const result = await page.evaluate(async (requestedLevelId) => {
      const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
        import("/src/core/levels.ts"),
        import("/src/core/levelSolver.ts"),
      ]);
      const level = LEVELS.find((candidate) => candidate.id === requestedLevelId);
      if (!level) throw new Error(`Missing level ${requestedLevelId}`);
      const startedAt = performance.now();
      const solved = solveLevelForValidation(level);
      return {
        levelId: level.id,
        name: level.name,
        difficulty: level.difficulty,
        solved: solved.solved,
        routeDrags: solved.minimumDrags,
        clearLoad: solved.clearLoad,
        repositionOverhead: solved.repositionOverhead,
        gridSteps: solved.gridSteps,
        turns: solved.turns,
        exploredStates: solved.exploredStates,
        solveDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        routeSource: "clear_first_validation_search",
      };
    }, levelId);
    levels.push(result);
    console.log(`SOLVED Lv${result.levelId} drags=${result.routeDrags} repositions=${result.repositionOverhead} states=${result.exploredStates}`);
  }
} finally {
  await browser.close();
}

const failed = levels.filter((level) => !level.solved);
const report = {
  method: "clear-first validation search with permanent Chapter 4 certified-route fallback; each route is replayed separately by tests; not an optimality proof",
  levelsPassed: levels.length - failed.length,
  totalRouteDrags: levels.reduce((sum, level) => sum + (Number.isFinite(level.routeDrags) ? level.routeDrags : 0), 0),
  totalClearLoad: levels.reduce((sum, level) => sum + level.clearLoad, 0),
  totalRepositionOverhead: levels.reduce((sum, level) => sum + (Number.isFinite(level.repositionOverhead) ? level.repositionOverhead : 0), 0),
  totalGridSteps: levels.reduce((sum, level) => sum + level.gridSteps, 0),
  totalSolveDurationMs: Math.round(levels.reduce((sum, level) => sum + level.solveDurationMs, 0) * 100) / 100,
  levels,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failed.length) throw new Error(`Solution report: missing routes for ${failed.map((level) => level.levelId).join(",")}`);
console.log(`Solution report passed ${report.levelsPassed}/${levels.length} levels: ${report.totalRouteDrags} drags, ${report.totalRepositionOverhead} repositions, ${report.totalGridSteps} grid steps.`);
