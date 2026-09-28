import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { verifyRulesLock } from './verify-rules-lock.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';

// Scoped layout-repair review, NOT the release-artifact pipeline. Requires a
// fresh replay before rendering, leaves difficulty/time/acceptance gates shut.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [candidatePath, routePath, difficultyPath] = process.argv.slice(2);
assert(candidatePath && routePath, 'Usage: node tools/review-revised-lv21-repair.mjs candidate.json route.json');
const originalPath = 'deliverables/revised-opening-layouts-lv021-030-2026-09-21T15-22-04-725Z/review.json';
const approvalPath = 'docs/level-generation/reviews/layout-approval-lv021-030-v140.json';
const sha = v => createHash('sha256').update(v).digest('hex');
const readJson = async p => JSON.parse(await readFile(path.resolve(root, p), 'utf8'));
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const hashObject = v => sha(JSON.stringify(canonical(v)));
const lock = verifyRulesLock();
assert(lock.ok && lock.activeVersion === '1.4.0');
const original = await readJson(originalPath), row = original.rows.find(r => r.levelId === 21);
const approval = await readJson(approvalPath);
assert.equal(sha(await readFile(path.join(root, originalPath))), approval.sourceReviewSha256);
assert.equal(hashObject(row.level), approval.levelHashes.find(r => r.levelId === 21).canonicalLevelSha256);
const raw = await readJson(candidatePath), level = raw.level ?? raw;
const rawRoute = await readJson(routePath), drags = Array.isArray(rawRoute) ? rawRoute : rawRoute.drags ?? rawRoute.search?.drags ?? rawRoute.result?.drags;
assert(Array.isArray(drags) && drags.length);
assert.equal(level.id, 21);
assert.equal(level.mechanismRules, 'revised-2026-09-21-v1.2');
assert.equal(level.difficulty, 'normal');
assert.equal(level.width, row.level.width);
assert.equal(level.height, row.level.height);
assert.deepEqual([...level.playable].sort(), [...row.level.playable].sort(), 'Approved outline must not change');
const files = { ...original.bindings };
async function bind(p) {
  const digest = sha(await readFile(path.resolve(root, p)));
  if (files[p]) assert.equal(files[p].sha256, digest, `Existing binding changed: ${p}`);
  else files[p] = { sha256: digest };
}
const beforeImagePath = `${path.dirname(originalPath).replaceAll('\\', '/')}/boards/level-021.png`;
for (const p of [originalPath, approvalPath, beforeImagePath, candidatePath, routePath, 'tools/review-revised-lv21-repair.mjs', 'tools/revised-opening-coverage.mjs', 'tools/revised-candidate-route.html', 'tools/revised-candidate-route-browser.mjs']) await bind(p);
const difficultyReview = difficultyPath ? await readJson(difficultyPath) : null;
if (difficultyReview) {
  await bind(difficultyPath);
  assert.equal(difficultyReview.candidateSha256, hashObject(level));
  assert(!difficultyReview.shortcutReplay?.valid || !difficultyReview.shortcutReplay.complete || difficultyReview.shortcutReplay.nonClearingDrags >= 10, 'Independent known below-floor route');
}
async function bindTree(dir) {
  for (const e of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) await bindTree(p);
    else await bind(p);
  }
}
async function unchanged() {
  for (const [p, b] of Object.entries(files)) assert.equal(sha(await readFile(path.resolve(root, p))), b.sha256, `Input changed: ${p}`);
}
await unchanged();
await bindTree('src');
await unchanged();
const bundle = await build({ absWorkingDir: root, stdin: { contents: 'export {PuzzleModel} from "./src/core/PuzzleModel.ts"; export {auditRevisedCandidate} from "./src/core/revisedCandidateAudit.ts"; export {replayRevisedRoute} from "./src/core/revisedLevelSearch.ts"; export {auditCandidateBlockArt} from "./tools/revised-candidate-block-art.mjs";', resolveDir: root, sourcefile: 'repair-review-entry.mjs' }, bundle: true, format: 'esm', platform: 'node', write: false, metafile: true });
await unchanged();
const core = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
for (const p of Object.keys(bundle.metafile.inputs)) if (p !== 'repair-review-entry.mjs') await bind(p);
const audit = core.auditRevisedCandidate(level, row.sourceContract);
assert.deepEqual(audit.issues, [], 'Common static inventory/geometry checks');
const coverage = auditOpeningCoverage(new core.PuzzleModel(level).snapshot());
assert(coverage.passed && coverage.coveredCells === 50, JSON.stringify(coverage));
const iceShell = blocks => blocks.filter(b => b.frozen > 0).map(b => `${b.frozen}:${(b.layers?.length ?? 0) > 1}`).sort();
assert.deepEqual(iceShell(level.blocks), iceShell(row.level.blocks), 'Numeric ice/shell pairing');
for (const g of level.gates) assert(level.blocks.some(b => (b.layers ?? [b.color]).includes(g.color)), `Empty gate ${g.id}`);
const art = core.auditCandidateBlockArt(level);
assert.deepEqual(art.issues, []);
for (const r of art.requirements) await bind(`public/${r.path}`);
const replay = core.replayRevisedRoute(level, drags);
assert(replay.valid && replay.complete, JSON.stringify(replay));
assert(replay.nonClearingDrags >= 10, 'Known below-floor solution: do not present this as the requested repaired layout');
const differences = [];
for (const collection of ['blocks', 'gates', 'shutters']) for (const item of level[collection] ?? []) {
  const prior = row.level[collection]?.find(x => x.id === item.id);
  if (hashObject(item) !== hashObject(prior ?? null)) differences.push({ collection, id: item.id, before: prior, after: item });
}
for (const collection of ['blocks', 'gates', 'shutters']) for (const prior of row.level[collection] ?? []) if (!(level[collection] ?? []).some(x => x.id === prior.id)) differences.push({ collection, id: prior.id, before: prior, after: null });
const relative = `deliverables/revised-lv021-local-repair-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`;
const output = path.join(root, relative);
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'before.png'), await readFile(path.join(root, beforeImagePath)), { flag: 'wx' });
await writeFile(path.join(output, 'candidate.json'), JSON.stringify({ levelId: 21, ruleVersion: '1.4.0', previewOnly: true, level }, null, 2) + '\n', { flag: 'wx' });
await writeFile(path.join(output, 'route.json'), JSON.stringify({ candidateSha256: hashObject(level), drags, replay }, null, 2) + '\n', { flag: 'wx' });
const errors = [], actions = [];
const report = { schemaVersion: 'lv21-local-repair-review-v1', originalPath, originalLevelSha256: hashObject(row.level), candidateSha256: hashObject(level), ruleVersion: '1.4.0', files, level, differences,
  audit, coverage, art, replay, difficultyReview, drags, actions, errors, spatialWitness: true, pointerReplayValidated: false, lowerBoundCertified: false, timeValidated: false,
  sourceFirstIntroductionCertified: false, fullCandidateValidated: false, layoutApprovedByUser: false, gameplayAccepted: false, releaseApproved: false };
