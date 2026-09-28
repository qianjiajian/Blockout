// Diagnostic model replay and screenshot. No Pointer or natural-time certification.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {chromium} from 'playwright';
const source=process.argv[2],raw=fs.readFileSync(source),d=JSON.parse(raw),{level}=d,drags=d.search.partialDrags;assert(drags.length);
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const stem=path.resolve('deliverables/remake131-140-v146-20260924/agent131-134',`checker139-blocked-${Date.now()}`),errors=[];
const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true});let report={source:path.resolve(source),sourceSha256:sha(raw),levelSha256:sha(level),dragsSha256:sha(drags),purpose:'Actual model partial-route diagnostic; not Pointer, time, solvability or difficulty certification',playerSaveTouched:false,formalAdopted:false};
try{
 const page=await browser.newPage({viewport:{width:900,height:1600}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/remake131to140.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
 const replay=await page.evaluate(async({level,drags})=>{
  const game=window.__COLOR_ESCAPE__;window.__REMAKE_FORMAL__.load(139,level);
  const {PuzzleModel}=await import('/src/core/PuzzleModel.ts'),model=new PuzzleModel(level);model.startCountdown();
  const steps=[];for(const[index,drag]of drags.entries()){const before=model.snapshot();model.beginAction();for(const p of drag.path)if(!model.moveBlockStep(drag.blockId,...p))throw Error(`Illegal model step ${index} ${drag.blockId} ${p}`);if(drag.exitSide&&!model.tryExit(drag.blockId,drag.exitSide).ok)throw Error(`Illegal model exit ${index}`);if(!model.commitAction())throw Error(`Empty model action ${index}`);const after=model.snapshot();steps.push({step:index+1,id:drag.blockId,clearEvents:after.cleared-before.cleared});}
  game.model=model;game.ensureFormalBlockArtForCurrentLevel();game.ensureFormalIceArtForCurrentLevel();
  const snapshot=model.snapshot(),active=snapshot.blocks.filter(b=>model.isBlockActive(model.getBlock(b.id))).map(b=>({id:b.id,color:b.color,x:b.x,y:b.y,frozen:b.frozen??0,shape:b.shape}));
  return{snapshot,active,steps,nonClearingDrags:steps.filter(s=>s.clearEvents===0).length};
 },{level,drags});assert.equal(replay.snapshot.cleared,18);assert.equal(replay.nonClearingDrags,15);
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0;},undefined,{timeout:20000});
 await page.screenshot({path:stem+'-full.png'});
 const clip=await page.evaluate(()=>{const d=window.__COLOR_ESCAPE__.getDebugState(),b=d.board,t=d.viewportTransform,c=document.querySelector('canvas').getBoundingClientRect();const x=Math.max(0,c.left+t.offsetX+(b.innerX-.8*b.cell)*t.scale),y=Math.max(0,c.top+t.offsetY+(b.innerY-.8*b.cell)*t.scale);return{x,y,width:Math.min(innerWidth-x,(d.puzzle.width+1.6)*b.cell*t.scale),height:Math.min(innerHeight-y,(d.puzzle.height+1.6)*b.cell*t.scale)};});
 await page.screenshot({path:stem+'.png',clip});assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);assert.equal(sha(fs.readFileSync(source)),sha(raw));
 report={...report,status:'PASS_DIAGNOSTIC_REPLAY_RENDER_ONLY',png:stem+'.png',fullPng:stem+'-full.png',replay,debug:await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),errors};
 const lines=replay.active.map(b=>`${b.id}\t${b.color}\t(${b.x},${b.y})\tice=${b.frozen}`);fs.writeFileSync(stem+'-active.txt',lines.join('\n')+'\n');console.log(lines.join('\n'));
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,png:report.png,report:stem+'.json',error:report.error}));
