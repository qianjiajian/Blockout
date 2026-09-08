import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/gate-readiness-hierarchy/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const requestedLevels = process.env.GATE_READINESS_LEVEL_IDS ?? "30,35,40";
const levelIds = requestedLevels === "all"
  ? Array.from({ length: 100 }, (_, index) => index + 1)
  : requestedLevels.split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
if (!levelIds.length) throw new Error("Set GATE_READINESS_LEVEL_IDS to one or more campaign ids");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(playtestUrl, { waitUntil: "networkidle" });
const levels = await page.evaluate(async (ids) => {
  const [{ LEVELS }, { solveLevelForValidation }, { PuzzleModel }, readiness] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/gateReadiness.ts"),
  ]);
  const summarize = (model, drag) => {
    const snapshot = model.snapshot();
    const gates = snapshot.gates.map((gate) => ({
      id: gate.id,
      color: gate.color,
      frozen: gate.frozen,
      readiness: readiness.gateReadiness(gate, snapshot.blocks, snapshot.shutters),
    }));
    return {
      afterDrag: drag,
      cleared: snapshot.cleared,
      remainingLayers: snapshot.blocks.reduce((sum, block) => sum + block.layers.length, 0),
      actionable: gates.filter((gate) => gate.readiness === "actionable").length,
      latent: gates.filter((gate) => gate.readiness === "latent").length,
      frozen: gates.filter((gate) => gate.readiness === "frozen").length,
      gates,
    };
  };
  return ids.map((id) => {
    const level = LEVELS[id - 1];
    const solution = solveLevelForValidation(level);
    const model = new PuzzleModel(level);
    const stages = [summarize(model, 0)];
    solution.drags.forEach((drag, index) => {
      model.beginAction();
      drag.path.forEach(([x, y]) => {
        if (!model.moveBlock(drag.blockId, x, y)) throw new Error(`Lv${id} ${drag.blockId} could not move to ${x},${y}`);
      });
      if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
        throw new Error(`Lv${id} ${drag.blockId} could not exit ${drag.exitSide}`);
      }
      if (!model.commitAction()) throw new Error(`Lv${id} drag ${index + 1} did not commit`);
      stages.push(summarize(model, index + 1));
    });
    const playableStages = stages.slice(0, -1);
    return {
      levelId: id,
      name: level.name,
      solved: solution.solved && model.snapshot().complete,
      totalDrags: solution.minimumDrags,
      initial: stages[0],
      maxLatent: Math.max(0, ...playableStages.map((stage) => stage.latent)),
      latentStages: playableStages.filter((stage) => stage.latent > 0),
      invalidNoActionableStages: playableStages.filter((stage) => stage.actionable === 0),
    };
  });
}, levelIds);
await page.close();
await browser.close();

const report = {
  method: "Replay each authored validation route in PuzzleModel and classify every gate after every committed drag as actionable, latent, or frozen. A latent gate is open but has no matching active top-layer block; no player solution is used at runtime.",
  levels,
  summary: {
    levels: levels.length,
    levelsWithLatentStages: levels.filter((level) => level.latentStages.length > 0).length,
    latentStages: levels.reduce((sum, level) => sum + level.latentStages.length, 0),
    invalidNoActionableStages: levels.reduce((sum, level) => sum + level.invalidNoActionableStages.length, 0),
  },
};
const reportPath = resolve(output, "gate-readiness-report.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
for (const level of levels) {
  console.log(`GATE-READINESS Lv${level.levelId} initial=${level.initial.actionable}/${level.initial.latent}/${level.initial.frozen} max-latent=${level.maxLatent} stages=${level.latentStages.length}/${level.totalDrags + 1}`);
}
if (report.summary.invalidNoActionableStages > 0) {
  throw new Error(`Gate-readiness audit found ${report.summary.invalidNoActionableStages} non-complete states without an actionable exit`);
}
console.log(`Verified ${report.summary.levels} levels: ${report.summary.levelsWithLatentStages} use latent-exit hierarchy across ${report.summary.latentStages} route stages; 0 non-complete stages lose every actionable exit.`);
console.log(`Gate-readiness report written to ${reportPath}`);
