import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const priorFile=process.argv[2],prior=JSON.parse(fs.readFileSync(priorFile));assert.equal(prior.status,'PASS');assert.deepEqual(prior.requestedIds,[60]);
const candidate=prior.rows[0].candidate,data=JSON.parse(fs.readFileSync(candidate));assert.equal(digest(data.level),prior.rows[0].levelSha256);const runtime=path.resolve(prior.isolatedRuntime),output=path.resolve(`deliverables/remake31-200-v145-20260924/batches/lv051-060/root60/popup-${Date.now()}`);fs.mkdirSync(output,{recursive:true});
for(const[p,h]of Object.entries(prior.bindings))if(path.resolve(p).startsWith(runtime+path.sep))assert.equal(digest(fs.readFileSync(p)),h);
const report={status:'running',ruleVersion:lock.activeVersion,candidate,levelSha256:digest(data.level),priorRuntimeReport:{file:priorFile,sha256:digest(fs.readFileSync(priorFile))},toolSha256:digest(fs.readFileSync(import.meta.filename)),formalAdopted:false,playerSaveTouched:false,errors:[]};
const server=await createServer({root:runtime,publicDir:path.join(runtime,'public'),cacheDir:path.join(output,'.vite'),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();const browser=await chromium.launch({headless:true});let page;
try{
 page=await browser.newPage({viewport:{width:496,height:1078}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('No player Storage');};});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/campaign-v145/lv051-060/candidate.html`);await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady);
 await page.evaluate(level=>{const g=window.__COLOR_ESCAPE__;g.save.featureSeen=g.save.featureSeen.filter(k=>k!=='key-lock');window.__REMAKE_FORMAL__.load(level);g.loadLevel(60,false);g.updateToastVisible=false;},data.level);
 const home=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),homeHit=home.interactionTargets.targets.homePlay.hit,homeRect=await page.locator('canvas').boundingBox(),homeTransform=home.viewportTransform;assert.equal(home.screen,'home');
 await page.mouse.click(homeRect.x+homeTransform.offsetX+(homeHit.x+homeHit.width/2)*homeTransform.scale,homeRect.y+homeTransform.offsetY+(homeHit.y+homeHit.height/2)*homeTransform.scale);
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='feature'&&window.__COLOR_ESCAPE__.featureIntroIconArt.image);
 const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());const before=await state();assert.equal(before.screen,'feature');assert.equal(before.level.id,60);assert.equal(before.puzzle.remainingSeconds,90);assert(!before.puzzle.started);
 const policy=await page.evaluate(async()=>{const {getScheduledFeatureIntro}=await import('/src/game/featureIntroPolicy.ts');return getScheduledFeatureIntro(60);});assert.equal(policy.kind,'key-lock');report.introduction=policy;
 await page.waitForTimeout(350);const still=await state();assert.equal(still.puzzle.remainingSeconds,90);assert(!still.puzzle.started);report.teachingDoesNotConsumeTimer=true;
 await page.screenshot({path:path.join(output,'lv60-key-lock-teaching.png')});
 const hit=still.interactionTargets.targets.featurePrimary.hit,rect=await page.locator('canvas').boundingBox(),t=still.viewportTransform;await page.mouse.click(rect.x+t.offsetX+(hit.x+hit.width/2)*t.scale,rect.y+t.offsetY+(hit.y+hit.height/2)*t.scale);
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing'&&window.__COLOR_ESCAPE__.model.snapshot().started);const after=await state();assert.equal(after.puzzle.moves,0);assert(after.puzzle.blocks.some(b=>b.keyId));assert(after.puzzle.blocks.some(b=>b.lockedBy));report.confirmedByActualPointer=true;report.seen=await page.evaluate(()=>window.__COLOR_ESCAPE__.save.featureSeen.includes('key-lock'));assert(report.seen);
 assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);assert.deepEqual(report.errors,[]);report.status='PASS';await page.screenshot({path:path.join(output,'lv60-after-teaching.png')});
}catch(e){report.status='FAIL';report.error=String(e.stack??e);if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
