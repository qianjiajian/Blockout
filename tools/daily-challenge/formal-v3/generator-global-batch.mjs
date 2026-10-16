import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,boundedBudget,boundedPlainTask,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {buildCompositionalCandidate,COMPOSITIONAL_FACTORY_VERSION} from './design-compositional-factory.mjs';
import {compareLayouts} from './diversity.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {qualifySmallCargo,makeSmallCargoCandidate,SMALL_CARGO_VERSION} from './generator-small-cargo.mjs';

export const GENERATOR_GLOBAL_BATCH_VERSION='generator-distributed-scaffold-batch-v1.2';
const ROOT='deliverables/daily-formal-v3-20261008',read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const defaultReferences=[
 'bar-gen4-09/candidate-0089.json','bar-gen3-09/candidate-0155.json','bar-gen3-09/candidate-0388.json',
 'wide-rect-06/candidate-0379.json','global-pilot-02/candidate-0300.json','bar-gen3-09/candidate-0005.json',
].map(p=>`${ROOT}/design/${p}`);

export async function runGeneratorGlobalBatch({label='gen-rebuild-01',maxConstructions=96,maxPlainSearches=12,berths=3,
 sources=[149,200,196,124,100,55,35,151,29,198,118,187],references=defaultReferences,
 shapeProfile='bar-mix',primaryExitQuota=2,referenceExitFieldMode='none',
 selectedIndex=`${ROOT}/selection/frozen-proof-refresh-62/index.json`}={}){
 if(!/^[a-z0-9-]+$/.test(label)||!Number.isSafeInteger(maxConstructions)||maxConstructions<1||maxConstructions>192
  ||!Number.isSafeInteger(maxPlainSearches)||maxPlainSearches<1||maxPlainSearches>24||![3,4].includes(berths)
  ||!['bar-mix','axial-bars'].includes(shapeProfile)||![2,3,4].includes(primaryExitQuota)
  ||!['none','anchors','long-bars','all'].includes(referenceExitFieldMode))throw Error('Invalid finite generator batch request');
 const directory=`${ROOT}/mechanisms/${label}`;if(fs.existsSync(directory))throw Error('Use a new immutable batch label');
 const runtime=await loadBoundedRuntime(),ledger=await createAttemptLedger(`${ROOT}/proof/attempts`),selected=read(selectedIndex).files.map(p=>read(p).level);
 const refs=references.map(p=>({path:p,fileSha256:hash(p),packet:read(p)}));
 const budget=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
 fs.mkdirSync(directory,{recursive:true});fs.mkdirSync(`${directory}/bases`);
 const inputs=['generator-global-batch.mjs','design-compositional-factory.mjs','diversity-layout-factory.mjs','generator-small-cargo.mjs','bounded-proof.mjs','diversity.mjs']
  .map(file=>{const p=`tools/daily-challenge/formal-v3/${file}`;fs.copyFileSync(p,`${directory}/${file}.snapshot`);return{path:p,sha256:hash(p)};});
 const rows=[],records=[],parents=new Map();let plainSearches=0;
 const write=status=>{
  fs.writeFileSync(`${directory}/report.json`,JSON.stringify({version:GENERATOR_GLOBAL_BATCH_VERSION,status,formalReady:false,productionChanged:false,
   ruleVersion:runtime.boundedRuleVersion,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
   factoryVersion:COMPOSITIONAL_FACTORY_VERSION,cargoVersion:SMALL_CARGO_VERSION,budget,inputs,selectedIndex,selectedIndexSha256:hash(selectedIndex),
   referenceBindings:refs.map(({path,fileSha256})=>({path,fileSha256})),referenceSelection:'Rotate among four closest normal dimensions and area',
   sources,berths,shapeProfile,primaryExitQuota,referenceExitFieldMode,maxConstructions,maxPlainSearches,plainSearches,
   constructionSearchSeparateFromFullBoardSearch:true,referenceRoutesUsedForUpperSearch:false,rows,records},null,2)+'\n');
  fs.writeFileSync(`${directory}/index.json`,JSON.stringify({records},null,2)+'\n');
 };
 for(let serial=0;serial<maxConstructions&&plainSearches<maxPlainSearches;serial++){
  const sourceId=sources[serial%sources.length],source=runtime.LEVELS.find(l=>l.id===sourceId);
  if(!source)throw Error(`Missing normal mainline source ${sourceId}`);
  const nearestRefs=[...refs].sort((a,b)=>{
   const distance=l=>3*(Math.abs(source.width-l.width)+Math.abs(source.height-l.height))+Math.abs(source.width*source.height-l.width*l.height);
   return distance(a.packet.level)-distance(b.packet.level);
  }).slice(0,4),reference=nearestRefs[Math.floor(serial/sources.length)%nearestRefs.length];
  const seed=(Math.imul(sourceId+1937,7919)+serial*104729+[...label].reduce((n,c)=>n+c.charCodeAt(0)*8191,0))>>>0;
  const built=buildCompositionalCandidate(source,reference.packet,runtime,{seed,referencePath:reference.path,referenceFileSha256:reference.fileSha256,
   shapeProfile,primaryExitQuota,referenceExitFieldMode,reservedGeneratorBerths:berths,paletteSize:6,maxNodes:10000,maxTransitions:10000});
  const row={serial,sourceLevelId:sourceId,reference:reference.path,seed,status:'REJECTED_CONSTRUCTION',reason:built.reason??null};rows.push(row);
  if(!built.ok){row.construction=built.reference??built.construction;write('RUNNING_FINITE_BATCH');continue;}
  const level=built.level,nearest=Math.max(0,...selected.map(l=>compareLayouts(l,level).footprintSimilarity));
  row.nearestSelectedFootprintArea=nearest;row.construction=built.construction;
  if(nearest>.65){row.status='REJECTED_SELECTED_SIMILARITY';write('RUNNING_FINITE_BATCH');continue;}
  const fingerprints=designFingerprints(level),prior=parents.get(sourceId);let attempt;
  try{attempt=await ledger.claim(level,{...(prior?{redesignOf:prior}:{}),allowRevalidation:false});}
  catch(error){row.status='REJECTED_ATTEMPT_LEDGER';row.reason=error.message;write('RUNNING_FINITE_BATCH');continue;}
  const packet={accepted:false,formalReady:false,productionChanged:false,sourceLevelId:sourceId,sourceLevelSha256:built.sourceLevelSha256,
   level,levelSha256:levelSha256(level),provenance:built.construction,attempt,proofToolchainSha256:runtime.toolchainSha256,inputBindings:inputs};
  plainSearches++;
  const proof=boundedPlainTask(level,runtime,{floor:16,searchUpper:96,...budget});packet.proof=proof;
  row.proof={status:proof.status,termination:proof.routeTermination??proof.termination,states:proof.discoveredStates,
   expanded:proof.exploredStates,rawFullBoardStates:proof.rawFullBoardStates,rawExploredStates:proof.rawExploredStates};
  if(proof.discoveredStates>10000||proof.exploredStates>10000||proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates)
   throw Error('Raw complete-board budget mismatch');
  if(proof.drags){
   packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,packet.drags);packet.independentReplay=independentReplay(runtime,level,packet.drags,{});
   const U=packet.independentReplay.nonClearingDrags,L=proof.certifiedFloor,difficulty=U<=20?1:U<=30?2:3;
   if(packet.replay.valid&&packet.replay.complete&&packet.independentReplay.valid&&packet.independentReplay.complete&&L>=[0,16,21,31][difficulty])
    Object.assign(packet,{accepted:true,L,U,difficulty,status:'PLAIN_BASE_VERIFIED_PENDING_ACTUAL_FIFO'});
  }
  if(!packet.accepted){packet.status='UNKNOWN_OR_OUTSIDE_DIFFICULTY_BAND';parents.set(sourceId,fingerprints.designSha256);}
  await ledger.finish(attempt,{...packet,lowerBound:{result:proof},route:{search:proof}});
  const basePath=`${directory}/bases/candidate-${String(serial).padStart(4,'0')}.json`;
  fs.writeFileSync(basePath,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});row.basePath=basePath;row.status=packet.status;
  if(packet.accepted){
   if(packet.difficulty+1>berths){row.status='BASE_HAS_INSUFFICIENT_MACHINE_BERTHS';write('RUNNING_FINITE_BATCH');continue;}
   const preview=makeSmallCargoCandidate(runtime,packet,{variant:25});
   if(preview.chosen.some(g=>!g.firstVacancy||g.firstVacancy.cleared<2||g.firstVacancy.cleared>level.blocks.length-2)){
    row.status='BASE_HAS_NO_MIDGAME_FOOTPRINT_PLAN';row.chosen=preview.chosen;write('RUNNING_FINITE_BATCH');continue;
   }
   const suffix=`${label}/enhanced-${String(serial).padStart(4,'0')}`;
   const actual=await qualifySmallCargo(basePath,{label:suffix,variant:25});
   row.actualStatus=actual.status;row.actualL=actual.L;row.actualU=actual.U;
   if(actual.accepted){const p=`${ROOT}/mechanisms/${suffix}/candidate.json`;records.push({path:p,fileSha256:hash(p)});selected.push(actual.level);}
  }
  write('RUNNING_FINITE_BATCH');console.log(JSON.stringify({label,serial,sourceId,status:row.status,actualStatus:row.actualStatus,plainSearches,accepted:records.length}));
 }
 write('FINITE_BATCH_COMPLETE');return{directory,plainSearches,accepted:records.length,constructed:rows.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 console.log(JSON.stringify(await runGeneratorGlobalBatch({label:process.argv[2],berths:Number(process.argv[3]??3),
  maxPlainSearches:Number(process.argv[4]??12),maxConstructions:Number(process.argv[5]??96)})));
