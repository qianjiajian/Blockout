import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const latestPath = resolve(root, "playtest-results/latest-100-level-pointer-report.json");
const roundPath = resolve(root, "playtest-results/round54-100-level-pointer-report.json");
const rangePath = resolve(root, process.env.POINTER_RANGE_REPORT ?? "playtest-results/round54-pointer-levels-1-10.json");

const [latest, range] = await Promise.all([
  readFile(latestPath, "utf8").then(JSON.parse),
  readFile(rangePath, "utf8").then(JSON.parse),
]);
if (latest.levels?.length !== 100 || !range.levels?.length) {
  throw new Error("Pointer report merge requires one 100-level baseline and one non-empty range report");
}

const replacement = new Map(range.levels.map((level) => [level.levelId, level]));
const levels = latest.levels.map((level) => replacement.get(level.levelId) ?? level);
if (new Set(levels.map((level) => level.levelId)).size !== 100) {
  throw new Error("Pointer report merge produced duplicate or missing level ids");
}

const report = {
  ...latest,
  method: `${latest.method}; Lv${range.levels[0].levelId}–Lv${range.levels.at(-1).levelId} refreshed by a range-only real Pointer replay because later levels were unchanged`,
  levelsPassed: levels.length,
  pointerGestures: levels.reduce((sum, level) => sum + level.gestures, 0),
  pointerGridSteps: levels.reduce((sum, level) => sum + level.gridSteps, 0),
  totalTestWallClockDurationMs: levels.reduce((sum, level) => sum + level.testWallClockDurationMs, 0),
  maxLevelTestWallClockDurationMs: Math.max(...levels.map((level) => level.testWallClockDurationMs)),
  refreshedRange: [range.levels[0].levelId, range.levels.at(-1).levelId],
  levels,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
await Promise.all([writeFile(latestPath, serialized, "utf8"), writeFile(roundPath, serialized, "utf8")]);
console.log(`Merged Lv${report.refreshedRange[0]}–Lv${report.refreshedRange[1]} Pointer evidence; preserved unchanged levels outside the range.`);
