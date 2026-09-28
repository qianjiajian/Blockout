import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyContinuationBatch} from './revised-continuation-batch.mjs';

const [archivePath,archiveSha,uiPath]=process.argv.slice(2);
assert(archivePath&&archiveSha&&uiPath,'Pass pinned adoption archive and complete formal Pointer report');
const checked=await verifyContinuationBatch(archivePath,archiveSha),archive=JSON.parse(fs.readFileSync(archivePath));
const ui=JSON.parse(fs.readFileSync(uiPath));assert.equal(ui.status,'passed');assert.deepEqual(ui.ids,archive.rows.map(r=>r.levelId));
assert.equal(ui.archiveSha256,archiveSha);assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.forbiddenStorage,[]);
for(const [p,b]of Object.entries(ui.files))assert.equal(digest(fs.readFileSync(p)),b.sha256,'UI report input drift '+p);
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),out=`deliverables/revised-formal-progress-v110-${stamp}`;
fs.mkdirSync(path.join(out,'boards'),{recursive:true});fs.mkdirSync(path.join(out,'reference'),{recursive:true});
const bindings={...checked.inputs,...Object.fromEntries(Object.entries(ui.files).map(([p,b])=>[p,b.sha256])),
  'tools/render-revised-continuation-progress.mjs':digest(fs.readFileSync('tools/render-revised-continuation-progress.mjs')),
  [archivePath]:digest(fs.readFileSync(archivePath)),[uiPath]:digest(fs.readFileSync(uiPath))};
const rows=[];
for(const row of checked.rows){
 const actual=ui.rows.find(r=>r.levelId===row.levelId);assert(actual?.complete&&actual.pointerReplayValidated);assert.equal(actual.formalLevelSha256,row.formalLevelSha256);
 const name=`level-${String(row.levelId).padStart(3,'0')}`,image=`${name}-board.png`,imagePath=path.join(path.dirname(uiPath),image);
 assert.equal(digest(fs.readFileSync(imagePath)),ui.outputFiles[image]?.sha256);bindings[imagePath]=ui.outputFiles[image].sha256;
 fs.copyFileSync(imagePath,path.join(out,'boards',`${name}.png`));
 const frame=row.sourceFrame,ext=path.extname(frame),reference=`reference/${name}${ext}`;bindings[frame]=digest(fs.readFileSync(frame));fs.copyFileSync(frame,path.join(out,reference));
 const complete={...row,formal:true,pointerReplayValidated:true,naturalClockValidated:true,
   retainedTimeSeconds:actual.metadata.timeSeconds,retainedStarTargets:actual.metadata.actualStarTargets,
   remainingSeconds:actual.remainingSeconds,image:`boards/${name}.png`,reference,uiReport:uiPath};
 fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify(complete,null,2)+'\n',{flag:'wx'});rows.push(complete);
}
const previous='deliverables/revised-season-design-progress-v190-2026-09-22T10-10-14-828Z/progress.json';
const previousBytes=fs.readFileSync(previous);assert.equal(digest(previousBytes),'dbe85e7f53aad8cccceeff14568ab58ea1b4d46378f583a48bc9009ff09dfdf5');bindings[previous]=digest(previousBytes);
const older=JSON.parse(previousBytes),adopted=new Set(checked.formalIds),byId=new Map(rows.map(r=>[r.levelId,r]));
const all=Array.from({length:180},(_,i)=>{const id=i+21,old=older.rows.find(r=>r.levelId===id),row=byId.get(id);
 return {levelId:id,status:adopted.has(id)?'formal':id===39?'confirmed-conflict':old?.status==='exit-only'?'exit-only':'pending',
   ...(row?{detail:`level-${String(id).padStart(3,'0')}.json`}:old?.detailPath?{historicalPreview:`/${old.detailPath}`}:{})};});
