import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { verifyRulesLock } from './verify-rules-lock.mjs';

// Reproduce a REJECTION on the exact user-approved visual draft. This does not
// bypass the still-unmigrated release certificate pipeline or write any level.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'deliverables/revised-opening-layouts-lv021-030-2026-09-21T15-22-04-725Z/review.json';
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(verifyRulesLock().activeVersion, '1.4.0');
assert(verifyRulesLock().ok);
const bytes = await readFile(path.join(root, source));
const review = JSON.parse(bytes);
const row = review.rows.find(r => r.levelId === 21);
assert.equal(review.ruleVersion, '1.4.0');
const files = { ...review.bindings, [source]: { sha256: sha(bytes) } };
for (const p of ['tools/playtest-revised-layout-lv21-blocker.mjs', 'tools/revised-candidate-route.html', 'tools/revised-candidate-route-browser.mjs']) {
  files[p] = { sha256: sha(await readFile(path.join(root, p))) };
}
async function unchanged() { for (const [p, b] of Object.entries(files)) assert.equal(sha(await readFile(path.join(root, p))), b.sha256, `Input changed: ${p}`); }
await unchanged();
const output = path.join(root, 'playtest-results/experiments/approved-layout-lv21-blocker', new Date().toISOString().replaceAll(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
const errors = [], actions = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.__STORAGE_CALLS__ = [];
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = function() { window.__STORAGE_CALLS__.push(method); throw Error('No persistent saves in layout diagnosis'); };
  for (const method of ['open', 'deleteDatabase']) indexedDB[method] = function() { window.__STORAGE_CALLS__.push(method); throw Error('No persistent databases in layout diagnosis'); };
});
const report = { kind: 'approved-layout-deadlock-reproduction', source, ruleVersion: '1.4.0', levelSha256: sha(JSON.stringify(row.level)),
  layoutApprovedByUser: true, fullCandidateValidated: false, spatialWitness: false, lowerBoundCertified: false,
  timeValidated: false, gameplayAccepted: false, releaseApproved: false, files, actions, errors };
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stable = () => page.waitForFunction(() => {
  const s = window.__COLOR_ESCAPE__?.getDebugState();
  return s?.puzzle?.started && !s.generatorSpawnAnimations.length && !s.revisedMechanismAnimations.length && !s.exitAnimations.length;
}, undefined, { timeout: 20000 });
const spatial = s => { const { moves, remainingSeconds, started, autonomousStarted, ...r } = s; return JSON.parse(JSON.stringify(r)); };
async function move(x, y) {
  const p = await page.evaluate(({ x, y }) => {
    const s = window.__COLOR_ESCAPE__.getDebugState(), c = document.querySelector('canvas').getBoundingClientRect(), t = s.viewportTransform;
    return { x: c.left + t.offsetX + (s.board.innerX + x * s.board.cell) * t.scale, y: c.top + t.offsetY + (s.board.innerY + y * s.board.cell) * t.scale };
  }, { x, y });
  await page.mouse.move(p.x, p.y, { steps: 5 });
}
async function capture(name) {
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  const s = (await state()).puzzle; actions.push({ name, snapshot: s }); return s;
}
try {
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/revised-candidate-route.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__REVISED_CANDIDATE_ROUTE__, undefined, { timeout: 60000 });
  await page.evaluate(level => {
    window.__REVISED_CANDIDATE_ROUTE__.load({ levelId: level.id, ruleVersion: '1.4.0', level });
    document.querySelector('#status').textContent = '第21关已认可布局：死锁复现\n内存存档，非正式地图';
  }, row.level);
  await page.waitForFunction(() => {
    const s = window.__COLOR_ESCAPE__.getDebugState();
    return s.art.ready && s.art.revisedMechanisms.ready && !s.art.formalGameplay.requestedIceSignature;
  }, undefined, { timeout: 60000 });
  await stable();
  const initial = await capture('00-opening'); assert.equal(initial.cleared, 0);
  await move(.5, 4.5); await page.mouse.down(); await move(-.3, 4.5); await page.mouse.up(); await stable();
  const first = await capture('01-red-cleared');
  assert.equal(first.cleared, 1); assert(!first.blocks.some(b => b.id === 'a06'));
  await move(.5, 5.5); await page.mouse.down(); await move(.5, 4.5); await page.mouse.up(); await stable();
  const up = await capture('02-blue-up');
  assert.equal(up.blocks.find(b => b.id === 'a14').y, 4); assert.equal(up.cleared, 1);
  // Attempts to move farther up or right are actually rejected by the game.
  for (const [x, y] of [[.5, 3.5], [1.5, 4.5]]) {
    await move(.5, 4.5); await page.mouse.down(); await move(x, y); await page.mouse.up(); await stable();
    assert.deepEqual(spatial((await state()).puzzle), spatial(up));
  }
  await move(.5, 4.5); await page.mouse.down(); await move(.5, 5.5); await page.mouse.up(); await stable();
  const down = await capture('03-blue-back');
  assert.deepEqual(spatial(down), spatial(first)); assert.equal(down.complete, false);
  assert.deepEqual(down.gates.filter(g => g.frozen > 0).map(g => g.frozen).sort((a,b) => a-b), [1, 5, 12]);
  assert.deepEqual(down.shutters.map(s => s.count), [9, 16, 18]);
  report.storageCalls = await page.evaluate(() => window.__STORAGE_CALLS__);
  assert.deepEqual(report.storageCalls, []); assert.deepEqual(errors, []);
  await unchanged(); report.status = 'deadlock-cycle-reproduced'; report.pointerDiagnosticPassed = true;
} catch (error) {
  report.status = 'diagnostic-failed'; report.error = error.stack ?? String(error); process.exitCode = 1;
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  await browser.close(); await server.close();
}
console.log(JSON.stringify({ output, status: report.status, error: report.error, releaseApproved: false }, null, 2));
