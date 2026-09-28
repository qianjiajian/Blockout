import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 30,
  coins: 1000,
  sound: false,
  haptic: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

const feedbackFixtures = await page.evaluate(async () => {
  const { LEVELS } = await import("/src/core/levels.ts");
  const key = (x, y) => `${x},${y}`;
  const wanted = new Set(["wrong-color", "frozen-gate", "no-gate"]);
  const fixtures = {};
  for (const level of LEVELS) {
    if ((level.elevators?.length ?? 0) || (level.generators?.length ?? 0) || (level.conveyors?.length ?? 0)) continue;
    const playableCells = level.playable ?? Array.from({ length: level.width * level.height }, (_, index) => (
      [index % level.width, Math.floor(index / level.width)]
    ));
    const playable = new Set(playableCells.map(([x, y]) => key(x, y)));
    const closedShutters = new Set((level.shutters ?? []).filter((item) => item.count > 0).map((item) => item.id));
    const shutterCells = new Set();
    for (const shutter of level.shutters ?? []) {
      if (shutter.count <= 0) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(key(x, y));
      }
    }
    for (const block of level.blocks) {
      if ((block.frozen ?? 0) > 0 || (block.shutterId && closedShutters.has(block.shutterId))) continue;
      const color = block.layers?.[0] ?? block.color;
      const occupied = new Set([...(level.blocked ?? []).map(([x, y]) => key(x, y)), ...shutterCells]);
      for (const other of level.blocks) {
        if (other.id === block.id || (other.shutterId && closedShutters.has(other.shutterId))) continue;
        for (const [dx, dy] of other.shape) occupied.add(key(other.x + dx, other.y + dy));
      }
      const canPlace = (x, y) => block.shape.every(([dx, dy]) => playable.has(key(x + dx, y + dy)) && !occupied.has(key(x + dx, y + dy)));
      const statusAt = (side, x, y) => {
        const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
        const xs = cells.map(([cellX]) => cellX);
        const ys = cells.map(([, cellY]) => cellY);
        const minX = Math.min(...xs); const maxX = Math.max(...xs);
        const minY = Math.min(...ys); const maxY = Math.max(...ys);
        const atEdge = side === "top" ? minY === 0
          : side === "bottom" ? maxY === level.height - 1
            : side === "left" ? minX === 0
              : maxX === level.width - 1;
        if (!atEdge) return undefined;
        const gate = level.gates.find((candidate) => {
          if (candidate.side !== side) return false;
          if (side === "top" || side === "bottom") return minX >= candidate.offset && maxX < candidate.offset + candidate.size;
          return minY >= candidate.offset && maxY < candidate.offset + candidate.size;
        });
        if (!gate) return "no-gate";
        if (gate.color !== color) return "wrong-color";
        if ((gate.frozen ?? 0) > 0) return "frozen-gate";
        return "ok";
      };
      const sides = ["top", "right", "bottom", "left"];
      // A held drag auto-exits immediately on a compatible open gate. Such a
      // square cannot be used as a transit node for an intentional failure.
      if (sides.some((side) => statusAt(side, block.x, block.y) === "ok")) continue;
      const start = key(block.x, block.y);
      const queue = [[block.x, block.y]];
      const parent = new Map([[start, undefined]]);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [x, y] = queue[cursor];
        for (const side of sides) {
          const status = statusAt(side, x, y);
          if (!status || !wanted.has(status) || fixtures[status]) continue;
          const path = [];
          let current = key(x, y);
          while (current !== start) {
            const [pathX, pathY] = current.split(",").map(Number);
            path.push([pathX, pathY]);
            current = parent.get(current);
          }
          path.reverse();
          fixtures[status] = { levelId: level.id, blockId: block.id, side, path };
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextX = x + dx; const nextY = y + dy; const next = key(nextX, nextY);
          if (parent.has(next) || !canPlace(nextX, nextY)
            || sides.some((side) => statusAt(side, nextX, nextY) === "ok")) continue;
          parent.set(next, key(x, y));
          queue.push([nextX, nextY]);
        }
      }
    }
    if (Object.keys(fixtures).length === wanted.size) break;
  }
  const missing = [...wanted].filter((status) => !fixtures[status]);
  if (missing.length) throw new Error(`Missing reachable feedback fixtures: ${missing.join(", ")}`);
  return fixtures;
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = (board, x, y) => ({ x: board.innerX + (x + 0.5) * board.cell, y: board.innerY + (y + 0.5) * board.cell });
const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};

