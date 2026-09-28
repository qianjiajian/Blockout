// Read-only candidate opening rendering through the existing in-memory harness.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const source=process.argv[2];assert(source,'Provide candidate JSON');
const bytes=fs.readFileSync(source),candidate=JSON.parse(bytes),level=candidate.level;assert.equal(level.id,139);
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const stamp=Date.now(),stem=path.resolve('deliverables/remake131-140-v146-20260924/agent131-134',`checker139-opening-${stamp}`),errors=[];
const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true});
let report={source:path.resolve(source),sourceSha256:sha(bytes),levelSha256:sha(level),status:'rendering',purpose:'Opening visual inspection only; no route, input, or difficulty certification',playerSaveTouched:false,formalAdopted:false};
try{
 const page=await browser.newPage({viewport:{width:900,height:1600},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/remake131to140.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
 const entry=await page.evaluate(level=>window.__REMAKE_FORMAL__.load(139,level),level);assert.deepEqual(entry.level,level);
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
 const snapshot=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());assert.equal(snapshot.puzzle.moves,0);assert.equal(snapshot.puzzle.cleared,0);
 await page.screenshot({path:stem+'-full.png'});
 const clip=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),b=d.board,t=d.viewportTransform,c=document.querySelector('canvas').getBoundingClientRect();const x=Math.max(0,c.left+t.offsetX+(b.innerX-.8*b.cell)*t.scale),y=Math.max(0,c.top+t.offsetY+(b.innerY-.8*b.cell)*t.scale);return{x,y,width:Math.min(innerWidth-x,(d.puzzle.width+1.6)*b.cell*t.scale),height:Math.min(innerHeight-y,(d.puzzle.height+1.6)*b.cell*t.scale)};});
 await page.screenshot({path:stem+'.png',clip});
 assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);assert.deepEqual(errors,[]);assert.equal(sha(fs.readFileSync(source)),sha(bytes));
 report={...report,status:'PASS_RENDER_ONLY',png:stem+'.png',fullPng:stem+'-full.png',clip,snapshot,errors,storage:await page.evaluate(()=>window.__REMAKE_FORMAL__.storage())};
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,png:report.png,report:stem+'.json',error:report.error}));
