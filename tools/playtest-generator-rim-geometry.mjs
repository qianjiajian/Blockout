import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/generator-rim-geometry/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const screenshotLevels = new Set([35, 36, 41, 43, 44, 46, 47, 70, 88, 89, 90]);
const viewports = [
  { key: "720x1584", width: 720, height: 1584 },
  { key: "320x568", width: 320, height: 568 },
];
const EPSILON = 0.05;
const HORIZONTAL_COUNTER_TANGENT = -1.5 + (246 / 285) * 3;
const HORIZONTAL_COUNTER_OUTWARD = (3 * 118 / 285) * (1 - 55 / 118);
const VERTICAL_COUNTER_SCREEN_UP = 1.5 - (39 / 299) * 3;
const VERTICAL_COUNTER_OUTWARD = (55 / 299) * 3;
const HORIZONTAL_PREVIEW_TANGENT = -1.5 + (124 / 285) * 3;
const HORIZONTAL_PREVIEW_OUTWARD = (3 * 118 / 285) * (1 - 55 / 118);
const VERTICAL_PREVIEW_SCREEN_DOWN = -1.5 + (161 / 299) * 3;
const VERTICAL_PREVIEW_OUTWARD = (55 / 299) * 3;

await mkdir(output, { recursive: true });

const anchorFor = (level, generator) => {
  if (generator.rimAnchor) return generator.rimAnchor;
  if (generator.side === "top") return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
  if (generator.side === "right") return { x: level.width, y: generator.offset + 0.5, quarterTurns: 1 };
  if (generator.side === "bottom") return { x: generator.offset + 0.5, y: level.height, quarterTurns: 2 };
  return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
};

const boundsFor = (level, generator, board) => {
  const anchor = anchorFor(level, generator);
  const cellBounds = anchor.quarterTurns === 0
    ? { x: anchor.x - 1.5, y: anchor.y - 1, width: 3, height: 1.35 }
    : anchor.quarterTurns === 1
      ? { x: anchor.x - 0.35, y: anchor.y - 1.5, width: 1.35, height: 3 }
      : anchor.quarterTurns === 2
        ? { x: anchor.x - 1.5, y: anchor.y - 0.35, width: 3, height: 1.35 }
        : { x: anchor.x - 1, y: anchor.y - 1.5, width: 1.35, height: 3 };
  return {
    x: board.innerX + cellBounds.x * board.cell,
    y: board.innerY + cellBounds.y * board.cell,
    width: cellBounds.width * board.cell,
    height: cellBounds.height * board.cell,
  };
};

const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

const railKey = (rail) => `${rail.quarterTurns}:${rail.x},${rail.y}`;

const reservedRailsFor = (level, generator) => {
  const anchor = anchorFor(level, generator);
  const tangent = anchor.quarterTurns === 0
    ? [1, 0]
    : anchor.quarterTurns === 1
      ? [0, 1]
      : anchor.quarterTurns === 2
        ? [-1, 0]
        : [0, -1];
  return [-1, 0, 1].map((offset) => ({
    x: anchor.x + tangent[0] * offset,
    y: anchor.y + tangent[1] * offset,
    quarterTurns: anchor.quarterTurns,
  }));
};

const exposedRailKeys = (level) => {
  const active = new Set();
  if (level.playable) {
    for (const [x, y] of level.playable) active.add(`${x},${y}`);
  } else {
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) active.add(`${x},${y}`);
    }
  }
  for (const [x, y] of level.blocked ?? []) active.delete(`${x},${y}`);
  const floor = (x, y) => active.has(`${x},${y}`);
  const rails = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!floor(x, y)) continue;
      if (!floor(x, y - 1)) rails.push({ x: x + 0.5, y, quarterTurns: 0 });
      if (!floor(x + 1, y)) rails.push({ x: x + 1, y: y + 0.5, quarterTurns: 1 });
      if (!floor(x, y + 1)) rails.push({ x: x + 0.5, y: y + 1, quarterTurns: 2 });
      if (!floor(x - 1, y)) rails.push({ x, y: y + 0.5, quarterTurns: 3 });
    }
  }
  return new Set(rails.map(railKey));
};

