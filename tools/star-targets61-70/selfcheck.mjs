// Deliberately synthetic qualification inputs. These checks are never evidence
// that a campaign route, natural GUI clock, or a difficulty bound has passed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {observe,replayTiming} from '../campaign-v145/lv141-150/observed-timing-flips.mjs';
import {ALL_IDS,BEFORE_SHA,ORIGINAL_BEFORE,CONCURRENT_TARGETS,clean,omitTarget,parseTargets,validateBaseline,validateScoringData,validateWitnessSources,replaySpatial} from './verification.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const beforeFile='deliverables/star-targets61-70-20260927/before.json';
assert.equal(digest(fs.readFileSync(beforeFile)),BEFORE_SHA);
const before=JSON.parse(fs.readFileSync(beforeFile)),levels=clean(before.priorLevels);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const target=before.rows[0].oldTargets.moveTarget+1,contract={targets:{61:target},beforeRuleVersion:'1.95.0',beforeSha256:BEFORE_SHA};
levels[60].preservedMoveTarget=target;
const drags=Array.from({length:target},()=>({blockId:'synthetic-not-a-campaign-route',path:[]}));
const source={id:61,level:clean(before.priorLevels[60]),drags:clean(drags),routeSha256:digest(drags)};
const sourceName='synthetic-source.json',sourceHash=digest(source),originalName='synthetic-historical-source.json';
const original={id:61,drags:[]},originalHash=digest(original);
const documents={[sourceName]:source,[originalName]:original};
const witnesses={beforeSha256:BEFORE_SHA,evidenceBindings:{[sourceName]:sourceHash,[originalName]:originalHash},rows:[{id:61,level:clean(levels[60]),drags,routeSha256:digest(drags),gameplaySha256:digest(omitTarget(levels[60])),sourceEvidence:{file:sourceName,sha256:sourceHash},originalSource:{file:originalName,sha256:originalHash}}]};
const validate=(b,w,l,c,docs)=>{
 validateScoringData(b,w,l,api,c);
 return validateWitnessSources(b,w,p=>docs[p],(p,h)=>assert.equal(digest(docs[p]),h));
};
assert(validate(before,witnesses,levels,contract,documents).passed);
assert.deepEqual(parseTargets('61:30,69:51'),{61:30,69:51});
const negatives=[
 ['other level',({l})=>l[0].name+='changed'],
 ['unmodified batch level',({l})=>l[61].preservedMoveTarget++],
 ['gameplay',({l})=>l[60].blocks[0].x++],
 ['time budget',({l})=>l[60].timeSeconds++],
 ['historical par moves',({l})=>l[60].parMoves++],
 ['route hash',({w})=>w.rows[0].routeSha256='0'.repeat(64)],
 ['route mutation with recomputed hash',({w})=>{w.rows[0].drags[0].blockId='changed';w.rows[0].routeSha256=digest(w.rows[0].drags);}],
 ['before hash',({w})=>w.beforeSha256='0'.repeat(64)],
 ['witness object',({w})=>w.rows[0].level.name+='changed'],
 ['missing requested row',({w})=>w.rows.pop()],
 ['extra requested row',({w})=>w.rows.push(clean(w.rows[0]))],
 ['extra approval ID',({c})=>c.targets[71]=40],
 ['target not equal route length',({c})=>c.targets[61]++],
 ['wrong rule baseline',({b})=>b.ruleVersion='1.94.0'],
 ['unbound source',({w})=>delete w.evidenceBindings[sourceName]],
 ['source bytes drift',({docs})=>docs[sourceName].id=62],
 ['source inventory mismatch with rehash',({w,docs})=>{docs[sourceName].level.blocks[0].x++;const h=digest(docs[sourceName]);w.evidenceBindings[sourceName]=h;w.rows[0].sourceEvidence.sha256=h;}],
 ['source without map binding',({w,docs})=>{delete docs[sourceName].level;const h=digest(docs[sourceName]);w.evidenceBindings[sourceName]=h;w.rows[0].sourceEvidence.sha256=h;}],
 ['source wrong level hash',({w,docs})=>{docs[sourceName].levelSha256='0'.repeat(64);const h=digest(docs[sourceName]);w.evidenceBindings[sourceName]=h;w.rows[0].sourceEvidence.sha256=h;}],
 ['historical evidence drift',({docs})=>docs[originalName].id=62],
];
const rows=negatives.map(([name,mutate])=>{const input=clean({b:before,w:witnesses,l:levels,c:contract,docs:documents});mutate(input);assert.throws(()=>validate(input.b,input.w,input.l,input.c,input.docs),undefined,name);return{name,rejected:true};});
const concurrent=clean(before);concurrent.ruleVersion='1.97.0';concurrent.originalBeforeSha256=BEFORE_SHA;
for(const[id,value]of Object.entries(CONCURRENT_TARGETS))concurrent.priorLevels[Number(id)-1].preservedMoveTarget=value;
concurrent.campaignSha256=digest(concurrent.priorLevels);
const concurrentDoc={status:'PASS',synthetic:true};concurrent.concurrentCheck={file:'synthetic-concurrent-check.json',sha256:digest(concurrentDoc)};
const readBaseline=p=>p===ORIGINAL_BEFORE?before:concurrentDoc;
const verifyBaseline=(p,h)=>assert.equal(p===ORIGINAL_BEFORE?BEFORE_SHA:digest(concurrentDoc),h);
assert(validateBaseline(before,BEFORE_SHA,readBaseline,verifyBaseline).passed);
assert(validateBaseline(concurrent,'f'.repeat(64),readBaseline,verifyBaseline).passed);
for(const[name,mutate]of[
 ['concurrent original SHA',b=>b.originalBeforeSha256='0'.repeat(64)],
 ['concurrent unrelated level',b=>b.priorLevels[99].name+='changed'],
 ['concurrent gameplay',b=>b.priorLevels[70].blocks[0].x++],
 ['concurrent wrong target',b=>b.priorLevels[70].preservedMoveTarget++],
 ['concurrent ten old rows',b=>b.rows[0].oldTargets.moveTarget++],
 ['concurrent missing report',b=>delete b.concurrentCheck],
 ['concurrent report hash',b=>b.concurrentCheck.sha256='0'.repeat(64)],
 ['concurrent unrelated source',b=>b.bindings['src/core/PuzzleModel.ts']='0'.repeat(64)],
]){const invalid=clean(concurrent);mutate(invalid);assert.throws(()=>validateBaseline(invalid,'f'.repeat(64),readBaseline,verifyBaseline),undefined,name);rows.push({name,rejected:true});}
for(const value of ['', '61:30,61:31','60:30','71:30','61:0','61:1.5','61:9007199254740992']){assert.throws(()=>parseTargets(value));rows.push({name:'invalid explicit target '+value,rejected:true});}
const toy={id:996170,name:'synthetic qualification only',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',width:3,height:3,timeSeconds:60,reward:0,gates:[{id:'red-gate',color:'red',side:'left',offset:0,size:1}],blocks:[{id:'red',x:1,y:1,color:'red',shape:[[0,0]]}]};
const toyRoute=[{blockId:'red',path:[[1,0],[0,0]],exitSide:'left'}];
assert(replaySpatial(toy,toyRoute,api).complete);
const atGate=clean(toy);atGate.blocks[0].x=0;atGate.blocks[0].y=0;
assert.equal(replaySpatial(atGate,[{blockId:'red',path:[[0,1]]}],api).valid,false);rows.push({name:'pointer-down exit cannot be delayed',rejected:true});
const bomb=clean(toy);bomb.blocks[0].timedBombSeconds=10;assert.throws(()=>replaySpatial(bomb,toyRoute,api));rows.push({name:'bomb clock cannot be deleted',rejected:true});
const model=new api.PuzzleModel(toy,{deferExitCompletion:true});
globalThis.window={__COLOR_ESCAPE__:{model}};observe();
model.startCountdown();model.tick(.2);model.beginAction();model.moveBlockStep('red',1,0);model.moveBlockStep('red',0,0);const exit=model.tryExit('red','left');model.commitAction();if(exit.exitAnimationId)model.completeExitAnimation(exit.exitAnimationId);
const log=window.__BATCH_TIMING__.read();delete globalThis.window;
assert(replayTiming(toy,log,api).passed);
for(const [name,mutate]of[
 ['timing field tamper',l=>{l.events.find(e=>e.method==='tick').after.remainingSeconds++;}],
 ['tick argument tamper',l=>{l.events.find(e=>e.method==='tick').args[0]=.3;}],
 ['negative natural tick',l=>{l.events.find(e=>e.method==='tick').args[0]=-.1;}],
 ['forbidden booster',l=>{l.forbidden.push('freezeTime');}],
 ['model replacement',l=>{l.sameModel=false;}],
 ['final state tamper',l=>{l.final.complete=false;}],
 ['nonmonotonic event clock',l=>{l.events[0].at=l.startedAt-1;}],
]){const invalid=clean(log);mutate(invalid);assert.throws(()=>replayTiming(toy,invalid,api),undefined,name);rows.push({name,rejected:true});}
const output='deliverables/star-targets61-70-20260927/pointer-support/qualification-'+Date.now()+'.json';
const toolFiles=['verification.mjs','selfcheck.mjs','playtest.mjs','playtest-header.txt','prepare.mjs','browser.mjs','index.html'].map(f=>'tools/star-targets61-70/'+f);
const modelBindings=Object.fromEntries(['src/core/PuzzleModel.ts','src/core/revisedLevelSearch.ts','src/core/revisedPointerGesture.ts','src/core/levelStarConditions.ts'].filter(f=>fs.existsSync(f)).map(f=>[f,digest(fs.readFileSync(f))]));
fs.mkdirSync('deliverables/star-targets61-70-20260927/pointer-support',{recursive:true});
fs.writeFileSync(output,JSON.stringify({status:'PASS',ruleVersion:lock.activeVersion,beforeFile,beforeSha256:BEFORE_SHA,allBatchIds:ALL_IDS,syntheticQualification:true,positiveScoringGate:true,positiveSourceGate:true,canonicalRouteGate:true,syntheticTimingReplay:true,negativeChecks:rows,toolBindings:Object.fromEntries(toolFiles.map(f=>[f,digest(fs.readFileSync(f))])),modelBindings,campaignRouteValidated:false,pointerValidated:false,naturalClockValidated:false,lowerBoundCertified:false},null,2),{flag:'wx'});
console.log(JSON.stringify({output,status:'PASS',negativeChecks:rows.length,campaignRouteValidated:false,pointerValidated:false}));
