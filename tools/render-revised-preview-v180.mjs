import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { loadStrict21to30Catalog, verifyStrict21to30Candidate, loadPreviewCore } from './revised-preview-validation-v180.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';

// Isolated 21–30 previews only. Full source/geometry/model checks precede images.
const root=process.cwd(),configPath=process.argv[2];
assert(configPath,'Usage: node tools/render-revised-preview-v180.mjs config.json [--allow-partial]');
const config=JSON.parse(await readFile(configPath,'utf8')),files={},rows=[],errors=[];
async function bind(p,expected) {
  const sha256=digest(await readFile(path.resolve(root,p)));
  if(expected) assert.equal(sha256,expected,`Source drift ${p}`);
  if(files[p]) assert.equal(sha256,files[p].sha256,`Input changed ${p}`);
  files[p]={sha256};
}
async function bindTree(dir) {
  for(const e of await readdir(dir,{withFileTypes:true})) {
    const p=path.posix.join(dir,e.name); if(e.isDirectory()) await bindTree(p); else await bind(p);
  }
}
async function unchanged(){for(const [p,b] of Object.entries(files))await bind(p,b.sha256);}
for(const p of [configPath,'docs/rules/manifest.json','docs/mechanism-rules-v1.8.0.md','tools/render-revised-preview-v180.mjs',
  'tools/revised-preview-validation-v180.mjs','tools/revised-preview-validation-v170.mjs','tools/revised-gate-span-limits.mjs','tools/revised-preview-validation-v160.mjs','tools/strict-board-alignment-v170.mjs',
  'tools/strict-mechanism-alignment-v170.mjs','tools/revised-source-inventory.mjs','tools/audit-revised-generation-inputs.mjs',
  'tools/revised-opening-coverage.mjs','tools/revised-candidate-route.html','tools/revised-candidate-route-browser.mjs']) await bind(p);
