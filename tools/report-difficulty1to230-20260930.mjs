import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Read current runtime objects, never reuse a historical D1 chart or relabel maps.
const root = path.resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const hash = (v) => createHash('sha256').update(v).digest('hex');
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const digest = (v) => hash(JSON.stringify(canonical(v)));
const manifest = readJson('docs/rules/manifest.json');
const source = await build({ stdin: {
  contents: 'export * from "./src/core/levels.ts"; export * from "./src/core/levelStarConditions.ts"; export * from "./src/game/temporaryTestLevelCatalog.ts";',
  resolveDir: root,
}, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, logLevel: 'silent' });
const runtime = new Module(path.join(root, 'difficulty-readonly.cjs'));
runtime._compile(source.outputFiles[0].text, path.join(root, 'difficulty-readonly.cjs'));
const api = runtime.exports;
const sources = Object.keys(source.metafile.inputs).filter(p => p !== '<stdin>').map(p => ({ path: p, sha256: hash(fs.readFileSync(path.resolve(root, p))) }));
const bands = {
  easy: { name: '简单', short: '简', ordinal: 1, range: [5, 10], color: '#108568', tint: '#e2f4ed' },
  normal: { name: '普通', short: '普', ordinal: 2, range: [11, 15], color: '#2473d0', tint: '#e8f0fc' },
  hard: { name: '困难', short: '难', ordinal: 3, range: [16, 20], color: '#c57916', tint: '#fff1d9' },
  super: { name: '超难', short: '超', ordinal: 4, range: [21, 30], color: '#c84567', tint: '#fce7ed' },
};
const production = api.LEVELS;
assert.equal(production.length, 200);
assert.throws(() => api.getLevelStrict(201));
const continuation = [201, 211, 221].flatMap(start => api[`FORMAL_${start}_${start + 9}_LEVELS`]);
const evidence = [201, 211, 221].flatMap(start => api[`FORMAL_${start}_${start + 9}_EVIDENCE`]);
const all = [...production, ...continuation].sort((a, b) => a.id - b.id);
assert.deepEqual(all.map(l => l.id), Array.from({ length: 230 }, (_, i) => i + 1));
assert.deepEqual([...api.TEMPORARY_TEST_LEVEL_IDS], all.map(l => l.id));
const records = all.map(level => {
  const band = bands[level.difficulty];
  assert(band, `Unknown difficulty ${level.id}`);
  const entry = evidence.find(e => e.id === level.id);
  const record = entry ? readJson(entry.evidence) : null;
  if (entry) {
    assert.equal(digest(level), entry.levelSha256, `Current object ${level.id}`);
    assert.equal(record.status, 'FORMAL_DATA_ACCEPTED');
    assert.equal(record.canonicalLevelSha256 ?? record.levelSha256, entry.levelSha256);
    assert(entry.L >= band.range[0] && entry.U <= band.range[1] && entry.L <= entry.U);
    assert.equal(api.moveTargetForLevel(level), entry.starMoves);
  }
  return {
    id: level.id, name: level.name, difficulty: level.difficulty, difficultyName: band.name,
    ordinal: band.ordinal, currentRuleTargetRange: band.range,
    levelSha256: digest(level), starMoves: api.moveTargetForLevel(level),
    starSeconds: api.timeTargetForLevel(level), timeLimitSeconds: level.timeSeconds,
    dataScope: level.id <= 200 ? '生产关卡' : '独立正式注册表 / 临时测试选关',
    recordedLowerBound: entry?.L ?? null, recordedRouteUpperBound: entry?.U ?? null,
    evidence: entry?.evidence ?? null,
    boundAuditScope: entry ? '同对象接受记录与注册表核对；未重新求解' : '本次仅提取难度配置，未重新审计必挪证据',
  };
});
const count = rows => Object.fromEntries(Object.keys(bands).map(k => [k, rows.filter(r => r.difficulty === k).length]));
const groups = Array.from({ length: 23 }, (_, i) => {
  const rows = records.slice(i * 10, i * 10 + 10);
  return { start: rows[0].id, end: rows.at(-1).id, rhythm: rows.map(r => bands[r.difficulty].short).join(' '), counts: count(rows) };
});
const counts = count(records);
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const output = path.join(root, 'deliverables', `difficulty-curve-1-230-v127-20260930-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
const summaryCards = Object.entries(bands).map(([key, b], i) => `<g transform="translate(${46 + i * 387},124)"><rect width="366" height="72" rx="12" fill="${b.tint}"/><text x="18" y="29" font-size="19" fill="${b.color}" font-weight="700">${b.name} · ${b.range.join('–')} 次目标</text><text x="18" y="57" font-size="19" fill="#34465d">${counts[key]} 关 · ${(counts[key] / 230 * 100).toFixed(1)}%</text></g>`).join('');
const panels = Array.from({ length: 5 }, (_, i) => {
  const rows = records.slice(i * 50, i * 50 + 50), top = 270 + i * 277;
  const x = idx => 142 + idx * 28.4, y = rank => top + 207 - (rank - 1) * 45;
  const labels = Object.values(bands).map(b => `<line x1="132" x2="1542" y1="${y(b.ordinal)}" y2="${y(b.ordinal)}" stroke="#dce4ee"/><text x="109" y="${y(b.ordinal) + 5}" text-anchor="end" fill="${b.color}" font-size="16">${b.name}</text>`).join('');
  const dividers = [9.5, 19.5, 29.5, 39.5].map(p => `<line x1="${x(p)}" x2="${x(p)}" y1="${top + 62}" y2="${top + 211}" stroke="#d1dce7" stroke-dasharray="4 5"/>`).join('');
  const line = rows.map((r, j) => `${j ? 'L' : 'M'}${x(j)},${y(r.ordinal)}`).join(' ');
  const dots = rows.map((r, j) => `<g><title>第${r.id}关 · ${r.difficultyName} · ${esc(r.name)}</title><circle cx="${x(j)}" cy="${y(r.ordinal)}" r="5" fill="${bands[r.difficulty].color}" stroke="white" stroke-width="1.5"/><text x="${x(j)}" y="${y(r.ordinal) - 11}" text-anchor="middle" fill="${bands[r.difficulty].color}" font-size="12">${bands[r.difficulty].short}</text><text x="${x(j)}" y="${top + 238}" text-anchor="middle" fill="#55677c" font-size="11">${r.id}</text></g>`).join('');
  const note = i === 0 ? '前20关保留当前旧标签；不表示已按新必挪区间全部认证' : i === 4 ? '30关均为已接受正式数据；通过临时选关试玩' : '读取当前最终 LEVELS，保留教学插入后的实际节奏';
  return `<g><rect x="26" y="${top}" width="1548" height="255" rx="14" fill="#fff" stroke="#dce4ee"/><text x="53" y="${top + 33}" font-size="22" fill="#182c46" font-weight="700">${rows[0].id}–${rows.at(-1).id} 关</text><text x="1540" y="${top + 32}" text-anchor="end" font-size="15" fill="#63758c">${note}</text>${labels}${dividers}<path d="${line}" fill="none" stroke="#91a4bb" stroke-width="2"/>${dots}${i === 4 ? `<text x="1050" y="${top + 112}" font-size="22" fill="#253c58">201–230 每10关：</text><text x="1050" y="${top + 150}" font-size="18" fill="#506780">简 → 普 → 普 → 难 → 简</text><text x="1050" y="${top + 182}" font-size="18" fill="#506780">普 → 难 → 简 → 普 → 超</text>` : ''}</g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1730" viewBox="0 0 1600 1730"><style>text{font-family:'Microsoft YaHei','PingFang SC',sans-serif}</style><rect width="1600" height="1730" fill="#f3f6fb"/><text x="46" y="59" font-size="36" font-weight="700" fill="#152c49">Block Out! · 1–230 关配置难度曲线</text><text x="46" y="95" font-size="17" fill="#5c7189">${date}（北京时间） · 规则 v${manifest.activeVersion} · 当前源码快照，不是建议规划</text>${summaryCards}<text x="46" y="235" font-size="17" fill="#73562d">纵轴是四档难度标签，不是实测最少腾挪；上方次数是现行设计目标，三星总拖动另计。</text>${panels}<text x="46" y="1690" font-size="16" fill="#506780">生产闯关 1–200；201–230 为独立正式数据，临时选关可用。本报告未重新求解、未改图或改标签。</text></svg>`;
const tenRows = groups.map(g => `<tr><th>${g.start}–${g.end}</th>${records.slice(g.start - 1, g.end).map(r => `<td style="background:${bands[r.difficulty].tint};color:${bands[r.difficulty].color}"><span>${r.id}</span><b>${r.difficultyName}</b></td>`).join('')}</tr>`).join('');
const detailRows = records.map(r => `<tr data-id="${r.id}" data-difficulty="${r.difficulty}" data-name="${esc(r.name)}"><td>${r.id}</td><td>${esc(r.name)}</td><td><b style="color:${bands[r.difficulty].color}">${r.difficultyName}</b></td><td>${r.currentRuleTargetRange.join('–')}</td><td>${r.recordedLowerBound === null ? '— 本次未复核' : r.recordedLowerBound === r.recordedRouteUpperBound ? r.recordedLowerBound : `${r.recordedLowerBound}–${r.recordedRouteUpperBound}`}</td><td>${r.starMoves}</td><td>${r.starSeconds} / ${r.timeLimitSeconds}</td><td>${r.dataScope}</td></tr>`).join('');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Block Out! 1–230关最新难度曲线</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#182c46;font:15px/1.7 'Microsoft YaHei',sans-serif}main{max-width:1600px;margin:auto;padding:24px}h1{font-size:30px;margin:0}h2{font-size:22px;margin:30px 0 10px}p{margin:10px 0}.muted{color:#586d85}a{color:#186ac6}.notice{padding:16px 20px;background:#fff2dc;border:1px solid #e8d4b2;border-radius:12px}.chart{margin:20px 0}.chart svg{display:block;width:100%;height:auto}.table-wrap{overflow:auto;background:#fff;border:1px solid #dce4ee;border-radius:12px}table{border-collapse:collapse;width:100%}th,td{padding:9px 12px;border-bottom:1px solid #e3e9f0;text-align:left;white-space:nowrap}th{background:#edf2f8}thead th{position:sticky;top:0;z-index:1}.rhythm td{text-align:center;min-width:95px;padding:10px 7px}.rhythm span{font-size:12px;display:block;opacity:.8}.rhythm b{font-size:16px}.details{max-height:680px}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}input,select{padding:9px 12px;font:inherit;border:1px solid #c9d5e2;border-radius:8px;background:#fff}summary{cursor:pointer;font-weight:700}.footer{padding:20px 0;color:#667a91;font-size:13px}@media(max-width:700px){main{padding:14px}h1{font-size:25px}.chart{overflow:auto}.chart svg{min-width:1150px}}
</style><main><h1>1–230关最新难度曲线</h1><p class="muted">读取时间：${date}（北京时间） · 活动规则 v${manifest.activeVersion} · 实际配置快照</p><p><a href="difficulty-curve.png">打开高清曲线图</a> · <a href="difficulty-curve.svg">矢量图</a> · <a href="data.json">逐关原始数据及来源</a></p>
<div class="notice"><b>先区分“配置档位”和“已证必挪”。</b>曲线严格取当前 LevelSpec.difficulty，不使用旧 D1 结构分数，不重新定级。简单5–10、普通11–15、困难16–20、超难21–30是现行设计区间，不表示全部旧关已证明落档。1–200本次未逐关重审上下界；201–230的记录已核对同一正式对象，区间为已证L到完整路线U，不把U称为最优。三星总拖数包含清除等动作，与必挪不同。</div>
<section class="chart">${svg}</section><h2>每10关完整节奏</h2><p class="muted">每格同时标出关号及实际档位，未按统一模板覆盖旧关。201–230三个十关组均为「简 普 普 难 简 普 难 简 普 超」。</p><div class="table-wrap"><table class="rhythm"><thead><tr><th>关卡组</th>${Array.from({length:10},(_,i)=>`<th>第${i+1}位</th>`).join('')}</tr></thead><tbody>${tenRows}</tbody></table></div>
<h2>逐关详情</h2><div class="controls"><input id="search" placeholder="精确关号或名称，如 43"><select id="band"><option value="">全部难度</option>${Object.entries(bands).map(([k,b])=>`<option value="${k}">${b.name}</option>`).join('')}</select><span id="visible">230 / 230 关</span></div><div class="table-wrap details"><table><thead><tr><th>关卡</th><th>名称</th><th>配置难度</th><th>该档设计必挪区间</th><th>本报告核对的L–U</th><th>三星总拖</th><th>时间星/总时限（秒）</th><th>数据位置</th></tr></thead><tbody id="details">${detailRows}</tbody></table></div>
<h2>边界与注意事项</h2><p>生产 LEVELS 共200关，getLevelStrict(201)仍拒绝；三个独立正式注册表各10关，临时测试选关已连续覆盖1–230。不是“只做到了200”，也不是“生产活动已扩到230”。</p><p>第1–20关中困难标签较密集，既有教学及单关特例保留；此图只反映配置，不能据此断言它们实际比后面的关卡难。未做玩家盲测，本次也没有新增求解或发布。</p><details><summary>数据来源及审计口径</summary><p>主数据：src/core/levels.ts最终LEVELS，formal201to210Data.ts、formal211to220Data.ts、formal221to230Data.ts正式注册表；评分读取levelStarConditions.ts的实际函数。全部230个对象与构建依赖SHA保存在data.json。201–230接受记录逐一核对状态、规范指纹、L/U和三星目标；旧证据没有改写。</p></details><div class="footer">生成工具 tools/report-difficulty1to230-20260930.mjs · 只生成报告文件，不改关卡、标签、规则、存档或包体。</div></main><script>
const search=document.getElementById('search'),band=document.getElementById('band');function filter(){const q=search.value.trim(),numeric=/^\\d+$/.test(q);let n=0;document.querySelectorAll('#details tr').forEach(r=>{const matched=(!band.value||r.dataset.difficulty===band.value)&&(!q||(numeric?r.dataset.id===String(Number(q)):r.dataset.name.includes(q)));r.hidden=!matched;if(matched)n++});document.getElementById('visible').textContent=n+' / 230 关'}search.addEventListener('input',filter);band.addEventListener('change',filter);
</script></html>`;
fs.writeFileSync(path.join(output, 'difficulty-curve.svg'), svg);
fs.writeFileSync(path.join(output, 'index.html'), html);
const data = { generatedAt: new Date().toISOString(), timezone: 'Asia/Shanghai', ruleVersion: manifest.activeVersion,
  scope: 'Actual configured difficulty labels, not a new difficulty certification or solver run',
  productionCount: production.length, formalContinuationCount: continuation.length, temporaryTestCount: api.TEMPORARY_TEST_LEVEL_COUNT,
  counts, bands, tenLevelGroups: groups, levels: records, sources,
  objectSnapshotsSha256: digest(all), productionSha256: digest(production),
  first20Counts: count(records.slice(0, 20)), last30Counts: count(records.slice(200)),
};
fs.writeFileSync(path.join(output, 'data.json'), JSON.stringify(data, null, 2));
const browser = await chromium.launch({ headless: true });
const checks = { count: records.length, continuationAcceptedCount: evidence.length, errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1730 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => checks.errors.push(e.message));
  await page.goto(pathToFileURL(path.join(output, 'difficulty-curve.svg')).href);
  await page.screenshot({ path: path.join(output, 'difficulty-curve.png') });
  await page.goto(pathToFileURL(path.join(output, 'index.html')).href);
  assert.equal(await page.locator('#details tr').count(), 230);
  assert.equal(await page.locator('.rhythm tbody tr').count(), 23);
  await page.locator('#search').fill('43');
  assert.equal(await page.locator('#details tr:visible').count(), 1);
  assert.equal(await page.locator('#details tr:visible').getAttribute('data-id'), '43');
  await page.locator('#search').fill('');
  await page.locator('#band').selectOption('super');
  assert.equal(await page.locator('#details tr:visible').count(), counts.super);
  await page.locator('#band').selectOption('');
  checks.pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(checks.pageOverflow, false);
  await page.screenshot({ path: path.join(output, 'report-preview.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  checks.mobilePageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(checks.mobilePageOverflow, false);
  assert.deepEqual(checks.errors, []);
} finally { await browser.close(); }
checks.sourceDrift = sources.filter(s => hash(fs.readFileSync(path.resolve(root, s.path))) !== s.sha256);
assert.deepEqual(checks.sourceDrift, []);
assert.equal(readJson('docs/rules/manifest.json').activeVersion, manifest.activeVersion);
fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ status: 'PASS', ...checks }, null, 2));
console.log(JSON.stringify({ output, counts, first20Counts: data.first20Counts, groups, verification: checks }, null, 2));
