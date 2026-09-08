import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

// The conveyor lesson replaces the usual chapter boss at 70. The star lesson
// now opens the final chapter at 91, leaving Lv100 free to be the real final
// examination under its truthful super-difficulty identity.
const pressureLevels = [60, 69, 80, 90, 99, 100];
const lessonTerminals = [
  { levelId: 70, kind: "conveyor" },
  { levelId: 91, kind: "star" },
];
const layoutSignatures = new Set();
const routingSignatures = new Set();
const report = [];

for (const levelId of pressureLevels) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(220);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== levelId || state.level.difficulty !== "super") {
    throw new Error(`Boss-redesign E2E: Lv${levelId} did not open as a playable super level`);
  }

  const playable = state.puzzle.playable ?? [];
  const layoutSignature = `${state.puzzle.width}x${state.puzzle.height}:${playable.map(([x, y]) => `${x},${y}`).join("|")}`;
  const routingSignature = JSON.stringify({
    blocks: state.puzzle.blocks.map((block) => [block.x, block.y, block.shape, block.layers, block.frozen, block.shutterId]),
    gates: state.puzzle.gates.map((gate) => [gate.side, gate.offset, gate.size, gate.color, gate.frozen]),
    blocked: state.puzzle.blocked,
  });
  if (layoutSignatures.has(layoutSignature)) throw new Error(`Boss-redesign E2E: Lv${levelId} repeated a boss silhouette`);
  if (routingSignatures.has(routingSignature)) throw new Error(`Boss-redesign E2E: Lv${levelId} repeated a boss routing layout`);
  layoutSignatures.add(layoutSignature);
  routingSignatures.add(routingSignature);

  report.push({
    levelId,
    name: state.level.name,
    role: "pressure-peak",
    difficulty: state.level.difficulty,
    width: state.puzzle.width,
    height: state.puzzle.height,
    playableCells: playable.length,
    voidCells: state.puzzle.width * state.puzzle.height - playable.length,
    blocks: state.puzzle.blocks.length,
    gates: state.puzzle.gates.length,
    parMoves: state.level.parMoves,
  });
  await page.screenshot({ path: shot(`round41-boss-level-${String(levelId).padStart(3, "0")}.png`) });
}

for (const lesson of lessonTerminals) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), lesson.levelId);
  await page.waitForTimeout(220);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== lesson.levelId
    || state.level.difficulty !== "normal" || state.level.timeSeconds !== 180
    || state.level.featureIntro?.kind !== lesson.kind) {
    throw new Error(`Boss-redesign E2E: Lv${lesson.levelId} did not preserve its low-pressure ${lesson.kind} lesson`);
  }
  if (lesson.kind === "conveyor" && state.puzzle.conveyors.length === 0) {
    throw new Error("Boss-redesign E2E: Lv70 lesson is missing its conveyor");
  }
  if (lesson.kind === "star" && !state.puzzle.blocks.some((block) => block.star)) {
    throw new Error(`Boss-redesign E2E: Lv${lesson.levelId} lesson is missing its star block`);
  }
  report.push({
    levelId: lesson.levelId,
    name: state.level.name,
    role: "mechanic-lesson",
    mechanic: lesson.kind,
    difficulty: state.level.difficulty,
    timeSeconds: state.level.timeSeconds,
    blocks: state.puzzle.blocks.length,
    gates: state.puzzle.gates.length,
    parMoves: state.level.parMoves,
  });
  await page.screenshot({ path: shot(`round41-lesson-level-${String(lesson.levelId).padStart(3, "0")}.png`) });
}

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await page.waitForTimeout(220);
const mobile = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (mobile.screen !== "playing" || mobile.level.id !== 100 || mobile.level.difficulty !== "super") {
  throw new Error("Boss-redesign E2E: 320x568 final examination did not remain playable");
}
await page.screenshot({ path: shot("round85-final-level-100-320x568.png") });

await writeFile(
  shot("round41-boss-layout-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await browser.close();
if (errors.length) throw new Error(`Boss-redesign browser errors:\n${errors.join("\n")}`);
console.log("Six late-game pressure peaks plus the Lv70/Lv91 low-pressure mechanic lessons passed.");
