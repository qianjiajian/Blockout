import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/block-pick-targets/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
await page.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star-gate"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
})));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);

const levels = [];
for (let levelId = 1; levelId <= 100; levelId += 1) {
  const row = await page.evaluate((id) => {
    window.__COLOR_ESCAPE__.loadLevel(id, true);
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const scale = state.viewportTransform.scale;
    const cellCss = state.board.cell * scale;
    const playable = new Set(state.puzzle.playable.map(([x, y]) => `${x},${y}`));
    const occupied = new Set();
    const closedShutters = new Set(state.puzzle.shutters.filter((item) => item.count > 0).map((item) => item.id));
    const activeBlocks = state.puzzle.blocks.filter((block) => !block.shutterId || !closedShutters.has(block.shutterId));
    activeBlocks.forEach((block) => block.shape.forEach(([dx, dy]) => occupied.add(`${block.x + dx},${block.y + dy}`)));
    state.puzzle.shutters.filter((item) => item.count > 0).forEach((item) => {
      for (let y = item.y; y < item.y + item.height; y += 1) {
        for (let x = item.x; x < item.x + item.width; x += 1) occupied.add(`${x},${y}`);
      }
    });
    const blocks = activeBlocks.map((block) => {
      const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
      const xs = cells.map(([x]) => x);
      const ys = cells.map(([, y]) => y);
      const widthCss = (Math.max(...xs) - Math.min(...xs) + 1) * cellCss;
      const heightCss = (Math.max(...ys) - Math.min(...ys) + 1) * cellCss;
      const emptyNeighbors = new Set();
      cells.forEach(([x, y]) => {
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
          const key = `${x + dx},${y + dy}`;
          if (playable.has(key) && !occupied.has(key)) emptyNeighbors.add(key);
        });
      });
      return {
        id: block.id,
        cells: cells.length,
        widthCss,
        heightCss,
        below44OnAnAxis: widthCss < 44 || heightCss < 44,
        emptyNeighborCount: emptyNeighbors.size,
      };
    });
    return { levelId: id, width: state.level.width, height: state.level.height, cellCss, blocks };
  }, levelId);
  levels.push(row);
}

const blocks = levels.flatMap((level) => level.blocks.map((block) => ({ levelId: level.levelId, cellCss: level.cellCss, ...block })));
const undersized = blocks.filter((block) => block.below44OnAnAxis);
const forgivingCandidates = undersized.filter((block) => block.emptyNeighborCount > 0);
const report = {
  viewport: { width: 320, height: 568 },
  levels: levels.length,
  activeBlocks: blocks.length,
  levelsWithSub44Cell: levels.filter((level) => level.cellCss < 44).length,
  minimumCellCss: Math.min(...levels.map((level) => level.cellCss)),
  blocksBelow44OnAnAxis: undersized.length,
  undersizedBlocksWithEmptyNeighbor: forgivingCandidates.length,
  examples: forgivingCandidates.slice(0, 40),
};
await writeFile(resolve(output, "small-screen-block-target-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await browser.close();
console.log(`Small-screen block audit: ${report.blocksBelow44OnAnAxis}/${report.activeBlocks} active blocks below 44px on an axis; ${report.undersizedBlocksWithEmptyNeighbor} have empty-neighbor forgiveness space; minimum cell ${report.minimumCellCss.toFixed(1)}px.`);
