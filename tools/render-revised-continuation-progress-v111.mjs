import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { digest } from './revised-preview-validation-v160.mjs';
import { verifyContinuationBatchV111 } from './revised-continuation-families-v111.mjs';

// Require one complete fresh UI run of every v1.11 addition. Historical v1.10
// evidence is linked with its original version, never relabelled as a new run.
const [archivePath, archiveSha, uiPath, uiSha] = process.argv.slice(2);
assert(archivePath && archiveSha && uiPath && uiSha, 'Pass ARCHIVE SHA UI_REPORT SHA');
const sha = p => digest(fs.readFileSync(p));
const read = (p, h) => { assert.equal(sha(p), h, `Changed evidence: ${p}`); return JSON.parse(fs.readFileSync(p)); };
const archive = read(archivePath, archiveSha), ui = read(uiPath, uiSha);
const checked = await verifyContinuationBatchV111(archivePath, archiveSha);
assert.equal(ui.ruleVersion, '1.11.0'); assert.equal(ui.status, 'passed');
assert.deepEqual(ui.ids, archive.rows.map(r => r.levelId));
assert.equal(ui.archiveSha256, archiveSha); assert.equal(ui.passed, ui.ids.length);
assert.equal(ui.naturalClock, true); assert.equal(ui.clockFrozen, false);
assert.deepEqual(ui.errors, []); assert.deepEqual(ui.forbiddenStorage, []);
const self = 'tools/render-revised-continuation-progress-v111.mjs';
const bindings = { ...checked.inputs, [self]: sha(self), [uiPath]: uiSha, [archivePath]: archiveSha };
for (const [p, b] of Object.entries(ui.files)) { assert.equal(sha(p), b.sha256, `UI snapshot drift: ${p}`); bindings[p] = b.sha256; }
const historical = 'deliverables/revised-formal-progress-v110-2026-09-22T15-45-32-632Z/index.html';
assert(fs.existsSync(historical)); bindings[historical] = sha(historical);
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const out = `deliverables/revised-formal-progress-v111-${stamp}`;
fs.mkdirSync(path.join(out, 'boards'), { recursive: true });
fs.mkdirSync(path.join(out, 'reference'));
const rows = [];
for (const row of checked.rows) {
  const actual = ui.rows.find(r => r.levelId === row.levelId);
  assert(actual?.complete && actual.pointerReplayValidated && actual.observedTiming?.passed && actual.observedTiming.wholeModelReplay);
  assert(actual.remainingSeconds > 0 && actual.gateRenderAudit.passed && actual.coverage.passed && actual.span.passed && actual.artPassed);
  assert.equal(actual.formalLevelSha256, row.formalLevelSha256);
  assert.deepEqual(actual.approvedDifferences, row.approvedDifferences);
  const name = `level-${String(row.levelId).padStart(3, '0')}`, image = `${name}-board.png`;
  const sourceImage = path.join(path.dirname(uiPath), image);
  assert.equal(sha(sourceImage), ui.outputFiles[image].sha256); bindings[sourceImage] = sha(sourceImage);
  fs.copyFileSync(sourceImage, path.join(out, 'boards', `${name}.png`));
  const reference = `reference/${name}${path.extname(row.sourceFrame)}`;
  bindings[row.sourceFrame] = sha(row.sourceFrame); fs.copyFileSync(row.sourceFrame, path.join(out, reference));
  const complete = { ...row, formal: true, pointerReplayValidated: true, naturalClockValidated: true,
    renderVerified: true, timeValidated: true, retainedTimeSeconds: actual.metadata.timeSeconds,
    retainedStarTargets: actual.metadata.actualStarTargets, remainingSeconds: actual.remainingSeconds,
    image: `boards/${name}.png`, reference, uiReport: { path: uiPath, sha256: uiSha },
    lowerBoundCertified: false, timeAndStarsCalibrated: false, releaseApproved: false };
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(complete, null, 2) + '\n', { flag: 'wx' });
  rows.push(complete);
}
const formalIds = new Set(checked.formalIds), byId = new Map(rows.map(r => [r.levelId, r]));
const all = Array.from({ length: 180 }, (_, i) => {
  const id = i + 21;
  return { levelId: id, status: byId.has(id) ? 'new-formal' : formalIds.has(id) ? 'inherited-formal' : 'pending',
    ...(byId.has(id) ? { detail: `level-${String(id).padStart(3, '0')}.json` } : {}) };
});
const counts = { gameTotal: 200, preservedEarlyLevels: 20, requested: 180, newFormal: rows.length,
  inheritedFormal: 82, totalFormal: formalIds.size, remaining: 180 - formalIds.size };
