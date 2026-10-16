import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

// The production dist files run unchanged on a fresh loopback port. Storage is
// replaced before the bundle starts, never delegated to the browser's storage.
// Named fixture preparation changes only the live, synthetic model. Every use
// of the booster, pause, resume and restart below is a genuine Pointer click.
const output = resolve(process.env.PULSE_OUTPUT ?? `playtest-results/pulse-animation-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['src/game/ColorEscapeGame.ts', 'src/game/pulseAnimation.ts', 'src/core/PuzzleModel.ts'];
const sources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, sha(await readFile(path))])));
const build = async () => {
  const index = await readFile('dist/index.html', 'utf8');
  const bundle = index.match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
  assert.ok(bundle, 'Built production game bundle');
  return { bundle, sha256: sha(await readFile(resolve('dist/assets', bundle))) };
};
const report = { status: 'RUNNING', sourceBindings: await sources(), build: await build(), scenarios: [], errors: [],
  scope: 'Unmodified production dist, isolated MemoryStorage behind production WebHost, Pointer input and natural RAF. No real player storage, no solved-route claims.',
  fixtures: ['Formal Lv20 geometry with explicit live-model ice/flip-door/shutter counters, shell and bomb markers', 'Formal Lv20 shutter skin exclusion fixtures', 'Formal Lv10 live frozen-one rescue fixture'],
  backgroundCoverage: 'Synthetic document.hidden/visibilitychange through production WebHost; not operating-system suspension.' };
const server = await preview({ configFile: false, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
report.origin = origin;
const browser = await chromium.launch({ headless: true });
let activePage;
const state = p => p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const audit = p => p.evaluate(() => window.__PULSE_TEST__.audit);
const fx = s => s.pulseAnimation;
const compact = s => ({ screen: s.screen, level: s.level.id, fx: fx(s), moves: s.puzzle.moves, cleared: s.puzzle.cleared,
  stock: s.economy.boosters.pulse, spent: s.activeRun?.boosterSpent.pulse ?? 0, seconds: s.puzzle.remainingSeconds,
  freeze: s.puzzle.timeFreezeSeconds, guide: s.pulseRescueGuide, puzzle: s.puzzle });
const counters = s => ({ gates: s.puzzle.gates.map(b => [b.id, b.frozen]), flipDoors: s.puzzle.flipDoors.map(b => [b.id, b.frozen, b.open]),
  blocks: s.puzzle.blocks.map(b => [b.id, b.frozen, b.layers, b.lockedBy, b.lockCount]),
  shutters: s.puzzle.shutters.map(b => [b.id, b.count, b.skin]), moves: s.puzzle.moves, cleared: s.puzzle.cleared });
async function click(p, key) {
  const s = await state(p), r = (s.interactionTargets.targets ?? s.interactionTargets)[key]?.hit;
  assert.ok(r, `Real target ${key}`);
  const box = await p.locator('canvas').boundingBox(), t = s.viewportTransform;
  await p.mouse.click(box.x + t.offsetX + (r.x + r.width / 2) * t.scale, box.y + t.offsetY + (r.y + r.height / 2) * t.scale);
}
async function clickBlock(p, id) {
  const s = await state(p), b = s.puzzle.blocks.find(b => b.id === id), box = await p.locator('canvas').boundingBox(), t = s.viewportTransform;
  assert.ok(b); const [dx, dy] = b.shape[0];
  await p.mouse.click(box.x + t.offsetX + (s.board.innerX + (b.x + dx + .5) * s.board.cell) * t.scale,
    box.y + t.offsetY + (s.board.innerY + (b.y + dy + .5) * s.board.cell) * t.scale);
}
async function ready(p, id) {
  await p.waitForFunction(id => { const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
    return d.screen === 'playing' && d.level.id === id && !g.revisedArtLoading && !g.navigationTransition && !g.directLevelTransition;
  }, id, { timeout: 30000 });
}
async function load(p, id) { await p.evaluate(id => window.__COLOR_ESCAPE__.loadLevel(id, true), id); await ready(p, id); }
async function snap(p, row, label) {
  const file = resolve(output, `${row.name}-${label}.png`); await p.screenshot({ path: file }); row.images.push(file);
}
async function resetAudit(p, captureTimeline = false) { await p.evaluate(capture => { const t = window.__PULSE_TEST__, a = t.audit;
  for (const key of ['frames', 'board', 'hud', 'boosters', 'images', 'arcs', 'pointer', 'drawCounts', 'captures']) a[key] = []; t.captureTimeline = capture;
}, captureTimeline); }
async function timelineImages(p, row) {
  const images = await p.evaluate(() => window.__PULSE_TEST__.audit.captures.map(r => ({ ...r })));
  row.keyframes = [];
  for (const capture of images) {
    const file = resolve(output, `${row.name}-${capture.label}.png`);
    await writeFile(file, Buffer.from(capture.dataUrl.split(',')[1], 'base64'));
    const { dataUrl, ...metadata } = capture; row.keyframes.push({ ...metadata, file }); row.images.push(file);
  }
  await p.evaluate(() => { for (const c of window.__PULSE_TEST__.audit.captures) delete c.dataUrl; });
  assert.deepEqual(row.keyframes.map(r => r.label), ['launch', 'gather', 'wave', 'response']);
  for (const capture of row.keyframes) assert.ok(capture.age >= capture.requestedAge && capture.age <= capture.requestedAge + .1,
    `Natural ${capture.label} frame has accurate age ${capture.age}`);
  assert.equal(row.keyframes[0].phase, 'fly'); assert.equal(row.keyframes[1].phase, 'gather'); assert.equal(row.keyframes[2].phase, 'wave');
}
async function finished(p) { await p.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().pulseAnimation.visible); }
async function atAge(p, age) { await p.waitForFunction(age => { const f = window.__COLOR_ESCAPE__.getDebugState().pulseAnimation; return f.visible && f.age >= age; }, age); }

async function prepare(viewport, reducedMotion = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(({ reducedMotion }) => {
    const seed = { schemaVersion: 1, currentLevel: 20, highestLevel: 26, coins: 777, sound: false, music: false, haptic: false, reducedMotion,
      language: 'zh-CN', featureSeen: ['basics', 'ice-door', 'ice-block', 'layer', 'shutter', 'generator', 'arrow-block', 'key-lock', 'lift', 'star', 'bomb', 'flip-door', 'colored-grid'],
      boosterUnlockSeen: ['time', 'rocket', 'pulse'], boosterUsageSeen: ['time', 'rocket', 'pulse'], boosters: { time: 9, rocket: 9, pulse: 9 },
      bestStars: {}, bestMoves: {}, rewardedLevels: Array.from({ length: 25 }, (_, i) => i + 1),
      collectionIntroPending: false, collectionIntroShown: true, leagueIntroSeen: true,
      journeyProgress: { claimedMilestoneLevels: [5, 10, 15, 20, 25], seenEpisodeUnlockLevels: [1, 11, 21] },
      lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 } };
    const data = new Map([['color-escape-save-v1', JSON.stringify(seed)]]), accesses = [], violations = [];
    for (const key of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[key] = function () { violations.push(key); throw Error('Native player storage forbidden'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem(k) { accesses.push({ op: 'read', key: k }); return data.get(k) ?? null; },
      setItem(k, v) { accesses.push({ op: 'write', key: k }); data.set(k, String(v)); },
      removeItem(k) { data.delete(k); }, clear() { data.clear(); }, key(n) { return [...data.keys()][n] ?? null; }, get length() { return data.size; },
    } });
    window.__PULSE_TEST__ = { data, accesses, violations, audit: { frames: [], board: [], hud: [], boosters: [], images: [], arcs: [], pointer: [], drawCounts: [] } };
  }, { reducedMotion });
  const p = await context.newPage(); activePage = p;
  p.on('pageerror', e => report.errors.push({ viewport, message: e.message }));
  p.on('console', m => { if (m.type() === 'error') report.errors.push({ viewport, message: m.text() }); });
  await p.goto(origin, { waitUntil: 'domcontentloaded' });
  assert.ok((await p.locator('script[src]').evaluateAll(nodes => nodes.map(n => n.src))).some(src => src.endsWith(report.build.bundle)));
  await p.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady, undefined, { timeout: 60000 });
  await load(p, 20);
  await p.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, test = window.__PULSE_TEST__, ctx = g.ctx;
    const matrix = c => { const m = c.getTransform(); return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }; };
    for (const [method, key] of [['drawBoard', 'board'], ['drawHud', 'hud'], ['drawBoosters', 'boosters']]) {
      const original = g[method]; g[method] = function (...args) {
        const d = this.getDebugState(); if (d.screen === 'playing') test.audit[key].push({ at: performance.now(), m: matrix(this.ctx), fx: d.pulseAnimation });
        return original.apply(this, args);
      };
    }
    const booster = g.drawBooster; g.drawBooster = function (rect, index, count, active, kind) {
      if (kind === 'pulse') test.audit.drawCounts.push({ at: performance.now(), count }); return booster.call(this, rect, index, count, active, kind);
    };
    let drawingPulse = false;
    const method = ['drawPulsePresentation', 'drawPulseEffect', 'drawPulseAnimation'].find(key => typeof g[key] === 'function');
    if (!method) throw Error('Missing production pulse drawing wrapper'); test.drawMethod = method;
    const draw = g[method]; g[method] = function (...args) {
      drawingPulse = true;
      try {
        const result = draw.apply(this, args), sample = this.pulseAnimation.sample(this.save.reducedMotion);
        // Copy the canvas immediately after this naturally scheduled draw. No
        // animation age, RAF timestamp or model state is changed for pictures.
        if (test.captureTimeline && sample.visible) for (const [label, requestedAge] of [['launch', .2], ['gather', .5], ['wave', .78], ['response', 1.03]]) {
          if (sample.age < requestedAge || test.audit.captures.some(c => c.label === label)) continue;
          test.audit.captures.push({ label, requestedAge, age: sample.age, phase: sample.phase, at: performance.now(),
            width: this.host.canvas.width, height: this.host.canvas.height, dataUrl: this.host.canvas.toDataURL('image/png') });
        }
        return result;
      } finally { drawingPulse = false; }
    };
    const image = ctx.drawImage, arc = ctx.arc;
    ctx.drawImage = function (source, ...args) {
      if (drawingPulse && source === g.art.gameplayUi?.boosterPulse) test.audit.images.push({ at: performance.now(), m: matrix(this), args, fx: g.getDebugState().pulseAnimation });
      return image.call(this, source, ...args);
    };
    ctx.arc = function (...args) { if (drawingPulse) test.audit.arcs.push({ at: performance.now(), args, fx: g.getDebugState().pulseAnimation }); return arc.apply(this, args); };
    for (const type of ['pointerdown', 'pointerup']) g.host.canvas.addEventListener(type, e => test.audit.pointer.push({ type, x: e.clientX, y: e.clientY, at: performance.now() }), true);
    const sample = () => { const d = g.getDebugState(); test.audit.frames.push({ at: performance.now(), screen: d.screen, stock: d.economy.boosters.pulse,
      spent: d.activeRun?.boosterSpent.pulse ?? 0, moves: d.puzzle.moves, seconds: d.puzzle.remainingSeconds, fx: d.pulseAnimation }); requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  });
  return { context, p };
}

async function fixture(p, mode = 'comprehensive') {
  await load(p, 20);
  const info = await p.evaluate(mode => {
    const g = window.__COLOR_ESCAPE__, m = g.model;
    // Live state only: the authored LevelSpec and all on-disk data stay intact.
    const visible = m.blocks.filter(b => m.isBlockVisible(b)), hidden = m.blocks.filter(b => !m.isBlockVisible(b));
    if (visible.length < 5 || !hidden.length || !m.shutters.length || m.gates.length < 3) throw Error('Lv20 fixture inventory changed');
    for (const b of m.blocks) b.frozen = 0;
    for (const gate of m.gates) gate.frozen = 0;
    for (const s of m.shutters) s.count = 5;
    const shutter = m.shutters[0];
    if (mode === 'comprehensive') {
      visible[0].frozen = 3; visible[1].frozen = 1; hidden[0].frozen = 4;
      visible[2].layers = [visible[2].color, visible[2].color === 'blue' ? 'red' : 'blue'];
      visible[4].timedBombSeconds = 30;
      m.gates[0].frozen = 3; m.gates[1].frozen = 1;
      const base = m.gates.pop(); m.flipDoors.push({ ...base, frozen: 2, initiallyOpen: false, open: false });
      shutter.count = 2;
    } else {
      shutter.skin = mode; shutter.count = 5;
    }
    const beforeVisible = m.blocks.filter(b => m.isBlockVisible(b)).map(b => b.id);
    g.dirty = true; g.scheduleFrame();
    return { mode, visible: beforeVisible, hidden: hidden.map(b => b.id), first: visible[0].id, finalIce: visible[1].id,
      shell: visible[2].id, locked: visible[3].id, bomb: visible[4].id, shutter: shutter.id, revised: m.revisedRules };
  }, mode);
  await p.waitForTimeout(40); return info;
}
function assertApplied(before, after, f) {
  const expectedTargets = [];
  for (const b of before.puzzle.blocks) {
    const got = after.puzzle.blocks.find(x => x.id === b.id); assert.ok(got);
    const affected = !f.revised || f.visible.includes(b.id);
    assert.equal(got.frozen, affected ? Math.max(0, b.frozen - 2) : b.frozen, `Block ${b.id}`);
    if (affected && b.frozen > 0) expectedTargets.push({ kind: 'block', id: b.id, previous: b.frozen, remaining: Math.max(0, b.frozen - 2) });
    assert.deepEqual(got.layers, b.layers, `Shell remains ${b.id}`); assert.equal(got.lockCount, b.lockCount, `Key remains ${b.id}`);
    if (b.timedBombSeconds != null) assert.ok(got.timedBombSeconds <= b.timedBombSeconds && got.timedBombSeconds > b.timedBombSeconds - 1,
      `Bomb only follows the natural clock across Pointer activation ${b.id}`);
  }
  for (const key of ['gates', 'flipDoors']) for (const b of before.puzzle[key]) {
    const got = after.puzzle[key].find(x => x.id === b.id); assert.equal(got.frozen, Math.max(0, b.frozen - 2));
    if (b.frozen > 0) expectedTargets.push({ kind: 'gate', id: b.id, previous: b.frozen, remaining: Math.max(0, b.frozen - 2) });
    if (key === 'flipDoors') assert.equal(got.open, b.open, 'Pulse thaws flip-door ice without toggling the door');
  }
  for (const b of before.puzzle.shutters) {
    const excluded = ['lift', 'staging', 'staged-frame'].includes(b.skin);
    assert.equal(after.puzzle.shutters.find(x => x.id === b.id).count, excluded ? b.count : Math.max(0, b.count - 2));
    if (!excluded && b.count > 0) expectedTargets.push({ kind: 'shutter', id: b.id, previous: b.count, remaining: Math.max(0, b.count - 2) });
  }
  const sorted = rows => rows.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
  assert.deepEqual(sorted(fx(after).targets.map(({ kind, id, previous, remaining }) => ({ kind, id, previous, remaining }))), sorted(expectedTargets),
    'Animation highlights only objects changed by this actual model operation');
  assert.equal(after.puzzle.moves, before.puzzle.moves); assert.equal(after.puzzle.cleared, before.puzzle.cleared);
  assert.equal(after.economy.boosters.pulse, before.economy.boosters.pulse - 1);
}
async function hold(p, hidden) {
  if (hidden) await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const before = await state(p); await p.waitForTimeout(450); const after = await state(p);
  assert.equal(fx(after).age, fx(before).age); assert.equal(after.puzzle.remainingSeconds, before.puzzle.remainingSeconds); assert.deepEqual(counters(after), counters(before));
  if (hidden) await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  return { before: compact(before), after: compact(after) };
}

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    const { context, p } = await prepare(viewport), row = { name: `normal-${viewport.width}`, images: [] }; report.scenarios.push(row);
    const f = await fixture(p), before = await state(p); await snap(p, row, 'before'); await resetAudit(p, true);
    await click(p, 'booster.pulse'); const immediate = await state(p); assertApplied(before, immediate, f); assert.ok(fx(immediate).visible);
    await finished(p); const ended = await state(p); assert.deepEqual(counters(ended), counters(immediate)); assert.equal(ended.economy.boosters.pulse, immediate.economy.boosters.pulse);
    await timelineImages(p, row);
    await snap(p, row, 'after'); const a = await audit(p);
    assert.ok(a.images.length > 2, 'Formal pulse sprite is actually drawn');
    assert.ok(a.arcs.length > 4, 'Actual expanding arcs are drawn');
    const iconCenters = a.images.map(r => ({ x: r.args[0] + r.args[2] / 2, y: r.args[1] + r.args[3] / 2 }));
    assert.ok(Math.max(...iconCenters.map(p => p.y)) - Math.min(...iconCenters.map(p => p.y)) > 50, 'Formal icon actually travels from the booster row');
    const waveFrames = new Map();
    for (const r of a.arcs.filter(r => r.fx.age > .76 && r.fx.age < .95 && Math.abs(r.args[4] - r.args[3] - Math.PI * 2) < .0001)) {
      const list = waveFrames.get(r.fx.age) ?? []; list.push(r.args[2]); waveFrames.set(r.fx.age, list);
    }
    assert.ok([...waveFrames.values()].some(radii => radii.length === 4), 'Two actual wave rings each draw their gradient disc and bright rim');
    assert.ok(a.frames.some(r => Math.hypot(r.fx.shake?.x ?? 0, r.fx.shake?.y ?? 0) > .05), 'Pulse has a light board response');
    const base = a.hud[0].m; for (const r of a.hud) assert.deepEqual(r.m, base, 'HUD stays fixed');
    const boosterBase = a.boosters[0].m; for (const r of a.boosters) assert.deepEqual(r.m, boosterBase, 'Booster row stays fixed');
    assert.ok(a.board.some(r => Math.hypot(r.m.e - base.e, r.m.f - base.f) > .05), 'Actual board matrix shakes');
    row.fixture = f; row.before = compact(before); row.immediate = compact(immediate); row.ended = compact(ended); row.audit = a; row.status = 'PASS';

    const pauseRow = { name: `pause-background-restart-${viewport.width}`, images: [] }; report.scenarios.push(pauseRow);
    await fixture(p); await click(p, 'booster.pulse'); const spent = (await state(p)).economy.boosters.pulse;
    await click(p, 'pause'); assert.equal((await state(p)).screen, 'paused'); pauseRow.paused = await hold(p, false); pauseRow.background = await hold(p, true);
    await click(p, 'pauseResume'); await click(p, 'booster.pulse'); assert.equal((await state(p)).economy.boosters.pulse, spent, 'Animation prevents a duplicate booster activation');
    await click(p, 'pause'); await click(p, 'pauseRestart'); await ready(p, 20); assert.ok(!fx(await state(p)).visible); assert.equal((await state(p)).economy.boosters.pulse, spent);
    await fixture(p); await click(p, 'booster.pulse'); await load(p, 21); assert.ok(!fx(await state(p)).visible, 'Loading another level clears presentation'); pauseRow.status = 'PASS';

    const excluded = { name: `excluded-and-invalid-${viewport.width}`, cases: [], images: [] }; report.scenarios.push(excluded);
    for (const skin of ['lift', 'staging', 'staged-frame']) {
      const info = await fixture(p, skin), pre = await state(p); await click(p, 'booster.pulse'); const post = await state(p);
      assert.deepEqual(counters(post), counters(pre)); assert.equal(post.economy.boosters.pulse, pre.economy.boosters.pulse); assert.ok(!fx(post).visible);
      excluded.cases.push({ skin, fixture: info, before: compact(pre), after: compact(post) });
    }
    excluded.status = 'PASS';

    const rescue = { name: `level10-rescue-${viewport.width}`, images: [] }; report.scenarios.push(rescue);
    await load(p, 10); await p.evaluate(() => {
      const g = window.__COLOR_ESCAPE__; g.model.startCountdown();
      // Explicit counter fixture without an earlier pulse; not a natural route.
      const boundary = g.model.snapshot();
      boundary.blocks.find(b => b.id === g.model.level.pulseRescue.targetBlockId).frozen = 1;
      g.model.restore(boundary); g.dirty = true; g.scheduleFrame();
    });
    await p.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().pulseRescueGuide.visible);
    const pre = await state(p), target = pre.level.pulseRescue.targetBlockId; assert.equal(pre.puzzle.blocks.find(b => b.id === target).frozen, 1);
    await click(p, 'booster.pulse'); const post = await state(p);
    assert.equal(post.puzzle.blocks.find(b => b.id === target).frozen, 0); assert.equal(post.economy.boosters.pulse, pre.economy.boosters.pulse);
    assert.equal(post.activeRun.boosterSpent.pulse, 1); assert.equal(post.pulseRescueGuide.visible, false);
    await p.waitForFunction(expected => window.__PULSE_TEST__.audit.drawCounts.at(-1)?.count === expected, pre.economy.boosters.pulse - 1);
    await snap(p, rescue, 'pulse'); await clickBlock(p, target); const tapped = await state(p); assert.ok(!fx(tapped).visible, 'Board Pointer can end presentation immediately');
    assert.equal(tapped.pulseRescueGuide.visible, false); await load(p, 10); assert.equal((await state(p)).activeRun?.boosterSpent.pulse ?? 0, 0);
    rescue.before = compact(pre); rescue.after = compact(post); rescue.tapped = compact(tapped); rescue.status = 'PASS';
    assert.deepEqual(await p.evaluate(() => window.__PULSE_TEST__.violations), []); await context.close();

    const reduced = await prepare(viewport, true), r = { name: `reduced-${viewport.width}`, images: [] }; report.scenarios.push(r);
    const rf = await fixture(reduced.p), rb = await state(reduced.p); await resetAudit(reduced.p); await click(reduced.p, 'booster.pulse'); const ra = await state(reduced.p);
    assertApplied(rb, ra, rf); await snap(reduced.p, r, 'feedback'); await finished(reduced.p); const raudit = await audit(reduced.p);
    assert.equal(raudit.images.length, 0, 'Reduced motion has no travelling sprite');
    assert.ok(raudit.frames.every(v => (v.fx.shake?.x ?? 0) === 0 && (v.fx.shake?.y ?? 0) === 0));
    r.before = compact(rb); r.after = compact(ra); r.audit = raudit; r.status = 'PASS'; assert.deepEqual(await reduced.p.evaluate(() => window.__PULSE_TEST__.violations), []); await reduced.context.close();
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (e) {
  report.status = 'FAIL'; report.failure = e.stack ?? String(e); process.exitCode = 1;
  if (activePage && !activePage.isClosed()) {
    report.lastState = await state(activePage).catch(() => null); report.lastAudit = await audit(activePage).catch(() => null);
    await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  }
} finally {
  report.finalSourceBindings = await sources(); report.finalBuild = await build();
  report.sourceStable = JSON.stringify(report.sourceBindings) === JSON.stringify(report.finalSourceBindings);
  report.buildStable = JSON.stringify(report.build) === JSON.stringify(report.finalBuild);
  if (!report.sourceStable || !report.buildStable) { report.status = 'FAIL_BINDING_CHANGED'; process.exitCode = 1; }
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); await new Promise(resolveClose => server.httpServer.close(resolveClose));
}
console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.length, errors: report.errors.length,
  failure: report.failure, sourceStable: report.sourceStable, buildStable: report.buildStable, output }, null, 2));
