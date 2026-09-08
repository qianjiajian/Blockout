import { chromium } from "playwright";

const levelId = Number(process.env.PLAYTEST_LEVEL_ID) || 79;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
const result = await page.evaluate(async (id) => {
  const [{ getLevel }, { PuzzleModel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const level = getLevel(id);
  const withoutGuard = { ...level, blocks: level.blocks.filter((block) => !block.id.startsWith("strategy-guard")) };
  const route = solveLevelForValidation(withoutGuard, 50_000);
  const model = new PuzzleModel(level);
  const actions = [];
  const apply = (drag) => {
    for (const [x, y] of drag.path) {
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        return `move ${drag.blockId} -> ${x},${y} failed at ${JSON.stringify(model.getBlock(drag.blockId))}`;
      }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return `exit ${drag.blockId} ${drag.exitSide} failed`;
    actions.push(drag);
    return undefined;
  };
  let error = apply({ blockId: "strategy-guard-a", path: [[8, 1], [7, 1]] });
  for (let index = 0; !error && index < route.drags.length; index += 1) {
    error = apply(route.drags[index]);
    if (!error && index === 4) {
      error = apply({
        blockId: "strategy-guard-a",
        path: [[6, 1], [5, 1], [5, 2], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3]],
        exitSide: "right",
      });
    }
  }
  return { error, routeSolved: route.solved, complete: model.complete, remaining: model.blocks, actions };
}, levelId);
await browser.close();
console.log(JSON.stringify(result, null, 2));
