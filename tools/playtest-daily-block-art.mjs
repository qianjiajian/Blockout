import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { preview } from "vite";

// Isolated synthetic player only. This checks rendering and real input, not
// solvability, the difficulty lower bound, or a player's persistent profile.
const output = resolve("playtest-results/daily-block-art-20261007");
const targetId = "daily-mechanisms-frozen-exit-6-d3-09";
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: ["src/core/dailyChallenge.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const dayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
let dailyChallenge;
for (let seed = 1; seed <= 10000; seed++) {
  const state = api.createDailyChallengeState(dayKey, 6, undefined, seed);
  if (api.getDailyChallengeAssignment(state, 3)?.id === targetId) { dailyChallenge = state; break; }
}
assert(dailyChallenge, "A finite seed search must find the screenshot slot");
const expected = api.cloneDailyChallengeLevel(api.getDailyChallengeAssignment(dailyChallenge, 3));
assert.equal(expected.id, 187);
const server = await preview({ configFile: false, logLevel: "error", preview: { host: "127.0.0.1", port: 5198, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [], failedAssets = [];
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, timezoneId: "Asia/Shanghai" });
    await context.addInitScript(({ dailyChallenge }) => {
      localStorage.setItem("color-escape-save-v1", JSON.stringify({ schemaVersion: 1, currentLevel: 6, highestLevel: 6,
        coins: 265, sound: false, music: false, haptic: false, reducedMotion: true,
        featureSeen: ["basics", "frozen-exit"], boosterUnlockSeen: ["time", "rocket", "pulse"],
        boosters: { time: 2, rocket: 0, pulse: 0 }, bestStars: {}, bestMoves: {}, rewardedLevels: [1, 2, 3, 4, 5],
        leagueIntroSeen: true, collectionIntroSeen: true, metaDiscovery: { collectionViewedThroughLevel: 6 }, dailyChallenge }));
    }, { dailyChallenge });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push({ tag, message: error.message }));
    page.on("requestfailed", request => { if (request.resourceType() === "image") failedAssets.push({ tag, url: request.url(), error: request.failure() }); });
    page.on("response", response => { if (response.status() >= 400 && response.request().resourceType() === "image") failedAssets.push({ tag, url: response.url(), status: response.status() }); });
    await page.goto("http://127.0.0.1:5198/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, undefined, { timeout: 60000 });
    await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      g.updateToastVisible = false;
      window.__dailyArtCalls = {};
      let activeId;
      const blockDraw = g.drawBlock, formalDraw = g.drawFormalWholeBlock;
      g.drawBlock = function(block, ...args) {
        const previousId = activeId;
        activeId = block.id;
        window.__dailyArtCalls[block.id] ??= { id: block.id, drawBlockCalls: 0, formalCalls: 0, images: [] };
        window.__dailyArtCalls[block.id].drawBlockCalls++;
        try { return blockDraw.call(this, block, ...args); } finally { activeId = previousId; }
      };
      g.drawFormalWholeBlock = function(image, match, ...args) {
        if (activeId) {
          const record = window.__dailyArtCalls[activeId];
          record.formalCalls++;
          const src = image.src;
          if (!record.images.some(entry => entry.src === src)) record.images.push({ src, width: image.naturalWidth, height: image.naturalHeight, shapeId: match.shapeId, rotation: match.rotation });
        }
        return formalDraw.call(this, image, match, ...args);
      };
      g.dirty = true;
      g.scheduleFrame();
    });
    const read = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    async function canvasPoint(x, y) {
      const d = await read(), box = await page.locator("canvas").boundingBox(), t = d.viewportTransform;
      assert(box);
      return { x: box.x + t.offsetX + x * t.scale, y: box.y + t.offsetY + y * t.scale };
    }
    async function clickRect(rect) {
      const p = await canvasPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.mouse.click(p.x, p.y);
    }
    await clickRect((await read()).dailyChallenge.entryRect);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "dailyChallenge" && Boolean(window.__COLOR_ESCAPE__.dailyChallengeArt), undefined, { timeout: 30000 });
    const selection = (await read()).dailyChallenge.rows.find(row => row.difficulty === 3);
    assert.equal(selection.assignmentId, targetId);
    await clickRect(selection.buttonRect);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "playing" && window.__COLOR_ESCAPE__.save.activeRun?.daily, undefined, { timeout: 30000 });
    await page.waitForTimeout(250);
    async function auditArt() {
      return page.evaluate(() => {
        const g = window.__COLOR_ESCAPE__;
        window.__dailyArtCalls = {};
        g.render();
        const snapshot = g.model.snapshot();
        const active = snapshot.blocks.filter(block => g.model.isBlockActive(block));
        return { activeCount: active.length, occupiedCells: active.reduce((sum, block) => sum + block.shape.length, 0),
          calls: active.map(block => ({ block, ...(window.__dailyArtCalls[block.id] ?? { drawBlockCalls: 0, formalCalls: 0, images: [] }) })),
          levelId: g.model.level.id, levelWidth: snapshot.width, levelHeight: snapshot.height, snapshot };
      });
    }
    function assertVisible(audit) {
      assert(audit.calls.every(call => call.drawBlockCalls > 0 && call.formalCalls > 0), "Every active block must draw its whole-piece art");
      assert(audit.calls.every(call => call.images.length && call.images.every(image => image.width > 0 && image.height > 0)), "Every drawn image must be decoded");
    }
    const before = await auditArt();
    assert.equal(before.activeCount, expected.blocks.length);
    assert.equal(before.occupiedCells, 56);
    assertVisible(before);
    await page.screenshot({ path: resolve(output, `${tag}-opening.png`) });
    const actions = [];
    // A fully occupied opening may first need one block dragged out. Probe only
    // read-only collision/exit queries; all actual changes use Pointer input.
    for (let attempt = 0; attempt < 3; attempt++) {
      const action = await page.evaluate(() => {
        const m = window.__COLOR_ESCAPE__.model, s = m.snapshot();
        const blocks = s.blocks.filter(block => m.isBlockActive(block) && !block.frozen && !block.lockedBy);
        for (const block of blocks) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (block.movementAxis === "horizontal" && dy || block.movementAxis === "vertical" && dx) continue;
          if (m.canTranslate(block, block.x + dx, block.y + dy)) return { kind: "move", block, dx, dy };
        }
        for (const block of blocks) for (const side of ["top", "right", "bottom", "left"]) {
          if (m.exitAttemptStatus(block.id, side) === "ok") {
            const [dx, dy] = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[side];
            return { kind: "exit", block, dx, dy, side };
          }
        }
        return undefined;
      });
      assert(action, "An eligible Pointer action must exist");
      const d = await read(), b = d.board, cell = action.block.shape[0];
      const p0 = await canvasPoint(b.innerX + (action.block.x + cell[0] + 0.5) * b.cell, b.innerY + (action.block.y + cell[1] + 0.5) * b.cell);
      const distance = action.kind === "exit" ? Math.max(d.puzzle.width, d.puzzle.height) + 1 : 1;
      const p1 = await canvasPoint(b.innerX + (action.block.x + cell[0] + 0.5 + action.dx * distance) * b.cell, b.innerY + (action.block.y + cell[1] + 0.5 + action.dy * distance) * b.cell);
      await page.mouse.move(p0.x, p0.y);
      await page.mouse.down();
      await page.mouse.move(p1.x, p1.y, { steps: 16 });
      await page.mouse.up();
      await page.waitForTimeout(350);
      const after = await auditArt();
      assertVisible(after);
      const moved = after.snapshot.blocks.find(block => block.id === action.block.id);
      if (action.kind === "move") {
        assert(moved && (moved.x !== action.block.x || moved.y !== action.block.y), "Pointer drag must update the model anchor");
        actions.push({ ...action, after: { x: moved.x, y: moved.y } });
        break;
      }
      assert(!moved || moved.layers.length < action.block.layers.length, "Exit Pointer drag must remove the block or shell");
      actions.push({ ...action, after: moved ?? null });
    }
    assert(actions.some(action => action.kind === "move"), "At least one visible block moved by real Pointer input");
    const after = await auditArt();
    await page.screenshot({ path: resolve(output, `${tag}-after-drag.png`) });
    const campaign = await page.evaluate(() => ({ currentLevel: window.__COLOR_ESCAPE__.save.currentLevel, highestLevel: window.__COLOR_ESCAPE__.save.highestLevel }));
    assert.deepEqual(campaign, { currentLevel: 6, highestLevel: 6 });
    results.push({ viewport, status: "PASS", selected: selection, before, actions, after, campaignUnchanged: campaign });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", scope: "Built client; synthetic isolated storage; visible art and Pointer input only; no solvability or lower-bound claim", buildHtml: await readFile("dist/index.html", "utf8"), playerSeed: dailyChallenge.playerSeed, targetId, dayKey, results, errors, failedAssets }, null, 2));
  console.log(JSON.stringify({ status: "PASS", output, screens: results.length }));
} catch (error) {
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "FAIL", results, errors, failedAssets, error: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
