import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

// No solver, candidate injection, or real persisted save access. The one route
// is an immutable prior authored route replayed against today's formal LEVELS.
const root=process.cwd(),archivePath=process.argv[2]??'.codex-temp/remaining161-v110/adoption-cumulative14-v2/adoption.json';
const archive=JSON.parse(fs.readFileSync(archivePath)),routeRow=archive.rows.find(r=>r.levelId===195);
assert(routeRow?.drags?.length,'Formal Lv195 archive route required');
assert.equal(digest(fs.readFileSync(routeRow.path)),routeRow.sha256,'Pinned archived candidate');
assert.deepEqual(JSON.parse(fs.readFileSync(routeRow.path)).drags,routeRow.drags,'Archive retains complete route');
const lock=verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(root,p),'utf8')});
assert(lock.ok&&lock.activeVersion==='1.10.0','Rule lock');
const {api,inputs}=await loadPreviewCore();
const files={},bind=p=>{const sha256=digest(fs.readFileSync(p));if(files[p])assert.equal(sha256,files[p].sha256,`Input drift ${p}`);files[p]={sha256};};
for(const p of [...inputs,archivePath,routeRow.path,'docs/rules/manifest.json','docs/mechanism-rules-v1.10.0.md','src/core/levels.ts','src/core/revisedContinuationLevels.ts','src/core/revisedContinuationLayouts.generated.ts','src/core/revisedReviewedLevels.ts','src/game/ColorEscapeGame.ts','src/game/keyLockMarkerArt.ts','src/game/artManifest.ts','tools/revised-formal-levels.html','tools/revised-formal-levels-browser.mjs','tools/playtest-key-lock-group-colors.mjs'])bind(p);
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),relative=`playtest-results/key-lock-group-colors-${stamp}`,output=path.resolve(relative);fs.mkdirSync(output,{recursive:true});
const report={ruleVersion:lock.activeVersion,status:'running',scope:'All formal key/lock levels: real opening Canvas plus authored carrier marker draw probes. Only Lv195 has complete fresh real Pointer playback.',archivePath,archiveSha256:digest(fs.readFileSync(archivePath)),routeSha256:digest(routeRow.drags),files,rows:[],pointer:[],errors:[],storageBackend:'MemoryHost',clockFrozen:false,all29SolvableCertified:false,lowerBoundCertified:false,releaseApproved:false};
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**/deliverables/**','**/.codex-temp/**','**/playtest-results/**']}},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
let page;
const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
async function ready(requireStarted=false){await page.waitForFunction(requireStarted=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState(),a=g?.art.videoParity;return d?.screen==='playing'&&d.art.ready&&a&&Object.values(a.keyTokens).every(i=>(i.naturalWidth||i.width)>0)&&Object.values(a.chainLocks).every(i=>(i.naturalWidth||i.width)>0)&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length&&(!requireStarted||d.puzzle?.started);},requireStarted,{timeout:45000});}
async function frame(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function init(viewport){
 page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{window.__FORBIDDEN_STORAGE__=[];for(const m of['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__FORBIDDEN_STORAGE__.push(m);throw Error('Persistent storage forbidden');};for(const m of['open','deleteDatabase'])indexedDB[m]=function(){window.__FORBIDDEN_STORAGE__.push(m);throw Error('Persistent database forbidden');};});
 await page.goto(`${origin}/tools/revised-formal-levels.html`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__REVISED_FORMAL_LEVELS__,undefined,{timeout:60000});
 await page.evaluate(async()=>{
  const {keyLockMarkerColor}=await import('/src/game/keyLockMarkerArt.ts');const g=window.__COLOR_ESCAPE__;
  window.__KEY_GROUP_PROBE__={calls:[],scope:null,phase:'opening',color:group=>keyLockMarkerColor(group,g.model.level)};
  const p=window.__KEY_GROUP_PROBE__,marker=g.drawBlockMechanicMarkers,flight=g.drawRevisedKeyFlights,draw=g.ctx.drawImage,text=g.ctx.fillText;
  g.drawBlockMechanicMarkers=function(b,...rest){const old=p.scope;p.scope={mode:p.phase,blockId:b.id,keyId:b.keyId,lockedBy:b.lockedBy,lockCount:b.lockCount};try{return marker.call(this,b,...rest);}finally{p.scope=old;}};
  g.drawRevisedKeyFlights=function(...args){const old=p.scope;p.scope={mode:'flight',transitions:this.revisedTransitions.filter(t=>t.kind==='lock').map(t=>({...t}))};try{return flight.apply(this,args);}finally{p.scope=old;}};
  g.ctx.drawImage=function(img,...args){if(p.scope){for(const [kind,items]of[['key',g.art.videoParity?.keyTokens],['lock',g.art.videoParity?.chainLocks]])for(const[color,image]of Object.entries(items??{}))if(image===img)p.calls.push({...p.scope,kind,color,src:img.src,args,alpha:this.globalAlpha,at:performance.now()});}return draw.call(this,img,...args);};
  g.ctx.fillText=function(value,...args){if(p.scope?.lockedBy)p.calls.push({...p.scope,kind:'text',value:String(value),args,at:performance.now()});return text.call(this,value,...args);};
 });
}
async function load(id,reducedMotion){
 return page.evaluate(async({id,reducedMotion})=>{const{getLevelStrict}=await import('/src/core/levels.ts');const g=window.__COLOR_ESCAPE__;g.save.reducedMotion=reducedMotion;g.loadLevel(id,true);g.updateToastVisible=false;window.__KEY_GROUP_PROBE__.calls=[];window.__KEY_GROUP_PROBE__.phase='opening';document.querySelector('#status').textContent=`正式第${id}关 · 钥匙组配色核查 · 内存存档`;if(g.model.level!==getLevelStrict(id))throw Error('Formal identity failed');return structuredClone(g.model.level);},{id,reducedMotion});
}
function checkCalls(calls,groups,level,label){
 const lookup=new Map(groups.map(g=>[g.id,g.color]));
 for(const c of calls){if(c.kind==='text')continue;if(c.mode==='flight'){
   for(const t of c.transitions){const group=level.blocks.find(b=>b.id===t.targetId)?.lockedBy;assert(group,`${label} flight authored target group`);assert.equal(t.color,lookup.get(group),`${label} flight transition group color`);}
   assert(c.transitions.some(t=>t.color===c.color),`${label} actual flight image color`);
  }else{const group=c.kind==='key'?c.keyId:(c.lockedBy??level.blocks.find(b=>b.id===c.blockId)?.lockedBy);assert.equal(c.color,lookup.get(group),`${label} actual ${c.kind} image/group ${group}`);}
 }
}
async function inspect(id){
 const level=await load(id,true);await ready();await frame();
 const audit=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,p=window.__KEY_GROUP_PROBE__,l=g.model.level,ids=[...new Set(l.blocks.flatMap(b=>[b.keyId,b.lockedBy].filter(Boolean)))].sort();const groups=ids.map(id=>({id,color:p.color(id),keyCount:l.blocks.filter(b=>b.keyId===id).length,lockCounts:l.blocks.filter(b=>b.lockedBy===id).map(b=>b.lockCount??1),keyBlockIds:l.blocks.filter(b=>b.keyId===id).map(b=>b.id),lockBlockIds:l.blocks.filter(b=>b.lockedBy===id).map(b=>b.id)}));p.calls=[];g.render();const openingCalls=structuredClone(p.calls);p.calls=[];p.phase='authored-carrier-probe';const b=g.boardLayout();for(const block of l.blocks.filter(x=>x.keyId||x.lockedBy)){const cells=block.shape.map(([x,y])=>[block.x+x,block.y+y]);g.drawBlockMechanicMarkers({...block},cells,b);}const authoredCalls=structuredClone(p.calls);p.phase='opening';p.calls=[];g.render();return{groups,openingCalls,authoredCalls,authoredCarrierCount:l.blocks.filter(x=>x.keyId||x.lockedBy).length,completeRouteReplayed:false};});
 assert.equal(new Set(audit.groups.map(g=>g.color)).size,audit.groups.length,`Lv${id} distinct groups must have distinct colors`);
 assert(audit.groups.length<=8,`Lv${id} available marker color capacity`);
 checkCalls(audit.openingCalls,audit.groups,level,`Lv${id} opening`);checkCalls(audit.authoredCalls,audit.groups,level,`Lv${id} authored`);
 for(const b of level.blocks){if(b.keyId)assert(audit.authoredCalls.some(c=>c.blockId===b.id&&c.kind==='key'),`Lv${id} key actually drawn`);if(b.lockedBy){assert(audit.authoredCalls.some(c=>c.blockId===b.id&&c.kind==='lock'),`Lv${id} lock actually drawn`);assert(audit.authoredCalls.some(c=>c.blockId===b.id&&c.kind==='text'&&c.value===String(b.lockCount??1)),`Lv${id} lock counter actually drawn`);}}
 const screenshot=`level-${String(id).padStart(3,'0')}-opening.png`;await page.locator('canvas').screenshot({path:path.join(output,screenshot)});
 const row={levelId:id,formalLevelSha256:digest(level),viewport:{width:496,height:1078},screenshot,...audit,status:'passed'};report.rows.push(row);console.log(`PASS Canvas Lv${id}: ${audit.groups.map(g=>g.id+'='+g.color).join(', ')}`);
}
async function move(x,y){const p=await page.evaluate(({x,y})=>{const d=window.__COLOR_ESCAPE__.getDebugState(),c=document.querySelector('canvas').getBoundingClientRect(),t=d.viewportTransform;return{x:c.left+t.offsetX+(d.board.innerX+x*d.board.cell)*t.scale,y:c.top+t.offsetY+(d.board.innerY+y*d.board.cell)*t.scale};},{x,y});await page.mouse.move(p.x,p.y,{steps:3});}
const spatial=s=>{const{moves,remainingSeconds,autonomousStarted,...rest}=s;return JSON.parse(JSON.stringify(rest));};
async function pointer(label){
 const level=await load(195,false);assert.equal(level.timeSeconds,routeRow.previous.timeSeconds,'Original formal time retained');await ready(true);await frame();
 const groups=report.rows.find(r=>r.levelId===195).groups;assert.equal(groups.length,2);assert(groups.every(g=>g.keyCount===3&&g.lockCounts.length===1&&g.lockCounts[0]===3),'Lv195 two authored 3-key/3-count groups');
 const row={levelId:195,label,viewport:page.viewportSize(),formalLevelSha256:digest(level),groups,steps:[],screenshots:[],clockFrozen:false,complete:false};report.pointer.push(row);
 const shot=async name=>{const file=`lv195-${label}-${name}.png`;await page.locator('canvas').screenshot({path:path.join(output,file)});row.screenshots.push(file);};await shot('before');
 row.openingSeconds=(await state()).puzzle.remainingSeconds;
 for(const[i,drag]of routeRow.drags.entries()){
  const before=(await state()).puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b);
  await page.evaluate(()=>{window.__KEY_GROUP_PROBE__.calls=[];window.__KEY_GROUP_PROBE__.phase='pointer-static';});
  const[gx,gy]=b.shape[0];await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const[x,y]of drag.path)await move(x+gx+.5,y+gy+.5);if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}await page.mouse.up();
  const immediate=(await state()).puzzle,removed=b.keyId&&!immediate.blocks.some(x=>x.id===b.id);
  if(removed){await page.waitForFunction(()=>window.__KEY_GROUP_PROBE__.calls.some(c=>c.mode==='flight'&&c.kind==='key'&&c.alpha>0),undefined,{timeout:5000});await shot(`step-${i+1}-key-flight`);}
  await ready();const after=(await state()).puzzle,expected=api.replayRevisedRoute(level,routeRow.drags.slice(0,i+1));assert(expected.valid);assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Lv195 ${label} real Pointer step${i+1}`);assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
  const calls=await page.evaluate(()=>structuredClone(window.__KEY_GROUP_PROBE__.calls));checkCalls(calls,groups,level,`Lv195 ${label}/${i+1}`);
  const counts=groups.map(g=>({group:g.id,before:before.blocks.find(b=>b.id===g.lockBlockIds[0])?.lockCount??0,after:after.blocks.find(b=>b.id===g.lockBlockIds[0])?.lockCount??0}));
  for(const c of counts)assert.equal(c.after,Math.max(0,c.before-(removed&&b.keyId===c.group?1:0)),`Lv195 correct group only decrements ${c.group}`);
  for(const g of groups)assert.equal(await page.evaluate(id=>window.__KEY_GROUP_PROBE__.color(id),g.id),g.color,'Palette stable after key/lock removal');
  if(removed){assert(calls.some(c=>c.mode==='flight'&&c.kind==='key'),'Actual flying key Canvas image');await shot(`step-${i+1}-lock-${counts.find(c=>c.group===b.keyId).after}`);}
  row.steps.push({step:i+1,blockId:b.id,removedKeyGroup:removed?b.keyId:null,counts,flightDraws:calls.filter(c=>c.mode==='flight'),remainingSeconds:after.remainingSeconds,complete:after.complete});
 }
 const final=(await state()).puzzle;assert(final.complete&&!final.failed);row.complete=true;row.drags=final.moves;row.remainingSeconds=final.remainingSeconds;
 for(const g of groups){const chain=[3,...row.steps.filter(s=>s.removedKeyGroup===g.id).map(s=>s.counts.find(c=>c.group===g.id).after)];assert.deepEqual(chain,[3,2,1,0]);}
 await shot('complete');assert.deepEqual(await page.evaluate(()=>window.__FORBIDDEN_STORAGE__),[]);row.status='passed';console.log(`PASS Lv195 ${label}: ${row.drags} real Pointer drags; both groups3→2→1→0`);
}
try{
 await init({width:496,height:1078});
 const levels=await page.evaluate(async()=>{const{LEVELS}=await import('/src/core/levels.ts');return LEVELS.filter(l=>l.blocks.some(b=>b.keyId||b.lockedBy)).map(l=>l.id);});
 assert.equal(levels.length,29,'Expected current formal key/lock level inventory');report.ids=levels;
 for(const id of [195,...levels.filter(n=>n!==195)])await inspect(id);
 await pointer('standard');report.memoryHost=await page.evaluate(()=>window.__REVISED_FORMAL_LEVELS__.storage());assert.deepEqual(await page.evaluate(()=>window.__FORBIDDEN_STORAGE__),[]);await page.close();
 await init({width:320,height:568});await pointer('small');report.smallMemoryHost=await page.evaluate(()=>window.__REVISED_FORMAL_LEVELS__.storage());
 assert.deepEqual(report.errors,[]);for(const p of Object.keys(files))bind(p);report.status='passed';
}catch(e){report.status='failed';report.error=String(e.stack??e);process.exitCode=1;if(page){report.failureDebug=await state().catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}}
finally{
 report.inputDrift=Object.entries(files).flatMap(([p,b])=>{const current=digest(fs.readFileSync(p));return current===b.sha256?[]:[{path:p,expected:b.sha256,current}];});
 if(page)await page.close().catch(()=>{});await browser.close();await server.close();
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const routeSummary=report.pointer.map(p=>`${escape(p.label)}：${p.drags??'未完成'}拖，${p.complete?'完整通关':'未验证完成'}`).join('；');
 const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>钥匙锁分组颜色核查</title><style>body{margin:24px;background:#15112d;color:#eee;font:16px system-ui}a{color:#9ef}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{background:#282244;border-radius:16px;padding:16px}img{width:100%;max-height:650px;object-fit:contain}li{margin:8px 0}</style><h1>钥匙锁分组颜色 · 当前正式关卡</h1><p>本次结果：${escape(report.status)}。${report.rows.length}/29关实际开局画布与完整authored分组标记检查。仅第195关另做真实Pointer：${routeSummary}；没有宣称29关全部通关。锁数字3仍需3个同组钥匙块完整移出。</p><p><a href="report.json">完整机器报告</a> · 内存测试存档，不操作用户进度 · 不修改旧图集</p><main>${report.rows.map(r=>`<article><h2>第${r.levelId}关</h2><img src="${r.screenshot}" alt="正式第${r.levelId}关开局"><ul>${r.groups.map(g=>`<li>${escape(g.id)}：${escape(g.color)}；钥匙${g.keyCount}；锁剩余需求[${g.lockCounts.join(',')}]</li>`).join('')}</ul>${r.levelId===195?report.pointer.flatMap(p=>p.screenshots.map(s=>`<a href="${s}">${escape(s)}</a><br>`)).join(''):''}</article>`).join('')}</main>`;
 fs.writeFileSync(path.join(output,'index.html'),html,{flag:'wx'});report.outputFiles=Object.fromEntries(fs.readdirSync(output).map(f=>[f,{sha256:digest(fs.readFileSync(path.join(output,f)))}]));fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output:relative,status:report.status,canvasLevels:report.rows.length,pointerRuns:report.pointer.filter(r=>r.status==='passed').length,error:report.error}));
}
