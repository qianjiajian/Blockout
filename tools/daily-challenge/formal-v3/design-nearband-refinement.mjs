import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {localRetiles,fixColors,random} from '../formal-v2/design-layout-factory.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,boundedPlainTask,boundedBudget,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {compareLayouts} from './diversity.mjs';
import {inventorySummary} from './diversity-layout-factory.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';

const [label,selectionFile,countText='8',perSeedText='5',externalIndex]=process.argv.slice(2);
const count=Number(countText),perSeed=Number(perSeedText);
if(!label||!/^[a-z0-9-]+$/.test(label)||!selectionFile||!Number.isSafeInteger(count)||count<1||count>200||!Number.isSafeInteger(perSeed)||perSeed<1||perSeed>30||count*perSeed>1000)throw Error('Finite new-label batch required');
const root='deliverables/daily-formal-v3-20261008/design',out=`${root}/${label}`;
if(fs.existsSync(out))throw Error('Do not overwrite prior outcomes');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const runtime=await loadBoundedRuntime(),ledger=await createAttemptLedger('deliverables/daily-formal-v3-20261008/proof/attempts');
const selected=read(selectionFile).files.map(read).map(r=>r.level),old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>read(e.path).level);
const seeds=[],successful=[],examinedSeeds=new Set();
let externalReferenceCostRange=null;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);
 else if(e.name==='report.json'){
  let report;try{report=read(p);}catch{continue;}
  if(typeof report.policy==='string'&&report.policy.startsWith('Each seed is a different previously full-board-rebuilt draft'))
   for(const s of report.selectedSeeds??[])examinedSeeds.add(s.path);
 }
 else if(/^candidate-.*\.json$/.test(e.name)){
  let b;try{b=read(p);}catch{continue;}
  if(b.accepted&&b.level)successful.push(b.level);
  const cost=b.proof?.cost;
  if(!b.accepted&&b.level&&b.drags&&b.replay?.valid&&b.replay.complete&&cost>=12&&cost<16
   &&b.replay.nonClearingDrags===cost&&!b.level.blocks.some(x=>x.frozen||x.layers||x.generatorId||x.shutterId)
   &&b.provenance?.strategy!=='one-refinement-per-independent-nearband-seed')seeds.push({path:p,packet:b,cost});
 }
}}
scan(root);
if(externalIndex){const input=read(externalIndex);externalReferenceCostRange=input.referenceCostRange??[12,15];
 if(externalReferenceCostRange.length!==2||!externalReferenceCostRange.every(Number.isSafeInteger)||externalReferenceCostRange[0]<8||externalReferenceCostRange[1]>15||externalReferenceCostRange[0]>externalReferenceCostRange[1])throw Error('Explicit reference-only range must stay within 8..15; final difficulty floors are unchanged');
 seeds.length=0;for(const p of input.files){const b=read(p),cost=b.U;
 if(b.accepted!==false||!b.redesignParentId||!b.replay?.valid||!b.replay.complete||cost<externalReferenceCostRange[0]||cost>externalReferenceCostRange[1]||b.replay.nonClearingDrags!==cost)throw Error(`External reference is not a bound failed under-band seed: ${p}`);
 seeds.push({path:p,packet:b,cost});}}
seeds.sort((a,b)=>b.cost-a.cost||a.packet.sourceLevelId-b.packet.sourceLevelId||a.path.localeCompare(b.path));
const chosen=[],used=new Set();
for(const seed of seeds){if(chosen.length>=count)break;if(used.has(seed.packet.sourceLevelId)||examinedSeeds.has(seed.path))continue;
 try{assertPlainProofDomain(seed.packet.level,runtime);}catch{continue;}
 if(selected.some(l=>compareLayouts(l,seed.packet.level).footprintSimilarity>.65)||successful.some(l=>compareLayouts(l,seed.packet.level).footprintSimilarity>.65))continue;
 chosen.push(seed);used.add(seed.packet.sourceLevelId);
}
fs.mkdirSync(out,{recursive:false});
const rows=[],accepted=[],bindings={},rejectedClaims=[];
for(const p of ['tools/daily-challenge/formal-v3/design-nearband-refinement.mjs','tools/daily-challenge/formal-v2/design-layout-factory.mjs',selectionFile])bindings[p]=sha(p);
if(externalIndex)bindings[externalIndex]=sha(externalIndex);
const budget=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const write=status=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status,formalReady:false,productionChanged:false,
 policy:'Each seed is a different previously full-board-rebuilt draft with an under-band complete route. At most one successful refinement per seed; every accepted geometry still clears whole-catalog/source/old-pool similarity gates.',
 selectedSeeds:chosen.map(s=>({path:s.path,cost:s.cost,sourceLevelId:s.packet.sourceLevelId})),count,perSeed,budget,inputBindings:bindings,externalReferenceCostRange,
 proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,rejectedClaims,rows,accepted},null,2)+'\n');
