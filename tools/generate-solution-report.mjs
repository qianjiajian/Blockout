import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
await page.goto(playtestUrl, { waitUntil: "networkidle" });
const levels = await page.evaluate(async ({ from, to }) => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return LEVELS.filter((level) => level.id >= from && level.id <= to).map((level) => {
    const startedAt = performance.now();
    const result = solveLevelForValidation(level);
    return {
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty,
      solved: result.solved,
      routeDrags: result.minimumDrags,
      clearLoad: result.clearLoad,
      repositionOverhead: result.repositionOverhead,
      gridSteps: result.gridSteps,
      turns: result.turns,
      exploredStates: result.exploredStates,
      solveDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  });
}, { from: fromLevel, to: toLevel });
await browser.close();

const failed = levels.filter((level) => !level.solved);
const report = {
  method: "clear-first validation search; each route is replayed separately by tests; not an optimality proof",
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
