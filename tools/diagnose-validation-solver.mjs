import { chromium } from "playwright";

const ids = (process.env.STRATEGY_LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter(Number.isInteger);
const maxStates = Number(process.env.SOLVER_MAX_STATES) || 5_000;
const removeStrategyGuards = process.env.REMOVE_STRATEGY_GUARDS === "1";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
for (const levelId of ids) {
  const startedAt = Date.now();
  const result = await page.evaluate(async ({ levelId: id, maxStates: limit, removeStrategyGuards: removeGuards }) => {
    const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
    ]);
    const source = getLevel(id);
    const level = removeGuards
      ? { ...source, blocks: source.blocks.filter((block) => !block.id.startsWith("strategy-guard")) }
      : source;
    return solveLevelForValidation(level, limit);
  }, { levelId, maxStates, removeStrategyGuards });
  console.log(JSON.stringify({
    levelId,
    elapsedMs: Date.now() - startedAt,
    ...result,
    drags: process.env.PRINT_DRAGS === "1" ? result.drags : result.drags.length,
  }));
}
await browser.close();
