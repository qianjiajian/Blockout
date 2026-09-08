import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(playtestUrl, { waitUntil: "networkidle" });
const fromLevel = Math.max(1, Number(process.env.STRATEGY_LEVEL_FROM) || 1);
const toLevel = Math.min(100, Number(process.env.STRATEGY_LEVEL_TO) || 100);
const levels = [];
for (let levelId = fromLevel; levelId <= toLevel; levelId += 1) {
  const level = await page.evaluate(async (id) => {
    const [{ getLevel }, { solveLevelForValidation }, { openingStrategyMetrics }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
      import("/src/core/levelStrategyMetrics.ts"),
    ]);
    const level = getLevel(id);
    const route = solveLevelForValidation(level);
    const opening = openingStrategyMetrics(level);
    const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
    const visibleBlocks = level.blocks.filter((block) => !block.shutterId || !closed.has(block.shutterId)).length;
    return {
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty,
      visibleBlocks,
      clearLoad: route.clearLoad,
      routeDrags: route.minimumDrags,
      repositionOverhead: route.repositionOverhead,
      gridSteps: route.gridSteps,
      turns: route.turns,
      exploredStates: route.exploredStates,
      solved: route.solved,
      ...opening,
    };
  }, levelId);
  levels.push(level);
  console.log(`AUDIT Lv${levelId} solved=${level.solved} direct=${level.directClearable} overhead=${level.repositionOverhead}`);
}
await browser.close();

const baseline = {
  visibleBlocks: 4,
  directClearableMaximum: 0,
  forcedRepositions: 3,
  oneStepMovable: 2,
  contacts: 3,
  routeRepositionOverhead: 3,
  routeTurns: 3,
};
const failures = levels.map((level) => ({
  levelId: level.levelId,
  reasons: [
    level.visibleBlocks < baseline.visibleBlocks ? `visible=${level.visibleBlocks}` : undefined,
    level.directClearable > baseline.directClearableMaximum ? `direct=${level.directClearable}` : undefined,
    level.forcedRepositions < Math.min(baseline.forcedRepositions, level.actionable) ? `forced=${level.forcedRepositions}` : undefined,
    level.oneStepMovable < Math.min(baseline.oneStepMovable, level.actionable) ? `movable=${level.oneStepMovable}` : undefined,
    level.contacts < Math.min(baseline.contacts, Math.max(0, level.active - 1)) ? `contacts=${level.contacts}` : undefined,
    level.repositionOverhead < baseline.routeRepositionOverhead ? `routeOverhead=${level.repositionOverhead}` : undefined,
    level.turns < baseline.routeTurns ? `turns=${level.turns}` : undefined,
    !level.solved ? "unsolved" : undefined,
  ].filter(Boolean),
})).filter((level) => level.reasons.length);
const report = { baseline, levels, failures };
const suffix = fromLevel === 1 && toLevel === 100 ? "" : `-${fromLevel}-${toLevel}`;
await writeFile(resolve(output, `round57-strategy-baseline-audit${suffix}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ baseline, firstTwenty: levels.slice(0, 20), failedLevels: failures.length, failures }, null, 2));
