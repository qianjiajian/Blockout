import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/feature-intro-guide-icons-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const reports = [];
const iconPrefix = "assets/art/ui/formal-pages/mechanism-guide-v2/";
const iconByKind = {
  "ice-door": "frozen-exit", "ice-block": "numeric-ice", layer: "multilayer-shell", shutter: "shutter",
  generator: "generator", "arrow-block": "axis-block", "key-lock": "key-lock", lift: "layered-lift",
  star: "star", bomb: "bomb", "flip-door": "flip-door", "colored-grid": "colored-grid",
};
const fingerprintPaths = ["src/game/ColorEscapeGame.ts", "src/game/featureIntroIcon.ts", "src/game/artManifest.ts",
  "src/game/featureIntroPolicy.ts", "src/game/localization.ts", "src/game/formalPageLayout.ts",
  "src/core/mechanismCatalog.ts", "src/core/levels.ts", "src/core/PuzzleModel.ts", "tools/playtest-feature-intros.mjs",
  ...[...new Set(Object.values(iconByKind))].map((id) => `public/${iconPrefix}icon-${id}.png`)];
const fingerprints = async () => Object.fromEntries(await Promise.all(fingerprintPaths.map(async (path) => [
  path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex"),
])));
const beforeHashes = await fingerprints();
const cases = [
  { level: 6, kind: "ice-door", name: "ice-door" },
  { level: 10, kind: "ice-block", name: "ice-block" },
  { level: 15, kind: "layer", name: "layer" },
  { level: 20, kind: "shutter", name: "shutter" },
  { level: 35, kind: "generator", name: "generator" },
  { level: 50, kind: "arrow-block", name: "axis-block" },
  { level: 60, kind: "key-lock", name: "key-lock" },
  { level: 65, kind: "lift", name: "layered-lift" },
  { level: 100, kind: "star", name: "star" },
  { level: 120, kind: "bomb", name: "bomb" },
  { level: 150, kind: "flip-door", name: "flip-door" },
  { level: 200, kind: "colored-grid", name: "colored-grid" },
];

