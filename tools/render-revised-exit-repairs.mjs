import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {verifyExitOnlyRepair,verifyReviewedLayout,EXIT_REPAIR_BASELINE,EXIT_REPAIR_BASELINE_SHA} from './revised-exit-repair-review.mjs';
import {loadReviewed31Source} from './revised-source-review-lv031.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

// Diagnostic progress gallery: exit-only rows are NEVER labelled fully aligned.
const root=process.cwd(),summaryPath=process.argv[2];assert(summaryPath,'Pass a stable exit-repair summary.json');
const lock=verifyRulesLock({readText:p=>readFileSync(path.resolve(root,p),'utf8')});assert(lock.ok&&lock.activeVersion==='1.8.0');
const files={},rows=[],errors=[];
async function bind(p,expected){const sha256=digest(await readFile(path.resolve(root,p)));if(expected)assert.equal(sha256,expected,`Input drift: ${p}`);if(files[p])assert.equal(sha256,files[p].sha256,`Concurrent write: ${p}`);files[p]={sha256};}
async function tree(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.posix.join(dir,e.name);if(e.isDirectory())await tree(p);else await bind(p);}}
async function unchanged(){for(const[p,b]of Object.entries(files))await bind(p,b.sha256);}
for(const p of [summaryPath,'docs/rules/manifest.json','docs/mechanism-rules-v1.8.0.md','tools/render-revised-exit-repairs.mjs',
  'tools/revised-exit-repair-review.mjs','tools/revised-source-review-lv031.mjs','tools/revised-gate-span-limits.mjs','tools/revised-opening-coverage.mjs',
  'tools/revised-preview-validation-v160.mjs','tools/strict-mechanism-alignment-v170.mjs','tools/strict-board-alignment-v170.mjs',
  'tools/verify-rules-lock.mjs','tools/revised-candidate-route.html','tools/revised-candidate-route-browser.mjs'])await bind(p);
