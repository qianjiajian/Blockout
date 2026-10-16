import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve("playtest-results/collection-startup-warm-20261008");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [], errors = [];
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
try {
  for (const { completed, viewport } of [0, 100].flatMap((completed) =>
    [{ width: 320, height: 568 }, { width: 496, height: 1078 }].map((viewport) => ({ completed, viewport })))) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((n) => {
      // This is a fresh browser context, using only an explicit synthetic save.
      localStorage.setItem("color-escape-save-v1", JSON.stringify({
        schemaVersion: 1, currentLevel: n + 1, highestLevel: n + 1,
        coins: 2000, sound: false, music: false, haptic: false, reducedMotion: true,
        language: "zh-CN", featureSeen: ["basics"],
        boosterUnlockSeen: ["time", "rocket", "pulse"],
        boosters: { time: 3, rocket: 3, pulse: 3 },
        bestStars: {}, bestMoves: {}, rewardedLevels: Array.from({ length: n }, (_, i) => i + 1),
      }));
    }, completed);
    await page.route("**/collection-card-atlases-v1/*.jpg", async (route) => {
      await new Promise((done) => setTimeout(done, 600));
      await route.continue();
    });
    await page.goto(process.env.PLAYTEST_URL ?? "http://127.0.0.1:5192/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const s = window.__COLOR_ESCAPE__?.getDebugState();
      return s?.art.ready && s.collectionAlbum.art.artworkReady;
    });
    const home = await debug(page);
    assert.equal(home.screen, "home");
    assert.ok(home.collectionAlbum.art.artworkAtlasCount <= 2);
    const rect = home.collectionAlbum.entryRect, canvas = await page.locator("canvas").boundingBox();
    await page.mouse.click(canvas.x + home.viewportTransform.offsetX + (rect.x + rect.width / 2) * home.viewportTransform.scale,
      canvas.y + home.viewportTransform.offsetY + (rect.y + rect.height / 2) * home.viewportTransform.scale);
    await page.waitForFunction(() => {
      const s = window.__COLOR_ESCAPE__.getDebugState();
      return s.screen === "records" && s.collectionAlbum.art.ready;
    });
    const album = await debug(page);
    assert.equal(album.collectionAlbum.pageIndex, Math.max(0, Math.floor((completed - 1) / 9)));
    assert.equal(album.collectionAlbum.art.artworkReady, true);
    assert.ok(album.collectionAlbum.visibleItems.every((item) => item.artworkReady));
    await page.screenshot({ path: resolve(output, `collection-${completed}-${viewport.width}.png`) });
    await page.evaluate(() => window.__BLOCK_OUT_DISPOSE_WEB__());
    const disposed = await page.evaluate(() => typeof window.__COLOR_ESCAPE__ === "undefined");
    assert.equal(disposed, true);
    reports.push({ completed, viewport, disposed, homeArt: home.collectionAlbum.art, albumArt: album.collectionAlbum.art,
      pageIndex: album.collectionAlbum.pageIndex });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", reports, errors }, null, 2));
  console.log("PASS: cold home warms only default-page atlases; actual Pointer navigation shows all card images.");
} finally { await browser.close(); }
