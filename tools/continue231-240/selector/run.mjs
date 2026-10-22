import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {chromium} from 'playwright';
import {ROOT,ruleGate,digest} from '../common.mjs';
ruleGate();const output=ROOT+'/selector-'+Date.now(),snapshot=path.resolve(output,'source-snapshot');fs.mkdirSync(snapshot,{recursive:true});
const bindings={},bind=f=>{bindings[f.replaceAll('\\','/')]=digest(fs.readFileSync(f));},tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);e.isDirectory()?tree(f):bind(f);}};tree('src');tree('public');tree('tools/continue231-240/selector');
for(const[f,h]of Object.entries(bindings)){const bytes=fs.readFileSync(f);assert.equal(digest(bytes),h);const to=path.resolve(snapshot,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);}
const server=await createServer({root:snapshot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true}),report={status:'running',bindings,sourceSnapshot:snapshot,viewports:[],errors:[],playerSaveTouched:false,MemoryHost:true,testCampaignScaffold:false,productionBoundary:200};let page;
try{for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
 page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=()=>{throw Error('Persistent database forbidden');};});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/continue231-240/selector/index.html`);
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
 const debug=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),storage=()=>page.evaluate(()=>window.__CONTINUATION_SELECTOR__.storage());
 const click=async name=>{await page.waitForFunction(n=>{const d=window.__COLOR_ESCAPE__.getDebugState(),t=d.interactionTargets;return(t.targets??t)[n]?.hit;},name);const d=await debug(),r=(d.interactionTargets.targets??d.interactionTargets)[name].hit,t=d.viewportTransform,b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale);};
 const baseline=await storage(),ids=await page.evaluate(()=>window.__CONTINUATION_SELECTOR__.ids),catalog=await page.evaluate(()=>window.__CONTINUATION_SELECTOR__.catalog);assert(ids.length);assert.equal(catalog.length,230+ids.length);assert.deepEqual(catalog.slice(230),ids);
 const row={viewport,ids,catalog,levels:[],baselineBytesPreserved:true};report.viewports.push(row);
 await click('temporaryLevel.open');for(let p=1;p<=11;p++){await click('temporaryLevel.next');await page.waitForFunction(p=>window.__COLOR_ESCAPE__.getDebugState().temporaryLevelTest.page===p,p);}
 let d=await debug();assert.equal(d.temporaryLevelTest.page,11);const shown=Object.keys(d.interactionTargets.targets??d.interactionTargets).filter(k=>k.startsWith('temporaryLevel.level.')).map(k=>Number(k.split('.').at(-1))).sort((a,b)=>a-b);assert.deepEqual(shown,[221,222,223,224,225,226,227,228,229,230,...ids]);
 await page.screenshot({path:path.join(output,`selector-${viewport.width}.png`)});
 await click(`temporaryLevel.level.${ids[0]}`);await click('temporaryLevel.start');
 for(const [index,id]of ids.entries()){
  if(index){await click('homeNext');await page.waitForFunction(id=>window.__COLOR_ESCAPE__.getDebugState().level.id===id,id);await click('homePlay');}
  await page.waitForFunction(id=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.screen==='playing'&&d.level.id===id&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed&&!g.revisedArtLoading&&!g.hasInitialRevisedRegionPresentation()&&d.art.formalGameplay.missingWholeBlockIds.length===0;},id);
  const identity=await page.evaluate(id=>window.__CONTINUATION_SELECTOR__.identity(id),id);assert(identity.registryIdentity&&identity.catalogIdentity&&identity.productionRejects);assert.equal(identity.productionCount,200);
  const normalized=`${ROOT}/author${id}/qualified${id}-schema.json`;
  const packet=JSON.parse(fs.readFileSync(fs.existsSync(normalized)?normalized:`${ROOT}/author${id}/qualified${id}.json`));assert.deepEqual(identity.level,packet.level);
  assert.equal(await storage(),baseline);row.levels.push({id,levelSha256:digest(identity.level),registryIdentity:true,catalogIdentity:true,storageUnchanged:true});
  await page.screenshot({path:path.join(output,`lv${id}-${viewport.width}.png`)});await click('pause');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==='paused');await click('pauseHome');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==='home');
 }
 await click('homeNext');await page.waitForTimeout(80);assert.equal((await debug()).level.id,ids.at(-1));
 await click('temporaryLevel.open');await click('temporaryLevel.exit');await page.waitForFunction(()=>{const d=window.__COLOR_ESCAPE__.getDebugState();return d.screen==='home'&&d.level.id===2&&!d.temporaryLevelTest.active&&!d.temporaryLevelTest.storageSuppressed;});assert.equal(await storage(),baseline);row.restoredLevel=2;row.status='PASS';await page.close();page=null;
}assert.deepEqual(report.errors,[]);report.workspaceDrift=Object.entries(bindings).filter(([f,h])=>digest(fs.readFileSync(f))!==h);assert.deepEqual(report.workspaceDrift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
