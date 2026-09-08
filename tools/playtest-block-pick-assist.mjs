import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/block-pick-targets/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star-gate"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript((initialSave) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));
}, save);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const canvasBounds = await page.locator("canvas").boundingBox();
if (!canvasBounds) throw new Error("Block-pick E2E: canvas bounds unavailable");
const logicalToPage = async ({ x, y }) => {
  const state = await debug();
  return {
    x: canvasBounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: canvasBounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};

const fixtures = await page.evaluate(async () => {
  const { pickNearbyBlock, rankNearbyBlocks } = await import("/src/game/blockPicker.ts");
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let assisted;
  let ambiguous;
  let boardVoid;

  for (let levelId = 1; levelId <= 100; levelId += 1) {
    window.__COLOR_ESCAPE__.loadLevel(levelId, true);
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const { puzzle, board } = state;
    const cellCss = board.cell * state.viewportTransform.scale;
    const maximumDistanceCss = Math.max(0, (44 - cellCss) / 2);
    if (maximumDistanceCss <= 0) continue;
    const maximumDistance = maximumDistanceCss / cellCss;
    const ambiguityMargin = 4 / cellCss;
    const playable = new Set(puzzle.playable.map(([x, y]) => `${x},${y}`));
    const blocked = new Set(puzzle.blocked.map(([x, y]) => `${x},${y}`));
    const closedShutters = puzzle.shutters.filter((shutter) => shutter.count > 0);
    const hiddenIds = new Set(closedShutters.map((shutter) => shutter.id));
    const visible = puzzle.blocks.filter((block) => !block.shutterId || !hiddenIds.has(block.shutterId));
    const active = visible.filter((block) => block.frozen <= 0);
    const cellsFor = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
    const candidates = active.map((block) => ({ id: block.id, cells: cellsFor(block) }));
    const occupied = new Map();
    visible.forEach((block) => cellsFor(block).forEach(([x, y]) => occupied.set(`${x},${y}`, block.id)));
    closedShutters.forEach((shutter) => {
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.set(`${x},${y}`, `shutter:${shutter.id}`);
      }
    });
    const isLegalMove = (block, dx, dy) => cellsFor(block, block.x + dx, block.y + dy).every(([x, y]) => {
      const key = `${x},${y}`;
      const occupant = occupied.get(key);
      return playable.has(key) && !blocked.has(key) && (!occupant || occupant === block.id);
    });
    const logicalPoint = (point) => ({
      x: board.innerX + point.x * board.cell,
      y: board.innerY + point.y * board.cell,
    });

    if (!assisted || cellCss < assisted.cellCss) {
      for (const block of active) {
        const move = directions.find(([dx, dy]) => isLegalMove(block, dx, dy));
        if (!move) continue;
        for (const [cellX, cellY] of cellsFor(block)) {
          for (const [edgeX, edgeY] of directions) {
            const emptyX = cellX + edgeX;
            const emptyY = cellY + edgeY;
            const emptyKey = `${emptyX},${emptyY}`;
            if (!playable.has(emptyKey) || blocked.has(emptyKey) || occupied.has(emptyKey)) continue;
            const distance = Math.min(maximumDistance * 0.62, 0.44);
            const point = edgeX < 0
              ? { x: cellX - distance, y: cellY + 0.5 }
              : edgeX > 0
                ? { x: cellX + 1 + distance, y: cellY + 0.5 }
                : edgeY < 0
                  ? { x: cellX + 0.5, y: cellY - distance }
                  : { x: cellX + 0.5, y: cellY + 1 + distance };
            const result = pickNearbyBlock(point, candidates, maximumDistance, ambiguityMargin);
            if (result?.blockId !== block.id) continue;
            assisted = {
              levelId,
              blockId: block.id,
              blockOrigin: { x: block.x, y: block.y },
              point: logicalPoint(point),
              pointGrid: point,
              move: { x: move[0], y: move[1] },
              cellLogical: board.cell,
              cellCss,
              distanceCss: result.distance * cellCss,
              maximumDistanceCss,
            };
            break;
          }
          if (assisted) break;
        }
        if (assisted) break;
      }
    }

    if (!ambiguous) {
      for (const [emptyX, emptyY] of puzzle.playable) {
        const emptyKey = `${emptyX},${emptyY}`;
        if (blocked.has(emptyKey) || occupied.has(emptyKey)) continue;
        for (let sampleY = 1; sampleY <= 9; sampleY += 1) {
          for (let sampleX = 1; sampleX <= 9; sampleX += 1) {
            const point = { x: emptyX + sampleX / 10, y: emptyY + sampleY / 10 };
            const ranked = rankNearbyBlocks(point, candidates);
            if (!ranked[1] || ranked[0].distance > maximumDistance
              || ranked[1].distance - ranked[0].distance > ambiguityMargin) continue;
            if (pickNearbyBlock(point, candidates, maximumDistance, ambiguityMargin)) continue;
            ambiguous = {
              levelId,
              point: logicalPoint(point),
              pointGrid: point,
              cellCss,
              nearest: ranked.slice(0, 2),
              ambiguityMarginCss: 4,
            };
            break;
          }
          if (ambiguous) break;
        }
        if (ambiguous) break;
      }
    }

    if (!boardVoid) {
      for (const block of active) {
        for (const [cellX, cellY] of cellsFor(block)) {
          for (const [edgeX, edgeY] of directions) {
            const voidX = cellX + edgeX;
            const voidY = cellY + edgeY;
            if (playable.has(`${voidX},${voidY}`)) continue;
            const distance = Math.min(maximumDistance * 0.62, 0.44);
            const point = edgeX < 0
              ? { x: cellX - distance, y: cellY + 0.5 }
              : edgeX > 0
                ? { x: cellX + 1 + distance, y: cellY + 0.5 }
                : edgeY < 0
                  ? { x: cellX + 0.5, y: cellY - distance }
                  : { x: cellX + 0.5, y: cellY + 1 + distance };
            boardVoid = { levelId, point: logicalPoint(point), pointGrid: point, blockId: block.id, cellCss };
            break;
          }
          if (boardVoid) break;
        }
        if (boardVoid) break;
      }
    }
  }
  return { assisted, ambiguous, boardVoid };
});