await bindTree('src');
await bindTree('public/assets/art/gameplay/board/formal-border-v2');
await bindTree('public/assets/art/gameplay/mechanics/formal-ice-v1');
const catalog=await loadStrict21to30Catalog(root);
for(const [p,b] of Object.entries(catalog.bindings))await bind(p,b.sha256);
const {api:core,inputs}=await loadPreviewCore(); for(const p of inputs)await bind(p);
for(const item of config.items) {
  const p=typeof item==='string'?item:item.candidate;await bind(p);
  const raw=JSON.parse(await readFile(p,'utf8'));
  const r=verifyStrict21to30Candidate(raw,catalog.levels.find(s=>s.levelId===raw.level?.id),core);
  assert(!rows.some(old=>old.levelId===r.levelId),'Duplicate candidate');
  for(const req of r.art.requirements)await bind(`public/${req.path}`);
  rows.push(r);
}
rows.sort((a,b)=>a.levelId-b.levelId);
if(!process.argv.includes('--allow-partial'))assert.deepEqual(rows.map(r=>r.levelId),Array.from({length:10},(_,i)=>i+21));
await unchanged();
const relative=`deliverables/revised-aligned-lv021-030-v180-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`;
const output=path.resolve(root,relative);
for(const dir of ['boards','levels','reference'])await mkdir(path.join(output,dir),{recursive:true});
const report={ruleVersion:'1.8.0',requestedRange:[21,30],requestedCount:10,files,rows,errors,completePreviewCount:0,remainingLevelIds:[],releaseApproved:false,lowerBoundCertified:false,timeValidated:false};
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,watch:{ignored:['**/deliverables/**','**/.codex-temp/**']}},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1000,height:1078}});
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  window.__PREVIEW_STORAGE__=[];
  for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__PREVIEW_STORAGE__.push(m);throw Error('No save access');};
  for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__PREVIEW_STORAGE__.push(m);throw Error('No database access');};
});
const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const stable=()=>page.waitForFunction(()=>{
  const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.puzzle?.started&&!d.generatorSpawnAnimations.length&&!d.revisedMechanismAnimations.length&&!d.exitAnimations.length;
},undefined,{timeout:20000});
const spatial=s=>{const {moves,remainingSeconds,autonomousStarted,...r}=s;return JSON.parse(JSON.stringify(r));};
async function move(x,y){
  const p=await page.evaluate(({x,y})=>{
    const d=window.__COLOR_ESCAPE__.getDebugState(),c=document.querySelector('canvas').getBoundingClientRect(),t=d.viewportTransform;
    return{x:c.left+t.offsetX+(d.board.innerX+x*d.board.cell)*t.scale,y:c.top+t.offsetY+(d.board.innerY+y*d.board.cell)*t.scale};
  },{x,y});await page.mouse.move(p.x,p.y,{steps:3});
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const css=`*{box-sizing:border-box}body{margin:0;background:#14112e;color:#fff4df;font:16px/1.6 "Microsoft YaHei",sans-serif}header,footer{padding:22px 30px}h1{font-size:30px;margin:8px 0}h2{font-size:22px;margin:8px 0}p,small{color:#c9c2e9}a{color:#f2c872}main{padding:0 30px 26px}.good{color:#a4efc3}.notice{color:#f2c872}.gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}.card,.panel{background:#262047;border:1px solid #5b4b7a;border-radius:16px;padding:16px;min-width:0}.card{text-decoration:none;color:inherit}.card img{width:100%;height:440px;object-fit:contain;background:#211c58;border-radius:10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center}.pair img{width:100%;height:680px;object-fit:contain;background:#211c58;border-radius:12px}table{border-collapse:collapse;width:100%;margin-top:22px;table-layout:fixed}th,td{padding:8px 12px;border-bottom:1px solid #554570;text-align:left;overflow-wrap:anywhere}th{background:#3e3260}nav{display:flex;gap:20px;flex-wrap:wrap}.pending,pre{overflow-wrap:anywhere;white-space:pre-wrap}.notes{padding:12px 0}@media(max-width:1000px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){header,footer{padding:18px}main{padding:0 18px 20px}h1{font-size:25px}.gallery,.pair{grid-template-columns:1fr}.pair img{height:520px}td,th{padding:6px;font-size:13px}}`;
function gateTable(r){
  const sides={top:'上',bottom:'下',left:'左',right:'右'},colors={red:'红',blue:'蓝',green:'绿',yellow:'黄',orange:'橙',purple:'紫',pink:'粉',cyan:'青'};
  return `<h2>实际出口长度</h2><p>每个实体出口通常最多3格；只有同色块该方向完整横截面确实超过3格才允许按需扩宽。本批没有扩宽例外。</p><table><thead><tr><th>颜色</th><th>边缘</th><th>长度</th><th>冰数</th></tr></thead><tbody>${r.level.gates.map(g=>`<tr><td>${colors[g.color]}</td><td>${sides[g.side]}</td><td>${g.size}格</td><td>${g.frozen??0}</td></tr>`).join('')}</tbody></table>`;
}
function detailTable(r){
  const s=r.sourceNormalizedFacts,d=r.proposedFacts,sm=s.mechanisms,dm=d.mechanisms;
  const entries=[['棋盘尺寸',`${s.width}×${s.height}`,`${d.width}×${d.height}`],['棋盘分类',r.sourceBoard.kind==='normal'?'完整矩形':'异形',r.sourceBoard.kind==='normal'?'同尺寸完整矩形':'保留当前原创轮廓'],
    ['开局色块',s.opening,d.opening],['全关色块',s.full,d.full],['异形块（开局 / 全关）',`${sm.irregularBlocks.openingCount} / ${sm.irregularBlocks.fullCount}`,`${dm.irregularBlocks.openingCount} / ${dm.irregularBlocks.fullCount}`],
    ['普通出口',sm.exits.ordinaryCount,dm.exits.ordinaryCount],['冰冻出口初值',sm.exits.frozenValues,dm.exits.frozenValues],['卷帘 初值→隐藏块数',sm.covers.values.map((v,i)=>`${v}→${sm.covers.hiddenBatchCounts[i]}`),dm.covers.values.map((v,i)=>`${v}→${dm.covers.hiddenBatchCounts[i]}`)],
    ['数字冰块初值',sm.numericIce.values,dm.numericIce.values],['冰壳同体块',sm.numericIce.postMeltShellCount,dm.numericIce.postMeltShellCount],['外壳块',sm.shells.count,dm.shells.count],
    ['生成器 / 轴向块 / 钥匙 / 锁','0 / 0 / 0 / 0','0 / 0 / 0 / 0'],['星块 / 星门 / 翻转门','0 / 0 / 0','0 / 0 / 0'],['彩格 / 炸弹 / 电梯','0 / 0 / 0','0 / 0 / 0']];
  const show=v=>Array.isArray(v)?v.join('、')||'无':String(v);
  return `<table><thead><tr><th>核对项</th><th>竞品</th><th>本次候选</th></tr></thead><tbody>${entries.map(([label,a,b])=>`<tr><td>${label}</td><td>${esc(show(a))}</td><td>${esc(show(b))}</td></tr>`).join('')}</tbody></table>`;
}
try{
  await page.goto(`${origin}/tools/revised-candidate-route.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__REVISED_CANDIDATE_ROUTE__,undefined,{timeout:60000});
  for(const r of rows){
    const name=`level-${String(r.levelId).padStart(3,'0')}`;
    await page.evaluate(r=>{window.__REVISED_CANDIDATE_ROUTE__.load({levelId:r.levelId,ruleVersion:'1.8.0',level:r.level});document.querySelector('#status').textContent=`第${r.levelId}关 · 严格对齐预览 · 非正式地图`;},r);
    await page.waitForFunction(requirements=>{
      const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.art.ready&&d.art.revisedMechanisms.ready&&!d.art.formalGameplay.requestedIceSignature&&!d.art.formalGameplay.iceError&&requirements.every(({color,kind,shapeId})=>{const img=g.art.formalBlocks?.[color]?.[kind]?.[shapeId];return img&&(img.naturalWidth||img.width)>0;});
    },r.art.requirements,{timeout:60000});
    await stable();const initial=await state();
    const initialModel=new core.PuzzleModel(r.level);initialModel.start();
    assert.deepEqual(spatial(initial.puzzle),spatial(initialModel.snapshot()),`Initial model binding Lv${r.levelId}`);
    assert.deepEqual(auditOpeningCoverage(initial.puzzle),r.coverage);assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
    // Audit real renderer calls, not only logical IDs: each physical aperture
    // must be painted once with the complete authoritative portal span.
    r.gateRenderAudit=await page.evaluate(async()=>{
      const {gatePortals}=await import('/src/core/gatePortals.ts');
      const game=window.__COLOR_ESCAPE__, snapshot=game.model.snapshot(), actual=[];
      const expected=snapshot.gates.flatMap(g=>gatePortals(snapshot,g).map(p=>({color:g.color,side:p.side,size:p.size,origin:p.origin})));
      const original=game.drawGateSegment;
      game.drawGateSegment=function(...a){actual.push({color:a[3],side:a[0],size:a[2],origin:a[10]?.origin});return original.apply(this,a);};
      try{game.render();}finally{game.drawGateSegment=original;}
      const sorted=a=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
      return{expected:sorted(expected),actual:sorted(actual)};
    });
    assert.deepEqual(r.gateRenderAudit.actual,r.gateRenderAudit.expected,`Physical gate rendition Lv${r.levelId}`);
    r.gateRenderAudit.passed=true;
    const clip=await page.evaluate(()=>{const d=window.__COLOR_ESCAPE__.getDebugState(),b=d.board,t=d.viewportTransform,c=document.querySelector('canvas').getBoundingClientRect();const x=c.left+t.offsetX+(b.innerX-.7*b.cell)*t.scale,y=c.top+t.offsetY+(b.innerY-.7*b.cell)*t.scale;return{x,y,width:(d.puzzle.width+1.4)*b.cell*t.scale,height:(d.puzzle.height+1.4)*b.cell*t.scale};});
    await page.screenshot({path:path.join(output,'boards',`${name}.png`),clip});
    const referenceName=`${name}${path.extname(r.sourceFrame)}`;await copyFile(r.sourceFrame,path.join(output,'reference',referenceName));
    r.renderVerified=true;r.browserOpeningCoverage=auditOpeningCoverage(initial.puzzle);
    for(let i=0;i<r.drags.length;i++){
      const drag=r.drags[i],before=(await state()).puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b,`Missing block ${r.levelId}/${i}`);
      const [gx,gy]=b.shape[0];await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
      for(const [x,y] of drag.path)await move(x+gx+.5,y+gy+.5);
      if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
      await page.mouse.up();await stable();
      const after=(await state()).puzzle,expected=core.replayRevisedRoute(r.level,r.drags.slice(0,i+1));assert(expected.valid);
      assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Pointer Lv${r.levelId}/${i+1}`);
      assert.equal(after.moves,expected.effectiveDrags);assert.equal(after.moves,before.moves+1);
    }
    assert((await state()).puzzle.complete);r.pointerReplayValidated=true;
    await page.screenshot({path:path.join(output,'boards',`${name}-complete.png`)});
    assert.deepEqual(await page.evaluate(()=>window.__PREVIEW_STORAGE__),[]);assert.deepEqual(errors,[]);
    const exception=r.levelId===26?'<p class="notice">第26关获准例外：竞品8普通＋3冰门；本次普通门重配，3个冰门5/9/14不变。不是原出口数量完全一致。</p>':'';
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${r.levelId}关 · 竞品对齐预览</title><style>${css}</style><header><small>BLOCK OUT! / Lv21–30 / v1.8</small><h1>第${r.levelId}关 · 竞品对齐预览</h1><p class="good">机制对齐${r.levelId===26?'（含已批准出口例外）':''} · 开局满铺 ${r.coverage.coveredCells}/${r.coverage.playableCells} · 完整模型和真实Pointer通关</p></header><main><div class="pair"><section class="panel"><h2>竞品开局参考</h2><img src="../reference/${referenceName}" alt="竞品第${r.levelId}关"></section><section class="panel"><h2>本次候选开局</h2><img src="../boards/${name}.png" alt="本次第${r.levelId}关"></section></div>${detailTable(r)}${exception}${gateTable(r)}<div class="notes"><p>卷帘计数与隐藏批量成对核对；机制统计包含开局及全部隐藏块。关内阶段允许重排，不复制竞品出现秒数。</p><p>完整路线 ${r.replay.effectiveDrags} 次拖动，仅证明可解，不是必要腾挪下界。临时预览时限${r.level.timeSeconds}秒；时间、三星与正式发布尚未验收。</p></div><nav><a href="../index.html">返回10关图集</a><a href="${name}.json">候选与完整验证</a><a href="${name}.png">查看对比大图</a></nav></main><footer>仅21–30隔离预览；正式LEVELS、Lv1–20及用户存档未改。全季首次引入尚未认证。</footer></html>`;
    await writeFile(path.join(output,'levels',`${name}.html`),html,{flag:'wx'});
    r.previewComplete=true;await writeFile(path.join(output,'levels',`${name}.json`),JSON.stringify(r,null,2)+'\n',{flag:'wx'});
    console.log(`PASS strict preview Lv${r.levelId}; pointer=${r.drags.length} drags`);
  }
  const cards=rows.map(r=>{const n=`level-${String(r.levelId).padStart(3,'0')}`;return `<a class="card" href="levels/${n}.html"><h2>第${r.levelId}关</h2><img src="boards/${n}.png" alt="第${r.levelId}关"><p class="good">机制对齐${r.levelId===26?' · 出口特例':''} / 出口≤3格 / 可解 / 满铺</p><small>${r.sourceBoard.kind==='normal'?'矩形与竞品一致':'原创异形轮廓保留'}<br>${r.level.width}×${r.level.height} · 开局${r.proposedFacts.opening} / 全关${r.proposedFacts.full}</small></a>`;}).join('');
  await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–30关 · 最新竞品对齐预览</title><style>${css}</style><header><small>BLOCK OUT! / STRICT ALIGNMENT v1.8</small><h1>21–30关 · 出口≤3格修正版</h1><p>已完成 ${rows.length}/10 关。第21、22、28、29关恢复竞品同尺寸矩形；其余关保留当前原创异形轮廓。</p><p class="good">本批全部实际出口≤3格，每色一扇；已重新验证缩门后的整关路线。</p><p>机制种类、数量和已知关键值逐关核对；第26关保留已批准的出口特例。所有展示关卡均通过首稳定画面满铺、新模型完整回放与真实Pointer通关。</p><nav><a href="overview.png">10关总览图</a><a href="review.json">完整检查记录</a></nav></header><main class="gallery">${cards}</main><footer>本轮只处理21–30关，未改正式地图或存档。暂不考核必挪次数；时间与三星待后续标定。点击关卡查看竞品对照与大图。</footer></html>`,{flag:'wx'});
  const design=await browser.newPage({viewport:{width:1500,height:1200}});design.on('pageerror',e=>errors.push(e.message));
  for(const r of rows){const n=`level-${String(r.levelId).padStart(3,'0')}`;await design.goto(`${origin}/${relative}/levels/${n}.html`,{waitUntil:'networkidle'});await design.screenshot({path:path.join(output,'levels',`${n}.png`),fullPage:true});}
  await design.setViewportSize({width:1800,height:1400});await design.goto(`${origin}/${relative}/index.html`,{waitUntil:'networkidle'});
  await design.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth));await design.screenshot({path:path.join(output,'overview.png'),fullPage:true});
  await design.setViewportSize({width:390,height:844});
  for(const suffix of ['index.html',...rows.map(r=>`levels/level-${String(r.levelId).padStart(3,'0')}.html`)]){
    const response=await design.goto(`${origin}/${relative}/${suffix}`,{waitUntil:'networkidle'});assert.equal(response.status(),200);
    assert(await design.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mobile overflow ${suffix}`);
    await design.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth));
  }
  report.mobileQa={viewport:[390,844],pages:rows.length+1,passed:true};assert.deepEqual(errors,[]);await unchanged();report.status=rows.length===10?'verified-10-of-10':'partial-batch-verified';
}catch(e){report.status='failed';report.error=(e.stack??String(e)).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-preview-core');process.exitCode=1;await writeFile(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><h1>本批未通过最终校验</h1><p>不得视为合格交付，旧图集未覆盖。</p><pre>${esc(report.error)}</pre>`);}
finally{
  report.completePreviewCount=rows.filter(r=>r.previewComplete).length;report.remainingLevelIds=Array.from({length:10},(_,i)=>i+21).filter(id=>!rows.some(r=>r.levelId===id&&r.previewComplete));
  report.outputFiles={};async function outputs(dir=''){for(const e of await readdir(path.join(output,dir),{withFileTypes:true})){const p=path.posix.join(dir,e.name);if(e.isDirectory())await outputs(p);else if(p!=='review.json')report.outputFiles[p]={sha256:digest(await readFile(path.join(output,p)))};}}
  await outputs();await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();
}
console.log(JSON.stringify({output:relative,status:report.status,completePreviewCount:report.completePreviewCount,error:report.error}));
