import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {assertBaseline,BASELINE} from '../../campaign31-200-baseline-v145.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditStructure,IDS,TARGETS} from './remake61to70-v146.mjs';
import {discoverNativeRemakeGroups,assertNativeRemakeInputsUnchanged} from './discover-native-remake-groups.mjs';

export const SUMMARY='deliverables/remake31-200-v145-20260924/batches/lv061-070/summary.json';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>digest(fs.readFileSync(file));
const PROTECTED_SHA='b8902d8454157a02ecbde510e444667501636735b6f1967b18f04a377dc313f7';
const PRESERVED=['id','name','width','height','playable','blocked','seams','timeSeconds','reward','mechanismRules'];
const sorted=values=>[...values].sort((a,b)=>a-b);

// One compiled graph keeps getLevelStrict, the final array and the historical
// 61–70 input stage in the same module instance. No candidate is injected here.
async function loadFormalApi(){
 const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {LEVELS,LEVELS_BEFORE_61_70_REMAKE,getLevelStrict} from './src/core/levels.ts';
  export {REMADE_61_70_IDS,applyRemake61to70} from './src/core/remake61to70.ts';
  export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
  export {levelStarTargets} from './src/core/levelStarConditions.ts';
  export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
  export {auditRevisedCandidate,measureRevisedMechanismInventory} from './src/core/revisedCandidateAudit.ts';
  export {matchFormalBlockShape,matchFormalBlockShapeForLevel} from './src/game/formalBlockShapes.ts';
  export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
 `},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 return {api,inputs:Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>').sort()};
}

export function auditFormalIntegration(api,summary,baseline,nativeRemakes=discoverNativeRemakeGroups()){
 assertBaseline(baseline);
 assert.deepEqual(summary.rows.map(row=>row.id),IDS,'Exactly ten reviewed candidates, in campaign order');
 assert.deepEqual(api.REMADE_61_70_IDS,IDS,'Production adoption list must contain all and only 61–70');
 const thisGroup=nativeRemakes.groups.find(group=>group.from===61&&group.to===70);
 assert(thisGroup,'The 61–70 module must belong to the actual final LEVELS stage chain');assert.deepEqual(thisGroup.ids,IDS);
 assert.equal(api.LEVELS.length,200);assert.equal(api.LEVELS_BEFORE_61_70_REMAKE.length,200);
 assert.deepEqual(api.LEVELS.map(level=>level.id),Array.from({length:200},(_,i)=>i+1));
 assert.equal(baseline.protected1to30Sha256,PROTECTED_SHA);
 assert.equal(digest(api.LEVELS.slice(0,30)),PROTECTED_SHA,'Protected 1–30 data drift');
 const before=api.LEVELS_BEFORE_61_70_REMAKE,scope=new Set(IDS),rows=[];
 const thisStage=before.map(api.applyRemake61to70);
 let untouched=0;
 for(const [index,level]of api.LEVELS.entries()){
  assert.equal(api.getLevelStrict(level.id),level,'The actual formal lookup must return the final array object');
  const old=baseline.levels[index];
  for(const key of PRESERVED)assert.deepEqual(level[key],old.level[key],`Lv${level.id} baseline ${key}`);
  assert.deepEqual(api.levelStarTargets(level),old.starTargets,`Lv${level.id} actual baseline star targets`);
  if(!scope.has(level.id)){
   assert.deepEqual(thisStage[index],before[index],`Lv${level.id} outside batch changed at the 61–70 stage`);
   assert.equal(thisStage[index],before[index],'The 61–70 stage must keep every untargeted input object');
   untouched++;
  }
 }
 assert.equal(untouched,190);
 for(const row of summary.rows){
  assert.deepEqual(row.target,TARGETS[row.id]);assert(Object.values(row.checks).every(v=>v==='PASS'));
  assert.deepEqual(row.missing,[]);assert.equal(sha(row.candidate.path),row.candidate.sha256);
  const candidate=read(row.candidate.path),level=api.getLevelStrict(row.id);
  assert.equal(digest(candidate.level),row.candidate.levelSha256);assert.equal(digest(candidate.drags),row.candidate.routeSha256);
  assert.deepEqual(level,candidate.level,`Lv${row.id} final LEVELS must exactly equal the reviewed candidate`);
  assert.deepEqual(thisStage[row.id-1],candidate.level);
  const audit=auditStructure({level},api),replay=api.replayRevisedRoute(level,candidate.drags);
  assert(audit.passed&&replay.valid&&replay.complete,JSON.stringify(replay));
  assert.equal(replay.nonClearingDrags,row.upperBound);assert.equal(replay.effectiveDrags,row.totalDrags);
  assert(row.lowerBound>=row.target.min&&row.upperBound<=row.target.max&&row.lowerBound<=row.upperBound);
  const assets=audit.art.requirements.map(item=>({path:'public/'+item.path,sha256:sha('public/'+item.path)}));
  for(const block of level.blocks)assert.equal(api.matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,0,block.id);
  const evidence=row.evidence.map(item=>{assert.equal(sha(item.path),item.sha256);return item;});
  const proofReference=evidence.find(item=>item.kind==='root-fresh-mechanical-review');assert(proofReference);
  const proof=read(proofReference.path);assert.equal(proof.levelSha256,digest(level));assert.equal(proof.routeSha256,digest(candidate.drags));
  assert(proof.proof.thresholdProven);assert.equal(proof.lowerBound,row.lowerBound);
  rows.push({id:level.id,status:'PASS',formalObjectIdentity:true,candidateInjected:false,
   candidate:row.candidate,levelSha256:digest(level),routeSha256:digest(candidate.drags),
   staticAudit:audit,replay,lowerBound:row.lowerBound,upperBound:row.upperBound,totalDrags:row.totalDrags,
   boundProofReference:proofReference,lowerBoundRecomputed:false,assets});
 }
 // A shape with only a rotated match distinguishes policy from coincidentally
 // native authored blocks. Existing accepted groups remain allowed as before.
 const rotationProbe=[[0,0],[1,0],[1,1]];
 assert.equal(api.matchFormalBlockShape(rotationProbe,'native-only'),undefined);
 assert(api.matchFormalBlockShape(rotationProbe,'legacy')?.quarterTurns>0);
 const otherAcceptedNative=new Set([...Array.from({length:30},(_,i)=>i+1).filter(id=>id!==5),
  ...nativeRemakes.ids.filter(id=>!scope.has(id))]);
 assert(IDS.every(id=>!otherAcceptedNative.has(id)));
 const nativeAfter=new Set([...otherAcceptedNative,...IDS]);
 for(let id=1;id<=200;id++)assert.deepEqual(api.matchFormalBlockShapeForLevel(rotationProbe,id),
  api.matchFormalBlockShape(rotationProbe,nativeAfter.has(id)?'native-only':'legacy'),`Lv${id} rotation policy`);
 const lv5=api.getLevelStrict(5),rotated5=lv5.blocks.filter(block=>(api.matchFormalBlockShapeForLevel(block.shape,5)?.quarterTurns??0)>0);
 assert.equal(rotated5.length,3,'Lv5 retains its original three rotated bodies');
 // The immutable baseline is JSON and omits historical own-undefined fields;
 // compare its canonical data while retaining strict in-memory stage equality.
 assert.equal(digest(lv5),digest(baseline.levels[4].level));
 assert.deepEqual(lv5,before[4]);
 return {status:'PASS',scope:IDS,formalAdoptedCount:10,untouchedOtherLevels:untouched,
  preservationComparison:'before61to70 versus before61to70.map(applyRemake61to70), with exact identity for the other 190; later independent stages may change their own IDs',
  laterStageChangedIds:api.LEVELS.filter((level,index)=>!scope.has(level.id)&&digest(level)!==digest(thisStage[index])).map(level=>level.id),
  protected1to30Sha256:PROTECTED_SHA,baselineGeometryEvaluationPreservedCount:200,
  beforeStageSha256:digest(before),thisStageSha256:digest(thisStage),formalCampaignSha256:digest(api.LEVELS),
  nativePolicy:{otherAcceptedIds:sorted(otherAcceptedNative),currentIds:sorted(nativeAfter),thisBatchIds:IDS,lv5RotatedBlockIds:rotated5.map(block=>block.id),discovery:nativeRemakes},
  rows,verification:'Actual formal LEVELS identity; exact bound candidates; fresh static/native/full-route checks; retained previously proven lower-bound evidence bound to the identical level and route. No new lower-bound search or GUI run is claimed.',
  pointerReplayed:false,humanBlindTested:false,mobileTested:false,published:false};
}

export async function verifyFormalIntegration(summaryFile=SUMMARY){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
 assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
 const summary=read(summaryFile),baseline=read(BASELINE);assert.equal(sha(BASELINE),summary.baselineSha256);
 const nativeRemakes=discoverNativeRemakeGroups();
 const discovered=await loadFormalApi();
 assertNativeRemakeInputsUnchanged(nativeRemakes);
 for(const file of nativeRemakes.files)assert(discovered.inputs.includes(file),'Discovered formal module absent from compiled graph: '+file);
 const watched=[...new Set([...discovered.inputs,...nativeRemakes.files,summaryFile,BASELINE,'docs/rules/manifest.json',
  `docs/mechanism-rules-v${lock.activeVersion}.md`,...summary.rows.flatMap(row=>[row.candidate.path,...row.evidence.map(e=>e.path)]),
  'tools/campaign-v145/lv061-070/verify-formal-integration.mjs',
  'tools/campaign-v145/lv061-070/discover-native-remake-groups.mjs',
  'tools/campaign-v145/lv061-070/remake61to70-v146.mjs'])];
 const inputs=Object.fromEntries(watched.map(file=>[file,sha(file)]));
 const loaded=await loadFormalApi();assert.deepEqual(loaded.inputs,discovered.inputs,'Concurrent import graph change');
 assertNativeRemakeInputsUnchanged(nativeRemakes);
 const result=auditFormalIntegration(loaded.api,summary,baseline,nativeRemakes);
 for(const [file,hash]of Object.entries(inputs))assert.equal(sha(file),hash,'Concurrent input change: '+file);
 assertNativeRemakeInputsUnchanged(nativeRemakes);
 return {...result,checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,summaryFile,summarySha256:inputs[summaryFile],baselineSha256:inputs[BASELINE],inputs};
}

// Read-only: reports go to stdout so the integration owner chooses their archive.
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 console.log(JSON.stringify(await verifyFormalIntegration(process.argv[2]??SUMMARY),null,2));
}