if (!fixtures.assisted || !fixtures.ambiguous || !fixtures.boardVoid) {
  throw new Error(`Block-pick E2E: campaign fixtures missing (${JSON.stringify(fixtures)})`);
}

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.assisted.levelId);
await page.waitForTimeout(80);
const assistedStart = await logicalToPage(fixtures.assisted.point);
await page.mouse.move(assistedStart.x, assistedStart.y);
await page.mouse.down();
await page.waitForTimeout(80);
let state = await debug();
if (state.selectedId !== fixtures.assisted.blockId || state.activePointer == null
  || state.selectionAssist?.blockId !== fixtures.assisted.blockId
  || state.selectionAssist.distanceCss <= 0
  || state.selectionAssist.distanceCss > state.selectionAssist.maximumDistanceCss + 0.01) {
  throw new Error(`Block-pick E2E: empty-cell assist did not acquire the unique block (${JSON.stringify({ fixture: fixtures.assisted, selectedId: state.selectedId, assist: state.selectionAssist })})`);
}
await page.screenshot({ path: resolve(output, "01-assisted-grab-320x568.png") });

const assistedEnd = await logicalToPage({
  x: fixtures.assisted.point.x + fixtures.assisted.move.x * fixtures.assisted.cellLogical,
  y: fixtures.assisted.point.y + fixtures.assisted.move.y * fixtures.assisted.cellLogical,
});
await page.mouse.move(assistedEnd.x, assistedEnd.y, { steps: 12 });
await page.waitForTimeout(100);
state = await debug();
const movedBlock = state.puzzle.blocks.find((block) => block.id === fixtures.assisted.blockId);
if (!movedBlock
  || movedBlock.x !== fixtures.assisted.blockOrigin.x + fixtures.assisted.move.x
  || movedBlock.y !== fixtures.assisted.blockOrigin.y + fixtures.assisted.move.y) {
  throw new Error(`Block-pick E2E: assisted acquisition did not preserve normal drag geometry (${JSON.stringify({ fixture: fixtures.assisted, block: movedBlock, dragMotion: state.dragMotion })})`);
}
await page.mouse.up();
await page.waitForTimeout(140);
state = await debug();
if (state.puzzle.moves !== 1 || state.selectedId != null || state.selectionAssist != null) {
  throw new Error(`Block-pick E2E: assisted drag did not settle as one normal move (${JSON.stringify({ moves: state.puzzle.moves, selectedId: state.selectedId, assist: state.selectionAssist })})`);
}

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.assisted.levelId);
await page.waitForTimeout(60);
state = await debug();
const exactBlock = state.puzzle.blocks.find((block) => block.id === fixtures.assisted.blockId);
const [shapeX, shapeY] = exactBlock.shape[0];
const exactPoint = {
  x: state.board.innerX + (exactBlock.x + shapeX + 0.5) * state.board.cell,
  y: state.board.innerY + (exactBlock.y + shapeY + 0.5) * state.board.cell,
};
const exactPagePoint = await logicalToPage(exactPoint);
await page.mouse.move(exactPagePoint.x, exactPagePoint.y);
await page.mouse.down();
await page.waitForTimeout(50);
state = await debug();
if (state.selectedId !== exactBlock.id || state.selectionAssist != null) {
  throw new Error(`Block-pick E2E: exact occupied cell lost priority (${JSON.stringify({ selectedId: state.selectedId, assist: state.selectionAssist })})`);
}
await page.mouse.up();

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.ambiguous.levelId);
await page.waitForTimeout(60);
const ambiguousPoint = await logicalToPage(fixtures.ambiguous.point);
await page.mouse.click(ambiguousPoint.x, ambiguousPoint.y);
await page.waitForTimeout(60);
state = await debug();
if (state.selectedId != null || state.activePointer != null || state.selectionAssist != null || state.puzzle.moves !== 0) {
  throw new Error(`Block-pick E2E: ambiguous empty space guessed a block (${JSON.stringify({ fixture: fixtures.ambiguous, selectedId: state.selectedId, assist: state.selectionAssist, moves: state.puzzle.moves })})`);
}
await page.screenshot({ path: resolve(output, "02-ambiguous-space-no-pick-320x568.png") });

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.boardVoid.levelId);
await page.waitForTimeout(60);
const voidPoint = await logicalToPage(fixtures.boardVoid.point);
await page.mouse.click(voidPoint.x, voidPoint.y);
await page.waitForTimeout(60);
state = await debug();
if (state.selectedId != null || state.activePointer != null || state.selectionAssist != null || state.puzzle.moves !== 0) {
  throw new Error(`Block-pick E2E: irregular-board void acquired a block (${JSON.stringify({ fixture: fixtures.boardVoid, selectedId: state.selectedId, assist: state.selectionAssist, moves: state.puzzle.moves })})`);
}

const report = {
  viewport: { width: 320, height: 568 },
  minimumTargetCss: 44,
  ambiguityMarginCss: 4,
  fixtures,
  checks: {
    emptyPlayableCellUniqueNearestAcquired: true,
    assistedDragUsedNormalOneMoveGeometry: true,
    exactOccupiedCellKeptPriority: true,
    ambiguousEmptySpaceRejected: true,
    irregularBoardVoidRejected: true,
  },
  browserErrors: errors,
};
await writeFile(resolve(output, "block-pick-assist-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await browser.close();
if (errors.length) throw new Error(`Block-pick browser errors:\n${errors.join("\n")}`);
console.log(`Block pick assist passed at 320x568: Lv${fixtures.assisted.levelId} ${fixtures.assisted.cellCss.toFixed(1)}px cell, ${fixtures.assisted.distanceCss.toFixed(1)}px miss; ambiguity and board void rejected.`);
