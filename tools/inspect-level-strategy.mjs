import { chromium } from "playwright";

const ids = (process.env.STRATEGY_LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter(Number.isInteger);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
const result = await page.evaluate(async (levelIds) => {
  const [{ LEVELS }, { canClearWithOtherBlocksFixed, openingStrategyMetrics }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelStrategyMetrics.ts"),
  ]);
  return LEVELS.filter((level) => levelIds.includes(level.id)).map((level) => ({
    levelId: level.id,
    dimensions: [level.width, level.height],
    directBlockIds: level.blocks
      .filter((block) => canClearWithOtherBlocksFixed(level, block.id))
      .map((block) => block.id),
    metrics: openingStrategyMetrics(level),
    gates: level.gates,
    boardRows: Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => (
      (level.playable ?? []).some(([cellX, cellY]) => cellX === x && cellY === y) ? "." : "#"
    )).join("")),
    elevators: level.elevators,
    conveyors: level.conveyors,
    blocks: level.blocks.map((block) => ({
      id: block.id,
      x: block.x,
      y: block.y,
      shape: block.shape,
      color: block.layers?.[0] ?? block.color,
      frozen: block.frozen ?? 0,
      shutterId: block.shutterId,
    })),
  }));
}, ids);
await browser.close();
console.log(JSON.stringify(result, null, 2));