const counts={requested:180,newFormal:rows.length,totalFormal:all.filter(r=>r.status==='formal').length,remaining:all.filter(r=>r.status!=='formal').length};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const css=`*{box-sizing:border-box}body{margin:0;background:#15102c;color:#fff3dc;font:16px/1.6 'Microsoft YaHei',sans-serif}header,main,footer{max-width:1500px;margin:auto;padding:24px}h1{font-size:30px}a{color:#ffd37b}.stats,.notice,article{background:#282043;border:1px solid #57456f;border-radius:12px;padding:16px;margin-bottom:20px}.stats{font-size:20px}.notice{color:#ffcf8e}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair figure{margin:0;text-align:center}.pair img{width:100%;height:510px;object-fit:contain;background:#1f1950}.pass{color:#91e5b5}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #4c3e60;padding:8px;text-align:left}select,input{background:#332846;color:inherit;font:inherit;padding:8px;border:1px solid #746287;border-radius:6px}tr[hidden]{display:none}@media(max-width:760px){header,main,footer{padding:15px}.grid{grid-template-columns:1fr}.pair img{height:390px}h1{font-size:24px}}`;
const cards=rows.map(r=>`<article id="level-${r.levelId}"><h2>第${r.levelId}关</h2><div class="pair"><figure><img src="${r.reference}" alt="竞品第${r.levelId}关"><figcaption>竞品来源帧</figcaption></figure><figure><img src="${r.image}" alt="正式第${r.levelId}关"><figcaption>本游戏当前正式开局</figcaption></figure></div><p class="pass">已写入正式数据 · 真实拖动通关 · 满铺／每色唯一／门长通过</p><p>${r.drags.length}次拖动完成；保留总时限${r.retainedTimeSeconds}秒，自动回放剩余${r.remainingSeconds.toFixed(1)}秒。<br>来源机制与轮廓已逐关核对；时间／三星重新标定及必要腾挪仍未认证。</p><a href="level-${String(r.levelId).padStart(3,'0')}.json">来源、布局与完整路线</a></article>`).join('');
const labels={formal:'新版已正式接入','confirmed-conflict':'8色／10冰门冲突，待处理','exit-only':'旧出口候选，整体待对齐',pending:'待来源核定／生成／验证'};
const table=all.map(r=>`<tr data-id="${r.levelId}" data-status="${r.status}"><td>${r.levelId}</td><td>${labels[r.status]}</td><td>${byId.has(r.levelId)?`<a href="#level-${r.levelId}">本轮正式图</a>`:r.historicalPreview?`<a href="${esc(r.historicalPreview)}">历史预览（非本轮重拍）</a>`:'尚未通过本轮全部门禁'}</td></tr>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–200正式生成进度</title><style>${css}</style><header><small>BLOCK OUT! / v1.10</small><h1>21–200关正式数据生成进度</h1><div class="stats">本轮新增 ${counts.newFormal} 关 · 累计正式 ${counts.totalFormal}/180 · 仍待完成 ${counts.remaining} 关</div><p class="notice">不是其余161关全部完成。只接入完成来源核定、空间检查、独立模型回放与正式入口自然计时Pointer验证的关卡。第39关继续保持8色及10个冰门，按此前决定暂缓。</p><p>第1–20关、存档、已正式的19关保持；仅重配获准的普通出口，冰门数量和初值不改。当前无必要腾挪认证，无微信实机或正式发布声明。</p><a href="#all">180关状态表</a> · <a href="progress.json">完整记录</a></header><main><div class="grid">${cards}</div><h2 id="all">逐关状态</h2><label>关号 <input id="search" placeholder="如 81" inputmode="numeric"></label> <select id="filter"><option value="all">全部</option><option value="formal">新版正式</option><option value="pending">待生成验证</option><option value="exit-only">待全面对齐</option><option value="confirmed-conflict">已确认冲突</option></select><table><thead><tr><th>关卡</th><th>状态</th><th>证据</th></tr></thead><tbody>${table}</tbody></table></main><footer>图片来自实际正式Canvas。源与候选数据分开记录；预算耗尽不算无解，缺证据不填0，不借包体优化删机制。</footer><script>const q=document.querySelector('#search'),f=document.querySelector('#filter');function update(){for(const r of document.querySelectorAll('tbody tr'))r.hidden=!!((q.value&&r.dataset.id!==q.value.trim())||(f.value!=='all'&&r.dataset.status!==f.value));}q.addEventListener('input',update);f.addEventListener('change',update);</script></html>`;
fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},
  server:{host:'127.0.0.1',port:0,watch:{ignored:['**/deliverables/**','**/.codex-temp/**','**/playtest-results/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/${out}/index.html`,{waitUntil:'networkidle',timeout:60000});
 assert(await page.evaluate(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)));
 await page.screenshot({path:path.join(out,'overview.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,'mobile.png')});await page.locator('#filter').selectOption('formal');
 assert.equal(await page.locator('tbody tr:not([hidden])').count(),counts.totalFormal);assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
for(const [p,sha]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),sha,'Gallery evidence drift');
const report={ruleVersion:'1.10.0',counts,rows:all,newFormalIds:rows.map(r=>r.levelId),bindings,
  modelVerification:{archivePath,archiveSha,campaignSemanticSha256:checked.campaignSemanticSha256},uiPath,
  browserQa:{width:390,noOverflow:true,filters:true,images:true,errors},lowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,counts}));
