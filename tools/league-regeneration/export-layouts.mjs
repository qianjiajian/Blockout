import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {build} from 'esbuild';

const root=process.cwd(), out=path.resolve('deliverables/league-layout-gallery-20261008');
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=await fs.readFile('src/core/leagueLevelData.ts');
const compiled=await build({entryPoints:['src/core/leagueLevelData.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEAGUE_LEVELS:entries}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.equal(entries.length,100);
const catalog=JSON.parse(await fs.readFile('deliverables/league-regeneration-20261006/final/catalog.json','utf8'));
assert.deepEqual(entries,catalog.entries);
await fs.mkdir(path.join(out,'images'),{recursive:true});
await fs.mkdir(path.join(out,'overview'),{recursive:true});
const harness=`import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {createLeague} from '/src/core/league.ts';
import {getLeagueLevel} from '/src/core/leagueLevels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';
class MemoryHost extends WebHost {
 data=new Map([['color-escape-save-v1',{schemaVersion:1,currentLevel:6,highestLevel:200,coins:0,sound:false,music:false,haptic:false,reducedMotion:true,language:'zh-CN',leagueIntroSeen:true,boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],boosters:{time:0,rocket:0,pulse:0},rewardedLevels:[1,2,3,4,5],bestStars:{},bestMoves:{},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}}]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}
}
const game=new ColorEscapeGame(new MemoryHost());window.__COLOR_ESCAPE__=game;
window.__EXPORT_LEVEL__=index=>{
 game.leagueRun=undefined;game.leagueRunResult=undefined;game.leagueTransaction=undefined;
 game.save.league=createLeague(Date.now(),12345,0);game.save.league.season.cleared=Array.from({length:index-1},(_,i)=>i+1);
 game.save.league.season.scoreHistory=game.save.league.season.cleared.map(()=>({atMs:game.save.league.season.joinedMs,score:0}));
 game.updateToastVisible=false;game.screen='league';game.startLeaguePrototype();
 if(game.model.level!==getLeagueLevel(index).level)throw Error('Production object identity mismatch');
 return {level:game.model.level,specials:[...game.leagueRun.specialIds]};
};game.start();`;
await fs.writeFile(path.join(out,'capture.mjs'),harness);
const baseHtml=await fs.readFile('index.html','utf8');
await fs.writeFile(path.join(out,'capture.html'),baseHtml.replace('<head>','<head><base href="/">').replace('/src/web.ts','/deliverables/league-layout-gallery-20261008/capture.mjs'));
const server=await createServer({root,configFile:false,logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});
await server.listen();
const base='http://127.0.0.1:'+server.httpServer.address().port+'/deliverables/league-layout-gallery-20261008/';
const browser=await chromium.launch({headless:true});
const rows=[],errors=[];let next=0;
try{
 await Promise.all(Array.from({length:2},async()=>{
  const ctx=await browser.newContext({viewport:{width:496,height:1078},deviceScaleFactor:1});
  await ctx.addInitScript(()=>{window.__FORBIDDEN_STORAGE__=[];for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){window.__FORBIDDEN_STORAGE__.push(key);throw Error('Persistent storage forbidden');}});});
  const page=await ctx.newPage();page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
  page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
  await page.goto(base+'capture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,null,{timeout:60000}).catch(async e=>{console.error(await page.evaluate(()=>({game:!!window.__COLOR_ESCAPE__,artError:window.__COLOR_ESCAPE__?.artLoadError,storage:window.__FORBIDDEN_STORAGE__})));throw e;});
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.openLeague();});
  await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art),null,{timeout:60000});
  while(next<entries.length){
   const entry=entries[next++],image='images/league-'+String(entry.index).padStart(3,'0')+'.png';
   const loaded=await page.evaluate(i=>window.__EXPORT_LEVEL__(i),entry.index);
   assert.deepEqual(loaded.level,entry.level);assert.deepEqual(loaded.specials,entry.specials);
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();const missingVisible=d.art.formalGameplay.missingWholeBlockIds.filter(id=>{const b=g.model.getBlock(id);return b&&g.model.isBlockActive(b);});return g.screen==='playing'&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&missingVisible.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();},null,{timeout:30000}).catch(async e=>{console.error(JSON.stringify({index:entry.index,debug:await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return {screen:g.screen,revisedArtLoading:g.revisedArtLoading,art:d.art.formalGameplay,initial:g.hasInitialRevisedRegionPresentation(),motion:g.hasActiveMechanicMotion()};})}));await page.screenshot({path:path.join(out,'capture-error-'+entry.index+'.png')});throw e;});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(100);
   const state=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return {level:g.model.level,moves:g.model.snapshot().moves,storage:window.__FORBIDDEN_STORAGE__,screen:g.screen};});
   assert.deepEqual(state.level,entry.level);assert.equal(state.moves,0);assert.deepEqual(state.storage,[]);
   const png=await page.screenshot({path:path.join(out,image)});
   assert.equal(png.readUInt32BE(16),496);assert.equal(png.readUInt32BE(20),1078);
   rows.push({index:entry.index,image,difficulty:entry.level.difficulty,width:entry.level.width,height:entry.level.height,specials:entry.specials.length,levelSha256:sha(JSON.stringify(state.level)),imageSha256:sha(png)});
   if(rows.length%10===0)console.log('Captured '+rows.length+'/100');
  }
  await ctx.close();
 }));
 rows.sort((a,b)=>a.index-b.index);assert.deepEqual(errors,[]);
 assert.equal(sha(await fs.readFile('src/core/leagueLevelData.ts')),sha(source));
 await fs.writeFile(path.join(out,'layouts.json'),JSON.stringify({source:'src/core/leagueLevelData.ts',sourceSha256:sha(source),rows},null,2));
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>荣耀联赛 · 100关布局图</title>
 <style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#172d27;font:16px/1.6 'Microsoft YaHei',sans-serif}header,main{max-width:1600px;margin:auto;padding:26px}h1{margin:0;font-size:32px}header p{color:#52685e;margin:8px 0 20px}button,input,select{font:inherit;padding:9px 14px;border:1px solid #b6c5bd;border-radius:8px;background:white;color:inherit}button{cursor:pointer}nav{display:flex;gap:10px;flex-wrap:wrap}a{color:#167655}h2{margin-top:30px}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.card{background:white;border-radius:12px;padding:10px;border:1px solid #d9e2dc}.card button{border:0;padding:0;width:100%;display:block;background:#041a15}.card img{width:100%;display:block;aspect-ratio:496/1078;object-fit:contain}.caption{font-weight:bold;margin:8px 0 0}.badge{color:#a04025}.details{font-size:13px;color:#607568}dialog{border:0;background:#09241b;color:white;border-radius:12px;padding:15px;max-width:96vw}dialog::backdrop{background:#000c}dialog img{display:block;max-height:78vh;max-width:88vw;margin:auto}dialog footer{text-align:center;margin-top:10px}dialog button{margin:5px}#count{font-size:14px;color:#61766a}.sheet header,.sheet main{max-width:none}.sheet .grid{gap:24px}.sheet .card{padding:16px}.sheet h1{font-size:44px}.sheet .caption{font-size:25px}.sheet .details{font-size:20px}.sheet nav,.sheet #count{display:none}@media(max-width:900px){.grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)}header,main{padding:16px}h1{font-size:26px}}</style>
 <header><h1>荣耀联赛 · 100关布局图</h1><p>当前正式数据的游戏开局画面 · 积分徽章与机关按游戏实际显示</p><nav><input id="search" placeholder="输入关号 1–100" type="search"><select id="difficulty"><option value="">全部难度</option><option value="hard">困难</option><option value="super">超难</option></select><button id="overviews">查看10关总览</button></nav><p id="count"></p></header><main id="content"></main>
 <dialog><img alt="关卡布局大图"><footer><div id="caption"></div><button id="prev">← 上一关</button><button id="close">关闭</button><button id="next">下一关 →</button><a id="original" target="_blank">原图</a></footer></dialog>
 <script>const DATA=__DATA__,labels={hard:'困难',super:'超难'},content=document.querySelector('#content'),box=document.querySelector('dialog');let filtered=DATA,active=0;
 const card=i=>'<article class="card"><button data-index="'+i.index+'" aria-label="放大第'+i.index+'关"><img loading="lazy" src="'+i.image+'" alt="荣耀联赛第'+i.index+'关开局布局"></button><div class="caption">第 '+String(i.index).padStart(3,'0')+' 关 · <span class="badge">'+labels[i.difficulty]+'</span></div><div class="details">'+i.width+' × '+i.height+' 棋盘 · '+i.specials+'个积分块</div></article>';
 const sheet=Number(new URLSearchParams(location.search).get('sheet'));
 function render(){const q=document.querySelector('#search').value.trim(),d=document.querySelector('#difficulty').value;filtered=DATA.filter(i=>(!q||i.index===Number(q))&&(!d||i.difficulty===d));document.querySelector('#count').textContent='显示 '+filtered.length+' / 100 关 · 点击图片放大，方向键切换';content.innerHTML='<div class="grid">'+filtered.map(card).join('')+'</div>';}
 function show(index){active=(index+filtered.length)%filtered.length;const i=filtered[active];box.querySelector('img').src=i.image;document.querySelector('#caption').textContent='荣耀联赛第 '+i.index+' 关 · '+labels[i.difficulty];document.querySelector('#original').href=i.image;if(!box.open)box.showModal();}
 if(sheet){document.body.classList.add('sheet');const start=(sheet-1)*10+1,end=sheet*10;document.querySelector('h1').textContent='荣耀联赛 · 第'+String(start).padStart(3,'0')+'–'+String(end).padStart(3,'0')+'关';content.innerHTML='<div class="grid">'+DATA.slice(start-1,end).map(card).join('')+'</div>';document.querySelectorAll('img').forEach(i=>i.loading='eager');}
 else{document.querySelector('#search').oninput=document.querySelector('#difficulty').onchange=render;render();document.querySelector('#overviews').onclick=()=>{content.innerHTML=Array.from({length:10},(_,i)=>'<p><a target="_blank" href="overview/league-'+String(i*10+1).padStart(3,'0')+'-'+String((i+1)*10).padStart(3,'0')+'.jpg">第'+(i*10+1)+'–'+((i+1)*10)+'关总览 ↗</a></p>').join('');};}
 content.onclick=e=>{const b=e.target.closest('[data-index]');if(b)show(filtered.findIndex(i=>i.index===+b.dataset.index));};document.querySelector('#close').onclick=()=>box.close();document.querySelector('#prev').onclick=()=>show(active-1);document.querySelector('#next').onclick=()=>show(active+1);document.onkeydown=e=>{if(box.open&&e.key==='ArrowRight')show(active+1);if(box.open&&e.key==='ArrowLeft')show(active-1);};box.onclick=e=>{if(e.target===box)box.close();};window.__GALLERY_READY__=true;</script></html>`;
 await fs.writeFile(path.join(out,'index.html'),html.replace('__DATA__',JSON.stringify(rows)));
 const page=await browser.newPage({viewport:{width:2480,height:2500},deviceScaleFactor:1});
 for(let i=1;i<=10;i++){
  await page.goto(base+'index.html?sheet='+i);await page.waitForFunction(()=>window.__GALLERY_READY__);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  await page.screenshot({path:path.join(out,'overview',`league-${String((i-1)*10+1).padStart(3,'0')}-${String(i*10).padStart(3,'0')}.jpg`),fullPage:true,type:'jpeg',quality:90});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'index.html');
 await page.waitForFunction(()=>window.__GALLERY_READY__);assert.equal(await page.locator('.card').count(),100);
 await page.selectOption('#difficulty','super');assert.equal(await page.locator('.card').count(),20);
 await page.locator('[data-index="3"]').click();await page.waitForFunction(()=>document.querySelector('dialog img').complete);
 await page.click('#next');assert.match(await page.locator('#caption').innerText(),/第 8 关/);await page.keyboard.press('Escape');
 await page.selectOption('#difficulty','');await page.fill('#search','100');assert.equal(await page.locator('.card').count(),1);
 await page.fill('#search','');await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await fs.writeFile(path.join(out,'export-check.json'),JSON.stringify({status:'PASS',count:100,overviews:10,productionSourceSha256:sha(source),productionObjectIdentity:true,movesBeforeCapture:0,persistentStorageAccess:0,filters:true,lightbox:true,keyboardNavigation:true,mobileNoOverflow:true,errors,scope:'Current production opening screenshots; no gameplay or difficulty re-certification.'},null,2));
 await fs.writeFile(path.join(out,'查看说明.txt'),'荣耀联赛100关布局图\r\n\r\n双击 index.html，可按关号与难度筛选，点击图片放大，方向键切换。\r\nimages：100张496×1078游戏实际开局PNG。\r\noverview：10张总览JPG，每张10关。\r\n积分徽章、出口及卷帘按游戏实际显示；隐藏区在开局保持隐藏。\r\n本次导出不修改关卡、主线或玩家存档，不重新认证难度与通关。\r\n');
 console.log(JSON.stringify({status:'PASS',output:out,count:rows.length,overviews:10}));
}finally{await browser.close();await server.close();}
