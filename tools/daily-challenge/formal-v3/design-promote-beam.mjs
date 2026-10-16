import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {localRetiles,fixColors,random} from '../formal-v2/design-layout-factory.mjs';
import {loadBoundedRuntime,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget} from './reserved-guard-budget.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {inventorySummary} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

// A finite beam of *different* physical designs. Each item is solved once;
// only a completed actual route may guide the next new shape/colour mutation.
// Success replaces its sole D2 representative; it never adds a sibling slot.
const[label,indexFile,sourcesText='35,14,60,120',maxText='48']=process.argv.slice(2);
const sources=sourcesText.split(',').map(Number),perFamily=Number(maxText);
assert(/^[a-z0-9-]+$/.test(label??'')&&indexFile&&sources.length<=4&&new Set(sources).size===sources.length&&perFamily>0&&perFamily<=48);
const root='deliverables/daily-formal-v3-20261008',out=`${root}/design/${label}`,read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert(!fs.existsSync(out));
const runtime=await loadBoundedRuntime(),ledger=await createAttemptLedger(`${root}/proof/attempts`),lineages=createReferenceLineageReader();
const selected=read(indexFile).files.map(file=>({file,p:read(file)})),prior450=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>read(e.path).level);
const successes=[],oldFailures=[];
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);else if(/^candidate-.*\.json$/.test(e.name)){
 const b=read(p);if(b.accepted&&b.level)successes.push({path:p,level:b.level,roots:lineages.inspect(p).roots});
 if(b.accepted===false&&b.replacementOf&&b.attempt?.id)oldFailures.push({path:p,b});
}}}scan(`${root}/design`);
const referenceOverrides=process.env.PROMOTION_REFERENCE_INDEX?read(process.env.PROMOTION_REFERENCE_INDEX):{};
const references=sources.map(sourceId=>{
 const item=selected.find(({p})=>p.difficulty===2&&p.sourceLevelId===sourceId);assert(item,`Missing D2 source ${sourceId}`);
 let referenceFile=item.p.baseInputFile,base=read(referenceFile);const lineage=lineages.inspect(referenceFile);assertPlainProofDomain(base.level,runtime);
 assert.equal(lineage.roots.length,1);assert.equal(lineage.unknownReasons.length,0);const family=lineage.roots[0];
 assert(!selected.some(e=>e.file!==item.file&&lineages.inspect(e.p.baseInputFile).roots.includes(family)),'Only sole representatives may be promoted');
 assert.equal(sha(item.p.baseInputFile),item.p.baseInputFileSha256);
 if(referenceOverrides[sourceId]){
  referenceFile=referenceOverrides[sourceId];base=read(referenceFile);assert(base.accepted===false&&base.actualU>=21&&base.actualU<=30&&base.drags,'Only a complete under-target failed reference may guide new physical inputs');
  assert.deepEqual(lineages.inspect(referenceFile).roots,[family]);assertPlainProofDomain(base.level,runtime);
  const a=runtime.replayRevisedRoute(base.level,base.drags),b=independentReplay(runtime,base.level,base.drags,{});
  assert(a.valid&&a.complete&&b.valid&&b.complete&&!b.failed&&a.nonClearingDrags===base.actualU&&b.nonClearingDrags===base.actualU);
  base={...base,U:base.actualU};
 }
 return{...item,base,family,referenceFile};
});
const budget=reservedGuardBudget({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
fs.mkdirSync(out);const rows=[],records=[],familyResults=[];
const write=status=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status,formalReady:false,productionChanged:false,indexFile,indexSha256:sha(indexFile),sources,perFamily,beamWidth:3,
 policy:'One final representative per existing independent family. Candidate U is used only when both actual complete replays pass. Every new candidate has different real shapes AND colours from the last failed input. At most 48 new physical inputs per family; never retry a failed board.',
 budget,referenceOverrides,references:references.map(r=>({file:r.file,sha256:sha(r.file),family:r.family,source:r.p.sourceLevelId,base:r.referenceFile,baseFileSha256:sha(r.referenceFile),U:r.base.U})),rows,records,familyResults,
 tool:{path:'tools/daily-challenge/formal-v3/design-promote-beam.mjs',sha256:sha('tools/daily-challenge/formal-v3/design-promote-beam.mjs')},proofToolchainSha256:runtime.toolchainSha256},null,2)+'\n');
