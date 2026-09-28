import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/composition/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const chapterOneComposition = new Map([
  [1, { total: 3, shapes: { "##/##": 3 } }],
  [2, { total: 9, shapes: { "##/##": 9 } }],
  [3, { total: 8, shapes: { "#/#/#": 5, "##/#.": 2, "###/.#.": 1 } }],
  [4, { total: 18, shapes: { "#": 12, "###": 6 } }],
  [5, { total: 20, shapes: { "#": 18, "#/#/#": 2 } }],
  [6, { total: 21, shapes: { "#": 17, "##": 4 } }],
  [7, { total: 16, shapes: { "#/#": 12, "##/##": 4 } }],
  [8, { total: 25, shapes: { "#": 24, "##/##/##": 1 } }],
  [9, { total: 10, shapes: { "##/##": 10 } }],
  [10, { total: 25, shapes: { "#": 16, "#/#/#": 4, "##/##": 5 } }],
]);
const fullLevelBlockFloors = new Map([
  [14, 10], [15, 4], [19, 12], [20, 12], [39, 8], [58, 11], [78, 12], [98, 12], [100, 14],
]);
const auditedLevelIds = [...new Set([...chapterOneComposition.keys(), ...fullLevelBlockFloors.keys()])];
const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const key = (x, y) => `${x},${y}`;
const connected = (shape) => {
  const remaining = new Set(shape.map(([x, y]) => key(x, y)));
  const queue = [shape[0]];
  remaining.delete(key(...shape[0]));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = key(x + dx, y + dy);
      if (!remaining.delete(next)) continue;
      queue.push([x + dx, y + dy]);
    }
  }
  return remaining.size === 0;
};
const shapeSignature = (shape) => {
  const maxX = Math.max(...shape.map(([x]) => x));
  const maxY = Math.max(...shape.map(([, y]) => y));
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  return Array.from({ length: maxY + 1 }, (_, y) => (
    Array.from({ length: maxX + 1 }, (_, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
  )).join("/");
};
const shapeHistogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((counts, block) => {
    const signature = shapeSignature(block.shape);
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
const sameHistogram = (actual, expected) => {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  return [...keys].every((shape) => actual[shape] === expected[shape]);
};
const screenPoint = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const seed = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const openAndAudit = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(160);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== levelId || !state.art.ready || !state.art.plainBlocksReady) {
    throw new Error(`Composition E2E: Lv${levelId} did not reach a fully rendered play state`);
  }
  if ((state.level.blocked ?? []).length) throw new Error(`Composition E2E: Lv${levelId} restored fixed interior cells`);
  const closed = new Set(state.puzzle.shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const visible = state.puzzle.blocks.filter((block) => !block.shutterId || !closed.has(block.shutterId));
  const expectedComposition = chapterOneComposition.get(levelId);
  if (expectedComposition) {
    const actualShapes = shapeHistogram(state.puzzle.blocks);
    if (state.puzzle.blocks.length !== expectedComposition.total) {
      throw new Error(`Composition E2E: Lv${levelId} has ${state.puzzle.blocks.length} total blocks, expected exactly ${expectedComposition.total}`);
    }
    if (!sameHistogram(actualShapes, expectedComposition.shapes)) {
      throw new Error(`Composition E2E: Lv${levelId} total shape mix ${JSON.stringify(actualShapes)}, expected ${JSON.stringify(expectedComposition.shapes)}`);
    }
  }
  const fullLevelFloor = fullLevelBlockFloors.get(levelId);
  if (fullLevelFloor !== undefined && state.puzzle.blocks.length < fullLevelFloor) {
    throw new Error(`Composition E2E: Lv${levelId} has ${state.puzzle.blocks.length} total blocks, expected at least ${fullLevelFloor}`);
  }
  const auditedBlocks = state.puzzle.blocks;
  if (auditedBlocks.some((block) => !connected(block.shape))) {
    throw new Error(`Composition E2E: Lv${levelId} contains a disconnected block`);
  }
  return state;
};
const findOneCellMove = (state) => {
  const playable = new Set(state.level.playable.map(([x, y]) => key(x, y)));
  const closedCells = new Set();
  for (const shutter of state.puzzle.shutters) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) closedCells.add(key(x, y));
    }
  }
  for (const block of state.puzzle.blocks) {
    if (block.frozen > 0 || block.shutterId) continue;
    const occupied = new Set(state.puzzle.blocks
      .filter((other) => other.id !== block.id)
      .flatMap((other) => other.shape.map(([dx, dy]) => key(other.x + dx, other.y + dy))));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const legal = block.shape.every(([shapeX, shapeY]) => {
        const cell = key(block.x + shapeX + dx, block.y + shapeY + dy);
        return playable.has(cell) && !closedCells.has(cell) && !occupied.has(cell);
      });
      if (legal) return { blockId: block.id, fromX: block.x, fromY: block.y, dx, dy, anchor: block.shape[0] };
    }
  }
  return undefined;
};
const exerciseOneCellDrag = async (page, levelId) => {
  const state = await openAndAudit(page, levelId);
  const move = findOneCellMove(state);
  if (!move) throw new Error(`Composition E2E: Lv${levelId} has no legal one-cell opening move`);
  const [anchorX, anchorY] = move.anchor;
  const start = screenPoint(page, cellPoint(state.board, move.fromX + anchorX, move.fromY + anchorY));
  const end = screenPoint(page, cellPoint(state.board, move.fromX + move.dx + anchorX, move.fromY + move.dy + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(280);
  const moved = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = moved.puzzle.blocks.find((candidate) => candidate.id === move.blockId);
  const parkedAtTarget = block
    && block.x === move.fromX + move.dx
    && block.y === move.fromY + move.dy;
  const clearedThroughAlignedGate = !block && moved.puzzle.cleared > state.puzzle.cleared;
  if (!parkedAtTarget && !clearedThroughAlignedGate) {
    throw new Error(`Composition E2E: Lv${levelId} failed a legal hybrid one-cell drag for ${move.blockId}`);
  }
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(standard);
await seed(standard);
for (const levelId of auditedLevelIds) {
  await openAndAudit(standard, levelId);
  await standard.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}.png`), timeout: 120_000 });
}
for (const levelId of [19, 58, 98]) await exerciseOneCellDrag(standard, levelId);
await standard.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small);
for (const levelId of [3, 8, 19, 58, 98, 100]) {
  await openAndAudit(small, levelId);
  await small.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}-320x568.png`) });
}
await small.close();

await browser.close();
if (errors.length) throw new Error(`Composition browser errors:\n${errors.join("\n")}`);
console.log("Composition passed: exact Lv1-10 totals, formal full-level floors, connected blocks, mobile layouts, and hybrid drags.");