// Include generator bodies, star/curtain/lift/axis art and the rest of the
// actual image inputs, not only the block and fixed-border PNG subsets.
await tree('src');await tree('public/assets/art');
await bind(EXIT_REPAIR_BASELINE,EXIT_REPAIR_BASELINE_SHA);
const baseline=JSON.parse(await readFile(EXIT_REPAIR_BASELINE)),summary=JSON.parse(await readFile(summaryPath));
const {api:core,inputs}=await loadPreviewCore();for(const p of inputs)await bind(p);
for(const item of summary.rows.filter(r=>r.status==='exit-subtask-passed')){
  let candidatePath=item.path,source;
  if(item.levelId===31){candidatePath=path.posix.join(path.posix.dirname(summaryPath.replaceAll('\\','/')),'candidate-31-rectangle.json');const loaded=await loadReviewed31Source(root);source=loaded.source;for(const[p,b]of Object.entries(loaded.bindings))await bind(p,b.sha256);}
  await bind(candidatePath,candidatePath===item.path?item.sha256:undefined);
  const raw=JSON.parse(await readFile(candidatePath));
  for(const[p,b]of Object.entries(raw.bindings??{}))await bind(p,b.sha256);
  const r=source?verifyReviewedLayout(raw,source,core):verifyExitOnlyRepair(raw,baseline.rows.find(x=>x.levelId===item.levelId),core);
  assert.equal((r.level.flipDoors??[]).length,0,'This initial-frame drawing probe covers fixed gates only; flip-door rendering requires a separate probe');
  for(const req of r.art.requirements)await bind(`public/${req.path}`);
  r.inputCandidate=candidatePath;rows.push(r);
}
assert(rows.length);assert.equal(new Set(rows.map(r=>r.levelId)).size,rows.length);rows.sort((a,b)=>a.levelId-b.levelId);await unchanged();
const relative=`deliverables/revised-exit-repair-progress-lv031-200-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`,output=path.resolve(root,relative);
for(const d of ['boards','levels','reference'])await mkdir(path.join(output,d),{recursive:true});
const ids=Array.from({length:170},(_,i)=>i+31),existingIds=baseline.rows.filter(r=>r.levelId>=31).map(r=>r.levelId);
const report={ruleVersion:'1.8.0',scope:'Exit repair progress; partially source-reviewed; NOT all170 complete',requestedCount:170,files,rows,errors,
  status:'running',exitReviewCount:0,strictPreviewCount:0,missingCandidateIds:ids.filter(id=>!existingIds.includes(id)),
  unresolvedExitIds:existingIds.filter(id=>!rows.some(r=>r.levelId===id)),releaseApproved:false,sourceFirstIntroductionCertified:false,lowerBoundCertified:false,timeValidated:false};
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,watch:{ignored:['**/deliverables/**','**/.codex-temp/**']}},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:1078}});
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.__PREVIEW_STORAGE__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__PREVIEW_STORAGE__.push(m);throw Error('No save access');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__PREVIEW_STORAGE__.push(m);throw Error('No database access');};});
const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const stable=()=>page.waitForFunction(()=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.puzzle?.started&&!d.generatorSpawnAnimations.length&&!d.revisedMechanismAnimations.length&&!d.exitAnimations.length;},undefined,{timeout:20000});
const spatial=s=>{const{moves,remainingSeconds,autonomousStarted,...rest}=s;return JSON.parse(JSON.stringify(rest));};
async function move(x,y){const p=await page.evaluate(({x,y})=>{const d=window.__COLOR_ESCAPE__.getDebugState(),c=document.querySelector('canvas').getBoundingClientRect(),t=d.viewportTransform;return{x:c.left+t.offsetX+(d.board.innerX+x*d.board.cell)*t.scale,y:c.top+t.offsetY+(d.board.innerY+y*d.board.cell)*t.scale};},{x,y});await page.mouse.move(p.x,p.y,{steps:3});}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const css=`*{box-sizing:border-box}body{margin:0;background:#14112e;color:#fff4df;font:16px/1.6 "Microsoft YaHei",sans-serif}header,footer{padding:22px 30px}h1{font-size:30px;margin:8px 0}h2{font-size:22px;margin:8px 0}p,small{color:#c9c2e9}a{color:#f2c872}main{padding:0 30px 26px}.good{color:#a4efc3}.notice{color:#ffcf7c}.gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.card,.panel{background:#262047;border:1px solid #5b4b7a;border-radius:16px;padding:16px;min-width:0}.card{text-decoration:none;color:inherit}.card img{width:100%;height:450px;object-fit:contain;background:#211c58;border-radius:10px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.pair img{width:100%;height:650px;object-fit:contain}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:8px;border-bottom:1px solid #554570;text-align:left;overflow-wrap:anywhere}th{background:#3e3260}nav{display:flex;gap:20px;flex-wrap:wrap}pre{overflow-wrap:anywhere;white-space:pre-wrap}.pending{padding-top:28px;overflow-wrap:anywhere}@media(max-width:1000px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){header,footer{padding:18px}main{padding:0 18px 20px}h1{font-size:25px}.gallery,.pair{grid-template-columns:1fr}.pair img{height:520px}td,th{font-size:13px}}`;
const badge=r=>r.qualifiedPreview?'本关机制与轮廓严格对齐通过':'仅出口专项通过；机制／轮廓未全部对齐';
const gateRows=r=>r.gateSpanAudit.portals.map(g=>`<tr><td>${esc(g.color)}</td><td>${esc(g.side)}</td><td>${g.size}格</td><td>${g.allowedMax}格</td></tr>`).join('');
try{
  await page.goto(`${origin}/tools/revised-candidate-route.html`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__REVISED_CANDIDATE_ROUTE__,undefined,{timeout:60000});
  for(const r of rows){
    const name=`level-${String(r.levelId).padStart(3,'0')}`;
    await page.evaluate(r=>{window.__REVISED_CANDIDATE_ROUTE__.load({levelId:r.levelId,ruleVersion:'1.8.0',level:r.level});document.querySelector('#status').textContent=`第${r.levelId}关 · 出口专项复核 · 非正式地图`;},r);
    await page.waitForFunction(req=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.art.ready&&d.art.revisedMechanisms.ready&&!d.art.formalGameplay.requestedIceSignature&&!d.art.formalGameplay.iceError&&req.every(({color,kind,shapeId})=>{const a=g.art.formalBlocks?.[color]?.[kind]?.[shapeId];return a&&(a.naturalWidth||a.width)>0;});},r.art.requirements,{timeout:60000});
    await stable();const initial=await state(),model=new core.PuzzleModel(r.level);model.start();
    assert.deepEqual(spatial(initial.puzzle),spatial(model.snapshot()),`Opening model Lv${r.levelId}`);assert.deepEqual(auditOpeningCoverage(initial.puzzle),r.coverage);assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
    r.gateRenderAudit=await page.evaluate(async()=>{const{gatePortals}=await import('/src/core/gatePortals.ts');const game=window.__COLOR_ESCAPE__,s=game.model.snapshot(),actual=[],expected=s.gates.flatMap(g=>gatePortals(s,g).map(p=>({color:g.color,side:p.side,size:p.size,origin:p.origin})));const original=game.drawGateSegment;game.drawGateSegment=function(...a){actual.push({color:a[3],side:a[0],size:a[2],origin:a[10]?.origin});return original.apply(this,a);};try{game.render();}finally{game.drawGateSegment=original;}const sort=a=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));return{actual:sort(actual),expected:sort(expected)};});
    assert.deepEqual(r.gateRenderAudit.actual,r.gateRenderAudit.expected,`Real gate geometry Lv${r.levelId}`);r.gateRenderAudit.passed=true;
    const clip=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),b=d.board,t=d.viewportTransform,c=document.querySelector('canvas').getBoundingClientRect();let minX=-.7,minY=-.7,maxX=d.puzzle.width+.7,maxY=d.puzzle.height+.7;for(const machine of d.puzzle.generators??[]){const a=g.generatorRimAnchor(machine),v=a.quarterTurns%2===1,art=v?g.art.videoParity.sideGeneratorVertical:g.art.videoParity.sideGenerator;const depth=v?3*(art.naturalWidth||art.width)/(art.naturalHeight||art.height):3*(art.naturalHeight||art.height)/(art.naturalWidth||art.width);const rect=a.quarterTurns===0?{x:a.x-1.5,y:a.y-depth,w:3,h:depth}:a.quarterTurns===2?{x:a.x-1.5,y:a.y,w:3,h:depth}:a.quarterTurns===1?{x:a.x,y:a.y-1.5,w:depth,h:3}:{x:a.x-depth,y:a.y-1.5,w:depth,h:3};minX=Math.min(minX,rect.x-.15);minY=Math.min(minY,rect.y-.15);maxX=Math.max(maxX,rect.x+rect.w+.15);maxY=Math.max(maxY,rect.y+rect.h+.15);}const x=Math.max(0,c.left+t.offsetX+(b.innerX+b.cell*minX)*t.scale),y=Math.max(0,c.top+t.offsetY+(b.innerY+b.cell*minY)*t.scale);return{x,y,width:Math.min(innerWidth-x,(maxX-minX)*b.cell*t.scale),height:Math.min(innerHeight-y,(maxY-minY)*b.cell*t.scale)};});
    await page.screenshot({path:path.join(output,'boards',`${name}.png`),clip});r.renderVerified=true;
    for(let i=0;i<r.drags.length;i++){
      const drag=r.drags[i],before=(await state()).puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b);const[gx,gy]=b.shape[0];await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const[x,y]of drag.path)await move(x+gx+.5,y+gy+.5);if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}await page.mouse.up();await stable();const after=(await state()).puzzle,expected=core.replayRevisedRoute(r.level,r.drags.slice(0,i+1));assert(expected.valid);assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Pointer Lv${r.levelId}/${i+1}`);assert.equal(after.moves,expected.effectiveDrags);assert.equal(after.moves,before.moves+1);
    }
    assert((await state()).puzzle.complete);r.pointerReplayValidated=true;await page.screenshot({path:path.join(output,'boards',`${name}-complete.png`)});assert.deepEqual(await page.evaluate(()=>window.__PREVIEW_STORAGE__),[]);assert.deepEqual(errors,[]);
    let reference='';if(r.sourceFrame){const ref=`${name}${path.extname(r.sourceFrame)}`;await copyFile(r.sourceFrame,path.join(output,'reference',ref));reference=`<section class="panel"><h2>竞品开局证据</h2><img src="../reference/${ref}" alt="竞品第${r.levelId}关"></section>`;}
    const unresolved=r.qualifiedPreview?'本关独立视频来源、机制数量、正常矩形均已复核。':`<strong>尚未符合整关严格对齐验收。</strong> 本次只修已有候选的门长与位置，保留原块／轮廓／机制；原有来源未知与差异未消除。<details><summary>展开原来源差异与未知</summary><pre>${esc(JSON.stringify({differences:r.comparison,designDifferences:r.designDifferences},null,2))}</pre></details>`;
    await writeFile(path.join(output,'levels',`${name}.html`),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${r.levelId}关出口复核</title><style>${css}</style><header><small>BLOCK OUT! / v1.8 EXIT REVIEW</small><h1>第${r.levelId}关 · 出口修复</h1><p class="${r.qualifiedPreview?'good':'notice'}">${badge(r)}</p></header><main><div class="pair">${reference}<section class="panel"><h2>本次实际开局</h2><img src="../boards/${name}.png" alt="第${r.levelId}关缩门后的实际开局"></section><section class="panel"><h2>验证范围</h2><p class="good">实体出口长度／颜色配额通过<br>完整模型＋真实Pointer通关 ${r.drags.length} 拖<br>首稳定满铺 ${r.coverage.coveredCells}/${r.coverage.playableCells}</p><p class="notice">${unresolved}</p><p>通常每口≤3格；例外只按同色块该方向完整通行宽度。没有改正式地图或存档。临时预览时限${r.level.timeSeconds}秒；时间、三星、难度下界未认证。</p></section></div><h2>逐实体出口</h2><table><thead><tr><th>颜色</th><th>方向</th><th>实际长度</th><th>规则允许上限</th></tr></thead><tbody>${gateRows(r)}</tbody></table><nav><a href="../index.html">返回修复进度</a><a href="${name}.json">完整证据与路线</a></nav></main></html>`,{flag:'wx'});
    r.exitReviewComplete=true;await writeFile(path.join(output,'levels',`${name}.json`),JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(`PASS exit review Lv${r.levelId}; Pointer ${r.drags.length}; strict=${r.qualifiedPreview}`);
  }
  const cards=rows.map(r=>{const n=`level-${String(r.levelId).padStart(3,'0')}`;return`<a class="card" href="levels/${n}.html"><h2>第${r.levelId}关</h2><img src="boards/${n}.png" alt="第${r.levelId}关"><p class="good">出口专项／完整操作回放通过</p><small class="${r.qualifiedPreview?'good':'notice'}">${badge(r)}</small></a>`;}).join('');
  await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>31–200关出口修复进度</title><style>${css}</style><header><small>BLOCK OUT! / 31–200 / v1.8</small><h1>31–200关 · 出口修复进度</h1><p>已有27个新版候选，本轮 ${rows.length} 关通过出口专项与真实操作通关；其中 ${rows.filter(r=>r.qualifiedPreview).length} 关已完成机制／轮廓严格对齐。不是170关全部完成。</p><p class="notice">未完整对齐的关卡仅作出口返修核对图，不能进入正式地图或“已对齐”通过数。</p><nav><a href="overview.png">本批总览图</a><a href="review.json">完整验证记录</a></nav></header><main><div class="gallery">${cards}</div><section class="pending"><h2>未完成出口修复：${report.unresolvedExitIds.length}关</h2><p>${report.unresolvedExitIds.join('、')}。有界搜索尚未找到完整路线，不代表已证明无解。</p><h2>尚无新版候选：${report.missingCandidateIds.length}关</h2><p>${report.missingCandidateIds.join('、')}。不使用旧正式关卡充数。</p></section></main><footer>旧图集和21–30新图不覆盖。正式LEVELS、Lv1–20、用户存档未改；时间三星与全季首次引入尚未认证。</footer></html>`,{flag:'wx'});
  const design=await browser.newPage({viewport:{width:1500,height:1200}});design.on('pageerror',e=>errors.push(e.message));
  for(const r of rows){const n=`level-${String(r.levelId).padStart(3,'0')}`;await design.goto(`${origin}/${relative}/levels/${n}.html`,{waitUntil:'networkidle'});await design.screenshot({path:path.join(output,'levels',`${n}.png`),fullPage:true});}
  await design.setViewportSize({width:1800,height:1400});await design.goto(`${origin}/${relative}/index.html`,{waitUntil:'networkidle'});await design.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth));await design.screenshot({path:path.join(output,'overview.png'),fullPage:true});
  await design.setViewportSize({width:390,height:844});for(const suffix of ['index.html',...rows.map(r=>`levels/level-${String(r.levelId).padStart(3,'0')}.html`)]){const res=await design.goto(`${origin}/${relative}/${suffix}`,{waitUntil:'networkidle'});assert.equal(res.status(),200);assert(await design.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mobile overflow ${suffix}`);await design.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth));}
  report.mobileQa={passed:true,pages:rows.length+1,viewport:[390,844]};assert.deepEqual(errors,[]);await unchanged();report.status='partial-exit-repair-reviewed';
}catch(e){report.status='failed';report.error=(e.stack??String(e)).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-preview-core');process.exitCode=1;await writeFile(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><h1>本批复核未通过</h1><p>不能作为已完成修复交付；旧图集未改。</p><pre>${esc(report.error)}</pre>`);}
finally{report.exitReviewCount=rows.filter(r=>r.exitReviewComplete).length;report.strictPreviewCount=rows.filter(r=>r.exitReviewComplete&&r.qualifiedPreview).length;report.outputFiles={};async function outputs(dir=''){for(const e of await readdir(path.join(output,dir),{withFileTypes:true})){const p=path.posix.join(dir,e.name);if(e.isDirectory())await outputs(p);else if(p!=='review.json')report.outputFiles[p]={sha256:digest(await readFile(path.join(output,p)))};}}await outputs();await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();}
console.log(JSON.stringify({output:relative,status:report.status,exitReviewCount:report.exitReviewCount,strictPreviewCount:report.strictPreviewCount,error:report.error}));
