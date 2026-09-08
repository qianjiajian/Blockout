import { chromium } from "playwright";

const levelIds = (process.env.BREAKTHROUGH_LEVEL_IDS ?? "8")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
if (!levelIds.length) throw new Error("Set BREAKTHROUGH_LEVEL_IDS to one or more campaign ids");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
const report = await page.evaluate(async (ids) => {
  const [{ LEVELS }, solver, strategy] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/levelStrategyMetrics.ts"),
  ]);
  return ids.map((id) => {
    const level = LEVELS[id - 1];
    const validation = solver.solveLevelForValidation(level);
    const firstClearIndex = validation.drags.findIndex((drag) => Boolean(drag.exitSide));
    const firstClearDrag = firstClearIndex < 0 ? null : firstClearIndex + 1;
    return {
      levelId: id,
      name: level.name,
      difficulty: level.difficulty,
      parMoves: level.parMoves,
      dimensions: [level.width, level.height],
      opening: strategy.openingStrategyMetrics(level),
      validation: {
        solved: validation.solved,
        drags: validation.minimumDrags,
        repositionOverhead: validation.repositionOverhead,
        gridSteps: validation.gridSteps,
        turns: validation.turns,
        exploredStates: validation.exploredStates,
        firstClearDrag,
        openingRoute: validation.drags.slice(0, Math.max(firstClearDrag ?? 0, 8)).map((drag, index) => ({
          drag: index + 1,
          blockId: drag.blockId,
          from: level.blocks.find((block) => block.id === drag.blockId)
            ? [level.blocks.find((block) => block.id === drag.blockId).x, level.blocks.find((block) => block.id === drag.blockId).y]
            : null,
          to: drag.path.at(-1) ?? null,
          path: drag.path,
          gridSteps: drag.path.length,
          exitSide: drag.exitSide ?? null,
        })),
      },
      blocks: level.blocks.map((block) => ({
        id: block.id,
        x: block.x,
        y: block.y,
        shape: block.shape,
        color: block.layers?.[0] ?? block.color,
      })),
      gates: level.gates,
    };
  });
}, levelIds);
await page.close();
await browser.close();
console.log(JSON.stringify(report, null, 2));
