import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {levelSha256} from './proof-contract.mjs';
import {mechanismInventory} from './mechanism-intensity.mjs';

const [selectionFile,output]=process.argv.slice(2);
if(!selectionFile||!output)throw Error('Usage: node review-capture.mjs selection.json new-output-directory');
const input=JSON.parse(await fs.readFile(selectionFile,'utf8'));
const selections=[...input.selections].sort((a,b)=>a.index-b.index);
assert.equal(new Set(selections.map(s=>s.index)).size,selections.length);
await fs.mkdir(output,{recursive:false});await fs.mkdir(path.join(output,'images'));await fs.mkdir(path.join(output,'overview'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=[selectionFile,'tools/league-v2/pointer.html','tools/league-v2/pointer-browser.mjs','tools/league-v2/review-capture.mjs',
  'src/game/ColorEscapeGame.ts','src/game/gameplayArtLayout.ts','src/game/artManifest.ts','src/core/PuzzleModel.ts','src/core/leagueRun.ts'];
const bindings=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
const report={schemaVersion:1,status:'CAPTURING_CANDIDATE_OPENINGS',ruleVersion:'1.155.0',createdAt:new Date().toISOString(),
  formalReady:false,productionChanged:false,candidateInjection:true,realGameplayRenderer:true,routePlayed:false,pointerValidated:false,naturalTimeValidated:false,
  note:'当前候选的真实游戏开局，仅截图。数据注入独立MemoryHost，不代表最终正式、路线Pointer或自然时钟验收。',viewport:{width:496,height:1078},bindings,rows:[],errors:[]};
const save=()=>fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true});
try{
 for(const s of selections){
  const bytes=await fs.readFile(s.proofFile),candidate=JSON.parse(bytes),row={index:s.index,sourceLevelId:candidate.sourceLevelId,L:candidate.L,U:candidate.U,
    difficulty:candidate.level.difficulty,proofFile:s.proofFile,proofFileSha256:sha(bytes),levelSha256:candidate.levelSha256,specials:candidate.specials,
    rawFullBoardStates:candidate.lowerBound.result.rawFullBoardStates,status:'CAPTURING',candidateInjection:true,formalReady:false};
  row.foundationMechanisms=candidate.staticAudit.mechanisms.filter(m=>['color-exit','irregular-block','irregular-board'].includes(m));
  const inventory=mechanismInventory(candidate.level);row.mechanisms=Object.fromEntries(Object.entries(inventory).filter(([,a])=>a.length).map(([k,a])=>[k,a.length]));
  row.mechanismCount=Object.values(row.mechanisms).reduce((n,a)=>n+a,0);row.assetBindings={};
  assert(candidate.accepted&&candidate.levelSha256===levelSha256(candidate.level));
  for(const [asset,expected]of Object.entries(candidate.staticAudit.assetBindings)){
    const assetPath=path.join('public',asset).replaceAll('\\','/'),hash=sha(await fs.readFile(assetPath));assert.equal(hash,expected,assetPath);row.assetBindings[assetPath]=hash;
  }
  const page=await browser.newPage({viewport:report.viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(()=>{
    window.__STORAGE_VIOLATIONS__=[];
    for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real storage forbidden');};
    for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real database forbidden');};
   });
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/league-v2/pointer.html`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
   const entry=await page.evaluate(candidate=>window.__LEAGUE_CANDIDATE__.load(candidate,false),candidate);assert.equal(levelSha256(entry.level),candidate.levelSha256);
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:30000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const state=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());assert.equal(state.puzzle.moves,0);assert(!state.puzzle.failed);
   const image=`images/league-${String(s.index).padStart(3,'0')}.png`;await page.screenshot({path:path.join(output,image)});
   row.image=image;row.imageSha256=sha(await fs.readFile(path.join(output,image)));row.openingStateSha256=levelSha256(state.puzzle);
   row.board=state.board;row.art=state.art.formalGameplay;row.openingRemainingSeconds=state.puzzle.remainingSeconds;
   row.drawAudit=await page.evaluate(()=>window.__LEAGUE_CANDIDATE__.drawAudit);assert(row.drawAudit.calls>0);assert.equal(row.drawAudit.rotated,0);assert.equal(row.drawAudit.canvasRotationCalls,0);
   row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);assert.deepEqual(errors,[]);
   row.status='CANDIDATE_OPENING_CAPTURED';
  }catch(error){row.status='CAPTURE_FAILED';row.error=error.message;row.pageErrors=errors;report.errors.push({index:s.index,error:error.message});}
  finally{await page.close();}
  report.rows.push(row);await save();console.log(JSON.stringify({index:row.index,status:row.status,image:row.image,error:row.error}));
 }
 for(const [file,hash]of Object.entries(bindings)){const current=sha(await fs.readFile(file));if(current!==hash)report.errors.push({file,error:'render-input-changed-during-capture',before:hash,after:current});}
 for(const row of report.rows)for(const [file,hash]of Object.entries(row.assetBindings))assert.equal(sha(await fs.readFile(file)),hash,'Art changed during capture');
 report.status=report.errors.length?'CAPTURE_WITH_ISSUES':'CANDIDATE_OPENINGS_CAPTURED_NOT_FORMAL';await save();
}finally{await browser.close();await server.close();}
console.log(JSON.stringify({output,status:report.status,rows:report.rows.length,errors:report.errors}));
