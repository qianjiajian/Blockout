import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {localRetiles,fixColors,random} from '../formal-v2/design-layout-factory.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,boundedPlainTask,boundedBudget,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {compareLayouts} from './diversity.mjs';
import {inventorySummary} from './diversity-layout-factory.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

// This is a replacement proposal, never an additional sibling layout. A D3
// child can be admitted only after its existing D2 representative is retired.
// All unrelated representatives and every source mask stay unchanged.
const [label,indexFile,maxText='12',perText='12']=process.argv.slice(2),maximum=Number(maxText),perRoot=Number(perText);
assert(/^[a-z0-9-]+$/.test(label??'')&&indexFile&&Number.isInteger(maximum)&&maximum>0&&maximum<=20&&Number.isInteger(perRoot)&&perRoot>0&&perRoot<=20);
const root='deliverables/daily-formal-v3-20261008',output=`${root}/design/${label}`;
assert(!fs.existsSync(output),'Preserve previous candidates');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const runtime=await loadBoundedRuntime(),ledger=await createAttemptLedger(`${root}/proof/attempts`),lineages=createReferenceLineageReader();
const selected=read(indexFile).files.map(file=>({file,receipt:read(file)}));
const prior450=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>read(e.path).level);
const references=[],usedSources=new Set();
for(const entry of selected.filter(e=>e.receipt.difficulty===2).sort((a,b)=>b.receipt.U-a.receipt.U)){
 const p=entry.receipt,base=read(p.baseInputFile),lineage=lineages.inspect(p.baseInputFile);
 if(references.length>=maximum)break;
 if(usedSources.has(p.sourceLevelId)||p.U<24||base.mechanismFirst||lineage.roots.length!==1||lineage.unknownReasons.length)continue;
 try{assertPlainProofDomain(base.level,runtime);}catch{continue;}
 const family=lineage.roots[0];
 if(selected.some(e=>e.file!==entry.file&&lineages.inspect(e.receipt.baseInputFile).roots.includes(family)))continue;
 assert.equal(sha(p.baseInputFile),p.baseInputFileSha256);assert.equal(levelSha256(base.level),p.baseLevelSha256);
 references.push({...entry,base,lineage,family});usedSources.add(p.sourceLevelId);
}
assert(references.length>0,'No eligible sole representative');
const successes=[];
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);else if(/^candidate-.*\.json$/.test(e.name)){
  const q=read(p);if(q.accepted&&q.level)successes.push({path:p,level:q.level,roots:lineages.inspect(p).roots});
 }
}}
scan(`${root}/design`);
const budget=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
fs.mkdirSync(output,{recursive:false});const rows=[],records=[],rejectedClaims=[];
const referencesPublic=references.map(({file,receipt,base,lineage,family})=>({receipt:file,receiptSha256:sha(file),formalId:receipt.formalId,sourceLevelId:receipt.sourceLevelId,
 baseInputFile:receipt.baseInputFile,baseInputFileSha256:sha(receipt.baseInputFile),baseLevelSha256:base.levelSha256,originalU:receipt.U,family,lineage}));
const write=status=>fs.writeFileSync(`${output}/report.json`,JSON.stringify({status,formalReady:false,productionChanged:false,
 policy:'At most one final representative per independent family. A successful D3 proposal MUST replace, never accompany, its original D2 slot. Failed proposals leave the original unchanged.',
 inputIndex:{path:indexFile,sha256:sha(indexFile)},references:referencesPublic,maximum,perRoot,budget,rows,records,rejectedClaims,
 tool:{path:'tools/daily-challenge/formal-v3/design-promote-representative.mjs',sha256:sha('tools/daily-challenge/formal-v3/design-promote-representative.mjs')},
 proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings},null,2)+'\n');
