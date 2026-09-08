import { chromium } from "playwright";

const ids = (process.env.STRATEGY_LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter(Number.isInteger);
const maxStates = Number(process.env.SOLVER_MAX_STATES) || 20_000;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
for (const levelId of ids) {
  const results = await page.evaluate(async ({ levelId: id, maxStates: limit }) => {
    const [{ getLevel }, { solveLevelForValidation }, { openingStrategyMetrics }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
      import("/src/core/levelStrategyMetrics.ts"),
    ]);
    const source = getLevel(id);
    const colors = [...new Set(source.gates.map((gate) => gate.color))];
    return colors.map((color) => {
      const level = {
        ...source,
        blocks: source.blocks.map((block) => block.id === "strategy-guard-a" ? { ...block, color } : block),
      };
      const startedAt = performance.now();
      const route = solveLevelForValidation(level, limit);
      return {
        color,
        metrics: openingStrategyMetrics(level),
        solved: route.solved,
        overhead: route.repositionOverhead,
        turns: route.turns,
        exploredStates: route.exploredStates,
        elapsedMs: Math.round(performance.now() - startedAt),
      };
    });
  }, { levelId, maxStates });
  console.log(JSON.stringify({ levelId, results }, null, 2));
}
await browser.close();
