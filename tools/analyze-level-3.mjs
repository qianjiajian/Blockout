import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(3, true));
await page.waitForTimeout(180);
await page.screenshot({ path: resolve(output, "round57-level-003-analysis-start.png") });

const analysis = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelOptimally, solveLevelForValidation }, { PuzzleModel }, { openingStrategyMetrics }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/core/levelStrategyMetrics.ts"),
  ]);
  const level = getLevel(3);
  const optimal = solveLevelOptimally(level);
  const validation = solveLevelForValidation(level);
  const directions = [
    { name: "右", dx: 1, dy: 0 },
    { name: "下", dx: 0, dy: 1 },
    { name: "左", dx: -1, dy: 0 },
    { name: "上", dx: 0, dy: -1 },
  ];
  const legalFirstSteps = [];
  for (const authored of level.blocks) {
    for (const direction of directions) {
      const model = new PuzzleModel(level);
      const block = model.getBlock(authored.id);
      if (!block || !model.isBlockActive(block)) continue;
      if (model.moveBlockStep(block.id, block.x + direction.dx, block.y + direction.dy)) {
        legalFirstSteps.push({ blockId: block.id, direction: direction.name });
      }
    }
  }
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const voids = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!playable.has(`${x},${y}`)) voids.push([x, y]);
    }
  }
  return {
    level: {
      id: level.id,
      name: level.name,
      difficulty: level.difficulty,
      width: level.width,
      height: level.height,
      parMoves: level.parMoves,
      timeSeconds: level.timeSeconds,
      playableCells: level.playable?.length ?? level.width * level.height,
      voids,
      gates: level.gates,
      blocks: level.blocks,
    },
    opening: openingStrategyMetrics(level),
    legalFirstSteps,
    optimal,
    validation,
  };
});

await writeFile(resolve(output, "round57-level-003-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
await browser.close();
console.log(JSON.stringify({
  level: analysis.level,
  opening: analysis.opening,
  legalFirstSteps: analysis.legalFirstSteps,
  optimal: analysis.optimal,
}, null, 2));