assert.equal(counts.totalFormal, counts.inheritedFormal + counts.newFormal);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const difference = r => r.approvedDifferences.length ? r.approvedDifferences.map(d => `${esc(d.field)}：${esc(JSON.stringify(d.sourceValue))} → ${esc(JSON.stringify(d.designValue))}`).join('<br>') : '未产生数量重配差异';
const cards = rows.map(r => `<article id="level-${r.levelId}"><h2>第${r.levelId}关</h2><div class="pair"><figure><img src="${r.reference}" alt="竞品第${r.levelId}关"><figcaption>竞品来源帧</figcaption></figure><figure><img src="${r.image}" alt="正式第${r.levelId}关"><figcaption>当前正式开局</figcaption></figure></div><p class="pass">正式接入 · 真实拖动通关 · 满铺／每色唯一／门宽通过</p><p>${r.drags.length}次拖动；保留原总时限${r.retainedTimeSeconds}秒，实操完成剩余${r.remainingSeconds.toFixed(1)}秒。</p><details><summary>本游戏规则优先的最小重配</summary><p class="differences">${difference(r)}</p></details><p><a href="level-${String(r.levelId).padStart(3, '0')}.json">来源、设计差异与完整路线</a></p></article>`).join('');
const labels = { 'new-formal': '本轮新增正式／已实操', 'inherited-formal': '此前正式／保留原版本证据', pending: '待来源核定、生成或完整验证' };
const table = all.map(r => `<tr data-id="${r.levelId}" data-status="${r.status}"><td>${r.levelId}</td><td>${labels[r.status]}</td><td>${byId.has(r.levelId) ? `<a href="#level-${r.levelId}">正式图与证据</a>` : r.status === 'inherited-formal' ? `<a href="/${historical}">此前正式记录</a>` : '尚未完成，不计入通过数'}</td></tr>`).join('');
const css = `*{box-sizing:border-box}body{margin:0;background:#15102c;color:#fff3dc;font:16px/1.6 'Microsoft YaHei',sans-serif}header,main,footer{max-width:1500px;margin:auto;padding:24px}h1{font-size:30px}a{color:#ffd37b}.stats,.notice,article{background:#282043;border:1px solid #57456f;border-radius:12px;padding:16px;margin-bottom:20px}.stats{font-size:20px}.notice{color:#ffcf8e}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair figure{margin:0;text-align:center}.pair img{width:100%;height:510px;object-fit:contain;background:#1f1950}.pass{color:#91e5b5}.differences{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #4c3e60;padding:8px;text-align:left}select,input{max-width:100%;background:#332846;color:inherit;font:inherit;padding:8px;border:1px solid #746287;border-radius:6px}tr[hidden]{display:none}@media(max-width:760px){header,main,footer{padding:15px}.grid{grid-template-columns:1fr}.pair img{height:390px}h1{font-size:24px}}`;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–200正式生成进度 v1.11</title><style>${css}</style><header><small>BLOCK OUT! / v1.11.0</small><h1>21–200关正式生成进度</h1><div class="stats">本轮新增 ${counts.newFormal} 关 · 累计正式 ${counts.totalFormal}/180 · 仍待完成 ${counts.remaining} 关</div><p>游戏总关数仍为200；第1–20关保持。本页只统计本轮21–200的重新设计范围。</p><p class="notice">没有将未完成关卡计入通过。已确认的竞品冲突按本游戏规则最小重配，差异逐关列出，不冒称完全照搬；来源未知仍待核实。保留旧时间与实际三星目标，暂不考核必要腾挪，未重新标定难度或三星。</p><p>本轮${counts.newFormal}关已在当前共同源码下重新运行正式入口、真实拖动与自然计时；此前82关保留v1.10证据，不冒称本次重验全部。</p><a href="#all">180关状态表</a> · <a href="progress.json">完整记录</a> · <a href="/${historical}">此前82关记录</a></header><main><div class="grid">${cards}</div><h2 id="all">逐关状态</h2><label>关号 <input id="search" placeholder="如 68" inputmode="numeric"></label> <select id="filter"><option value="all">全部</option><option value="formal">全部新版正式</option><option value="new-formal">本轮新增</option><option value="pending">待完成</option></select><table><thead><tr><th>关卡</th><th>状态</th><th>证据</th></tr></thead><tbody>${table}</tbody></table></main><footer>图片来自正式Canvas；无手机实机或正式发布声明。预算耗尽不算无解，缺证据不填0。</footer><script>const q=document.querySelector('#search'),f=document.querySelector('#filter');function update(){for(const r of document.querySelectorAll('tbody tr')){const match=f.value==='all'||(f.value==='formal'?r.dataset.status!=='pending':r.dataset.status===f.value);r.hidden=!!((q.value&&r.dataset.id!==q.value.trim())||!match);}}q.addEventListener('input',update);f.addEventListener('change',update);</script></html>`;
fs.writeFileSync(path.join(out, 'index.html'), html, { flag: 'wx' });
const server = await createServer({ root: process.cwd(), configFile: false, optimizeDeps: { noDiscovery: true, entries: [] },
  server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/deliverables/**', '**/.codex-temp/**', '**/playtest-results/**'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/${out}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  assert(await page.evaluate(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)));
  await page.screenshot({ path: path.join(out, 'overview.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(out, 'mobile.png') });
  for (const [filter, n] of [['formal', counts.totalFormal], ['new-formal', counts.newFormal], ['pending', counts.remaining], ['all', 180]]) {
    await page.locator('#filter').selectOption(filter); assert.equal(await page.locator('tbody tr:not([hidden])').count(), n);
  }
  await page.locator('#search').fill(String(rows[0].levelId)); assert.equal(await page.locator('tbody tr:not([hidden])').count(), 1);
  assert.deepEqual(errors, []);
} finally { await browser.close(); await server.close(); }
for (const [p, h] of Object.entries(bindings)) assert.equal(sha(p), h, `Gallery evidence drift: ${p}`);
const report = { ruleVersion: '1.11.0', counts, rows: all, newFormalIds: rows.map(r => r.levelId), bindings,
  modelVerification: { archivePath, archiveSha, campaignSemanticSha256: checked.campaignSemanticSha256 },
  ui: { path: uiPath, sha256: uiSha }, historicalEvidenceVersion: '1.10.0', inheritedFreshUiValidated: false,
  browserQa: { width: 390, noOverflow: true, filters: true, images: true, errors },
  lowerBoundCertified: false, timeAndStarsCalibrated: false, releaseApproved: false };
fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ out, counts }));
