import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/numeric-ice-fracture/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const logicalViewport = { width: 496, height: 1078 };
const pulseFallback = { x: 364, y: 990 };
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

const attachErrors = (page, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`[${label}] ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`[${label}] ${error.message}`));
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const seedPage = async (page, reducedMotion) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate((motionReduced) => {
    const key = "color-escape-save-v1";
    const save = JSON.parse(localStorage.getItem(key));
    save.currentLevel = 1;
    save.highestLevel = 100;
    save.coins = Math.max(10_000, save.coins ?? 0);
    save.sound = false;
    save.haptic = false;
    save.reducedMotion = motionReduced;
    save.featureSeen = [
      "basics",
      "ice-door",
      "ice-block",
      "layer",
      "shutter",
      "axis",
      "key-lock",
      "lift",
      "timed-generator",
      "staged-frame",
      "generator",
      "star-gate",
    ];
    save.boosterUnlockSeen = ["time", "rocket", "pulse"];
    save.boosters = { ...save.boosters, time: 9, rocket: 9, pulse: 30 };
    localStorage.setItem(key, JSON.stringify(save));
  }, reducedMotion);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 15_000 },
  );
};

const discoverFixtures = (page) => page.evaluate(async () => {
  const { LEVELS } = await import("/src/core/levels.ts");
  const stagingSkins = new Set(["staging", "lift", "staged-frame"]);
  const candidates = LEVELS.map((level) => {
    const blocks = level.blocks
      .filter((block) => (block.frozen ?? 0) > 0)
      .map((block) => ({ id: block.id, frozen: block.frozen ?? 0, cells: block.shape.length }));
    const frozenGates = level.gates.filter((gate) => (gate.frozen ?? 0) > 0).length;
    const pulseShutters = (level.shutters ?? []).filter((shutter) => (
      !stagingSkins.has(shutter.skin) && (shutter.count ?? 0) > 0
    )).length;
    return {
      levelId: level.id,
      blocks,
      frozenBlockCount: blocks.length,
      terminalCount: blocks.filter((block) => block.frozen <= 2).length,
      decrementCount: blocks.filter((block) => block.frozen > 2).length,
      maximumCounter: Math.max(0, ...blocks.map((block) => block.frozen)),
      totalPulseTargets: blocks.length + frozenGates + pulseShutters,
    };
  }).filter((candidate) => candidate.frozenBlockCount > 0);

  const byCoverage = [...candidates].sort((a, b) => (
    Number(b.terminalCount > 0 && b.decrementCount > 0) - Number(a.terminalCount > 0 && a.decrementCount > 0)
    || b.frozenBlockCount - a.frozenBlockCount
    || b.maximumCounter - a.maximumCounter
    || a.levelId - b.levelId
  ));
  const coverage = byCoverage.find((candidate) => candidate.terminalCount > 0);
  const decrement = coverage?.decrementCount
    ? coverage
    : byCoverage.find((candidate) => candidate.decrementCount > 0);
  const stressPool = candidates.filter((candidate) => (
    candidate.frozenBlockCount > 1 && candidate.levelId !== coverage?.levelId
  ));
  const stress = [...(stressPool.length ? stressPool : candidates.filter((candidate) => candidate.frozenBlockCount > 1))]
    .sort((a, b) => (
      b.totalPulseTargets - a.totalPulseTargets
      || b.frozenBlockCount - a.frozenBlockCount
      || b.maximumCounter - a.maximumCounter
      || a.levelId - b.levelId
    ))[0];

  if (!coverage || !decrement || !stress) {
    throw new Error(`Numeric-ice E2E: campaign has no resilient terminal/decrement/stress fixtures ${JSON.stringify({
      coverage,
      decrement,
      stress,
      candidateCount: candidates.length,
    })}`);
  }
  return { coverage, decrement, stress };
});

const openLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForFunction(
    (id) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "playing" && state.level.id === id && state.art.ready;
    },
    levelId,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(80);
};

const pulseButtonPoint = async (page, state) => {
  const hit = state.interactionTargets?.targets?.["booster.pulse"]?.hit;
  const logical = hit
    ? { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }
    : pulseFallback;
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Numeric-ice E2E: canvas has no browser bounds");
  return {
    x: canvas.x + state.viewportTransform.offsetX + logical.x * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + logical.y * state.viewportTransform.scale,
    logical,
  };
};

const frozenChanges = (before, after) => before.puzzle.blocks
  .filter((block) => block.frozen > 0)
  .map((block) => {
    const current = after.puzzle.blocks.find((candidate) => candidate.id === block.id);
    return current && current.frozen < block.frozen ? {
      id: block.id,
      previous: block.frozen,
      remaining: current.frozen,
      cellCount: block.shape.length,
    } : undefined;
  })
  .filter(Boolean);

const iceBlockPulses = (state, ids) => state.mechanicPulses.filter((pulse) => (
  pulse.kind === "ice" && pulse.target === "block" && ids.includes(pulse.targetId)
));

const assertPulseContract = (state, expectedActive, label, expectedPhase = "visible") => {
  const expected = expectedActive;
  const ids = expected.map((change) => change.id);
  const pulses = iceBlockPulses(state, ids);
  const uniqueIds = new Set(pulses.map((pulse) => pulse.targetId));
  if (pulses.length !== expected.length || uniqueIds.size !== expected.length) {
    throw new Error(`Numeric-ice E2E: ${label} lost or duplicated frozen-block pulses ${JSON.stringify({
      expected: expected.map(({ id, previous, remaining }) => ({ id, previous, remaining })),
      actual: pulses.map(({ targetId, previous, remaining, phase }) => ({ targetId, previous, remaining, phase })),
      allPulseCount: state.mechanicPulses.length,
    })}`);
  }
  for (const change of expected) {
    const pulse = pulses.find((candidate) => candidate.targetId === change.id);
    const expectedIntensity = change.remaining === 0 ? "shatter" : "decrement";
    if (pulse.previous !== change.previous || pulse.remaining !== change.remaining) {
      throw new Error(`Numeric-ice E2E: ${label}/${change.id} counter provenance drifted ${JSON.stringify({ pulse, change })}`);
    }
    if (pulse.phase !== expectedPhase || !(pulse.age >= 0)) {
      throw new Error(`Numeric-ice E2E: ${label}/${change.id} fracture is not in its ${expectedPhase} phase ${JSON.stringify(pulse)}`);
    }
    const fracture = pulse.iceFracture;
    const debrisContract = expectedIntensity === "shatter"
      ? fracture?.shardCount > 0 && fracture?.speckCount > 0
      : fracture?.shardCount === 0 && fracture?.speckCount === 0;
    if (!fracture
      || fracture.intensity !== expectedIntensity
      || !(fracture.progress >= 0 && fracture.progress <= 1)
      || !debrisContract
      || fracture.cellCount !== change.cellCount) {
      throw new Error(`Numeric-ice E2E: ${label}/${change.id} has incomplete fracture evidence ${JSON.stringify({
        expectedIntensity,
        expectedDebris: expectedIntensity === "shatter" ? "nonzero" : "zero/direct-cut",
        expectedCellCount: change.cellCount,
        pulse,
      })}`);
    }
  }
  return pulses;
};

const armImmediatePulseCapture = (page) => page.evaluate(() => {
  const previous = window.__NUMERIC_ICE_TRIGGER_CAPTURE__;
  if (previous?.frame) cancelAnimationFrame(previous.frame);
  const capture = {
    startedAt: performance.now(),
    frame: 0,
    state: undefined,
    timedOut: false,
  };
  window.__NUMERIC_ICE_TRIGGER_CAPTURE__ = capture;
  const sample = () => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    if (state?.mechanicPulses.some((pulse) => pulse.kind === "ice" && pulse.target === "block")) {
      capture.state = structuredClone(state);
      capture.frame = 0;
      return;
    }
    if (performance.now() - capture.startedAt >= 1_500) {
      capture.timedOut = true;
      capture.frame = 0;
      return;
    }
    capture.frame = requestAnimationFrame(sample);
  };
  capture.frame = requestAnimationFrame(sample);
});

const waitForPeak = async (page, ids) => {
  await page.waitForFunction((targetIds) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    if (!state) return false;
    const pulses = state.mechanicPulses.filter((pulse) => (
      pulse.kind === "ice" && pulse.target === "block" && targetIds.includes(pulse.targetId)
    ));
    return pulses.length === targetIds.length && pulses.every((pulse) => (
      pulse.phase === "visible"
      && pulse.age >= 0
      && pulse.iceFracture
      && pulse.iceFracture.progress >= 0.24
      && pulse.iceFracture.progress <= 0.82
    ));
  }, ids, { timeout: 3_000, polling: "raf" });
};

const storePeakRoi = (page, ids, key) => page.evaluate(({ targetIds, snapshotKey }) => {
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const blocks = state.puzzle.blocks.filter((block) => targetIds.includes(block.id));
  const cells = blocks.flatMap((block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]));
  const board = state.board;
  const padding = board.cell * 0.7;
  const logicalBounds = {
    left: board.innerX + Math.min(...cells.map(([x]) => x)) * board.cell - padding,
    top: board.innerY + Math.min(...cells.map(([, y]) => y)) * board.cell - padding,
    right: board.innerX + (Math.max(...cells.map(([x]) => x)) + 1) * board.cell + padding,
    bottom: board.innerY + (Math.max(...cells.map(([, y]) => y)) + 1) * board.cell + padding,
  };
  const canvas = document.querySelector("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const css = canvas.getBoundingClientRect();
  const pixelScaleX = canvas.width / css.width;
  const pixelScaleY = canvas.height / css.height;
  const transform = state.viewportTransform;
  const x = Math.max(0, Math.floor((transform.offsetX + logicalBounds.left * transform.scale) * pixelScaleX));
  const y = Math.max(0, Math.floor((transform.offsetY + logicalBounds.top * transform.scale) * pixelScaleY));
  const right = Math.min(canvas.width, Math.ceil((transform.offsetX + logicalBounds.right * transform.scale) * pixelScaleX));
  const bottom = Math.min(canvas.height, Math.ceil((transform.offsetY + logicalBounds.bottom * transform.scale) * pixelScaleY));
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);
  const data = context.getImageData(x, y, width, height).data;
  window.__NUMERIC_ICE_PEAK_ROI__ ??= {};
  window.__NUMERIC_ICE_PEAK_ROI__[snapshotKey] = { x, y, width, height, data };
  return { x, y, width, height, pixels: width * height };
}, { targetIds: ids, snapshotKey: key });

const compareSettledRoi = (page, key) => page.evaluate((snapshotKey) => {
  const canvas = document.querySelector("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const peak = window.__NUMERIC_ICE_PEAK_ROI__?.[snapshotKey];
  if (!peak) throw new Error(`Missing peak ROI ${snapshotKey}`);
  const settled = context.getImageData(peak.x, peak.y, peak.width, peak.height).data;
  let changedPixels = 0;
  let absoluteDifference = 0;
  for (let index = 0; index < settled.length; index += 4) {
    const delta = Math.abs(peak.data[index] - settled[index])
      + Math.abs(peak.data[index + 1] - settled[index + 1])
      + Math.abs(peak.data[index + 2] - settled[index + 2]);
    absoluteDifference += delta;
    if (delta >= 24) changedPixels += 1;
  }
  const pixels = peak.width * peak.height;
  return {
    pixels,
    changedPixels,
    changedRatio: changedPixels / pixels,
    meanAbsoluteDifference: absoluteDifference / (pixels * 3),
  };
}, key);

const runScenario = async (page, fixture, options) => {
  const { label, viewportTag } = options;
  await openLevel(page, fixture.levelId);
  const before = await debug(page);
  const beforeFrozen = before.puzzle.blocks.filter((block) => block.frozen > 0);
  if (!beforeFrozen.length || before.economy.boosters.pulse <= 0 || !before.controls.boosters.pulse) {
    throw new Error(`Numeric-ice E2E: ${label} did not open an actionable frozen-block fixture`);
  }
  if (before.mechanicPulses.length !== 0) {
    throw new Error(`Numeric-ice E2E: ${label} inherited stale mechanic pulses`);
  }

  const point = await pulseButtonPoint(page, before);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(34);
  const pressed = await debug(page);
  if (pressed.buttonPress?.key !== "booster.pulse" || pressed.mechanicPulses.length !== 0) {
    throw new Error(`Numeric-ice E2E: ${label} did not reach a clean real-Pointer pre-trigger state ${JSON.stringify({
      buttonPress: pressed.buttonPress,
      mechanicPulses: pressed.mechanicPulses,
      logicalPoint: point.logical,
    })}`);
  }
  await page.screenshot({ path: resolve(output, `${label}-01-queued-pre-trigger-${viewportTag}.png`) });
  await armImmediatePulseCapture(page);
  await page.mouse.up();

  await page.waitForFunction(() => {
    const capture = window.__NUMERIC_ICE_TRIGGER_CAPTURE__;
    return Boolean(capture?.state || capture?.timedOut);
  }, undefined, { timeout: 2_000, polling: "raf" });
  const afterTrigger = await page.evaluate(() => window.__NUMERIC_ICE_TRIGGER_CAPTURE__?.state);
  if (!afterTrigger) {
    throw new Error(`Numeric-ice E2E: ${label} real-Pointer pulse produced no capturable frozen-block event`);
  }
  if (afterTrigger.economy.boosters.pulse !== before.economy.boosters.pulse - 1) {
    throw new Error(`Numeric-ice E2E: ${label} real-Pointer pulse did not spend exactly one booster`);
  }
  const changes = frozenChanges(before, afterTrigger);
  if (changes.length !== beforeFrozen.length) {
    throw new Error(`Numeric-ice E2E: ${label} pulse did not reduce every frozen block ${JSON.stringify({
      before: beforeFrozen.map(({ id, frozen }) => ({ id, frozen })),
      changes,
    })}`);
  }
  if (afterTrigger.puzzle.moves !== before.puzzle.moves) {
    throw new Error(`Numeric-ice E2E: ${label} booster incorrectly counted as a puzzle move`);
  }
  assertPulseContract(afterTrigger, changes, `${label} trigger`);

  const ids = changes.map((change) => change.id);
  const shatterChanges = changes.filter((change) => change.remaining === 0);
  const decrementChanges = changes.filter((change) => change.remaining > 0);
  const triggerPulses = iceBlockPulses(afterTrigger, ids);
  const triggerShatterPulses = iceBlockPulses(
    afterTrigger,
    shatterChanges.map((change) => change.id),
  );
  if (afterTrigger.settings.reducedMotion && afterTrigger.boardShakeTime !== 0) {
    throw new Error(`Numeric-ice E2E: ${label} reduced-motion trigger retained board shake ${afterTrigger.boardShakeTime}`);
  }

  let peakRoi;
  let roiMetric;
  let peakShatterPulses = triggerShatterPulses;
  const roiKey = `${label}-${fixture.levelId}-${viewportTag}`;
  if (shatterChanges.length > 0) {
    const shatterIds = shatterChanges.map((change) => change.id);
    await waitForPeak(page, shatterIds);
    const peak = await debug(page);
    peakShatterPulses = assertPulseContract(peak, shatterChanges, `${label} shatter peak`);
    if (peak.settings.reducedMotion && peak.boardShakeTime !== 0) {
      throw new Error(`Numeric-ice E2E: ${label} reduced-motion fracture retained board shake ${peak.boardShakeTime}`);
    }
    peakRoi = await storePeakRoi(page, shatterIds, roiKey);
    await page.screenshot({ path: resolve(output, `${label}-02-fracture-peak-${viewportTag}.png`) });
  } else {
    await page.screenshot({ path: resolve(output, `${label}-02-counter-direct-cut-${viewportTag}.png`) });
  }

  await page.waitForFunction((targetIds) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return !state.mechanicPulses.some((pulse) => (
      pulse.kind === "ice" && pulse.target === "block" && targetIds.includes(pulse.targetId)
    ));
  }, ids, { timeout: 3_000, polling: "raf" });
  await page.waitForTimeout(34);
  const settled = await debug(page);
  if (iceBlockPulses(settled, ids).length !== 0
    || changes.some((change) => (
      settled.puzzle.blocks.find((block) => block.id === change.id)?.frozen !== change.remaining
    ))) {
    throw new Error(`Numeric-ice E2E: ${label} did not settle cleanly on the new counters`);
  }
  if (shatterChanges.length > 0) {
    roiMetric = await compareSettledRoi(page, roiKey);
    if (roiMetric.changedPixels < 6
      || roiMetric.changedRatio < 0.0005
      || roiMetric.meanAbsoluteDifference < 0.08) {
      throw new Error(`Numeric-ice E2E: ${label} peak had no measurable transient board-region change ${JSON.stringify({
        peakRoi,
        roiMetric,
      })}`);
    }
  }
  await page.screenshot({ path: resolve(output, `${label}-03-fracture-settled-${viewportTag}.png`) });

  const shatterShardCounts = peakShatterPulses.map((pulse) => pulse.iceFracture.shardCount);
  const shatterSpeckCounts = peakShatterPulses.map((pulse) => pulse.iceFracture.speckCount);
  const result = {
    label,
    levelId: fixture.levelId,
    viewport: page.viewportSize(),
    reducedMotion: (await debug(page)).settings.reducedMotion,
    changedFrozenBlocks: changes.length,
    totalPulseTargetsInLevel: fixture.totalPulseTargets,
    shatterCount: shatterChanges.length,
    decrementCount: decrementChanges.length,
    directCutDebrisCount: decrementChanges.reduce((sum, change) => {
      const pulse = triggerPulses.find((candidate) => candidate.targetId === change.id);
      return sum + pulse.iceFracture.shardCount + pulse.iceFracture.speckCount;
    }, 0),
    minimumShatterShardCount: shatterShardCounts.length ? Math.min(...shatterShardCounts) : null,
    minimumShatterSpeckCount: shatterSpeckCounts.length ? Math.min(...shatterSpeckCounts) : null,
    roiMetric: roiMetric ?? null,
  };
  results.push(result);
  return result;
};

try {
  const standard = await browser.newPage({ viewport: logicalViewport });
  attachErrors(standard, "496x1078");
  await seedPage(standard, false);
  const fixtures = await discoverFixtures(standard);

  const standardPlans = [
    { label: "terminal-coverage", fixture: fixtures.coverage },
    ...(fixtures.decrement.levelId !== fixtures.coverage.levelId
      && fixtures.decrement.levelId !== fixtures.stress.levelId
      ? [{ label: "decrement-coverage", fixture: fixtures.decrement }]
      : []),
    { label: "maximum-multi-block", fixture: fixtures.stress },
  ].filter((plan, index, plans) => (
    plan.label !== "maximum-multi-block"
      || index === 0
      || plans.slice(0, index).every((candidate) => candidate.fixture.levelId !== plan.fixture.levelId)
  ));

  for (const plan of standardPlans) {
    await runScenario(standard, plan.fixture, { label: plan.label, viewportTag: "496x1078" });
  }
  const standardShatters = results.reduce((sum, result) => sum + result.shatterCount, 0);
  const standardDecrements = results.reduce((sum, result) => sum + result.decrementCount, 0);
  if (standardShatters === 0 || standardDecrements === 0) {
    throw new Error(`Numeric-ice E2E: standard scenarios did not cover both shatter and decrement ${JSON.stringify(results)}`);
  }
  await standard.close();

  const reduced = await browser.newPage({ viewport: { width: 320, height: 568 } });
  attachErrors(reduced, "reduced-320x568");
  await seedPage(reduced, true);
  await runScenario(reduced, fixtures.coverage, {
    label: "reduced-motion-terminal",
    viewportTag: "320x568",
  });
  await reduced.close();
} finally {
  await browser.close();
}

if (errors.length) throw new Error(`Numeric-ice browser errors:\n${errors.join("\n")}`);
console.log(`Numeric ice fracture passed with real Pointer input: ${JSON.stringify(results)}`);
