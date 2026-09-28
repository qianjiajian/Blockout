import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../../',import.meta.url));
const stage=process.argv[2];
assert.ok(['before','after'].includes(stage),'Explicit before/after stage required');
const output=resolve(root,'playtest-results/gate-rim72-20260927/ui',stage);
await mkdir(output,{recursive:true});
const paths=['src/game/boardRim.ts','src/game/ColorEscapeGame.ts','src/game/gatePortalVisualGeometry.ts','src/core/PuzzleModel.ts','src/core/levels.ts','src/core/remake71to80.ts','src/core/remake111to120.ts','tools/gate-rim72-20260927/capture.mjs'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,hash(await readFile(resolve(root,path)))])));
const report={stage,scope:'Actual production rendering in isolated MemoryHost. The thawed screenshot changes only the isolated pink gate frozen count from 1 to 0; this is a rendering-state diagnostic, not gameplay or a solved route. Half/fully retired variants override only the isolated rendering opacity of blue/pink to 0.5/0 while retaining the same model.',before:await hashes(),cases:[]};
const url='http://127.0.0.1:5180/__gate_rim72_isolated_capture__';
const html=`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {gatePortals} from '/src/core/gatePortals.ts';import {gatePortalVisualRect} from '/src/game/gatePortalVisualGeometry.ts';import {boardPortalVisualDepthTop} from '/src/game/boardRim.ts';
class MemoryHost extends WebHost{data=new Map();storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}}
const save={schemaVersion:1,currentLevel:72,highestLevel:200,coins:1000,sound:false,haptic:false,reducedMotion:true,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','flip-door','star-gate','axis','key','bomb','generator','colored-grid','lift','elevator','conveyor','star'],boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:[]},achievementProgress:{claimedIds:[]},selectedJourneyEpisode:1,collectionProgress:{version:1,inspiration:0,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]},dailyStreak:0,lastDailyCompletedDay:''};
const host=new MemoryHost();host.data.set('color-escape-save-v1',save);const game=new ColorEscapeGame(host);window.__TEST__={game,host,gatePortals,gatePortalVisualRect,boardPortalVisualDepthTop};const originalOpacity=game.gateExitOpacity;game.gateExitOpacity=function(...args){const forced=window.__TEST__.forcedOpacity;if(forced!=null&&['blue','pink'].includes(args[4]))return forced;return originalOpacity.apply(this,args);};game.start();
</script>`;
const browser=await chromium.launch({headless:true});
async function ready(page){await page.waitForFunction(()=>{const g=window.__TEST__?.game;if(!g)return false;const d=g.getDebugState();return d.screen==='playing'&&d.art.revisedMechanisms.currentSceneReady&&!d.art.revisedMechanisms.loading&&!d.art.revisedMechanisms.error&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasActiveMechanicMotion()&&!g.hasInitialRevisedRegionPresentation();},undefined,{timeout:30000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function capture(page,viewport,level,variant){
  const detail=await page.evaluate(()=>{const t=window.__TEST__,g=t.game,d=g.getDebugState(),snapshot=g.model.snapshot();return{level:structuredClone(g.model.level),snapshot,board:d.board,transform:d.viewportTransform,art:d.art,forcedOpacity:t.forcedOpacity??null,portals:snapshot.gates.flatMap(gate=>t.gatePortals(snapshot,gate).map(portal=>{const horizontal=portal.side==='top'||portal.side==='bottom',image=g.art.gates?.[gate.color]?.[horizontal?'horizontal':'vertical'][Math.min(3,portal.size)];return{gateId:gate.id,color:gate.color,frozen:gate.frozen,portal,rect:t.gatePortalVisualRect(portal,d.board),depth:t.boardPortalVisualDepthTop(portal,image?.naturalHeight||image?.height||58),image:{width:image?.naturalWidth||image?.width||0,height:image?.naturalHeight||image?.height||0}};}))};});
  assert.equal(detail.level.id,level);assert.ok(detail.portals.every(p=>p.image.width>0&&p.image.height>0));
  if(level===72){assert.equal(detail.portals.find(p=>p.color==='pink').frozen,variant==='initial'?1:0);assert.equal(detail.portals.find(p=>p.color==='blue').portal.size,3);assert.equal(detail.portals.find(p=>p.color==='pink').portal.size,3);}
  const filename=`level${level}-${viewport.width}-${variant}.png`;
  await page.screenshot({path:resolve(output,filename)});
  const samples=await page.evaluate(detail=>{const g=window.__TEST__.game,canvas=g.ctx.canvas,ctx=g.ctx,dpr=canvas.width/window.innerWidth;return detail.portals.map(p=>{const r=p.rect,points=[0.1,0.5,0.85,0.95].map(f=>{const x=r.x+r.width*.5,y=r.y+r.height*f,cssX=x*detail.transform.scale+detail.transform.offsetX,cssY=y*detail.transform.scale+detail.transform.offsetY;return{fraction:f,cssX,cssY,rgba:Array.from(ctx.getImageData(Math.round(cssX*dpr),Math.round(cssY*dpr),1,1).data)};});return{gateId:p.gateId,color:p.color,points};});},detail);
  report.cases.push({name:`level${level}-${viewport.width}-${variant}`,screenshot:filename,...detail,levelSha256:hash(JSON.stringify(detail.level)),samples});
}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  await context.addInitScript(()=>{window.__STORAGE__=[];for(const key of ['getItem','setItem','removeItem','clear']){const old=Storage.prototype[key];Storage.prototype[key]=function(...args){window.__STORAGE__.push(key);return old.apply(this,args);};}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(url,{waitUntil:'commit'});
  await page.waitForFunction(()=>window.__TEST__?.game.artReady&&window.__TEST__.game.storageBaselineReady,undefined,{timeout:60000});
  for(const level of [72,111,1]){
   await page.evaluate(level=>{const g=window.__TEST__.game;window.__TEST__.forcedOpacity=undefined;g.updateToastVisible=false;g.boosterUnlockToast=undefined;g.loadLevel(level,true);g.dirty=true;g.scheduleFrame();},level);await ready(page);
   await capture(page,viewport,level,'initial');
   if(level===72){await page.evaluate(()=>{const g=window.__TEST__.game,gate=g.model.gates.find(g=>g.color==='pink');if(gate.frozen!==1)throw Error('Expected official pink frozen1');gate.frozen=0;g.dirty=true;g.scheduleFrame();});await ready(page);await capture(page,viewport,level,'pink-thawed');for(const [variant,opacity]of [['half-retired',0.5],['retired',0]]){await page.evaluate(opacity=>{window.__TEST__.forcedOpacity=opacity;const g=window.__TEST__.game;g.dirty=true;g.scheduleFrame();},opacity);await ready(page);await capture(page,viewport,level,variant);}}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.__STORAGE__),[]);report.cases.push({name:`isolation-${viewport.width}`,errors,storageCalls:[]});await context.close();
 }
 report.after=await hashes();assert.deepEqual(report.after,report.before,'No source change while capturing this stage');report.sourceUnchanged=true;report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