for(const [si,seed]of chosen.entries()){
 const base=seed.packet,source=runtime.LEVELS.find(l=>l.id===base.sourceLevelId),origin=designFingerprints(base.level);
 let previous=origin,previousParentId=base.redesignParentId??origin.designSha256,solved=0;
 const rng=random(712384+si*19481+[...label].reduce((n,c)=>n+c.charCodeAt(0)*1711,0));
 const variants=localRetiles(base.level,{irregular:true,maxUnion:16}).map(v=>({...v,sort:rng()})).sort((a,b)=>a.sort-b.sort);
 if(variants.length>10000)throw Error('Construction enumeration budget exceeded');
 for(const [vi,v]of variants.entries()){
  if(solved>=perSeed)break;
  const level=v.level;level.timeSeconds=source.timeSeconds;
  if(!fixColors(level,v.changedIds,Math.floor(rng()*4294967296),runtime,{keepProbability:.4}))continue;
  const f=designFingerprints(level);
  if(f.shapeSha256===origin.shapeSha256||f.colorSha256===origin.colorSha256||f.shapeSha256===previous.shapeSha256||f.colorSha256===previous.colorSha256)continue;
  const inventory=inventorySummary(level,runtime);if(inventory.nonNativeOrMissingArtIds.length)continue;
  const sourceSimilarity=compareLayouts(source,level).footprintSimilarity;
  if(sourceSimilarity>.55||successful.some(l=>compareLayouts(l,level).footprintSimilarity>.65)||selected.some(l=>compareLayouts(l,level).footprintSimilarity>.65)||old.some(l=>compareLayouts(l,level).footprintSimilarity>.75))continue;
  try{runtime.validateLevel(level);}catch{continue;}
  const composition=runtime.auditRevisedCandidate(level,undefined);
  if(composition.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;
  let attempt;try{attempt=await ledger.claim(level,{redesignOf:previousParentId});}catch(error){rejectedClaims.push({seed:seed.path,variantIndex:vi,reason:error.message});continue;}
  solved++;
  let proof,packet={status:'NEW_REFINED_INPUT_NOT_ACCEPTED',accepted:false,formalReady:false,level,levelSha256:levelSha256(level),sourceLevelId:base.sourceLevelId,sourceLevelSha256:levelSha256(source),attempt,
   proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
   provenance:{strategy:'one-refinement-per-independent-nearband-seed',input:seed.path,inputFileSha256:sha(seed.path),inputLevelSha256:base.levelSha256,
    inputCost:seed.cost,changedBodyIds:v.changedIds,newShapesAndColours:true,constructionVariants:variants.length,sourceFootprintSimilarity:sourceSimilarity,
    sourceBoardExactlyRetained:true,sourceClockSeconds:source.timeSeconds,priorWholeBoardConstruction:base.provenance,
    importedReference:externalIndex??null,importedFailureParent:base.redesignParentId??null}};
  try{
   proof=boundedPlainTask(level,runtime,{floor:16,searchUpper:64,...budget});packet.proof=proof;
   if(proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates||proof.discoveredStates>10000||proof.exploredStates>10000)throw Error('Raw board budget mismatch');
  if(proof.drags){packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
   const U=packet.replay.nonClearingDrags,L=proof.certifiedFloor,difficulty=U<=20?1:U<=30?2:3;
   if(packet.replay.valid&&packet.replay.complete&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed
    &&packet.independentReplay.nonClearingDrags===U&&L>=[0,16,21,31][difficulty]&&U>=L)Object.assign(packet,{accepted:true,L,U,difficulty,status:'EXPLORATORY_REFINED_SAME_OBJECT_LU_PENDING_V3_CONTRACT'});
  }
  }
  catch(error){packet.accepted=false;packet.status='SEARCH_OR_REPLAY_EXCEPTION';packet.error=error.message;}
  finally{await ledger.finish(attempt,{...packet,lowerBound:{result:proof??null},route:{search:proof??null}});}
  const p=`${out}/candidate-${String(rows.length).padStart(4,'0')}.json`;fs.writeFileSync(p,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  const row={path:p,seedIndex:si,variantIndex:vi,sourceLevelId:base.sourceLevelId,accepted:packet.accepted,L:packet.L,U:packet.U,
   cost:proof?.cost,rawStates:proof?.rawFullBoardStates,rawExpanded:proof?.rawExploredStates,reason:packet.error??proof?.routeTermination??proof?.termination};rows.push(row);
  if(packet.accepted){successful.push(level);accepted.push(row);}
  else{previous=f;previousParentId=attempt.id;}
  write('FINITE_NEARBAND_BATCH_RUNNING');console.log(JSON.stringify({...row,acceptedCount:accepted.length}));
  if(packet.accepted)break;
 }
}
write('FINITE_NEARBAND_BATCH_FINISHED');console.log(JSON.stringify({out,seeds:chosen.length,searches:rows.length,accepted:accepted.length}));
