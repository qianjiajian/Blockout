import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,boundedLowerTask,boundedPlainTask,createAttemptLedger} from './bounded-proof.mjs';
import {independentReplay,routeSha256} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';
import {digest,orbitFootprintArea} from './diversity-layout-factory.mjs';
import {createReverseConstructionTemplate,buildReverseConstructedCandidate} from './design-reverse-construction-factory.mjs';
import {createReverseConstructionLedger} from './design-reverse-construction-ledger.mjs';
import {pruneKnownPlainWitness} from './design-known-route-prune.mjs';
import {proofPlanForKnownU,classifyKnownWitnessLower} from './design-reverse-proof-plan.mjs';

const root='deliverables/daily-formal-v3-20261008/design',label=process.env.DESIGN_V3_LABEL;
if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Explicit fresh label required');
const directory=`${root}/${label}`;if(fs.existsSync(directory))throw Error('Preserve prior reverse experiment');
const runtime=await loadBoundedRuntime(),blueprintIndexPath=process.env.DESIGN_V3_BLUEPRINT_INDEX;
const proofMode=process.env.DESIGN_V3_PROOF_MODE??'known-lower';
if(!['known-lower','d3-lower','adaptive-joint'].includes(proofMode))throw Error('Unknown predeclared proof mode');
const blueprintIndex=blueprintIndexPath?JSON.parse(fs.readFileSync(blueprintIndexPath)):null,blueprints=blueprintIndex?.records??null;
if(blueprints&&(blueprints.length>8||new Set(blueprints.map(x=>x.path)).size!==blueprints.length||blueprints.some(x=>blueprints.filter(y=>y.sourceLevelId===x.sourceLevelId).length>2)))throw Error('Blueprint pilot requires at most eight distinct stocks and at most two per source');
const ids=blueprints?blueprints.map(x=>x.sourceLevelId):(process.env.DESIGN_V3_SOURCES??'2,3,7,18').split(',').map(Number);
const rounds=Number(process.env.DESIGN_V3_ATTEMPTS??1);if(!Number.isSafeInteger(rounds)||rounds<1||rounds*ids.length>40)throw Error('Reverse prototype batch is at most 40 new construction inputs');
if(blueprints&&rounds!==1)throw Error('Only one initial construction per successful blueprint stock');
const budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
const constructionOptions={...budget,minimumScrambleDrags:blueprints?0:36,maxScrambleDrags:blueprints?180:96,shapeProfile:process.env.DESIGN_V3_SHAPE_PROFILE??'balanced'};
constructionOptions.queuePolicy=process.env.DESIGN_V3_REVERSE_QUEUE_POLICY??'minimum-parking';
if(!['minimum-parking','fill-first-diverse'].includes(constructionOptions.queuePolicy))throw Error('Invalid predeclared reverse queue policy');
if(process.env.DESIGN_V3_ROUTE_COLOURING==='1')constructionOptions.routeCompatibleColouring=true;
const constructionLedger=await createReverseConstructionLedger(`${root}/reverse-construction-attempts`);
const proofLedger=await createAttemptLedger('deliverables/daily-formal-v3-20261008/proof/attempts');
const baseline=JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`)),compared=[],oldPool=[];
const scan=dir=>{for(const x of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${x.name}`;if(x.isDirectory())scan(path);else if(/^candidate-.*\.json$/.test(x.name)){
 let p;try{p=JSON.parse(fs.readFileSync(path));}catch{continue;}if(p.accepted&&p.level)compared.push(p.level);
}}};scan(root);
const selectedPath=process.env.DESIGN_V3_SELECTION_INDEX;
if(selectedPath)for(const path of JSON.parse(fs.readFileSync(selectedPath)).files)compared.push(JSON.parse(fs.readFileSync(path)).level);
if(blueprintIndex?.comparisonPaths)for(const path of blueprintIndex.comparisonPaths){
 const bytes=fs.readFileSync(path),expected=blueprintIndex.sourceBindings?.find(x=>x.path===path)?.sha256;
 if(!expected||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Comparison pool source binding changed');
 compared.push(JSON.parse(bytes).level);
}
if(blueprints)for(const ref of blueprints)compared.push(JSON.parse(fs.readFileSync(ref.path)).level);
for(const e of JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/final-qualified/index.json')).entries)oldPool.push(JSON.parse(fs.readFileSync(e.path)).level);
const hashFile=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const modules=['design-reverse-pool.mjs','design-reverse-proof-plan.mjs','design-reverse-construction-factory.mjs','design-route-compatible-colouring.mjs','design-reverse-interleaved.mjs','design-reverse-construction-ledger.mjs','design-reverse-blueprint.mjs','design-known-route-prune.mjs','reverse-route-audit.mjs','diversity-layout-factory.mjs','bounded-proof.mjs','diversity.mjs'];
const bindings=[...modules.map(n=>`tools/daily-challenge/formal-v3/${n}`),...(selectedPath?[selectedPath]:[]),...(blueprintIndexPath?[blueprintIndexPath,...blueprints.map(x=>x.path)]:[])].map(path=>({path,sha256:hashFile(path)}));
fs.mkdirSync(directory);for(const n of modules)fs.copyFileSync(`tools/daily-challenge/formal-v3/${n}`,`${directory}/${n}.snapshot`);
const rows=[],accepted=[];
const write=status=>fs.writeFileSync(`${directory}/report.json`,JSON.stringify({status,formalReady:false,productionChanged:false,
 declaredBeforeAllSearches:{construction:'empty-to-filled reverse insertion and parking',constructionQueuePolicy:constructionOptions.queuePolicy,constructionBudget:budget,
 routeCompatibleColouring:constructionOptions.routeCompatibleColouring?{declaredBeforeConstruction:true,sharedRawBudget:true,maxCspNodes:10000,preserveColourCounts:true,finalGeometryMaximumPoolSimilarity:.65,oneFinalColourAssignmentPerAcceptedClosure:true}:null,
 proofMode,lower:proofMode==='d3-lower'?'Complete pruned known U must be >=31 before one floor31 lower search. A complete same-search shortcut may only be recorded in its actual lower band after double replay; UNKNOWN never changes floor or adds a search.':proofMode==='adaptive-joint'&&blueprints?'Predeclared choice from complete pruned construction U only: U<=128 uses one joint floor31/searchUpper128; U>128 uses one lower-only floor31 with the already complete finite U. No switch after any proof result.':'One plain lower chosen before claim from complete pruned actual U: 16..20 => floor16, 21..30 => floor21, >=31 => floor31. Same-search complete shortcut may classify a lower band after double replay. No second search after UNKNOWN.',lowerBudget:budget,
 jointAllocation:proofMode==='adaptive-joint'&&blueprints?'Joint raw maxStates = 10000 - actual constructor raw count; lower-only has its own <=10000. Implementation allocation, not a new user rule.':null,automaticUpperSearch:Boolean(proofMode==='adaptive-joint'&&blueprints)},
 proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,inputBindings:bindings,sourceIds:ids,rounds,rows,accepted},null,2)+'\n');
for(let round=0;round<rounds;round++)for(const[referenceIndex,sourceId]of ids.entries()){
 const serial=rows.length,seed=createHash('sha256').update(`${label}:${sourceId}:${round}:${referenceIndex}`).digest().readUInt32LE(0),source=runtime.LEVELS.find(x=>x.id===sourceId);
 if(!source||digest(source)!==digest(baseline.rows.find(x=>x.sourceLevelId===sourceId)?.level))throw Error('Mainline baseline changed');
 const row={serial,sourceLevelId:sourceId,seed,status:'CONSTRUCTION_PENDING'},options={...constructionOptions,seed};rows.push(row);
 if(options.routeCompatibleColouring)options.finalGeometryAdmissible=level=>Math.max(0,...compared.map(x=>compareLayouts(x,level).footprintSimilarity),...oldPool.map(x=>compareLayouts(x,level).footprintSimilarity))<=.65;
 const reference=blueprints?.[referenceIndex],referencePacket=reference?JSON.parse(fs.readFileSync(reference.path)):null;
 if(reference&&hashFile(reference.path)!==reference.fileSha256)throw Error('Blueprint immutable input changed');
 if(referencePacket&&!referencePacket.accepted)throw Error('Only successful original blueprints are allowed');
 if(referencePacket)Object.assign(options,{blueprintPacket:referencePacket,blueprintPrefixClearCount:reference.blueprintPrefixClearCount??null,blueprintMaximumPrefixArea:reference.blueprintMaximumPrefixArea??8,blueprintAllowLargePrefix:reference.blueprintAllowLargePrefix??false});
 const template=referencePacket?{ok:true,level:referencePacket.level,construction:{successfulReferencePath:reference.path,referenceFileSha256:reference.fileSha256}}:createReverseConstructionTemplate(source,runtime,options);let built,constructionReceipt;
 if(!template.ok)built={ok:false,status:'NO_STATIC_TEMPLATE',reason:template.reason};
 else{
  let receipt;try{receipt=await constructionLedger.claim(template.level,{sourceLevelId:sourceId,seed,budget:{...constructionOptions,seed,
   blueprintPrefixClearCount:options.blueprintPrefixClearCount??null,blueprintMaximumPrefixArea:options.blueprintMaximumPrefixArea??8,blueprintAllowLargePrefix:options.blueprintAllowLargePrefix??false}});}
  catch(error){built={ok:false,status:'CONSTRUCTION_LEDGER_REJECTED',reason:error.message};}
  if(receipt){constructionReceipt=receipt;try{built=buildReverseConstructedCandidate(source,runtime,{...options,constructionTemplatePacket:template});
    if(built.ok){if(built.routeColouring)built.finalStockAlias=await constructionLedger.registerFinalStock(receipt,built.level);
     const pruned=pruneKnownPlainWitness(runtime,built.level,built.drags);built.unprunedConstructionWitness={drags:built.drags,U:built.U};
     Object.assign(built,{drags:pruned.drags,U:pruned.U,replay:pruned.replay,independentReplay:pruned.independentReplay,knownRoutePruning:pruned});}}
    catch(error){built={...built,ok:false,status:'CONSTRUCTION_THROW',reason:error.message};}
    finally{await constructionLedger.finish(receipt,built);}built.constructionAttempt=receipt.path;}
 }
 const constructionPath=`${directory}/construction-${String(serial).padStart(3,'0')}.json`;fs.writeFileSync(constructionPath,JSON.stringify(built,null,2)+'\n',{flag:'wx'});
 Object.assign(row,{constructionPath,status:built.status,reason:built.reason??null,constructionRaw:built.construction?.rawDiscoveredStates,U:built.U??null});
 if(built.ok){
  const level=built.level,near=Math.max(0,...compared.map(x=>compareLayouts(x,level).footprintSimilarity)),oldNear=Math.max(0,...oldPool.map(x=>compareLayouts(x,level).footprintSimilarity));
  row.diversity={source:orbitFootprintArea(source,level),pool:near,oldV2:oldNear};
  const packet={...built,accepted:false,formalReady:false,sourceLevelId:sourceId,sourceLevelSha256:digest(source),constructionWitness:{drags:built.drags,U:built.U},
   proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,pointerValidated:false,timeValidated:false,inputBindings:bindings};
  const useJoint=Boolean(proofMode==='adaptive-joint'&&blueprints&&built.U<=128);
  const knownPlan=proofPlanForKnownU(built.U);
  packet.declaredProofStrategy={mode:useJoint?'joint-31-128':`lower-only-${knownPlan.floor}`,selectedBeforeFirstClaim:true,completeConstructionU:built.U,knownWitnessPlan:knownPlan,
   reason:useJoint?'Known witness within the finite engineering joint-search target':'Preserve an already complete finite witness; 128 is not a D3 acceptance upper limit'};
  if(near>.65||oldNear>.75||row.diversity.source>.75){packet.status='REJECTED_EXPLORATORY_DIVERSITY';}
  else if(built.U<(proofMode==='d3-lower'?31:16)){packet.status=proofMode==='d3-lower'?'REJECTED_KNOWN_CONSTRUCTION_UPPER_BELOW_D3':'REJECTED_KNOWN_CONSTRUCTION_UPPER_BELOW_ALL_BANDS';}
  else{
   let receipt;try{receipt=await proofLedger.claim(level);}catch(error){packet.status='PUBLIC_LEDGER_REJECTED';packet.reason=error.message;}
   if(receipt){
    packet.attempt=receipt;
    try{const allocated={...budget,maxStates:budget.maxStates-built.construction.rawDiscoveredStates};
     if(useJoint){packet.jointBudgetAllocation={constructionRaw:built.construction.rawDiscoveredStates,maxJointRaw:allocated.maxStates,totalImplementationCap:10000};
      if(allocated.maxStates<1)throw Error('No remaining joint raw allocation after construction');}
     const lower=useJoint?{method:'v3-plain-joint-search',inputLevelSha256:digest(level),projectedLevelSha256:null,projection:null,requiredFloor:31,
      result:boundedPlainTask(level,runtime,{floor:31,searchUpper:128,...allocated})}:boundedLowerTask(runtime,level,knownPlan.difficulty,budget),p=lower.result;packet.lowerBound=lower;packet.proof=p;
    if(useJoint&&['threshold-proven','relaxed-shortcut'].includes(p.status)&&Number.isSafeInteger(p.cost)&&p.cost>=16&&p.drags){
     const replay=runtime.replayRevisedRoute(level,p.drags),independent=independentReplay(runtime,level,p.drags);
     if(replay.valid&&replay.complete&&independent.valid&&independent.complete&&!independent.failed&&replay.nonClearingDrags===p.cost&&independent.nonClearingDrags===p.cost){
      Object.assign(packet,{accepted:true,L:p.cost,U:p.cost,difficulty:p.cost<=20?1:p.cost<=30?2:3,drags:p.drags,replay,independentReplay:independent});
     }
    }
    else if(!useJoint&&lower.method==='v3-plain'){
     const classification=classifyKnownWitnessLower(knownPlan,p);
     if(classification&&!classification.requiresShortcutReplay)Object.assign(packet,{accepted:true,L:classification.L,U:classification.U,difficulty:classification.difficulty});
     else if(classification){const replay=runtime.replayRevisedRoute(level,p.drags),independent=independentReplay(runtime,level,p.drags);
      if(replay.valid&&replay.complete&&independent.valid&&independent.complete&&!independent.failed&&replay.nonClearingDrags===classification.U&&independent.nonClearingDrags===classification.U)
       Object.assign(packet,{accepted:true,L:classification.L,U:classification.U,difficulty:classification.difficulty,drags:p.drags,replay,independentReplay:independent});
     }
    }
    packet.status=packet.accepted?'REVERSE_WITNESS_AND_BOUNDED_LOWER_EXPLORATORY':useJoint?'UNKNOWN_OR_BELOW_BAND_JOINT_WITH_CONSTRUCTION_U':'REJECTED_BOUNDED_LOWER';packet.routeSha256=routeSha256(packet.drags);
    }catch(error){packet.accepted=false;packet.status='LOWER_THROW';packet.reason=error.message;}
    finally{await proofLedger.finish(receipt,packet);}
   }
  }
  const path=`${directory}/candidate-${String(serial).padStart(3,'0')}.json`;fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  Object.assign(row,{path,status:packet.status,accepted:packet.accepted,L:packet.L??null,U:packet.U,difficulty:packet.difficulty??null});
  await constructionLedger.recordProofOutcome(constructionReceipt,{accepted:packet.accepted,status:packet.status,levelSha256:packet.levelSha256});
  if(packet.accepted){accepted.push({path,sourceLevelId:sourceId,difficulty:packet.difficulty,L:packet.L,U:packet.U});compared.push(level);}
 }
 write('REVERSE_FINITE_BATCH_RUNNING');console.log(JSON.stringify(row));
}
write('REVERSE_FINITE_BATCH_FINISHED');