const attemptExit = async (blockId, target, side, screenshot) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((item) => item.id === blockId);
  if (!block) throw new Error(`Exit-feedback E2E: missing ${blockId}`);
  const board = state.board;
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(logicalPoint(board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  if (target) {
    const targets = Array.isArray(target) ? target : [[target.x, target.y]];
    for (const [targetX, targetY] of targets) {
      const aligned = screenPoint(logicalPoint(board, targetX + anchorX, targetY + anchorY));
      await page.mouse.move(aligned.x, aligned.y, { steps: 3 });
    }
  }
  const latest = await debug();
  const current = latest.puzzle.blocks.find((item) => item.id === blockId);
  if (!current) throw new Error(`Exit-feedback E2E: ${blockId} disappeared before the intended invalid exit`);
  const alignedLogical = logicalPoint(board, current.x + anchorX, current.y + anchorY);
  const endpointLogical = {
    left: { x: board.innerX - board.cell, y: alignedLogical.y },
    right: { x: board.innerX + board.innerWidth + board.cell, y: alignedLogical.y },
    top: { x: alignedLogical.x, y: board.innerY - board.cell },
    bottom: { x: alignedLogical.x, y: board.innerY + board.innerHeight + board.cell },
  }[side];
  const endpoint = screenPoint(endpointLogical);
  await page.mouse.move(endpoint.x, endpoint.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(70);
  if (screenshot) await page.screenshot({ path: shot(screenshot) });
};

const wrongColorFixture = feedbackFixtures["wrong-color"];
const frozenGateFixture = feedbackFixtures["frozen-gate"];
const noGateFixture = feedbackFixtures["no-gate"];

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), wrongColorFixture.levelId);
await page.waitForTimeout(60);
await attemptExit(wrongColorFixture.blockId, wrongColorFixture.path, wrongColorFixture.side, "round13-wrong-color-feedback.png");
let state = await debug();
if (state.exitFailure?.status !== "wrong-color" || state.exitFailure.text !== "颜色不匹配"
  || !state.puzzle.blocks.some((block) => block.id === wrongColorFixture.blockId)) {
  throw new Error("Exit-feedback E2E: wrong-color attempt was not explained or preserved");
}

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), frozenGateFixture.levelId);
await page.waitForTimeout(60);
await attemptExit(frozenGateFixture.blockId, frozenGateFixture.path, frozenGateFixture.side, "round13-frozen-gate-feedback.png");
state = await debug();
if (state.exitFailure?.status !== "frozen-gate" || state.exitFailure.text !== "出口仍冰封"
  || !state.puzzle.blocks.some((block) => block.id === frozenGateFixture.blockId)) {
  throw new Error("Exit-feedback E2E: frozen-gate attempt was not explained or preserved");
}

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), noGateFixture.levelId);
await page.waitForTimeout(60);
await attemptExit(noGateFixture.blockId, noGateFixture.path, noGateFixture.side, "round13-no-gate-feedback.png");
state = await debug();
if (state.exitFailure?.status !== "no-gate" || state.exitFailure.text !== "这里没有出口"
  || !state.puzzle.blocks.some((block) => block.id === noGateFixture.blockId)) {
  throw new Error("Exit-feedback E2E: no-gate attempt was not explained or preserved");
}

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), wrongColorFixture.levelId);
await page.waitForTimeout(60);
await attemptExit(wrongColorFixture.blockId, wrongColorFixture.path, wrongColorFixture.side, "round13-small-wrong-color-feedback-320x568.png");
state = await debug();
if (state.exitFailure?.status !== "wrong-color") throw new Error("Exit-feedback E2E: small-screen feedback disappeared");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Wrong-color, frozen-gate, no-gate, and 320x568 exit feedback passed.");