const gateRailKeys = (level) => {
  const keys = new Set();
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (let index = gate.offset; index < gate.offset + gate.size; index += 1) {
      const rail = gate.side === "top"
        ? { x: index + 0.5, y: 0, quarterTurns: 0 }
        : gate.side === "right"
          ? { x: level.width, y: index + 0.5, quarterTurns: 1 }
          : gate.side === "bottom"
            ? { x: index + 0.5, y: level.height, quarterTurns: 2 }
            : { x: 0, y: index + 0.5, quarterTurns: 3 };
      keys.add(railKey(rail));
    }
  }
  return keys;
};

const pointAt = (level, generator, board, tangentOffset, outwardOffset) => {
  const anchor = anchorFor(level, generator);
  const tangent = anchor.quarterTurns === 0
    ? [1, 0]
    : anchor.quarterTurns === 1
      ? [0, 1]
      : anchor.quarterTurns === 2
        ? [-1, 0]
        : [0, -1];
  const outward = anchor.quarterTurns === 0
    ? [0, -1]
    : anchor.quarterTurns === 1
      ? [1, 0]
      : anchor.quarterTurns === 2
        ? [0, 1]
        : [-1, 0];
  return {
    x: board.innerX + (anchor.x + tangent[0] * tangentOffset + outward[0] * outwardOffset) * board.cell,
    y: board.innerY + (anchor.y + tangent[1] * tangentOffset + outward[1] * outwardOffset) * board.cell,
  };
};

const counterPointFor = (level, generator, board) => {
  const quarterTurns = anchorFor(level, generator).quarterTurns;
  if (quarterTurns === 0 || quarterTurns === 2) {
    return pointAt(level, generator, board, HORIZONTAL_COUNTER_TANGENT, HORIZONTAL_COUNTER_OUTWARD);
  }
  return pointAt(
    level,
    generator,
    board,
    quarterTurns === 1 ? -VERTICAL_COUNTER_SCREEN_UP : VERTICAL_COUNTER_SCREEN_UP,
    VERTICAL_COUNTER_OUTWARD,
  );
};

const previewPointFor = (level, generator, board) => {
  const quarterTurns = anchorFor(level, generator).quarterTurns;
  if (quarterTurns === 0 || quarterTurns === 2) {
    return pointAt(level, generator, board, HORIZONTAL_PREVIEW_TANGENT, HORIZONTAL_PREVIEW_OUTWARD);
  }
  return pointAt(
    level,
    generator,
    board,
    quarterTurns === 1 ? VERTICAL_PREVIEW_SCREEN_DOWN : -VERTICAL_PREVIEW_SCREEN_DOWN,
    VERTICAL_PREVIEW_OUTWARD,
  );
};

const normalizedAngleDistance = (left, right) => Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));

