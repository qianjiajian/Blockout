import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/timeout-title-${new Date().toISOString().replace(/[:.]/g, "-")}`);
await mkdir(output, { recursive: true });
const inputPaths = ["src/game/ColorEscapeGame.ts", "src/game/formalPageLayout.ts", "src/game/canvasTypography.ts",
  "public/assets/art/ui/formal-pages/overlays/pause-settings/panel.png", "tools/playtest-timeout-title.mjs"];
const hashes = async () => Object.fromEntries(await Promise.all(inputPaths.map(async (path) => [path,
  createHash("sha256").update(await readFile(resolve(root, path))).digest("hex"),
])));
const before = await hashes();
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.001, `${message}: ${actual} vs ${expected}`);
const reports = [];
const errors = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }, { width: 383, height: 585 }]) {
    for (const language of ["zh-CN", "en"]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const name = `${language}-${viewport.width}x${viewport.height}`;
      page.on("pageerror", (error) => errors.push({ case: name, error: error.message }));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push({ case: name, error: message.text() });
      });
      try {
        await page.addInitScript((locale) => {
          // A new nonpersistent browser context is used for every case. This
          // seed never touches the user's browser or production save.
          localStorage.setItem("color-escape-save-v1", JSON.stringify({
            schemaVersion: 1, currentLevel: 1, highestLevel: 1, language: locale,
            coins: 1000, sound: false, haptic: false, reducedMotion: true,
            featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
            boosters: { time: 3, rocket: 3, pulse: 3 }, bestStars: {}, bestMoves: {},
            rewardedLevels: [], dailyStreak: 0, lastDailyCompletedDay: "",
            lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
          }));
          globalThis.__TIMEOUT_TITLE_DRAWS__ = [];
          const snapshotMatrix = (ctx) => {
            const m = ctx.getTransform();
            return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
          };
          const fillText = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function auditTitle(text, x, y, ...args) {
            if (window.__COLOR_ESCAPE__?.screen === "failed") {
              const metrics = this.measureText(text);
              globalThis.__TIMEOUT_TITLE_DRAWS__.push({ type: "text", text: String(text), x, y,
                font: this.font, align: this.textAlign, baseline: this.textBaseline,
                maxWidth: args[0] ?? null, measuredWidth: metrics.width,
                inkBounds: { left: metrics.actualBoundingBoxLeft, right: metrics.actualBoundingBoxRight,
                  ascent: metrics.actualBoundingBoxAscent, descent: metrics.actualBoundingBoxDescent },
                matrix: snapshotMatrix(this),
              });
            }
            return fillText.call(this, text, x, y, ...args);
          };
          const drawImage = CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage = function auditPanel(image, ...args) {
            if (window.__COLOR_ESCAPE__?.screen === "failed") {
              globalThis.__TIMEOUT_TITLE_DRAWS__.push({ type: "image", source: String(image.currentSrc || image.src || ""),
                width: image.naturalWidth || image.width, height: image.naturalHeight || image.height,
                args, matrix: snapshotMatrix(this),
              });
            }
            return drawImage.call(this, image, ...args);
          };
        }, language);
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
        const expected = await page.evaluate(async (locale) => {
          const { STATUS_OVERLAY_LAYOUT: status, PAUSE_SETTINGS_LAYOUT: pause } = await import("/src/game/formalPageLayout.ts");
          const game = window.__COLOR_ESCAPE__;
          game.save.language = locale;
          game.loadLevel(1, true);
          return { text: game.tr("timeout.title"), status, pause };
        }, language);
        assert.equal(expected.pause.typography.title.size, 60, "Same-shell pause/settings title remains 60 art px");
        assert.equal(expected.status.title.size, 30, "This timeout-only fix must preserve the feature intro title");
        await page.waitForFunction(() => {
          const game = window.__COLOR_ESCAPE__;
          return game.screen === "playing" && Boolean(game.art.pauseSettings && game.art.statusOverlay);
        }, undefined, { timeout: 15_000 });
        await page.evaluate(() => {
          const game = window.__COLOR_ESCAPE__;
          globalThis.__TIMEOUT_TITLE_DRAWS__.length = 0;
          // Advance only this isolated in-memory model to its real timeout;
          // the normal game update transitions to failed and renders the card.
          game.model.startCountdown();
          game.model.tick(game.model.snapshot().remainingSeconds + 0.01);
          game.dirty = true;
          game.scheduleFrame();
        });
        await page.waitForFunction((text) => window.__COLOR_ESCAPE__.screen === "failed"
          && globalThis.__TIMEOUT_TITLE_DRAWS__.some((draw) => draw.type === "text" && draw.text === text),
        expected.text, { timeout: 8_000 });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const observed = await page.evaluate(() => ({
          state: window.__COLOR_ESCAPE__.getDebugState(), draws: [...globalThis.__TIMEOUT_TITLE_DRAWS__],
        }));
        assert.equal(observed.state.puzzle.failed, true);
        assert.equal(observed.state.puzzle.remainingSeconds, 0);
        const titles = observed.draws.filter((draw) => draw.type === "text" && draw.text === expected.text);
        assert.ok(titles.length, "Actual Canvas timeout title must be drawn");
        const center = {
          x: expected.status.panel.x + expected.pause.typography.title.x - expected.pause.panel.x,
          y: expected.status.panel.y + expected.pause.typography.title.pauseY - expected.pause.panel.y,
        };
        const panel = observed.draws.find((draw) => draw.type === "image"
          && draw.args[0] === expected.status.panel.x && draw.args[1] === expected.status.panel.y
          && draw.width === expected.status.panel.width && draw.height === expected.status.panel.height);
        assert.ok(panel, "Measured title must be relative to the actual shared panel image");
        for (const title of titles) {
          const size = Number(title.font.match(/(?:^|\s)([\d.]+)px(?:\s|$)/)?.[1]);
          if (language === "zh-CN") near(size, 60, "Chinese actual Canvas title font matches pause/settings");
          else assert.ok(size > 30 && size <= 60, "Long English title scales proportionally from 60, stays larger than the old 30px");
          const inkCenter = {
            x: title.x + (title.inkBounds.right - title.inkBounds.left) / 2,
            y: title.y + (title.inkBounds.descent - title.inkBounds.ascent) / 2,
          };
          near(inkCenter.x, center.x, "Visible title ink horizontal center");
          near(inkCenter.y, center.y, "Visible title ink vertical center");
          assert.ok(title.inkBounds.left + title.inkBounds.right <= 330.01, "Actual visible title fits the title plaque");
          assert.deepEqual(title.matrix, panel.matrix, "Title and shared panel use exactly the same transform");
          assert.equal(title.maxWidth, null, "Do not use Canvas maxWidth horizontal squeezing");
          const cssCenter = { x: title.matrix.a * inkCenter.x + title.matrix.c * inkCenter.y + title.matrix.e,
            y: title.matrix.b * inkCenter.x + title.matrix.d * inkCenter.y + title.matrix.f };
          assert.ok(cssCenter.x > 0 && cssCenter.x < viewport.width && cssCenter.y > 0 && cssCenter.y < viewport.height,
            "Title remains inside the viewport");
        }
        const screenshot = `${name}.png`;
        await page.screenshot({ path: resolve(output, screenshot) });
        reports.push({ viewport, language, titleText: expected.text, title: titles.at(-1), panel, expectedCenter: center,
          screenshot, modelFailed: true, remainingSeconds: 0 });
      } catch (error) {
        await page.screenshot({ path: resolve(output, `failure-${name}.png`) });
        await writeFile(resolve(output, `failure-${name}.json`), JSON.stringify({ error: String(error), reports,
          debug: await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState()),
          draws: await page.evaluate(() => globalThis.__TIMEOUT_TITLE_DRAWS__),
        }, null, 2));
        throw error;
      } finally { await context.close(); }
    }
  }
  assert.deepEqual(errors, []);
  const after = await hashes();
  assert.deepEqual(after, before, "Inputs must remain stable throughout the visual test");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ pass: true, isolatedContexts: true,
    scope: "Timeout-title appearance only; isolated model clock advanced to failure, not a natural-time gameplay certification",
    sources: after, reports, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, scenarios: reports.length, output }));
} finally { await browser.close(); }
