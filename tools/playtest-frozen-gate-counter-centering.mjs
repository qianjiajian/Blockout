import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/frozen-gate-counter-centering/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const fixtureLevel = 84;
const authoredCell = 95;
const faceThickness = 58;
const horizontalIceHeight = 67;
const epsilon = 0.01;
const viewports = [
  { name: "standard", width: 496, height: 1078 },
  { name: "small", width: 320, height: 568 },
];

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`[${viewport.name}] ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`[${viewport.name}] ${error.message}`));

  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function instrumentFrozenGateCounter(
      text,
      x,
      y,
      maxWidth,
    ) {
      const fill = String(this.fillStyle).toLowerCase().replaceAll(" ", "");
      if (/^\d+$/.test(String(text))
        && this.font.includes("23px")
        && (fill === "#633545" || fill === "rgb(99,53,69)")) {
        const calls = window.__FROZEN_GATE_COUNTER_CALLS__ ??= [];
        calls.push({ text: String(text), x, y });
        if (calls.length > 1_000) calls.splice(0, calls.length - 1_000);
      }
      if (maxWidth == null) return original.call(this, text, x, y);
      return original.call(this, text, x, y, maxWidth);
    };
  });

  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => {
    const key = "color-escape-save-v1";
    const save = JSON.parse(localStorage.getItem(key));
    save.currentLevel = 84;
    save.highestLevel = 100;
    save.sound = false;
    save.haptic = false;
    save.reducedMotion = true;
    save.featureSeen = [
      "basics",
      "ice-door",
      "ice-block",
      "layer",
      "shutter",
      "axis",
      "key-lock",
      "lift",
      "timed-generator",
      "staged-frame",
      "generator",
      "star-gate",
    ];
    save.boosterUnlockSeen = ["time", "rocket", "pulse"];
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 15_000 },
  );
  await page.evaluate((levelId) => {
    window.__FROZEN_GATE_COUNTER_CALLS__ = [];
    window.__COLOR_ESCAPE__.loadLevel(levelId, true);
  }, fixtureLevel);
  await page.waitForFunction(
    (levelId) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "playing" && state.level.id === levelId && state.art.ready;
    },
    fixtureLevel,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(180);

  const evidence = await page.evaluate(({ cellSize, rimThickness, iceHeight }) => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const { board } = state;
    const thickness = board.cell * rimThickness / cellSize;
    const expected = state.puzzle.gates
      .filter((gate) => gate.frozen > 0)
      .map((gate) => {
        let x = board.innerX + gate.offset * board.cell;
        let y = board.innerY - thickness;
        let width = gate.size * board.cell;
        let height = thickness;
        if (gate.side === "bottom") y = board.innerY + board.innerHeight;
        if (gate.side === "left" || gate.side === "right") {
          x = gate.side === "left" ? board.innerX - thickness : board.innerX + board.innerWidth;
          y = board.innerY + gate.offset * board.cell;
          width = thickness;
          height = gate.size * board.cell;
        }
        const center = { x: x + width / 2, y: y + height / 2 };
        if (gate.side === "top") {
          center.y -= (iceHeight - rimThickness) * board.cell / cellSize;
        }
        return {
          id: gate.id,
          side: gate.side,
          text: String(gate.frozen),
          expected: center,
        };
      });
    const calls = (window.__FROZEN_GATE_COUNTER_CALLS__ ?? []).map((call) => ({ ...call }));
    return { expected, calls, board };
  }, { cellSize: authoredCell, rimThickness: faceThickness, iceHeight: horizontalIceHeight });

  const matches = evidence.expected.map((gate) => {
    const sameText = evidence.calls.filter((call) => call.text === gate.text);
    const nearest = sameText.sort((left, right) => (
      Math.hypot(left.x - gate.expected.x, left.y - gate.expected.y)
      - Math.hypot(right.x - gate.expected.x, right.y - gate.expected.y)
    ))[0];
    if (!nearest) throw new Error(`${viewport.name}/${gate.id}: counter ${gate.text} was not drawn`);
    const error = {
      x: Math.abs(nearest.x - gate.expected.x),
      y: Math.abs(nearest.y - gate.expected.y),
    };
    if (error.x > epsilon || error.y > epsilon) {
      throw new Error(`${viewport.name}/${gate.id}: frozen-gate counter is off-center ${JSON.stringify({
        side: gate.side,
        expected: gate.expected,
        actual: nearest,
        error,
      })}`);
    }
    return { ...gate, actual: nearest, error };
  });

  const coveredSides = [...new Set(matches.map(({ side }) => side))].sort();
  if (coveredSides.join(",") !== "bottom,left,right,top") {
    throw new Error(`${viewport.name}: fixture does not cover all four gate sides (${coveredSides.join(",")})`);
  }

  const screenshot = `${viewport.name}.png`;
  await page.screenshot({ path: `${output}/${screenshot}` });
  results.push({
    viewport,
    levelId: fixtureLevel,
    screenshot,
    frozenGateCount: matches.length,
    coveredSides,
    maximumCenterError: Math.max(...matches.flatMap(({ error }) => [error.x, error.y])),
    matches,
  });
  await page.close();
}

await browser.close();

if (errors.length) {
  throw new Error(`Frozen-gate counter E2E logged browser errors:\n${errors.join("\n")}`);
}

await writeFile(
  `${output}/report.json`,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  "utf8",
);

console.log(`Frozen-gate counter centering passed for ${results.length} viewports and all four sides.`);