const save = () => ({
  schemaVersion: 1,
  currentLevel: 6,
  highestLevel: 200,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const runCases = async (page, suffix, width, height) => {
  const requests = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname.replace(/^\/+/, "");
    if (pathname.startsWith(iconPrefix)) requests.push(pathname);
  });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    globalThis.__FEATURE_IMAGE_DRAWS__ = [];
    globalThis.__GUIDE_IMAGE_LOADS__ = [];
    globalThis.__FEATURE_TITLE_DRAWS__ = [];
    globalThis.__FEATURE_DESCRIPTION_DRAWS__ = [];
    globalThis.__IN_FEATURE_DRAW__ = false;
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      ...src,
      set(value) {
        const path = new URL(String(value), location.href).pathname.replace(/^\/+/, "");
        if (path.startsWith("assets/art/ui/formal-pages/mechanism-guide-v2/")) {
          globalThis.__GUIDE_IMAGE_LOADS__.push(path);
        }
        return src.set.call(this, value);
      },
    });
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function auditedDrawImage(image, ...args) {
      const source = String(image?.currentSrc || image?.src || "");
      if (globalThis.__IN_FEATURE_DRAW__) {
        const m = this.getTransform();
        globalThis.__FEATURE_IMAGE_DRAWS__.push({ source, args, width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height, alpha: this.globalAlpha,
          matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
      }
      return original.call(this, image, ...args);
    };
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function auditedFillText(text, x, y, maxWidth) {
      if (globalThis.__IN_FEATURE_DRAW__ && Math.abs(Number(x) - 356) < 0.001 && Math.abs(Number(y) - 360) < 0.001) {
        globalThis.__FEATURE_TITLE_DRAWS__.push({ text: String(text), x, y });
      }
      if (globalThis.__IN_FEATURE_DRAW__ && Math.abs(Number(x) - 158) < 0.001 && Number(y) >= 806) {
        const metrics = this.measureText(String(text));
        globalThis.__FEATURE_DESCRIPTION_DRAWS__.push({ text: String(text), x, y, font: this.font,
          bottom: Number(y) + metrics.actualBoundingBoxDescent });
      }
      if (maxWidth == null) return originalFillText.call(this, text, x, y);
      return originalFillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 15_000 },
  );
  assert.equal(requests.length, 0, "Home must not preload guide icons or the guide page");
  assert.deepEqual(await page.evaluate(() => globalThis.__GUIDE_IMAGE_LOADS__), [], "Home must not allocate cached guide images either");

  // Check mapping independently against the guide catalog, not only against a
  // debug string provided by the feature renderer being tested.
  const mapping = await page.evaluate(async (kinds) => {
    const { featureIntroIconPath } = await import("/src/game/featureIntroIcon.ts");
    const { FEATURE_INTRO_POLICY } = await import("/src/game/featureIntroPolicy.ts");
    const { MECHANISM_GUIDE } = await import("/src/core/mechanismCatalog.ts");
    const { GAME_ART } = await import("/src/game/artManifest.ts");
    return {
      scheduled: FEATURE_INTRO_POLICY.filter(({ showUnlockPopup }) => showUnlockPopup)
        .map(({ id, unlockLevel, kind }) => ({ id, level: unlockLevel, kind })),
      guide: Object.fromEntries(MECHANISM_GUIDE.map(({ id, atlasIndex }) => [id,
        GAME_ART.ui.formalPages.collection.itemImages[atlasIndex]])),
      paths: Object.fromEntries(kinds.map((kind) => [kind, featureIntroIconPath(kind)])),
    };
  }, Object.keys(iconByKind));
  assert.deepEqual(mapping.scheduled, cases.map(({ level, kind }) => ({ id: iconByKind[kind], level, kind })),
    "Test the workbook's exact 12 enabled formal nodes, independently of legacy level metadata");
  for (const [kind, guideId] of Object.entries(iconByKind)) {
    assert.equal(mapping.paths[kind], mapping.guide[guideId], `${kind} must share the guide's actual image path`);
  }

  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const methods = ["drawHome", "drawHud", "drawBoard", "drawBoosters", "drawFeature"];
    const originals = {};
    const trace = [];
    for (const method of methods) {
      originals[method] = game[method];
      game[method] = function auditedFeatureRender(...args) {
        trace.push({ method, screen: this.screen });
        if (trace.length > 1_000) trace.splice(0, trace.length - 1_000);
        const previous = globalThis.__IN_FEATURE_DRAW__;
        if (method === "drawFeature") globalThis.__IN_FEATURE_DRAW__ = true;
        try { return originals[method].apply(this, args); }
        finally { globalThis.__IN_FEATURE_DRAW__ = previous; }
      };
    }
    window.__FEATURE_RENDER_PROBE__ = {
      trace,
      restore: () => {
        for (const method of methods) game[method] = originals[method];
      },
    };
  });

  const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const interactionTargetPoint = async (name) => {
    const state = await debug();
    const hit = state.interactionTargets?.targets?.[name]?.hit;
    const bounds = await page.locator("canvas").boundingBox();
    if (!hit || !bounds) throw new Error(`Feature intro E2E: missing interaction target ${name}`);
    return {
      x: bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
      y: bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
    };
  };
  const clickInteractionTarget = async (name) => {
    const point = await interactionTargetPoint(name);
    await page.mouse.click(point.x, point.y);
  };
  const pressInteractionTarget = async (name) => {
    const point = await interactionTargetPoint(name);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
  };

  const openHome = async (feature) => page.evaluate(async ({ level }) => {
    const { LEVELS } = await import("/src/core/levels.ts");
    const game = window.__COLOR_ESCAPE__;
    const actual = LEVELS.find((candidate) => candidate.id === level);
    if (!actual) throw new Error(`Missing formal introduction level ${level}`);
    game.loadLevel(level, false);
    // Vite may instantiate a second module URL for this direct inspection;
    // compare the complete authored value, not cross-module object identity.
    if (JSON.stringify(game.model.level) !== JSON.stringify(actual)) {
      throw new Error(`Introduction level ${level} is not the unmodified formal level`);
    }
    return { source: "formal", level, levelJSON: JSON.stringify(actual) };
  }, feature);

  for (const feature of cases) {
    const { levelJSON, ...caseSource } = await openHome(feature);
    const levelSHA256 = createHash("sha256").update(levelJSON).digest("hex");
    await page.waitForTimeout(70);
    let state = await debug();
    if (state.screen !== "home" || state.puzzle.started || state.puzzle.autonomousStarted) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not begin from an idle Home selection`);
    }
    await page.evaluate(() => {
      globalThis.__FEATURE_IMAGE_DRAWS__.length = 0;
      globalThis.__GUIDE_IMAGE_LOADS__.length = 0;
      globalThis.__FEATURE_TITLE_DRAWS__.length = 0;
      globalThis.__FEATURE_DESCRIPTION_DRAWS__.length = 0;
      window.__FEATURE_RENDER_PROBE__.trace.length = 0;
    });
    const requestStart = requests.length;
    await clickInteractionTarget("homePlay");
    const expectedPath = mapping.guide[iconByKind[feature.kind]];
    await page.waitForFunction((path) => globalThis.__FEATURE_IMAGE_DRAWS__.some(({ source }) => (
      new URL(source, location.href).pathname.replace(/^\/+/, "") === path
    )), expectedPath, { timeout: 15_000 });
    state = await debug();
    if (state.screen !== "feature" || state.level.id !== feature.level) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not open`);
    }
    const initialRemaining = state.puzzle.remainingSeconds;
    const initialBombs = state.puzzle.blocks.filter((block) => block.timedBombSeconds !== undefined)
      .map(({ id, timedBombSeconds }) => ({ id, timedBombSeconds }));
    const initialLives = await page.evaluate(() => window.__COLOR_ESCAPE__.save.lifeState.lives);
    if (feature.kind === "bomb") assert.ok(initialBombs.length, "Formal bomb introduction must contain a real bomb");
    const initialTimedGenerators = state.puzzle.generators
      .filter((generator) => generator.trigger === "time")
      .map(({ id, head, remaining, elapsed }) => ({ id, head, remaining, elapsed }));
    if (state.puzzle.started || state.puzzle.autonomousStarted
      || initialRemaining !== state.level.timeSeconds) {
      throw new Error(`Feature intro E2E: ${feature.kind} timer started before the card opened`);
    }
    if ((feature.kind === "ice-door" || feature.kind === "ice-block" || feature.kind === "shutter" || feature.kind === "generator") && state.featureVisual.counter < 1) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not bind its live countdown`);
    }
    if (feature.kind === "ice-block" && !state.featureVisual.outerColor) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not bind its live outer color`);
    }
    const featureDraws = await page.evaluate(() => [...globalThis.__FEATURE_IMAGE_DRAWS__]);
    const iconDraws = featureDraws.filter(({ source }) => new URL(source, playtestUrl).pathname.replace(/^\/+/, "") === expectedPath);
    assert.ok(iconDraws.length, `${feature.kind}: Canvas must draw the shared guide image`);
    for (const draw of iconDraws) {
      assert.equal(draw.args.length, 4, `${feature.kind}: full image contain, never source cropping`);
      const [x, y, w, h] = draw.args;
      const scale = Math.min(190 / draw.width, 190 / draw.height);
      for (const [actual, expected] of [[w, draw.width * scale], [h, draw.height * scale], [x + w / 2, 352], [y + h / 2, 622]]) {
        assert.ok(Math.abs(actual - expected) < 0.001, `${feature.kind}: proportional centered 190px contain`);
      }
      assert.equal(draw.alpha, 1, `${feature.kind}: no unintended dimming on the icon`);
    }
    const wrongContent = featureDraws.filter(({ source }) => {
      const path = new URL(source, playtestUrl).pathname.replace(/^\/+/, "");
      return path !== expectedPath && !path.includes("/overlays/pause-settings/");
    });
    assert.deepEqual(wrongContent, [], `${feature.kind}: no old gameplay sprite/atlas in the feature visual`);
    const featureRequests = requests.slice(requestStart);
    // Chromium can satisfy Image.src from decoded memory cache, so observe
    // real image allocation as well as network requests.
    const imageLoads = await page.evaluate(() => [...globalThis.__GUIDE_IMAGE_LOADS__]);
    assert.deepEqual(imageLoads, [expectedPath], `${feature.kind}: lazily load exactly its own guide icon`);
    assert.ok(featureRequests.every((path) => path === expectedPath), `${feature.kind}: do not load the entire guide page`);
    await page.waitForTimeout(600);
    state = await debug();
    if (state.screen !== "feature" || state.puzzle.started || state.puzzle.autonomousStarted
      || state.puzzle.remainingSeconds !== initialRemaining) {
      throw new Error(`Feature intro E2E: ${feature.kind} card consumed the level countdown while open`);
    }
    assert.deepEqual(state.puzzle.blocks.filter((block) => block.timedBombSeconds !== undefined)
      .map(({ id, timedBombSeconds }) => ({ id, timedBombSeconds })), initialBombs,
    `${feature.kind}: popup waiting must not consume any bomb countdown`);
    const waitingTimedGenerators = state.puzzle.generators
      .filter((generator) => generator.trigger === "time")
      .map(({ id, head, remaining, elapsed }) => ({ id, head, remaining, elapsed }));
    if (JSON.stringify(waitingTimedGenerators) !== JSON.stringify(initialTimedGenerators)) {
      throw new Error(`Feature intro E2E: ${feature.kind} card advanced an autonomous mechanism`);
    }
    const renderTrace = await page.evaluate(() => [...window.__FEATURE_RENDER_PROBE__.trace]);
    const featureMethods = new Set(renderTrace
      .filter(({ screen }) => screen === "feature")
      .map(({ method }) => method));
    for (const method of ["drawHud", "drawBoard", "drawBoosters", "drawFeature"]) {
      if (!featureMethods.has(method)) {
        throw new Error(`Feature intro E2E: ${feature.kind} card did not render ${method} over gameplay`);
      }
    }
    if (featureMethods.has("drawHome")) {
      throw new Error(`Feature intro E2E: ${feature.kind} card rendered the Home scene behind the modal`);
    }
    const titleDraws = await page.evaluate(() => [...globalThis.__FEATURE_TITLE_DRAWS__]);
    if (!titleDraws.length || titleDraws.some(({ text }) => text !== "新机制解锁")) {
      throw new Error(`Feature intro E2E: ${feature.kind} title is not the unified unlock title (${JSON.stringify(titleDraws)})`);
    }
    const descriptionDraws = await page.evaluate(() => [...globalThis.__FEATURE_DESCRIPTION_DRAWS__]);
    assert.ok(descriptionDraws.length, `${feature.kind}: draw the actual mechanism explanation`);
    assert.ok(descriptionDraws.every(({ bottom }) => Number.isFinite(bottom) && bottom < 1003),
      `${feature.kind}: mechanism explanation must remain above the confirmation button`);
    await page.screenshot({ path: shot(`round110-feature-${feature.name}${suffix}.png`) });
    reports.push({ viewport: { width, height }, kind: feature.kind, ...caseSource, levelSHA256, expectedPath,
      iconDraw: iconDraws.at(-1), imageLoads, requested: featureRequests, initialRemaining, initialBombs,
      descriptionBottom: Math.max(...descriptionDraws.map(({ bottom }) => bottom)) });

    await pressInteractionTarget("featurePrimary");
    await page.waitForTimeout(300);
    state = await debug();
    if (state.screen !== "feature" || state.puzzle.started || state.puzzle.autonomousStarted
      || state.puzzle.remainingSeconds !== initialRemaining) {
      throw new Error(`Feature intro E2E: ${feature.kind} timer started before confirmation release`);
    }
    assert.deepEqual(state.puzzle.blocks.filter((block) => block.timedBombSeconds !== undefined)
      .map(({ id, timedBombSeconds }) => ({ id, timedBombSeconds })), initialBombs,
    `${feature.kind}: holding confirmation must not consume any bomb countdown`);
    await page.mouse.up();
    // Revised levels start at their first playable stable frame. The first
    // arrow/lock/lift introduction may still be fetching its gameplay art after
    // the modal is dismissed; that loading interval must not consume the clock.
    await page.waitForFunction(() => {
      const state = window.__COLOR_ESCAPE__.getDebugState();
      return state.screen === "playing" && state.puzzle.started;
    }, undefined, { timeout: 15_000, polling: "raf" });
    state = await debug();
    if (state.screen !== "playing" || !state.puzzle.started || state.puzzle.autonomousStarted
      || state.puzzle.remainingSeconds > initialRemaining
      || state.puzzle.remainingSeconds < initialRemaining - 0.12) {
      throw new Error(`Feature intro E2E: ${feature.kind} confirmation did not start only the level countdown (${JSON.stringify({ screen: state.screen, puzzle: state.puzzle, art: state.art })})`);
    }
    const dismissedRemaining = state.puzzle.remainingSeconds;
    await page.waitForTimeout(400);
    state = await debug();
    const elapsedAfterDismiss = dismissedRemaining - state.puzzle.remainingSeconds;
    if (state.screen !== "playing" || !state.puzzle.started || state.puzzle.autonomousStarted
      || elapsedAfterDismiss < 0.2 || elapsedAfterDismiss > 0.8) {
      throw new Error(`Feature intro E2E: ${feature.kind} countdown did not advance from dismissal (${elapsedAfterDismiss})`);
    }
    const runningTimedGenerators = state.puzzle.generators
      .filter((generator) => generator.trigger === "time")
      .map(({ id, head, remaining, elapsed }) => ({ id, head, remaining, elapsed }));
    if (JSON.stringify(runningTimedGenerators) !== JSON.stringify(initialTimedGenerators)) {
      throw new Error(`Feature intro E2E: ${feature.kind} dismissal was incorrectly treated as player mechanism activation`);
    }
    const acknowledgement = await page.evaluate(() => ({
      lives: window.__COLOR_ESCAPE__.save.lifeState.lives,
      runtime: window.__COLOR_ESCAPE__.save.featureSeen,
      durable: JSON.parse(localStorage.getItem("color-escape-save-v1")).featureSeen,
    }));
    assert.equal(acknowledgement.lives, initialLives, `${feature.kind}: reading and confirming must not consume a life`);
    assert.ok(acknowledgement.runtime.includes(feature.kind), `${feature.kind}: confirmation is acknowledged in memory`);
    assert.ok(acknowledgement.durable.includes(feature.kind), `${feature.kind}: confirmation is durably acknowledged`);

    // The acknowledged feature must not interrupt this level a second time.
    await openHome(feature);
    await page.waitForTimeout(70);
    await clickInteractionTarget("homePlay");
    await page.waitForTimeout(70);
    state = await debug();
    if (state.screen !== "playing") throw new Error(`Feature intro E2E: ${feature.kind} was not one-shot`);
  }

  await page.evaluate(() => {
    window.__FEATURE_RENDER_PROBE__?.restore();
    delete window.__FEATURE_RENDER_PROBE__;
  });
};

try {
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try { await runCases(page, `-${viewport.width}x${viewport.height}`, viewport.width, viewport.height); }
    catch (error) {
      await page.screenshot({ path: shot(`failure-${viewport.width}x${viewport.height}.png`) });
      await writeFile(shot(`failure-${viewport.width}x${viewport.height}.json`), JSON.stringify({
        error: String(error), reports, state: await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState()),
      }, null, 2));
      throw error;
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  const afterHashes = await fingerprints();
  assert.deepEqual(afterHashes, beforeHashes, "Inputs changed during feature-intro E2E");
  await writeFile(shot("report.json"), JSON.stringify({ pass: true, isolatedStorage: true,
    neverOpenedGuide: true, sources: afterHashes, reports, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, scenarios: reports.length, output,
    coverage: "All 12 workbook-scheduled formal levels use shared guide images; actual Canvas contain, bounded text, no guide preopen, one-shot confirmation, paused modal clocks and no life charge" }));
} finally { await browser.close(); }
