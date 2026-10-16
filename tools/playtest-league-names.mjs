import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { preview } from "vite";

// Synthetic legacy save only. Validate the built client, never a player's profile.
const output = resolve("playtest-results/league-names-20261007");
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: ["src/core/league.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const server = await preview({ configFile: false, logLevel: "error", preview: { host: "127.0.0.1", port: 5197, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const league = api.createLeague(Date.now(), 12345, 0);
    league.season.score = 30;
    league.season.cleared = [1];
    league.season.scoreHistory = [{ atMs: league.season.joinedMs, score: 30 }];
    const legacyNames = ["竹影拾光290", "竹影寻路298", "遠帆乐园909", "晴空拾光216", "小满2"];
    league.season.bots.forEach((bot, i) => { bot.name = legacyNames[i % legacyNames.length]; });
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(({ league }) => {
      if (!localStorage.getItem("color-escape-save-v1")) {
        localStorage.setItem("color-escape-save-v1", JSON.stringify({ schemaVersion: 1, currentLevel: 6, highestLevel: 6,
          coins: 1234, sound: false, music: false, haptic: false, reducedMotion: true,
          rewardedLevels: [1, 2, 3, 4, 5], leagueIntroSeen: true, league }));
      }
      window.__drawnLeagueText = new Set();
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        window.__drawnLeagueText.add(String(text));
        return original.call(this, text, ...args);
      };
    }, { league });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push({ tag, message: error.message }));
    async function openLeague() {
      await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, { timeout: 60000 });
      await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; g.updateToastVisible = false; g.dirty = true; g.scheduleFrame(); });
      const point = await page.evaluate(() => {
        const d = window.__COLOR_ESCAPE__.getDebugState(), r = d.interactionTargets.targets.homeLeague.hit, t = d.viewportTransform;
        return { x: t.offsetX + (r.x + r.width / 2) * t.scale, y: t.offsetY + (r.y + r.height / 2) * t.scale };
      });
      const b = await page.locator("canvas").boundingBox();
      await page.mouse.click(b.x + point.x, b.y + point.y);
      await page.waitForFunction(() => {
        const g = window.__COLOR_ESCAPE__;
        return g.screen === "league" && Boolean(g.leagueArtStore?.art) && g.formalPageArt?.screen === "leaderboard";
      }, { timeout: 30000 });
      await page.waitForFunction(() => window.__drawnLeagueText.has("升级区"));
    }
    await page.goto("http://127.0.0.1:5197/", { waitUntil: "domcontentloaded" });
    await openLeague();
    const rows = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().league.rows);
    const names = rows.filter(row => !row.player).map(row => row.name);
    assert.equal(rows.length, 50);
    assert.equal(new Set(names).size, 49);
    assert(names.every(name => /^[\u3400-\u9fff]{2,5}$/.test(name)));
    assert.deepEqual([...new Set(names.map(name => name.length))].sort(), [2, 3, 4, 5]);
    await page.screenshot({ path: resolve(output, `${tag}-top.png`) });
    for (let i = 0; i < 12; i++) {
      const t = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().viewportTransform);
      const b = await page.locator("canvas").boundingBox();
      await page.mouse.move(b.x + t.offsetX + 248 * t.scale, b.y + t.offsetY + 900 * t.scale);
      await page.mouse.down();
      await page.mouse.move(b.x + t.offsetX + 248 * t.scale, b.y + t.offsetY + 500 * t.scale, { steps: 10 });
      await page.mouse.up();
      if (i === 5) await page.screenshot({ path: resolve(output, `${tag}-middle.png`) });
    }
    await page.screenshot({ path: resolve(output, `${tag}-bottom.png`) });
    const rendered = await page.evaluate(() => [...window.__drawnLeagueText]);
    assert(names.every(name => rendered.includes(name)), "Every opponent must actually be drawn while scrolling");
    assert(legacyNames.every(name => !rendered.includes(name)), "No legacy names should be drawn");
    const saved = await page.evaluate(() => window.__COLOR_ESCAPE__.save);
    assert.deepEqual(saved.league.season.bots, league.season.bots);
    assert.equal(saved.league.season.score, 30);
    assert.deepEqual(saved.league.season.cleared, [1]);
    assert.equal(saved.coins, 1234);
    assert.equal(saved.highestLevel, 6);
    await page.reload({ waitUntil: "domcontentloaded" });
    await openLeague();
    assert.deepEqual(await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().league.rows), rows);
    results.push({ viewport, status: "PASS", oldSavePreserved: true, reloadStable: true, all49NamesDrawn: true, rows });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", scope: "Built client, synthetic legacy storage, real Pointer input and natural clock", results, errors }, null, 2));
  console.log(JSON.stringify({ status: "PASS", output, screens: results.length }));
} catch (error) {
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "FAIL", results, errors, error: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