write('FINITE_NEW_DESIGN_BEAM_RUNNING');
for(const [ri,reference]of references.entries()){
 const{p,base,family}=reference,source=runtime.LEVELS.find(l=>l.id===p.sourceLevelId),rng=random(7191143+ri*78139),original=designFingerprints(base.level);
 const past=oldFailures.filter(x=>x.b.replacementOf.familyRoot===family).sort((a,b)=>a.b.attempt.startedAt.localeCompare(b.b.attempt.startedAt)).at(-1);
 let parent=past?.b.attempt.id??null,previous=past?designFingerprints(past.b.level):original,solved=0,best=base.U,refCounter=0;
 const beam=[{file:reference.referenceFile,level:base.level,U:base.U,drags:base.drags,used:0}],mutated=new Set(),otherSelected=selected.filter(e=>e.file!==reference.file).map(e=>e.p.level),otherSuccesses=successes.filter(e=>!e.roots.includes(family)).map(e=>e.level);
 while(solved<perFamily&&refCounter<perFamily*4){
  beam.sort((a,b)=>a.used-b.used||b.U-a.U);const anchor=beam[0];anchor.used++;refCounter++;
  const variants=localRetiles(anchor.level,{irregular:true,maxUnion:16}).map(v=>({...v,order:rng()})).sort((a,b)=>a.order-b.order);assert(variants.length<=10000);
  let thisRound=0,accepted=false;
  for(const v of variants){
   if(solved>=perFamily||thisRound>=8)break;const level=v.level;
   if(!fixColors(level,v.changedIds,Math.floor(rng()*4294967296),runtime,{keepProbability:.35}))continue;
   const f=designFingerprints(level);if(mutated.has(f.designSha256))continue;mutated.add(f.designSha256);
   if(f.shapeSha256===previous.shapeSha256||f.colorSha256===previous.colorSha256||f.shapeSha256===original.shapeSha256||f.colorSha256===original.colorSha256)continue;
   const oldColors=new Map(previous.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));if(!f.colorAssignments.some(b=>oldColors.has(b.id)&&oldColors.get(b.id)!==JSON.stringify(b.colors)))continue;
   if(inventorySummary(level,runtime).nonNativeOrMissingArtIds.length||compareLayouts(level,source).footprintSimilarity>.55)continue;
   if([...otherSelected,...otherSuccesses].some(l=>compareLayouts(l,level).footprintSimilarity>.65)||prior450.some(l=>compareLayouts(l,level).footprintSimilarity>.75))continue;
   try{runtime.validateLevel(level);assertPlainProofDomain(level,runtime);}catch{continue;}
   if(runtime.auditRevisedCandidate(level,undefined).issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;
   let attempt;try{attempt=await ledger.claim(level,{redesignOf:parent??undefined});}catch{continue;}
   solved++;thisRound++;
   const packet={accepted:false,formalReady:false,level,levelSha256:levelSha256(level),sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),attempt,
    replacementOf:{formalId:p.formalId,receipt:reference.file,receiptSha256:sha(reference.file),levelSha256:p.levelSha256,baseLevelSha256:p.baseLevelSha256,baseInputFile:p.baseInputFile,familyRoot:family},
    proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
    provenance:{strategy:'replace-one-family-via-finite-actual-route-beam',input:anchor.file,inputFileSha256:sha(anchor.file),originalWholeBoardRoot:family,
     anchorActualU:anchor.U,anchorReferenceOnly:true,changedBodyIds:v.changedIds,newShapeAndColour:true,sourceBoardExactlyRetained:true,retiresPriorRepresentativeBeforeAnyAdmission:true}};
   let proof;
   try{proof=guardedPlainTask(level,runtime,{floor:31,searchUpper:128,...budget});packet.proof=proof;
    if(proof.drags){packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
     if(packet.replay.valid&&packet.replay.complete&&!packet.replay.failed&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed&&packet.replay.nonClearingDrags===packet.independentReplay.nonClearingDrags){
      packet.actualU=packet.replay.nonClearingDrags;
      if(proof.thresholdProven&&proof.certifiedFloor>=31)Object.assign(packet,{accepted:true,L:proof.certifiedFloor,U:packet.actualU,difficulty:3,status:'PROVED_D3_REQUIRES_ATOMIC_REPRESENTATIVE_REPLACEMENT'});
     }
    }
    if(!packet.accepted)packet.status='NEW_BEAM_INPUT_NOT_D3';
   }catch(e){packet.error=e.message;packet.status='NEW_BEAM_INPUT_ERROR';}
   finally{await ledger.finish(attempt,{...packet,lowerBound:{result:proof??null},route:{search:proof??null}});}
   const file=`${out}/candidate-${String(rows.length).padStart(4,'0')}.json`;fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
   const row={path:file,sourceLevelId:source.id,family,anchor:anchor.file,anchorU:anchor.U,actualU:packet.actualU,L:packet.L,U:packet.U,accepted:packet.accepted,raw:proof?.rawFullBoardStates,upperBound:proof?.guardAllowance?.conservativeFullBoardStateUpperBound,reason:packet.error??proof?.routeTermination??proof?.termination};rows.push(row);
   if(packet.accepted){records.push({...row,fileSha256:sha(file),replacementOf:packet.replacementOf});accepted=true;}
   else{parent=attempt.id;previous=f;
    if(packet.actualU>=Math.max(21,best-3)){best=Math.max(best,packet.actualU);beam.push({file,level,U:packet.actualU,drags:packet.drags,used:0});beam.sort((a,b)=>b.U-a.U||a.used-b.used);beam.splice(3);}
   }
   write('FINITE_NEW_DESIGN_BEAM_RUNNING');console.log(JSON.stringify({...row,best,solved,proposals:records.length}));if(accepted)break;
  }
  if(accepted)break;
  if(!thisRound&&beam.every(b=>b.used>=3))break;
 }
 familyResults.push({sourceLevelId:source.id,family,solved,originalU:base.U,bestCompleteU:best,finalBeam:beam.map(({level,drags,...b})=>b)});
}
write('FINITE_NEW_DESIGN_BEAM_FINISHED');fs.writeFileSync(`${out}/index.json`,JSON.stringify({status:'ATOMIC_REPLACEMENT_REQUIRED',formalReady:false,records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:out,searches:rows.length,proposals:records.length,familyResults}));
