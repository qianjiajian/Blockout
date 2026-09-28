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

// Isolated previews, not release certificates. A low-reposition COMPLETE route
// is valid here under v1.5. Unknown/unsupported routes are never rendered as PASS.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.argv[2];
assert(configPath, 'Usage: node tools/render-revised-solvable-previews.mjs config.json [--pointer]');
const readJson = async p => JSON.parse(await readFile(path.resolve(root, p), 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const hashObject = v => sha(JSON.stringify(canonical(v)));
const lock = verifyRulesLock();
assert(lock.ok && lock.activeVersion === '1.5.0', JSON.stringify(lock));
const config = await readJson(configPath);
assert(Array.isArray(config.items) && config.items.length);
const files = {}, migrations = [], rows = [], errors = [];
async function bind(p, expected) {
  const digest = sha(await readFile(path.resolve(root, p)));
  if (expected) assert.equal(digest, expected, `Source changed: ${p}`);
  if (files[p]) assert.equal(files[p].sha256, digest, `Input drift: ${p}`);
  files[p] = { sha256: digest };
}
async function bindTree(dir) {
  for (const e of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) await bindTree(p); else await bind(p);
  }
}
async function unchanged() {
  for (const [p, b] of Object.entries(files)) assert.equal(sha(await readFile(path.resolve(root, p))), b.sha256, `Input changed during batch: ${p}`);
}
for (const p of [configPath, 'docs/rules/manifest.json', 'docs/mechanism-rules-v1.5.0.md', 'tools/render-revised-solvable-previews.mjs', 'tools/revised-opening-coverage.mjs', 'tools/revised-candidate-route.html', 'tools/revised-candidate-route-browser.mjs']) await bind(p);
await bindTree('src');
const bundle = await build({ absWorkingDir: root, stdin: { contents: 'export {PuzzleModel} from "./src/core/PuzzleModel.ts"; export {auditRevisedCandidate} from "./src/core/revisedCandidateAudit.ts"; export {replayRevisedRoute} from "./src/core/revisedLevelSearch.ts"; export {auditCandidateBlockArt} from "./tools/revised-candidate-block-art.mjs";', resolveDir: root, sourcefile: 'solvable-preview-entry.mjs' }, bundle: true, format: 'esm', platform: 'node', write: false, metafile: true });
await unchanged();
const core = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
for (const p of Object.keys(bundle.metafile.inputs)) if (p !== 'solvable-preview-entry.mjs') await bind(p);
const approvalPath = 'docs/level-generation/reviews/layout-approval-lv021-030-v140.json';
const approval = await readJson(approvalPath);
await bind(approvalPath);
for (const item of config.items) {
  for (const p of [item.candidate, item.route ?? item.candidate, item.sourceReview]) await bind(p);
  const raw = await readJson(item.candidate), level = raw.level ?? raw;
  const route = await readJson(item.route ?? item.candidate);
  const drags = route.drags ?? route.result?.drags ?? route.search?.drags;
  assert(Array.isArray(drags) && drags.length, `No complete route Lv${level.id}`);
  assert(!rows.some(r => r.levelId === level.id), 'Duplicate level');
  assert(level.id >= 21 && level.id <= 200);
  const source = await readJson(item.sourceReview);
  // Current independent reviewed source scope. Broader coverage must gain an
  // explicit source adapter, not infer source counts from the generated layout.
  assert(level.id <= 30, `Independent source adapter not yet available Lv${level.id}`);
  assert.equal(sha(await readFile(path.resolve(root, item.sourceReview))), approval.sourceReviewSha256);
  const prior = source.rows.find(r => r.levelId === level.id);
  assert(prior, `Missing source row Lv${level.id}`);
  assert.equal(hashObject(prior.level), approval.levelHashes.find(r => r.levelId === level.id).canonicalLevelSha256);
  for (const [p, b] of Object.entries(source.bindings)) {
    if (p === 'docs/rules/manifest.json') {
      if (!migrations.length) migrations.push({ path: p, historicalSha256: b.sha256, currentSha256: files[p].sha256, reason: 'Explicit v1.5 preview policy appended; old frozen documents remain lock-verified. This exception applies ONLY to the active manifest, never model/source/art files.' });
    } else await bind(p, b.sha256);
  }
  assert.equal(level.mechanismRules, 'revised-2026-09-21-v1.2');
  assert.deepEqual([...level.playable].sort(), [...prior.level.playable].sort(), `Approved outline Lv${level.id}`);
  const audit = core.auditRevisedCandidate(level, prior.sourceContract);
  assert.deepEqual(audit.issues, [], `Static contract Lv${level.id}`);
  const coverage = auditOpeningCoverage(new core.PuzzleModel(level).snapshot());
  assert(coverage.passed, JSON.stringify(coverage));
  const iceShell = l => l.blocks.filter(b => b.frozen > 0).map(b => `${b.frozen}:${(b.layers?.length ?? 0) > 1}`).sort();
  assert.deepEqual(iceShell(level), iceShell(prior.level), `Ice/shell pairings Lv${level.id}`);
  for (const g of level.gates) assert(level.blocks.some(b => (b.layers ?? [b.color]).includes(g.color)), `Unused exit ${g.id}`);
  const art = core.auditCandidateBlockArt(level);
  assert.deepEqual(art.issues, [], `Art Lv${level.id}`);
  for (const r of art.requirements) await bind(`public/${r.path}`);
  const replay = core.replayRevisedRoute(level, drags);
  assert(replay.valid && replay.complete, `Fresh replay Lv${level.id}: ${JSON.stringify(replay)}`);
  // Deliberately NO lower-bound / 10/15/20 assertion in this preview phase.
  rows.push({ levelId: level.id, title: prior.title, level, candidateSha256: hashObject(level), sourceContract: prior.sourceContract, sourceFacts: prior.sourceFacts, audit, coverage, art, drags, replay, pointerReplayValidated: false, lowerBoundCertified: false, difficultyAssessed: false, timeValidated: false, releaseApproved: false });
}
rows.sort((a, b) => a.levelId - b.levelId);
await unchanged();
const relative = `deliverables/revised-solvable-previews-lv021-200-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`;
const output = path.join(root, relative);
await mkdir(path.join(output, 'boards'), { recursive: true });
await mkdir(path.join(output, 'levels'), { recursive: true });
const report = { ruleVersion: '1.5.0', requestedRange: [21, 200], requestedCount: 180, completePreviewCount: 0, remainingLevelIds: Array.from({ length: 180 }, (_, i) => i + 21).filter(id => !rows.some(r => r.levelId === id)), files, migrations, rows, errors, releaseApproved: false, lowerBoundCertified: false };
const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.__PREVIEW_STORAGE__ = [];
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = function() { window.__PREVIEW_STORAGE__.push(method); throw Error('No save access'); };
  for (const method of ['open', 'deleteDatabase']) indexedDB[method] = function() { window.__PREVIEW_STORAGE__.push(method); throw Error('No database access'); };
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
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const css = `:root{--bg:#14112e;--panel:#25204b;--ink:#f9f0d5;--gold:#e9be65;--muted:#c4bee8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Microsoft YaHei",sans-serif}header,footer{padding:24px 32px}h1{margin:8px 0}small,a{color:var(--gold)}p{color:var(--muted)}main{padding:0 32px 24px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.card{background:var(--panel);border:1px solid #554775;border-radius:18px;overflow:hidden;padding:18px;text-decoration:none;color:var(--ink)}.card img{display:block;width:100%;height:460px;object-fit:contain;background:#211c58;border-radius:10px}h2{font-size:22px;margin:0 0 12px}.good{color:#9fe6bc}.detail{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:24px}.detail img{width:100%;height:850px;object-fit:contain;background:#211c58;border-radius:18px}.notice{border-left:3px solid var(--gold);padding-left:12px}.fact{line-height:2}.pending{overflow-wrap:anywhere}nav{display:flex;gap:20px;flex-wrap:wrap}@media(max-width:700px){header,footer{padding:20px}main{padding:0 20px 20px}.gallery,.detail{grid-template-columns:1fr}.detail img{height:640px}h1{font-size:26px}}`;
try {
  await page.goto(`${origin}/tools/revised-candidate-route.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__REVISED_CANDIDATE_ROUTE__, undefined, { timeout: 60000 });
  for (const r of rows) {
    const name = `level-${String(r.levelId).padStart(3, '0')}`;
    await page.evaluate(r => {
      window.__REVISED_CANDIDATE_ROUTE__.load({ levelId: r.levelId, ruleVersion: '1.5.0', level: r.level });
      document.querySelector('#status').textContent = `第${r.levelId}关 · 可解预览 · 不考核必挪次数\n隔离候选，未替换正式地图`;
    }, r);
    await page.waitForFunction(requirements => {
      const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
      return d?.art.ready && d.art.revisedMechanisms.ready && !d.art.formalGameplay.requestedIceSignature && !d.art.formalGameplay.iceError && requirements.every(({ color, kind, shapeId }) => {
        const img = g.art.formalBlocks?.[color]?.[kind]?.[shapeId]; return img && (img.naturalWidth || img.width) > 0;
      });
    }, r.art.requirements, { timeout: 60000 });
    await stable();
    const initial = await state();
    assert.deepEqual(auditOpeningCoverage(initial.puzzle), r.coverage);
    assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds, []);
    const clip = await page.evaluate(() => {
      const d = window.__COLOR_ESCAPE__.getDebugState(), b = d.board, t = d.viewportTransform, c = document.querySelector('canvas').getBoundingClientRect();
      return { x: c.left + t.offsetX + (b.innerX - b.cell * .68) * t.scale, y: c.top + t.offsetY + (b.innerY - b.cell * .68) * t.scale, width: (b.innerWidth + b.cell * 1.36) * t.scale, height: (b.innerHeight + b.cell * 1.36) * t.scale };
    });
    await page.screenshot({ path: path.join(output, 'boards', `${name}.png`), clip });
    r.renderVerified = true;
    if (process.argv.includes('--pointer')) {
      for (let i = 0; i < r.drags.length; i++) {
        const drag = r.drags[i], before = (await state()).puzzle, b = before.blocks.find(b => b.id === drag.blockId);
        assert(b, `Missing block Lv${r.levelId}/${i}`);
        const [gx, gy] = b.shape[0];
        await move(b.x + gx + .5, b.y + gy + .5); await page.mouse.down();
        for (const [x, y] of drag.path) await move(x + gx + .5, y + gy + .5);
        if (drag.exitSide) {
          const [x, y] = drag.path.at(-1) ?? [b.x, b.y], [dx, dy] = { left: [-.8, 0], right: [.8, 0], top: [0, -.8], bottom: [0, .8] }[drag.exitSide];
          await move(x + gx + .5 + dx, y + gy + .5 + dy);
        }
        await page.mouse.up(); await stable();
        const after = (await state()).puzzle, expected = core.replayRevisedRoute(r.level, r.drags.slice(0, i + 1));
        assert(expected.valid);
        assert.deepEqual(spatial(after), spatial(JSON.parse(expected.finalStateKey)), `Pointer Lv${r.levelId}/${i + 1}`);
        assert.equal(after.moves, expected.effectiveDrags, `Pointer move accounting Lv${r.levelId}/${i + 1}`);
        assert.equal(after.moves, before.moves + 1, `Exactly one committed drag Lv${r.levelId}/${i + 1}`);
      }
      assert((await state()).puzzle.complete);
      r.pointerReplayValidated = true;
      await page.screenshot({ path: path.join(output, 'boards', `${name}-complete.png`) });
    }
    assert.deepEqual(await page.evaluate(() => window.__PREVIEW_STORAGE__), []);
    assert.deepEqual(errors, []);
    const facts = `<div class="fact">棋盘 ${r.level.width} × ${r.level.height}<br>开局 ${r.audit.measurements.openingBlockCount} 块 / 全关 ${r.level.blocks.length} 块<br>满铺 ${r.coverage.coveredCells}/${r.coverage.playableCells} 格<br>出口 ${r.level.gates.length} 个 / 卷帘 ${(r.level.shutters ?? []).length} 道<br>完整路线 ${r.replay.effectiveDrags} 次拖动</div>`;
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${r.levelId}关 · 可解预览</title><style>${css}</style><header><small>BLOCK OUT! / SOLVABLE PREVIEW · v1.5</small><h1>第${r.levelId}关 · ${esc(r.title ?? r.level.name)}</h1><p class="good">完整模型通关通过${r.pointerReplayValidated ? ' · 真实鼠标通关通过' : ''}</p></header><main class="detail"><img src="../boards/${name}.png" alt="第${r.levelId}关开局"><section><h2>布局核对</h2>${facts}<p>冰门：${r.sourceFacts.frozenExitValues.join(' / ') || '无'}<br>冰块：${r.sourceFacts.numericIce.values.join(' / ') || '无'}<br>外壳：${r.sourceFacts.shells.count}</p><p>卷帘：${(r.level.shutters ?? []).map(s => `${s.count}次→${r.level.blocks.filter(b => b.shutterId === s.id).length}块`).join('；') || '无'}</p><p class="notice">本轮不考核必要腾挪次数。路线长度不是难度下界；时间、三星与正式发布尚未验收。</p><p>开局满铺、数量、配色与空间检查通过。临时预览时限为${r.level.timeSeconds}秒，不是正式时间标定。</p><nav><a href="../index.html">返回图集</a><a href="${name}.json">候选与完整路线</a></nav></section></main><footer>隔离候选，正式关卡和存档未改。全季首次引入来源尚未完成核定，不宣称完整发布门禁通过。</footer></html>`;
    await writeFile(path.join(output, 'levels', `${name}.html`), html, { flag: 'wx' });
    r.previewComplete = true;
    await writeFile(path.join(output, 'levels', `${name}.json`), JSON.stringify(r, null, 2)+'\n', { flag: 'wx' });
    report.completePreviewCount++;
    console.log(`PASS preview Lv${r.levelId}; ${r.replay.effectiveDrags} drags; pointer=${r.pointerReplayValidated}`);
  }
  const cards = rows.map(r => `<a class="card" href="levels/level-${String(r.levelId).padStart(3,'0')}.html"><h2>第${r.levelId}关</h2><img loading="lazy" src="boards/level-${String(r.levelId).padStart(3,'0')}.png" alt="第${r.levelId}关开局"><p class="good">完整通关通过 · 满铺100%</p><small>${r.level.width}×${r.level.height} / 开局${r.audit.measurements.openingBlockCount}块 / 全关${r.level.blocks.length}块</small></a>`).join('');
  await writeFile(path.join(output,'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–200关 · 可解预览进度</title><style>${css}</style><header><small>BLOCK OUT! / SOLVABLE PREVIEWS</small><h1>21–200关 · 可解预览</h1><p>当前完成 ${rows.length}/180 关，以下仅展示已验证完整通关的候选。不是180关已完成。</p><p>本轮暂不考核必要腾挪次数，保留满铺、机制与布局规则；未替换正式地图。点击关卡查看大图和完整数据。</p><nav><a href="overview.png">本批总览图</a><a href="review.json">检查记录</a></nav></header><main class="gallery">${cards}</main><footer><p class="notice">尚未完成：${report.remainingLevelIds.join('、')}。不把开局可移动、旧规则证书或未知结果标成可解。</p><p>时间与三星待后续标定。图片来自实际游戏Canvas，未用示意图替代真实绘制。</p></footer></html>`, {flag:'wx'});
  const design = await browser.newPage({viewport:{width:1100,height:1200}});
  for(const r of rows){const name=`level-${String(r.levelId).padStart(3,'0')}`;await design.goto(`${origin}/${relative}/levels/${name}.html`,{waitUntil:'networkidle'});await design.screenshot({path:path.join(output,'levels',`${name}.png`),fullPage:true});}
  await design.setViewportSize({width:1800,height:1400});
  await design.goto(`${origin}/${relative}/index.html`,{waitUntil:'networkidle'});
  await design.locator('img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
  await design.waitForFunction(()=>Array.from(document.images).every(i=>i.complete && i.naturalWidth));
  await design.screenshot({path:path.join(output,'overview.png'),fullPage:true});
  await design.setViewportSize({width:390,height:844});
  assert(await design.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile gallery overflow');
  await unchanged(); report.status='partial-batch-verified';
} catch(error){report.status='failed';report.error=error.stack??String(error);process.exitCode=1;}
finally{
  report.completePreviewCount = rows.filter(r => r.previewComplete).length;
  report.remainingLevelIds = Array.from({length:180},(_,i)=>i+21).filter(id=>!rows.some(r=>r.levelId===id&&r.previewComplete));
  report.sourceFirstIntroductionCertified = false;
  report.outputFiles = {};
  async function recordOutputs(dir='') {
    for(const entry of await readdir(path.join(output,dir),{withFileTypes:true})) {
      const p=dir?`${dir}/${entry.name}`:entry.name;
      if(entry.isDirectory()) await recordOutputs(p);
      else if(p!=='review.json') report.outputFiles[p]={sha256:sha(await readFile(path.join(output,p)))};
    }
  }
  await recordOutputs();
  await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();
}
console.log(JSON.stringify({output:relative,status:report.status,completePreviewCount:report.completePreviewCount,error:report.error}));
