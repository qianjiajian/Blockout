import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const levelIds = (process.env.RESCUE_LEVEL_IDS ?? "78,80,90,98")
  .split(",")
  .map(Number)
  .filter(Number.isInteger);
const reportPath = resolve(
  projectRoot,
  "playtest-results/player-difficulty-study",
  `first-impression-browser-report-${levelIds.join("-")}.json`,
);
const report = JSON.parse(await readFile(reportPath, "utf8"));
const inputs = report.levels.flatMap((level) => {
  const observedNudge = level.actions.find((action) => action.kind.startsWith("nudge")) ?? null;
  const before = level.rescueEvents.find((candidate) => candidate.nudge.visible)
    ?? level.rescueEvents.find((candidate) => candidate.noClearMoveStreak >= 10)
    ?? level.rescueEvents.at(-1);
  const after = observedNudge
    ? level.rescueEvents.find((candidate) => candidate.afterGesture === observedNudge.gesture)
    : undefined;
  return [
    {
      levelId: level.levelId,
      stage: "before-nudge",
      afterGesture: before?.afterGesture ?? null,
      positions: before?.activeBlockPositions ?? [],
      observedNudge,
    },
    ...(after ? [{
      levelId: level.levelId,
      stage: "after-nudge",
      afterGesture: after.afterGesture,
      positions: after.activeBlockPositions ?? [],
      observedNudge,
    }] : []),
  ];
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
const results = await page.evaluate(async (items) => {
  const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }, { localBreakthroughAction, localBreakthroughFocus }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/localBreakthroughFocus.ts"),
  ]);
  return items.map((item) => {
    const source = getLevel(item.levelId);
    const positions = new Map(item.positions.map((block) => [block.id, block]));
    const level = {
      ...source,
      blocks: source.blocks.map((block) => {
        const current = positions.get(block.id);
        return current ? { ...block, x: current.x, y: current.y } : { ...block };
      }),
    };
    const localModel = new PuzzleModel({ ...level, strategyNudge: undefined });
    const localStarted = performance.now();
    const localFocus = localBreakthroughFocus(
      localModel,
      source.strategyFocus?.blockId,
    );
    const localElapsedMs = performance.now() - localStarted;
    const localAction = localBreakthroughAction(localModel, source.strategyFocus?.blockId);
    const solved = solveLevelForValidation(level);
    const firstClearIndex = solved.drags.findIndex((drag) => Boolean(drag.exitSide));
    return {
      ...item,
      solved: solved.solved,
      exploredStates: solved.exploredStates,
      firstClearDrag: firstClearIndex >= 0 ? firstClearIndex + 1 : null,
      counterfactualOpening: solved.drags.slice(0, firstClearIndex >= 0 ? firstClearIndex + 1 : 0),
      localFocus,
      localAction,
      localElapsedMs,
    };
  });
}, inputs);
await browser.close();

const outputPath = resolve(projectRoot, "playtest-results/player-difficulty-study/adaptive-rescue-counterfactual.json");
await writeFile(outputPath, `${JSON.stringify({ sourceReport: reportPath, levels: results }, null, 2)}\n`, "utf8");
for (const result of results) {
  console.log(`COUNTERFACTUAL Lv${result.levelId} ${result.stage} after=${result.afterGesture} firstClear=${result.firstClearDrag ?? "none"} states=${result.exploredStates} observed=${result.observedNudge?.blockId ?? "none"} optimal=${result.counterfactualOpening[0]?.blockId ?? "none"} local=${result.localFocus?.blockId ?? "none"}/${result.localFocus?.kind ?? "none"} path=${result.localAction?.path?.map((point) => point.join(",")).join(";") ?? "none"} localMs=${result.localElapsedMs.toFixed(2)}`);
}
