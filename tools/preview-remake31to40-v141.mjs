// DESIGN PREVIEW ONLY: inject an isolated candidate into the MemoryHost game.
// This is not formal-entry, route, natural-time or difficulty certification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi,auditCandidate,BASELINE,OUTPUT,ruleGate} from './remake31to40-v141.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const output=path.resolve(OUTPUT,`design-preview-${Date.now()}`);fs.mkdirSync(output,{recursive:true});
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true}),rows=[],errors=[];
try{
 for(const file of process.argv.slice(2)){
  const data=JSON.parse(fs.readFileSync(file)),{level}=data;auditCandidate(data,baseline,api);
  const page=await browser.newPage({viewport:{width:496,height:1078}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=()=>{throw Error('Persistent storage forbidden');};for(const k of ['open','deleteDatabase'])indexedDB[k]=()=>{throw Error('Persistent database forbidden');};});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/remake31to40.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
  await page.evaluate(async level=>{
   const {PuzzleModel}=await import('/src/core/PuzzleModel.ts');
   window.__REMAKE_FORMAL__.load(level.id);const g=window.__COLOR_ESCAPE__;
   g.model=new PuzzleModel(level,{deferExitCompletion:true});g.captureInitialGeneratorSpawns();
   g.ensureFormalBlockArtForCurrentLevel();g.ensureFormalIceArtForCurrentLevel();g.ensureRevisedMechanismArt();g.dirty=true;g.scheduleFrame();
  },level);
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();},undefined,{timeout:30000});
  const png=path.join(output,`lv${level.id}.png`);await page.screenshot({path:png});rows.push({id:level.id,input:file,levelSha256:digest(level),png,formalEntryValidated:false});await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'candidate design preview only',rows,errors},null,2));}
console.log(JSON.stringify({output,rows,errors}));