write('FINITE_REPLACEMENT_PROPOSALS_RUNNING');
for(const [ri,reference]of references.entries()){
 const {receipt:p,base,family}=reference,source=runtime.LEVELS.find(l=>l.id===p.sourceLevelId),initial=designFingerprints(base.level);
 const otherSelected=selected.filter(e=>e.file!==reference.file).map(e=>e.receipt.level);
 const otherSuccesses=successes.filter(e=>!e.roots.includes(family)).map(e=>e.level);
 const rng=random(7140613+ri*71383+[...label].reduce((n,c)=>n+c.charCodeAt(0)*373,0));
 const variants=localRetiles(base.level,{irregular:true,maxUnion:16}).map(v=>({...v,order:rng()})).sort((a,b)=>a.order-b.order);
 assert(variants.length<=10000,'Finite construction enumeration');
 let count=0,previous=initial,parent=null;
 for(const [vi,variant]of variants.entries()){
  if(count>=perRoot)break;const level=variant.level;
  if(!fixColors(level,variant.changedIds,Math.floor(rng()*4294967296),runtime,{keepProbability:.4}))continue;
  const f=designFingerprints(level);if(f.shapeSha256===initial.shapeSha256||f.colorSha256===initial.colorSha256||f.shapeSha256===previous.shapeSha256||f.colorSha256===previous.colorSha256)continue;
  const oldColours=new Map(initial.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
  if(!f.colorAssignments.some(b=>oldColours.has(b.id)&&oldColours.get(b.id)!==JSON.stringify(b.colors)))continue;
  if(inventorySummary(level,runtime).nonNativeOrMissingArtIds.length||compareLayouts(level,source).footprintSimilarity>.55)continue;
  if([...otherSelected,...otherSuccesses].some(l=>compareLayouts(l,level).footprintSimilarity>.65)||prior450.some(l=>compareLayouts(l,level).footprintSimilarity>.75))continue;
  try{runtime.validateLevel(level);assertPlainProofDomain(level,runtime);}catch{continue;}
  if(runtime.auditRevisedCandidate(level,undefined).issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;
  let attempt;try{attempt=await ledger.claim(level,{redesignOf:parent??undefined});}catch(e){rejectedClaims.push({reference:ri,variant:vi,error:e.message});continue;}
  count++;let proof;
  const packet={status:'D3_REPLACEMENT_PROPOSAL_NOT_PROVED',accepted:false,formalReady:false,level,levelSha256:levelSha256(level),sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),attempt,
   replacementOf:{formalId:p.formalId,receipt:reference.file,receiptSha256:sha(reference.file),levelSha256:p.levelSha256,baseLevelSha256:p.baseLevelSha256,baseInputFile:p.baseInputFile,familyRoot:family},
   proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
   provenance:{strategy:'replace-one-family-representative-not-add-sibling',input:p.baseInputFile,inputFileSha256:sha(p.baseInputFile),originalWholeBoardRoot:family,
    changedBodyIds:variant.changedIds,newShapeAndColour:true,sourceBoardExactlyRetained:true,retiresPriorRepresentativeBeforeAnyAdmission:true}};
  try{
   proof=boundedPlainTask(level,runtime,{floor:31,searchUpper:128,...budget});packet.proof=proof;
   assert.equal(proof.discoveredStates,proof.rawFullBoardStates);assert.equal(proof.exploredStates,proof.rawExploredStates);assert(proof.discoveredStates<=10000&&proof.exploredStates<=10000);
   if(proof.drags){packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
    const U=packet.replay.nonClearingDrags;
    if(proof.certifiedFloor>=31&&packet.replay.valid&&packet.replay.complete&&!packet.replay.failed&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed&&packet.independentReplay.nonClearingDrags===U)
     Object.assign(packet,{status:'PROVED_D3_REQUIRES_ATOMIC_REPRESENTATIVE_REPLACEMENT',accepted:true,difficulty:3,L:proof.certifiedFloor,U});
   }
  }catch(e){packet.error=e.message;packet.accepted=false;}
  finally{await ledger.finish(attempt,{...packet,lowerBound:{result:proof??null},route:{search:proof??null}});}
  const file=`${output}/candidate-${String(rows.length).padStart(4,'0')}.json`;fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  const row={path:file,sourceLevelId:source.id,referenceIndex:ri,variantIndex:vi,accepted:packet.accepted,L:packet.L,U:packet.U,cost:proof?.cost,rawStates:proof?.rawFullBoardStates,reason:packet.error??proof?.routeTermination??proof?.termination};rows.push(row);
  if(packet.accepted){records.push({...row,fileSha256:sha(file),replacementOf:packet.replacementOf});successes.push({path:file,level,roots:[family]});}
  else{previous=f;parent=attempt.id;}
  write('FINITE_REPLACEMENT_PROPOSALS_RUNNING');console.log(JSON.stringify({...row,acceptedCount:records.length}));if(packet.accepted)break;
 }
}
write('FINITE_REPLACEMENT_PROPOSALS_FINISHED');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'ATOMIC_REPLACEMENT_REQUIRED',formalReady:false,records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,references:references.length,searches:rows.length,proposals:records.length,selectionUnchanged:true}));
