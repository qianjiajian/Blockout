import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const root='deliverables/remake151-160-20260927';
const output=root+'/agent157-159';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(canonical(v))).digest('hex');
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const filePaths=['src/core/levels.ts','src/core/remake151to160.ts','src/game/formalBlockShapes.ts','tests/fixtures/remake151to160-v102.json','tests/remake151to160.test.ts'];
const currentHashes=Object.fromEntries(filePaths.map(p=>[p,sha(fs.readFileSync(p))]));
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_151_160_REMAKE} from './src/core/levels.ts'; export {PuzzleModel} from './src/core/PuzzleModel.ts'; export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts'; export {applyRemake151to160,REMADE_151_160_IDS} from './src/core/remake151to160.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const fixture=json('tests/fixtures/remake151to160-v102.json');
const first=json(root+'/adopted-1790517510806-57076.json');
const firstBefore=json(first.before);
const second=json(root+'/adopted-1790517847337-52548.json');
const secondBefore=json(second.before);
const differences=(a,b)=>a.filter((level,i)=>sha(level)!==sha(b[i])).map(level=>level.id);
// The second adoption's immutable before snapshot is the exact first adoption output.
assert.equal(sha(secondBefore.levels),first.campaignSha256);
assert.deepEqual(differences(firstBefore.levels,secondBefore.levels),first.changed);
assert.equal(firstBefore.levels.length,200);assert.equal(secondBefore.levels.length,200);
const initialFixture=JSON.parse(secondBefore.files['tests/fixtures/remake151to160-v102.json']);
assert.deepEqual(initialFixture.rows.map(row=>row.id),first.adoptedIds);
for(const [p,h] of Object.entries(first.files))assert.equal(sha(secondBefore.files[p]),h,p);
const secondStage=secondBefore.levels.map(level=>level.id===159?fixture.rows.find(row=>row.id===159).level:level);
assert.deepEqual(differences(secondBefore.levels,secondStage),[159]);
assert.equal(sha(secondStage),second.campaignSha256);

assert.deepEqual(api.REMADE_151_160_IDS,fixture.rows.map(row=>row.id));
for(const before of api.LEVELS_BEFORE_151_160_REMAKE){
 const row=fixture.rows.find(item=>item.id===before.id),mapped=api.applyRemake151to160(before);
 if(row){assert.deepEqual(mapped,row.level);assert.strictEqual(mapped,api.LEVELS.find(level=>level.id===before.id));}
 else assert.strictEqual(mapped,before);
}
const protectedFields=['id','width','height','playable','blocked','seams','name','timeSeconds','parMoves','reward'];
for(const row of fixture.rows){const before=firstBefore.levels[row.id-1];for(const key of protectedFields)assert.deepEqual(row.level[key],before[key],row.id+'/'+key);assert.deepEqual(api.levelStarTargets(row.level),api.levelStarTargets(before));}
const report={passed:true,checkedAt:new Date().toISOString(),activeVersion:lock.activeVersion,currentHashes,
 firstAdoption:{evidence:root+'/adopted-1790517510806-57076.json',changed:first.changed,other194Unchanged:true,campaignHash:sha(secondBefore.levels),sourceHashesMatch:true},
 secondAdoption:{evidence:root+'/adopted-1790517847337-52548.json',changed:[159],other199Unchanged:true,campaignHash:sha(secondStage)},
 currentFormalIds:[...api.REMADE_151_160_IDS],currentCampaignHash:sha(api.LEVELS),currentChangesSinceFirstBaseline:differences(firstBefore.levels,api.LEVELS),protectedFieldsAndScoresPreserved:true,
 testReport:output+(fs.existsSync(output+'/vitest-adoption-final.json')?'/vitest-adoption-final.json':'/vitest-adoption-first.json'),additionalAdoptions:[],pointer:[]};