const browser = await chromium.launch({ headless: true });
const reports = [];
let levelIds;
let finalLevelCount;

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1,
      currentLevel: 35,
      highestLevel: 100,
      coins: 9999,
      sound: false,
      haptic: false,
      reducedMotion: true,
      featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star", "timed-generator"],
      boosterUnlockSeen: ["time", "rocket", "pulse"],
      boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: {},
      bestMoves: {},
      rewardedLevels: [],
    }));
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    globalThis.__GENERATOR_RIM_DRAWS__ = [];
    globalThis.__GENERATOR_COUNTER_TEXTS__ = [];
    globalThis.__GENERATOR_PREVIEW_CALLS__ = [];
    globalThis.__clearGeneratorRimDraws = () => {
      globalThis.__GENERATOR_RIM_DRAWS__.length = 0;
      globalThis.__GENERATOR_COUNTER_TEXTS__.length = 0;
      globalThis.__GENERATOR_PREVIEW_CALLS__.length = 0;
    };
    CanvasRenderingContext2D.prototype.drawImage = function drawGeneratorAudit(image, ...args) {
      const src = String(image?.currentSrc || image?.src || "");
      if (src.includes("formal-generator-v1/generator-horizontal.png")
        || src.includes("formal-generator-v1/generator-vertical.png")
        || src.includes("timed-feeder-v1.png")) {
        const matrix = this.getTransform();
        globalThis.__GENERATOR_RIM_DRAWS__.push({
          src,
          args: args.map((value) => typeof value === "number" ? value : null),
          matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f },
        });
      }
      return original.call(this, image, ...args);
    };
    CanvasRenderingContext2D.prototype.fillText = function generatorCounterAudit(text, x, y, maxWidth) {
      globalThis.__GENERATOR_COUNTER_TEXTS__.push({
        text: String(text),
        x,
        y,
        maxWidth: typeof maxWidth === "number" ? maxWidth : null,
        fillStyle: String(this.fillStyle),
        font: this.font,
      });
      if (typeof maxWidth === "number") return originalFillText.call(this, text, x, y, maxWidth);
      return originalFillText.call(this, text, x, y);
    };
  });

  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 20_000 });
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const original = game.drawFormalBlockPreview.bind(game);
    game.drawFormalBlockPreview = (block, centerX, centerY, maxWidth, maxHeight) => {
      globalThis.__GENERATOR_PREVIEW_CALLS__.push({
        blockId: block.id,
        centerX,
        centerY,
        maxWidth,
        maxHeight,
      });
      return original(block, centerX, centerY, maxWidth, maxHeight);
    };
  });

  const discovery = await page.evaluate(async () => {
    const { LEVELS } = await import("/src/core/levels.ts");
    return {
      levelCount: LEVELS.length,
      levelIds: LEVELS.filter((level) => (level.generators?.length ?? 0) > 0).map((level) => level.id),
    };
  });
  if (!discovery.levelIds.length) throw new Error("Final LEVELS contains no generator fixtures");
  if (levelIds === undefined) {
    levelIds = discovery.levelIds;
    finalLevelCount = discovery.levelCount;
  } else if (discovery.levelCount !== finalLevelCount
    || discovery.levelIds.join(",") !== levelIds.join(",")) {
    throw new Error(`Generator fixture discovery changed between viewports: ${JSON.stringify(discovery)}`);
  }

  for (const levelId of levelIds) {
    await page.evaluate(() => globalThis.__clearGeneratorRimDraws());
    await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
    await page.waitForFunction((id) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "playing" && state.level.id === id && state.art.ready;
    }, levelId, { timeout: 10_000 });
    await page.waitForTimeout(180);

    const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const allDraws = await page.evaluate(() => [...globalThis.__GENERATOR_RIM_DRAWS__]);
    const allCounterTexts = await page.evaluate(() => [...globalThis.__GENERATOR_COUNTER_TEXTS__]);
    const allPreviewCalls = await page.evaluate(() => [...globalThis.__GENERATOR_PREVIEW_CALLS__]);
    const expectedGenerators = state.level.generators ?? [];
    const generators = state.puzzle.generators.filter((generator) => generator.remaining > 0);
    if (!expectedGenerators.length) {
      throw new Error(`Lv${levelId}: dynamically discovered generator fixture is absent from final level`);
    }
    if (generators.length !== expectedGenerators.length) {
      const activeIds = new Set(generators.map((generator) => generator.id));
      const inactiveIds = expectedGenerators
        .filter((generator) => !activeIds.has(generator.id))
        .map((generator) => generator.id);
      throw new Error(`Lv${levelId}: expected ${expectedGenerators.length} active generators, got ${generators.length}; inactive: ${inactiveIds.join(", ") || "unknown"}`);
    }
    const chassisDraws = allDraws.filter((draw) => draw.src.includes("formal-generator-v1/generator-"));
    if (chassisDraws.length < generators.length) {
      throw new Error(`Lv${levelId}: expected at least ${generators.length} chassis draws, got ${chassisDraws.length}`);
    }
    const draws = chassisDraws.slice(-generators.length);
    for (const [index, draw] of draws.entries()) {
      if (draw.args.length !== 4) throw new Error(`Lv${levelId}: generator must use one destination rect`);
      const [, , width, height] = draw.args;
      const quarterTurns = anchorFor(state.level, generators[index]).quarterTurns;
      const vertical = quarterTurns % 2 === 1;
      const expectedFile = vertical ? "generator-vertical.png" : "generator-horizontal.png";
      if (!draw.src.endsWith(`/${expectedFile}`)) {
        throw new Error(`Lv${levelId} generator ${index + 1}: expected ${expectedFile}, got ${draw.src}`);
      }
      if (vertical) {
        if (Math.abs(height / state.board.cell - 3) > EPSILON
          || Math.abs(width / height - 112 / 299) > 0.01) {
          throw new Error(`Lv${levelId}: vertical generator lost its native 112:299 aspect: ${JSON.stringify(draw.args)}`);
        }
        const expectedScaleX = quarterTurns === 1 ? 1 : -1;
        const xScale = Math.hypot(draw.matrix.a, draw.matrix.b);
        const yScale = Math.hypot(draw.matrix.c, draw.matrix.d);
        if (Math.abs(draw.matrix.a / xScale - expectedScaleX) > 0.01
          || Math.abs(draw.matrix.b / xScale) > 0.01
          || Math.abs(draw.matrix.c / yScale) > 0.01
          || Math.abs(draw.matrix.d / yScale - 1) > 0.01) {
          throw new Error(`Lv${levelId} generator ${index + 1}: wrong vertical mount transform ${JSON.stringify(draw.matrix)}`);
        }
      } else {
        if (Math.abs(width / state.board.cell - 3) > EPSILON
          || Math.abs(height / width - 118 / 285) > 0.01) {
          throw new Error(`Lv${levelId}: horizontal generator lost its native 285:118 aspect: ${JSON.stringify(draw.args)}`);
        }
        const expectedRotation = quarterTurns === 0 ? 0 : Math.PI;
        const actualRotation = Math.atan2(draw.matrix.b, draw.matrix.a);
        if (normalizedAngleDistance(actualRotation, expectedRotation) > 0.01) {
          throw new Error(`Lv${levelId} generator ${index + 1}: wrong canvas rotation ${actualRotation}, expected ${expectedRotation}`);
        }
      }
    }

    for (const [index, generator] of generators.entries()) {
      const expected = counterPointFor(state.level, generator, state.board);
      const matches = allCounterTexts.filter((entry) => entry.text === `${generator.remaining}`
        && Math.abs(entry.x - expected.x) <= EPSILON
        && Math.abs(entry.y - expected.y) <= EPSILON);
      if (!matches.length) {
        throw new Error(`Lv${levelId} generator ${index + 1}: counter is not in the authored slot ${JSON.stringify({
          expected,
          remaining: generator.remaining,
          nearest: allCounterTexts
            .filter((entry) => entry.text === `${generator.remaining}`)
            .map((entry) => ({ ...entry, distance: Math.hypot(entry.x - expected.x, entry.y - expected.y) }))
            .toSorted((left, right) => left.distance - right.distance)
            .slice(0, 3),
        })}`);
      }
      const counter = matches.at(-1);
      if (counter.fillStyle !== "#a8ffff"
        || Math.abs(counter.maxWidth - state.board.cell * 0.44) > EPSILON) {
        throw new Error(`Lv${levelId} generator ${index + 1}: counter typography drift ${JSON.stringify(counter)}`);
      }
    }

    for (const [index, generator] of generators.entries()) {
      const expected = previewPointFor(state.level, generator, state.board);
      const matches = allPreviewCalls.filter((entry) => entry.blockId === generator.nextBlockId
        && Math.abs(entry.centerX - expected.x) <= EPSILON
        && Math.abs(entry.centerY - expected.y) <= EPSILON
        && Math.abs(entry.maxWidth - state.board.cell * 0.66) <= EPSILON
        && Math.abs(entry.maxHeight - state.board.cell * 0.52) <= EPSILON);
      if (!matches.length) {
        throw new Error(`Lv${levelId} generator ${index + 1}: preview is not centred in the authored window ${JSON.stringify({
          blockId: generator.nextBlockId,
          expected,
          expectedMaxWidth: state.board.cell * 0.66,
          expectedMaxHeight: state.board.cell * 0.52,
          calls: allPreviewCalls.filter((entry) => entry.blockId === generator.nextBlockId).slice(-3),
        })}`);
      }
    }

    const timedPlateDraws = allDraws.filter((draw) => draw.src.includes("timed-feeder-v1.png"));
    const timedGenerators = generators.filter((generator) => generator.trigger === "time");
    if (timedPlateDraws.length < timedGenerators.length) {
      throw new Error(`Lv${levelId}: missing contained timed-feeder status plate`);
    }
    // loadLevel can leave a final animation-frame draw from the preceding board
    // in the capture buffer. Select the draws closest to this board's authored
    // 0.66-cell-high 4:3 plate instead of assuming capture order is atomic.
    const expectedPlateWidth = state.board.cell * 0.66 * 4 / 3;
    const currentTimedPlateDraws = timedPlateDraws.toSorted((left, right) => (
      Math.abs(left.args[2] - expectedPlateWidth) - Math.abs(right.args[2] - expectedPlateWidth)
    )).slice(0, timedGenerators.length);
    for (const draw of currentTimedPlateDraws) {
      const [, , width, height] = draw.args;
      if (Math.abs(width / height - 4 / 3) > 0.01 || width > state.board.cell * 0.9 + EPSILON) {
        throw new Error(`Lv${levelId}: timed-feeder plate is stretched: ${JSON.stringify({ args: draw.args, cell: state.board.cell })}`);
      }
    }

    const bounds = generators.map((generator) => boundsFor(state.level, generator, state.board));
    const exposed = exposedRailKeys(state.level);
    const gateRails = gateRailKeys(state.level);
    const ownedRails = new Set();
    for (const [index, generator] of generators.entries()) {
      const rails = reservedRailsFor(state.level, generator);
      if (generator.rimSpan !== 3) throw new Error(`Lv${levelId} generator ${index + 1}: rimSpan must be 3`);
      if (generator.rimMount !== "rim") {
        throw new Error(`Lv${levelId} generator ${index + 1}: final machine must use a true rim mount`);
      }
      for (const rail of rails) {
        const key = railKey(rail);
        if (!exposed.has(key)) throw new Error(`Lv${levelId} generator ${index + 1}: ${key} is not an exposed rail`);
        if (gateRails.has(key)) throw new Error(`Lv${levelId} generator ${index + 1}: ${key} overlaps an exit`);
        if (ownedRails.has(key)) throw new Error(`Lv${levelId} generator ${index + 1}: ${key} is already owned`);
        ownedRails.add(key);
      }
    }
    for (const [index, rect] of bounds.entries()) {
      if (rect.x < -EPSILON || rect.x + rect.width > 496 + EPSILON) {
        throw new Error(`Lv${levelId} generator ${index + 1}: horizontal clipping ${JSON.stringify(rect)}`);
      }
      if (rect.y < -EPSILON || rect.y + rect.height > state.board.visualBottom + EPSILON) {
        throw new Error(`Lv${levelId} generator ${index + 1}: vertical clipping ${JSON.stringify(rect)}`);
      }
    }
    for (let left = 0; left < bounds.length; left += 1) {
      for (let right = left + 1; right < bounds.length; right += 1) {
        if (overlapArea(bounds[left], bounds[right]) > state.board.cell * state.board.cell * 0.02) {
          throw new Error(`Lv${levelId}: generator bodies overlap (${left + 1}, ${right + 1})`);
        }
      }
    }

    const before = state;
    for (const [index, generator] of generators.entries()) {
      const logicalPoints = [
        pointAt(state.level, generator, state.board, 0, -0.18),
        pointAt(state.level, generator, state.board, 0, 0.25),
        pointAt(state.level, generator, state.board, 0, 0.75),
      ];
      for (const logicalPoint of logicalPoints) {
        const screenPoint = {
          x: before.viewportTransform.offsetX + logicalPoint.x * before.viewportTransform.scale,
          y: before.viewportTransform.offsetY + logicalPoint.y * before.viewportTransform.scale,
        };
        await page.mouse.click(screenPoint.x, screenPoint.y);
        await page.waitForTimeout(24);
        const after = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
        if (after.selectedId !== undefined || after.activePointer !== undefined || after.puzzle.moves !== before.puzzle.moves) {
          throw new Error(`Lv${levelId} generator ${index + 1}: device click leaked into block interaction`);
        }
        if (after.puzzle.generators.some((candidate, generatorIndex) => candidate.head !== before.puzzle.generators[generatorIndex].head)) {
          throw new Error(`Lv${levelId} generator ${index + 1}: device click advanced a queue`);
        }
      }
    }

    if (screenshotLevels.has(levelId)) {
      await page.screenshot({
        path: `${output}/${viewport.key}-level-${String(levelId).padStart(3, "0")}.png`,
      });
    }
    reports.push({
      viewport: viewport.key,
      levelId,
      generators: generators.map((generator, index) => ({
        id: generator.id,
        side: generator.side,
        offset: generator.offset,
        rimSpan: generator.rimSpan,
        rimMount: generator.rimMount,
        rimAnchor: generator.rimAnchor,
        previewAnchor: previewPointFor(state.level, generator, state.board),
        countAnchor: counterPointFor(state.level, generator, state.board),
        bounds: bounds[index],
      })),
      drawCount: draws.length,
      cell: state.board.cell,
    });
  }

  if (browserErrors.length) throw new Error(`Browser errors (${viewport.key}): ${browserErrors.join(" | ")}`);
  await page.close();
}

await browser.close();
await writeFile(`${output}/report.json`, `${JSON.stringify({ finalLevelCount, levelIds, reports }, null, 2)}\n`, "utf8");
console.log(`Generator rim geometry playtest passed: ${levelIds.length} generator levels across ${finalLevelCount} final levels; ${reports.length} level/viewport checks.`);
