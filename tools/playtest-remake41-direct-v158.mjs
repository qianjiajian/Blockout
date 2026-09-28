import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { loadApi, BASELINE, OUTPUT, checkCandidate, ruleGate, VERSION } from './remake41-direct-v158.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { pointerCorners } from './remake41to50-pointer-path-v146.mjs';

ruleGate();
const candidateOnly = process.env.CANDIDATE_ONLY === '1';
const file = process.argv[2];
assert(file, 'Usage: node tools/playtest-remake41-direct-v158.mjs CANDIDATE.json');
const viewport = { width: Number(process.env.REMAKE_VIEWPORT_WIDTH ?? 496), height: Number(process.env.REMAKE_VIEWPORT_HEIGHT ?? 1078) };
const data = JSON.parse(fs.readFileSync(file));
const baseline = JSON.parse(fs.readFileSync(BASELINE));
const { api } = await loadApi();
const checked = checkCandidate(data, baseline, api);
const level = data.level, drags = data.drags;
const spatial = s => JSON.parse(JSON.stringify(Object.fromEntries(['blocks', 'gates', 'shutters', 'generators', 'queuedBlocks', 'cleared', 'complete', 'failed', 'timeFreezeSeconds'].map(k => [k, s[k]]))));
const expected = drags.map((_, i) => { const r = api.replayRevisedRoute(level, drags.slice(0, i + 1)); assert(r.valid, r.error); return spatial(JSON.parse(r.finalStateKey)); });
const bindings = {};
const bind = p => { const rel = path.relative(process.cwd(), path.resolve(p)).replaceAll('\\', '/'); if (rel.startsWith('../') || path.isAbsolute(rel) || bindings[rel]) return; bindings[rel] = digest(fs.readFileSync(p)); };
for (const p of ['src/core/levels.ts', 'src/core/remake41to50.ts', 'src/core/PuzzleModel.ts', 'src/game/ColorEscapeGame.ts', 'tools/remake41to50-browser.mjs', 'tools/remake41to50.html', file]) bind(p);
const output = path.resolve(OUTPUT, `pointer-${Date.now()}`); fs.mkdirSync(output, { recursive: true });
const report = { status: 'running', ruleVersion: VERSION, candidateOnly, formalDataValidated: !candidateOnly, adoptionBasis: 'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED', lowerBound: null, lowerBoundValidated: false, difficultyCertified: false, viewport, naturalClock: true, clockFrozen: false, playerSaveTouched: false, releaseApproved: false, bindings, rows: [], errors: [] };
const server = await createServer({ root: process.cwd(), configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`; const browser = await chromium.launch({ headless: true });
let page;
try {
  page = await browser.newPage({ viewport });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(() => { window.__STORAGE_VIOLATIONS__ = []; for (const m of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[m] = function () { window.__STORAGE_VIOLATIONS__.push(m); throw Error('Persistent storage forbidden'); }; for (const m of ['open', 'deleteDatabase']) indexedDB[m] = function () { window.__STORAGE_VIOLATIONS__.push(m); throw Error('Persistent database forbidden'); }; });
  await page.goto(`${origin}/tools/remake41to50.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__?.storageBaselineReady, undefined, { timeout: 60000 });
  const entry = await page.evaluate(({ id, overlay }) => { const e = window.__REMAKE_FORMAL__.load(id, overlay); window.__COLOR_ESCAPE__.model.freezeTime = () => { throw Error('No time booster in verification'); }; return e; }, { id: 41, overlay: candidateOnly ? level : null });
  assert.deepEqual(entry.level, level); assert.equal(entry.formalObjectIdentity, true); assert.equal(entry.candidateOverlay, candidateOnly);
  await page.evaluate(() => { const game = window.__COLOR_ESCAPE__, original = game.drawFormalWholeBlockAt.bind(game); window.__NATIVE_DRAW_AUDIT__ = { calls: 0, rotated: 0, canvasRotationCalls: 0 }; game.drawFormalWholeBlockAt = function (image, match, ...args) { const a = window.__NATIVE_DRAW_AUDIT__; a.calls++; if (match.quarterTurns !== 0) a.rotated++; const rotate = game.ctx.rotate; game.ctx.rotate = function (angle) { if (angle !== 0) a.canvasRotationCalls++; return rotate.call(this, angle); }; try { return original(image, match, ...args); } finally { game.ctx.rotate = rotate; } }; });
  const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const stable = () => page.waitForFunction(() => { const g = window.__COLOR_ESCAPE__, d = g?.getDebugState(); return d?.puzzle?.started && !g.revisedArtLoading && d.art.formalGameplay.missingWholeBlockIds.length === 0 && !g.hasInitialRevisedRegionPresentation() && !g.hasActiveMechanicMotion() && !d.exitAnimations.length && !d.revisedMechanismAnimations.length && !d.generatorSpawnAnimations.length; }, undefined, { timeout: 20000 });
  await stable(); const initial = await state(); const row = { id: 41, candidate: file, levelSha256: digest(level), routeSha256: digest(drags), formalObjectIdentity: !candidateOnly, candidateOverlay: candidateOnly, lowerBound: null, lowerBoundValidated: false, difficultyCertified: false, status: 'running', steps: [], opening: initial.puzzle };
  assert.deepEqual(initial.starTargets, baseline.levels[40].starTargets); assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds, []); report.rows.push(row); await page.screenshot({ path: path.join(output, 'lv41-opening.png') });
  const beforeClock = (await state()).puzzle.remainingSeconds; await page.waitForTimeout(220); const afterClock = (await state()).puzzle.remainingSeconds; assert(afterClock < beforeClock); row.naturalClockProbe = { before: beforeClock, after: afterClock };
  for (const [index, drag] of drags.entries()) {
    await stable(); const s = await state(), before = s.puzzle, b = before.blocks.find(x => x.id === drag.blockId); assert(b && !before.failed, `step ${index + 1} block/time`); const rect = await page.locator('canvas').boundingBox(); assert(rect); const [gx, gy] = b.shape[0], t = s.viewportTransform; const move = async (x, y) => page.mouse.move(rect.x + t.offsetX + (s.board.innerX + x * s.board.cell) * t.scale, rect.y + t.offsetY + (s.board.innerY + y * s.board.cell) * t.scale, { steps: 1 }); await move(b.x + gx + .5, b.y + gy + .5); await page.mouse.down(); for (const [x, y] of pointerCorners([b.x, b.y], drag.path)) await move(x + gx + .5, y + gy + .5); if (drag.exitSide) { const [x, y] = drag.path.at(-1) ?? [b.x, b.y], [dx, dy] = { left: [-.8, 0], right: [.8, 0], top: [0, -.8], bottom: [0, .8] }[drag.exitSide]; await move(x + gx + .5 + dx, y + gy + .5 + dy); } await page.mouse.up(); await stable(); const after = (await state()).puzzle; assert.deepEqual(spatial(after), expected[index], `step ${index + 1} state`); assert.equal(after.moves, before.moves + 1); row.steps.push({ step: index + 1, blockId: drag.blockId, clears: after.cleared - before.cleared, moves: after.moves, remainingSeconds: after.remainingSeconds }); }
  const final = (await state()).puzzle; assert(final.complete && !final.failed && final.remainingSeconds > 0); assert.deepEqual(await page.evaluate(() => window.__STORAGE_VIOLATIONS__), []); row.final = final; row.nonClearingDrags = row.steps.filter(s => s.clears === 0).length; row.nativeDrawAudit = await page.evaluate(() => window.__NATIVE_DRAW_AUDIT__); assert(row.nativeDrawAudit.calls > 0); assert.equal(row.nativeDrawAudit.rotated, 0); assert.equal(row.nativeDrawAudit.canvasRotationCalls, 0); row.status = 'PASS'; await page.screenshot({ path: path.join(output, 'lv41-complete.png') }); report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.error = String(error.stack ?? error); process.exitCode = 1; } finally { await browser.close(); await server.close(); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ output, status: report.status, error: report.error }));