const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.__REPAIR_STORAGE__ = [];
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = function() { window.__REPAIR_STORAGE__.push(method); throw Error('No save access in candidate review'); };
  for (const method of ['open', 'deleteDatabase']) indexedDB[method] = function() { window.__REPAIR_STORAGE__.push(method); throw Error('No database access in candidate review'); };
});
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stable = () => page.waitForFunction(() => {
  const d = window.__COLOR_ESCAPE__?.getDebugState();
  return d?.puzzle?.started && !d.generatorSpawnAnimations.length && !d.revisedMechanismAnimations.length && !d.exitAnimations.length;
}, undefined, { timeout: 20000 });
const spatial = s => { const { moves, remainingSeconds, autonomousStarted, ...r } = s; return JSON.parse(JSON.stringify(r)); };
async function move(x, y) {
  const p = await page.evaluate(({ x, y }) => {
    const d = window.__COLOR_ESCAPE__.getDebugState(), c = document.querySelector('canvas').getBoundingClientRect(), t = d.viewportTransform;
    return { x: c.left + t.offsetX + (d.board.innerX + x * d.board.cell) * t.scale, y: c.top + t.offsetY + (d.board.innerY + y * d.board.cell) * t.scale };
  }, { x, y });
  await page.mouse.move(p.x, p.y, { steps: 3 });
}
try {
  await page.goto(`${origin}/tools/revised-candidate-route.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__REVISED_CANDIDATE_ROUTE__, undefined, { timeout: 60000 });
  await page.evaluate(level => {
    window.__REVISED_CANDIDATE_ROUTE__.load({ levelId: 21, ruleVersion: '1.4.0', level });
    document.querySelector('#status').textContent = '第21关局部修复 · 隔离验证\n非正式地图，难度/时间未批准';
  }, level);
  await page.waitForFunction(requirements => {
    const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
    return d?.art.ready && d.art.revisedMechanisms.ready && !d.art.formalGameplay.requestedIceSignature && !d.art.formalGameplay.iceError && requirements.every(({ color, kind, shapeId }) => {
      const img = g.art.formalBlocks?.[color]?.[kind]?.[shapeId]; return img && (img.naturalWidth || img.width) > 0;
    });
  }, art.requirements, { timeout: 60000 });
  await stable();
  const initial = await state();
  assert.deepEqual(auditOpeningCoverage(initial.puzzle), coverage);
  assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds, []);
  const clip = await page.evaluate(() => {
    const d = window.__COLOR_ESCAPE__.getDebugState(), b = d.board, t = d.viewportTransform, c = document.querySelector('canvas').getBoundingClientRect();
    return { x: c.left + t.offsetX + (b.innerX - b.cell * .68) * t.scale, y: c.top + t.offsetY + (b.innerY - b.cell * .68) * t.scale,
      width: (b.innerWidth + b.cell * 1.36) * t.scale, height: (b.innerHeight + b.cell * 1.36) * t.scale };
  });
  await page.screenshot({ path: path.join(output, 'after.png'), clip });
  await page.screenshot({ path: path.join(output, 'opening-full.png') });
  for (let index = 0; index < drags.length; index++) {
    await stable();
    const drag = drags[index], before = (await state()).puzzle, block = before.blocks.find(b => b.id === drag.blockId);
    assert(block, `Missing block at drag ${index}`);
    const [gx, gy] = block.shape[0];
    await move(block.x + gx + .5, block.y + gy + .5); await page.mouse.down();
    for (let step = 0; step < drag.path.length; step++) {
      const [x, y] = drag.path[step]; await move(x + gx + .5, y + gy + .5);
      const s = (await state()).puzzle, actual = s.blocks.find(b => b.id === block.id);
      if (s.cleared === before.cleared) assert.deepEqual(actual && [actual.x, actual.y], [x, y], `Pointer drag ${index}, step ${step}`);
      else assert(step === drag.path.length - 1 && drag.exitSide, `Premature exit at drag ${index}`);
    }
    if (drag.exitSide) {
      const [x, y] = drag.path.at(-1) ?? [block.x, block.y], [dx, dy] = { left: [-.8, 0], right: [.8, 0], top: [0, -.8], bottom: [0, .8] }[drag.exitSide];
      await move(x + gx + .5 + dx, y + gy + .5 + dy);
    }
    await page.mouse.up(); await stable();
    const after = (await state()).puzzle, expected = core.replayRevisedRoute(level, drags.slice(0, index + 1));
    assert(expected.valid, expected.error);
    assert.deepEqual(spatial(after), spatial(JSON.parse(expected.finalStateKey)), `Pointer independent replay drag ${index}`);
    assert.equal(after.moves, before.moves + 1);
    actions.push({ index, blockId: block.id, clearDelta: after.cleared - before.cleared, nonClearing: after.cleared === before.cleared, moves: after.moves });
    if (index === 2 || after.shutters.some((s, i) => s.revealed && !before.shutters[i].revealed)) await page.screenshot({ path: path.join(output, `step-${String(index + 1).padStart(3, '0')}.png`) });
    console.log(`Pointer ${index + 1}/${drags.length}: ${block.id}, clears=${after.cleared}`);
  }
  const final = (await state()).puzzle;
  assert(final.complete && !final.failed);
  assert.equal(final.moves, replay.effectiveDrags);
  assert.equal(actions.filter(a => a.nonClearing).length, replay.nonClearingDrags);
  report.storageCalls = await page.evaluate(() => window.__REPAIR_STORAGE__);
  assert.deepEqual(report.storageCalls, []); assert.deepEqual(errors, []);
  report.pointerReplayValidated = true; report.status = 'layout-repair-route-verified-only';
  await page.screenshot({ path: path.join(output, 'complete.png') });
  const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第21关 · 局部修复核对</title><style>
  :root{--bg:#14112e;--panel:#242048;--ink:#f9f0d5;--gold:#e9be65;--muted:#c4bee8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "Microsoft YaHei",sans-serif}header,footer{padding:24px 36px}small{color:var(--gold);letter-spacing:2px}h1{margin:8px 0}p{margin:10px 0;color:var(--muted)}main{display:grid;grid-template-columns:1fr 1fr;gap:22px;padding:0 36px}section{background:var(--panel);border:1px solid #514674;border-radius:18px;padding:16px;text-align:center}h2{font-size:23px;margin:0 0 12px}img{width:100%;height:640px;object-fit:contain}a{color:var(--gold)}.bad{color:#ffb3b3}.good{color:#a3e9c2}.notice{border-left:3px solid var(--gold);padding:4px 14px}details{text-align:left;color:var(--muted)}@media(max-width:700px){header,footer{padding:20px}main{padding:0 20px;grid-template-columns:1fr}img{height:560px}h1{font-size:25px}}</style>
  <header><small>BLOCK OUT! / LEVEL 21 · LOCAL REPAIR</small><h1>第21关 · 局部修复核对</h1><p>棋盘轮廓不变：6 × 9 / 50格 · 开局14块 / 全关24块 · 色块＋真实卷帘满铺100%</p><p>机制配额不变：普通门2、冰门2 / 6 / 13；卷帘10 / 17 / 19；冰块6 / 2、外壳4。</p></header>
  <main><section><h2>原认可草案 B</h2><img src="before.png" alt="原第21关布局"><p class="bad">红条消除后陷入上下往返，不能通关</p></section><section><h2>局部调整候选 C</h2><img src="after.png" alt="第21关局部调整后的开局"><p class="good">模型与真实拖动均完成通关</p><p>该路线 ${replay.effectiveDrags} 次有效拖动，其中 ${replay.nonClearingDrags} 次不消除/不剥层</p></section></main>
  <footer><p class="notice">请核对新摆放。本图仍是隔离候选，未替换正式关卡。路线腾挪次数不是最少必要次数；普通关≥10下界、时间和三星尚未认证，不能视为难度合格或正式发布。</p><p>本次重排下部9块；6层冰保留，调整至左侧10次卷帘内，显露前不减数。2层冰仍与外壳同体。${difficultyReview ? '独立下界搜索已达15,000状态预算，结果未知，不按通过处理。' : ''}</p><p>实际变化：${differences.filter(d => d.collection === 'blocks').length} 个色块记录、${differences.filter(d => d.collection === 'gates').length} 个出口、${differences.filter(d => d.collection === 'shutters').length} 道卷帘。<a href="review.json">查看逐项数据与验证记录</a> · <a href="comparison.png">打开对比大图</a> · <a href="complete.png">通关截图</a></p><details><summary>逐项差异（ID与数据）</summary><pre>${escape(JSON.stringify(differences, null, 2))}</pre></details></footer></html>`;
  await writeFile(path.join(output, 'index.html'), html, { flag: 'wx' });
  const design = await browser.newPage({ viewport: { width: 1300, height: 1150 } });
  await design.goto(`${origin}/${relative}/index.html`, { waitUntil: 'networkidle' });
  await design.screenshot({ path: path.join(output, 'comparison.png'), fullPage: true });
  await design.setViewportSize({ width: 390, height: 844 });
  assert(await design.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow');
  await unchanged();
} catch (error) {
  report.status = 'review-failed'; report.error = error.stack ?? String(error); process.exitCode = 1;
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
} finally {
  await writeFile(path.join(output, 'review.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  await browser.close(); await server.close();
}
console.log(JSON.stringify({ output: relative, status: report.status, error: report.error, pointerReplayValidated: report.pointerReplayValidated, lowerBoundCertified: false, releaseApproved: false }, null, 2));
