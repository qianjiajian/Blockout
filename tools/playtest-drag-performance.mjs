import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const reportPath = resolve(output, "round49-drag-performance-report.json");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });

const report = await page.evaluate(async () => {
  const [{ getLevel }, { PuzzleModel }, drag] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/continuousDrag.ts"),
  ]);
  const snapshot = new PuzzleModel(getLevel(100)).snapshot();
  const block = snapshot.blocks.reduce((largest, candidate) => (
    candidate.shape.length > largest.shape.length ? candidate : largest
  ));
  const start = { x: block.x, y: block.y };
  const target = { x: block.x + 8, y: block.y + 8 };
  const cachedValidator = drag.createContinuousCollisionValidator(snapshot, block.id);

  for (let index = 0; index < 20; index += 1) {
    drag.sweepContinuousPose(start, target, cachedValidator, 0.08);
  }

  const cachedIterations = 300;
  let startedAt = performance.now();
  for (let index = 0; index < cachedIterations; index += 1) {
    drag.sweepContinuousPose(start, target, cachedValidator, 0.08);
  }
  const cachedTotalMs = performance.now() - startedAt;

  const rebuildingIterations = 30;
  startedAt = performance.now();
  for (let index = 0; index < rebuildingIterations; index += 1) {
    drag.sweepContinuousPose(
      start,
      target,
      (x, y) => drag.isContinuousPoseValid(snapshot, block.id, x, y),
      0.08,
    );
  }
  const rebuildingTotalMs = performance.now() - startedAt;
  const cachedPerSweepMs = cachedTotalMs / cachedIterations;
  const rebuildingPerSweepMs = rebuildingTotalMs / rebuildingIterations;

  return {
    levelId: 100,
    blockId: block.id,
    blockCells: block.shape.length,
    board: { width: snapshot.width, height: snapshot.height, playableCells: snapshot.playable.length },
    sweepDistanceCells: 8,
    sweepStepCells: 0.08,
    cachedIterations,
    rebuildingIterations,
    cachedTotalMs,
    rebuildingTotalMs,
    cachedPerSweepMs,
    rebuildingPerSweepMs,
    speedup: rebuildingPerSweepMs / cachedPerSweepMs,
  };
});

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await page.close();
await browser.close();

if (errors.length) throw new Error(`Drag-performance browser errors:\n${errors.join("\n")}`);
if (report.cachedPerSweepMs > 1.5) {
  throw new Error(`Drag-performance E2E: cached worst-case sweep took ${report.cachedPerSweepMs.toFixed(3)} ms`);
}
if (report.speedup < 5) {
  throw new Error(`Drag-performance E2E: collision-field speedup was only ${report.speedup.toFixed(2)}x`);
}
console.log(`Drag collision field passed: ${report.cachedPerSweepMs.toFixed(3)} ms/sweep, ${report.speedup.toFixed(1)}x faster than rebuilding per substep.`);