for(const name of fs.readdirSync(root).filter(name=>/^adopted-.*\.json$/.test(name)).sort()){
 if(name==='adopted-1790517510806-57076.json'||name==='adopted-1790517847337-52548.json')continue;
 const adoption=json(root+'/'+name),before=json(adoption.before);
 const expected=before.levels.map(level=>adoption.changed.includes(level.id)?fixture.rows.find(row=>row.id===level.id).level:level);
 assert.deepEqual(differences(before.levels,expected),adoption.changed);
 assert.equal(sha(expected),adoption.campaignSha256);
 report.additionalAdoptions.push({evidence:root+'/'+name,changed:adoption.changed,preservedOtherObjects:200-adoption.changed.length,campaignSha256:sha(expected),basis:'Exact recorded post-write campaign hash matches before snapshot plus only the adopted candidate objects; current mapper separately preserves all non-target identities.'});
}

const stripOtherAdoptionStages=text=>text.replace(/\r\n/g,'\n')
 .replace(/^import \{ applyRemake161to170 \} from '\.\/remake161to170';\n/m,'')
 .replace(/^import \{ applyLevel78LateLiftRepair \} from ["']\.\/level78LateLiftRepair["'];\n/m,'')
 .replace("export const LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR: LevelSpec[] = LEVELS_BEFORE_151_160_REMAKE.map(applyRemake151to160);\n// v1.104: only Lv78's hidden cargo changes; retain the prior stage and evidence.\nexport const LEVELS_BEFORE_161_170_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.map(applyLevel78LateLiftRepair);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);",'export const LEVELS: LevelSpec[] = LEVELS_BEFORE_151_160_REMAKE.map(applyRemake151to160);');
const stripOtherNativeQualification=text=>text.replace(/\r\n/g,'\n')
 .replace("import { REMADE_161_170_IDS } from '../core/remake161to170';\n",'')
 .replace(' || REMADE_161_170_IDS.includes(levelId)','');
const parseReviewed=text=>JSON.parse(text.match(/const reviewed[^=]*=\s*(\{[\s\S]*?\})\s*;\s*export/)[1]);

for(const directory of process.argv.slice(2)){
 const pointer=json(directory+'/report.json');
 assert.equal(pointer.status,'PASS');assert.equal(pointer.formalDataValidated,true);assert.equal(pointer.candidateOnly,false);
 assert.equal(pointer.naturalClock,true);assert.equal(pointer.clockFrozen,false);assert.equal(pointer.playerSaveTouched,false);
 assert.deepEqual(pointer.errors,[]);
 let bindingsChecked=0;const currentDrift=[];
 for(const [path,expected] of Object.entries(pointer.bindings)){
  assert.equal(sha(fs.readFileSync(pointer.sourceSnapshot+'/'+path)),expected,'snapshot '+path);bindingsChecked++;
  if(sha(fs.readFileSync(path))!==expected){
   currentDrift.push(path);
   const source=fs.readFileSync(pointer.sourceSnapshot+'/'+path,'utf8'),current=fs.readFileSync(path,'utf8');
   if(path==='src/core/levels.ts')assert.equal(stripOtherAdoptionStages(current),stripOtherAdoptionStages(source),'Only separately named 78/161 adoption stages');
   else if(path==='src/game/formalBlockShapes.ts')assert.equal(stripOtherNativeQualification(current),stripOtherNativeQualification(source),'Only 161 native qualification addition; remaining drawing code unchanged');
   else if(path==='src/core/remake151to160.ts'||path==='src/core/remake161to170.ts'){
    const old=parseReviewed(source),now=parseReviewed(current);
    for(const [id,level]of Object.entries(old))assert.deepEqual(now[id],level,'Previously rendered formal object preserved '+id);
    const firstId=path.includes('151to160')?151:161;
    assert(Object.keys(now).every(id=>Number(id)>=firstId&&Number(id)<firstId+10));
   }else if(path==='docs/rules/manifest.json'){
    const old=JSON.parse(source),now=JSON.parse(current);assert.deepEqual(now.versions.slice(0,old.versions.length),old.versions,'Frozen manifest entries unchanged');
   }else assert.fail('Unreviewed implementation/art/binding drift: '+path);
  }
 }
 const verified={directory,reportSha256:sha(fs.readFileSync(directory+'/report.json')),viewport:pointer.viewport,bindingsChecked,currentDrift,unchangedModelAndDrawingImplementations:true,originalReportPreserved:true,rows:[]};
 for(const row of pointer.rows){
  const recorded=json(directory+`/lv${row.id}-observed-timing.json`);
  const level=fixture.rows.find(item=>item.id===row.id)?.level;assert(level);
  assert.equal(sha(level),row.levelSha256);assert.equal(row.formalObjectIdentity,true);assert.equal(row.candidateOverlay,false);assert.equal(row.status,'PASS');
  assert.equal(recorded.readOnlyObservation,true);assert.equal(recorded.sameModel,true);assert.deepEqual(recorded.forbidden,[]);
  const model=new api.PuzzleModel(structuredClone(level),{deferExitCompletion:recorded.deferExitCompletion});
  const tokens=new Map(),reverse=new Map();
  const normalize=value=>{
   if(typeof value==='string')return tokens.get(value)??value;
   if(Array.isArray(value))return value.map(normalize);
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[tokens.get(k)??k,normalize(v)]));
   return value;
  };
  assert.deepEqual(normalize(model.snapshot()),recorded.initial);
  let ticks=0,lastAt=-Infinity,charged=0;
  const methods=new Set(['tick','start','startCountdown','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation']);
  for(let index=0;index<recorded.events.length;index++){
   const event=recorded.events[index];assert(methods.has(event.method),event.method);assert(event.at>=lastAt);lastAt=event.at;
   const args=structuredClone(event.args);
   if(event.method==='completeExitAnimation'){assert(reverse.has(args[0]));args[0]=reverse.get(args[0]);}
   const before=model.snapshot(),actual=model[event.method](...args);
   if(event.method==='tryExit'&&actual?.exitAnimationId){assert(event.result.exitAnimationId);tokens.set(actual.exitAnimationId,event.result.exitAnimationId);reverse.set(event.result.exitAnimationId,actual.exitAnimationId);}
   // Browser observation serializes a void method return as JSON null.
   assert.deepEqual(normalize(actual??null),event.result,`${row.id} event ${index} result`);
   const after=model.snapshot();assert.deepEqual(normalize(after),event.after,`${row.id} event ${index} state`);
   if(event.method==='tick'){ticks++;assert(args[0]>=0);charged+=before.remainingSeconds-after.remainingSeconds;}
  }
  const final=model.snapshot();assert.deepEqual(normalize(final),recorded.final);assert.deepEqual(normalize(final),row.final);
  assert(final.complete&&!final.failed);assert(ticks>0);assert(Math.abs(charged-(level.timeSeconds-final.remainingSeconds))<1e-7);
  assert(row.naturalClockProbe.before>row.naturalClockProbe.after);
  assert.equal(final.moves,row.steps.length);assert.equal(row.settlement.assistedClear,false);
  const stars=api.evaluateLevelStars(level,row.settlement.completionMetrics);
  assert.equal(row.settlement.earnedStars,stars.earnedStars);assert.equal(row.actualStars,stars.earnedStars);
  assert.deepEqual(row.settlement.conditions,stars);assert.equal(row.settlement.screen,'win');
  assert.equal(row.storage.backend,'MemoryHost');assert.equal(row.storage.save.bestStars[row.id],stars.earnedStars);assert.equal(row.storage.save.bestMoves[row.id],final.moves);
  verified.rows.push({id:row.id,events:recorded.events.length,ticks,chargedSeconds:charged,moves:final.moves,actualStars:stars.earnedStars,logSha256:sha(fs.readFileSync(directory+`/lv${row.id}-observed-timing.json`))});
 }
 report.pointer.push(verified);
}
for(const [p,h]of Object.entries(currentHashes))assert.equal(sha(fs.readFileSync(p)),h,'Review input drift: '+p);
const path=output+'/independent-adoption-review-'+Date.now()+'.json';
fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path,passed:true,ids:report.currentFormalIds,pointerRuns:report.pointer.reduce((n,p)=>n+p.rows.length,0)}));
