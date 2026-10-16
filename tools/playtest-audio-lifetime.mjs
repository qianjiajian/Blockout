// Standalone browser with synthetic storage only; never attaches to a user tab.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 408, height: 884 } });
  await context.addInitScript(() => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({ schemaVersion: 1,
      currentLevel: 1, highestLevel: 1, coins: 0, sound: false, music: true,
      haptic: false, leagueIntroSeen: true, collectionIntroSeen: true,
      featureSeen: ["basics"], boosterUnlockSeen: [], bestStars: {}, bestMoves: {} }));
    window.__nativeContexts = [];
    const Native = window.AudioContext;
    window.AudioContext = new Proxy(Native, { construct(Target, args) {
      const audio = new Target(...args);
      window.__nativeContexts.push(audio);
      return audio;
    } });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, undefined, { timeout: 60000 });
  // A generic canvas gesture unlocks audio; the test need not change any setting.
  await page.mouse.click(204, 420);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.host.musicTransport().playing
    && window.__COLOR_ESCAPE__.host.soundscape.musicSource);
  assert.equal(await page.evaluate(() => window.__nativeContexts.length), 1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await page.waitForFunction(() => window.__nativeContexts[0].state === "suspended");
  checks.push("BFCache entry suspends the native context");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.waitForFunction(() => window.__nativeContexts[0].state === "running"
    && window.__COLOR_ESCAPE__.host.soundscape.musicSource);
  checks.push("BFCache return resumes the same context and music");

  await page.evaluate(async () => {
    window.__oldHost = window.__COLOR_ESCAPE__.host;
    const entry = [...document.scripts].find(script => /\/assets\/game-.*\.js$/.test(script.src)).src;
    await import(entry + "?lifetime-repeat=1");
  });
  await page.waitForFunction(() => window.__nativeContexts[0].state === "closed");
  assert.equal(await page.locator("canvas").count(), 1);
  checks.push("Replacing the entry closes the old native context and removes the old canvas");
  await page.evaluate(() => {
    window.__oldHost.music("menu", true);
    window.__oldHost.sound("button");
  });
  assert.equal(await page.evaluate(() => window.__nativeContexts.length), 1);
  checks.push("Late calls cannot revive a disposed host");
  await page.mouse.click(204, 420);
  await page.waitForFunction(() => window.__nativeContexts.length === 2 && window.__nativeContexts[1].state === "running");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })));
  await page.waitForFunction(() => window.__nativeContexts.every(audio => audio.state === "closed"));
  checks.push("Final page exit closes all game audio contexts");
  assert.deepEqual(errors, []);
  const output = "playtest-results/audio-lifetime-20261007";
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/report.json`, JSON.stringify({ status: "PASS", scope: "isolated synthetic browser", checks, errors }, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks, errors }, null, 2));
} finally {
  await browser.close();
}
