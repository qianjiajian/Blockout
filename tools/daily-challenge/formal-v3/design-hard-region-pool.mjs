import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,boundedPlainTask,boundedBudget,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {retileWholeBoard,boardCells,absoluteCells,bodyFootprint,digest,random,rectangular,FACTORY_VERSION} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
import {fixColors} from '../formal-v2/design-layout-factory.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';

export const HARD_REGION_VERSION='daily-connected-large-region-repartition-v1.4';
const ROOT='deliverables/daily-formal-v3-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const key=p=>p.join(','),pointsHash=p=>digest(p.map(key).sort());
const shapeInventory=l=>digest(l.blocks.map(b=>digest(b.shape)).sort());
const cellColours=l=>digest(l.blocks.flatMap(b=>absoluteCells(b).map(p=>[key(p),b.color])).sort());
const adjacency=(a,b)=>absoluteCells(a).some(p=>absoluteCells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
export const DEFAULT_HARD_REFERENCES=[
 'nearband14-pilot/candidate-0017.json','wide-rect-06/candidate-0379.json','bar-gen3-09/candidate-0388.json',
 'generator-berths-05/candidate-0057.json','native-small-07/candidate-0041.json','native-small-07/candidate-0479.json',
 'unused-shared-01/candidate-0004.json','broad-rect-04/candidate-0533.json',
].map(p=>`${ROOT}/design/${p}`);
export const SECOND_HARD_REFERENCES=[
 'nearband14-pilot/candidate-0017.json','wide-rect-06/candidate-0379.json','nearband14-third/candidate-0073.json',
 'hard-region-02/candidate-0015.json','bar-gen3-09/candidate-0388.json','broad-rect-04/candidate-0533.json',
 'global-pilot-02/candidate-0180.json','native-small-07/candidate-0041.json','native-small-07/candidate-0479.json','unused-shared-01/candidate-0004.json',
].map(p=>`${ROOT}/design/${p}`);

export function inheritedVisualExclusions(indexPath){
 const excluded=new Map(),indices=[];let next=indexPath;
 while(next&&!indices.some(i=>i.path===next)){
  const index=read(next);indices.push({path:next,fileSha256:hash(next)});
  for(const removed of index.visualCuration?.removed??[]){
   const receipt=read(removed.file),base=read(receipt.baseInputFile),fingerprint=designFingerprints(base.level).designSha256;
   excluded.set(fingerprint,{designSha256:fingerprint,baseInputFile:receipt.baseInputFile,baseFileSha256:hash(receipt.baseInputFile),
    removedReceipt:removed.file,removedReceiptSha256:hash(removed.file),reviewFile:index.visualCuration.reviewFile});
  }
  next=index.priorIndex;
 }
 return{indices,excluded:[...excluded.values()]};
}

/** Construction only: grow one connected union of whole old bodies. */
export function chooseConnectedRegion(level,{seed=1,minimum=.35,maximum=.50,maxGrowthAttempts=48,protectedBodyIds=[]}={}){
 if(minimum!==.35||maximum!==.50||!Number.isSafeInteger(maxGrowthAttempts)||maxGrowthAttempts<1||maxGrowthAttempts>48)
  throw Error('Invalid finite hard-region geometry request');
 const protectedSet=new Set(protectedBodyIds);
 if(protectedBodyIds.some(id=>!level.blocks.some(b=>b.id===id)))throw Error('Unknown protected reference body');
 const r=random(seed),bodies=level.blocks,total=boardCells(level).length,neighbors=bodies.map(a=>bodies.flatMap((b,i)=>a!==b&&adjacency(a,b)?[i]:[])),
  selectable=bodies.flatMap((b,i)=>protectedSet.has(b.id)?[]:[i]);
 if(!selectable.length)return null;
 for(let attempt=0;attempt<maxGrowthAttempts;attempt++){
  const chosen=new Set([selectable[Math.floor(r()*selectable.length)]]);let area=[...chosen].reduce((n,i)=>n+bodies[i].shape.length,0);
  const target=total*(minimum+r()*(maximum-minimum));
  while(area<target){
   const frontier=[...new Set([...chosen].flatMap(i=>neighbors[i]))].filter(i=>!protectedSet.has(bodies[i].id)&&!chosen.has(i)&&area+bodies[i].shape.length<=maximum*total);
   if(!frontier.length)break;
   // Prefer compact unions while still varying region location and outline.
   frontier.sort((a,b)=>neighbors[b].filter(i=>chosen.has(i)).length-neighbors[a].filter(i=>chosen.has(i)).length);
   const next=frontier[Math.floor(r()*Math.min(frontier.length,3))];chosen.add(next);area+=bodies[next].shape.length;
  }
  if(area>=minimum*total&&area<=maximum*total&&chosen.size>=3)return{
   indices:[...chosen].sort((a,b)=>a-b),area,total,ratio:area/total,growthAttempts:attempt+1,
   cells:[...chosen].flatMap(i=>absoluteCells(bodies[i]))};
 }
 return null;
}

/** Read a supplied complete plain route. No board search or alternate route. */
export function deriveEarlyChainProtection(level,drags,{maximumAreaRatio=.25}={}){
 if(maximumAreaRatio!==.25)throw Error('Early-chain protection ceiling is 25%');
 let clears=0,current=[];const chains=[],earlyExits=[];
 const flush=()=>{if(current.length)chains.push({clears,actions:current});current=[];};
 for(const[index,drag]of drags.entries()){
  if(drag.exitSide){flush();if(clears<2)earlyExits.push({blockId:drag.blockId,drag:index+1});clears++;}
  else if(clears>=1&&clears<=2)current.push({blockId:drag.blockId,drag:index+1});
 }flush();
 const chain=chains.sort((a,b)=>b.actions.length-a.actions.length)[0]??null;
 if(!chain)return{protectedBodyIds:[],protectedArea:0,maximumAreaRatio,chain:null,fullBoardSearchInvocations:0};
 const counts=new Map();for(const a of chain.actions)counts.set(a.blockId,(counts.get(a.blockId)??0)+1);
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]||level.blocks.find(x=>x.id===a[0]).shape.length-level.blocks.find(x=>x.id===b[0]).shape.length);
 const choices=[...earlyExits.filter(e=>e.drag<chain.actions[0].drag).map(e=>e.blockId),...ranked.map(([id])=>id)],protectedBodyIds=[];
 let protectedArea=0;const total=boardCells(level).length;
 for(const id of choices){
  if(protectedBodyIds.length>=4)break;const block=level.blocks.find(b=>b.id===id);
  if(!block||protectedBodyIds.includes(id)||protectedArea+block.shape.length>maximumAreaRatio*total)continue;
  protectedBodyIds.push(id);protectedArea+=block.shape.length;
 }
 return{protectedBodyIds,protectedArea,protectedAreaRatio:protectedArea/total,maximumAreaRatio,
  chain:{clears:chain.clears,firstDrag:chain.actions[0].drag,lastDrag:chain.actions.at(-1).drag,nonClearingDrags:chain.actions.length,
   bodyActionCounts:ranked.map(([blockId,actions])=>({blockId,actions}))},fullBoardSearchInvocations:0};
}

function assertPlain(level){
 const allowedBody=new Set(['id','x','y','shape','color']),allowedGate=new Set(['id','color','side','offset','size']);
 if(level.blocks.some(b=>Object.keys(b).some(k=>!allowedBody.has(k)))||level.gates.some(g=>Object.keys(g).some(k=>!allowedGate.has(k)))
  ||['shutters','generators','flipDoors','coloredGrids','seams','elevators'].some(k=>level[k]?.length))throw Error('Reference must be a plain visible single-layer layout');
}

/** Verify static geometry and actual art files; this never searches board actions. */
export function inspectHardRegionStatic(level,source,runtime){
 const reasons=[],playable=new Set(boardCells(level).map(key)),covered=new Set();
 if(level.width!==source.width||level.height!==source.height||pointsHash(boardCells(level))!==pointsHash(boardCells(source)))reasons.push('normal-source-mask-changed');
 for(const b of level.blocks){
  for(const p of absoluteCells(b)){const k=key(p);if(!playable.has(k))reasons.push('body-outside-mask');if(covered.has(k))reasons.push('body-overlap');covered.add(k);}
  const art=runtime.matchFormalBlockShape(b.shape,'native-only'),file=art&&runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[art.shapeId];
  if(art?.quarterTurns!==0||!file||!fs.existsSync(`public/${file}`))reasons.push('native-art-missing');
 }
 if(covered.size!==playable.size)reasons.push('opening-not-full');
 if(level.blocks.some((a,i)=>level.blocks.slice(i+1).some(b=>a.color===b.color&&adjacency(a,b))))reasons.push('adjacent-equal-colour');
 try{runtime.validateLevel(level);}catch(e){reasons.push(`native-validation:${e.message}`);}
 return{valid:!reasons.length,reasons:[...new Set(reasons)],playable:playable.size,covered:covered.size};
}

export function buildHardRegionCandidate(source,reference,runtime,{seed=1,protectedBodyIds=[]}={}){
 assertPlain(reference);
 if(source.width!==reference.width||source.height!==reference.height||pointsHash(boardCells(source))!==pointsHash(boardCells(reference)))
  return{ok:false,reason:'reference-does-not-use-source-normal-mask'};
 const region=chooseConnectedRegion(reference,{seed,protectedBodyIds});if(!region)return{ok:false,reason:'no-connected-whole-body-region'};
 const target=new Set(region.indices),fixed=reference.blocks.filter((b,i)=>!target.has(i)),oldRegion=reference.blocks.filter((b,i)=>target.has(i));
 const bodyCount=reference.blocks.length+([-1,0,1][seed%3]),irregular=reference.blocks.some(b=>!rectangular(b.shape));
 let partition=retileWholeBoard(reference,runtime,{seed:seed^0x6c8e9cf5,maxNodes:10000,maxTransitions:10000,
  bodyCount,irregular,minimumIrregular:irregular?2:0,shapeProfile:'balanced',fixedBlocks:fixed,forbiddenFootprints:oldRegion.map(bodyFootprint)});
 let partitionAdapter=null;
 if(!partition.ok&&partition.reason==='invalid-fixed-original-orientation-footprint'){
  // The shared generator palette only admits shapes available in >=4 colours.
  // A retained reference body needs its own real colour asset, not 4 others.
  const nativeFixed=fixed.every(b=>{const match=runtime.matchFormalBlockShape(b.shape,'native-only'),asset=match&&runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];
   return match?.quarterTurns===0&&asset&&fs.existsSync(`public/${asset}`);});
  if(nativeFixed){
   const regionBoard={...structuredClone(reference),playable:structuredClone(region.cells),blocked:[],blocks:structuredClone(oldRegion)};
   const result=retileWholeBoard(regionBoard,runtime,{seed:seed^0x6c8e9cf5,maxNodes:10000,maxTransitions:10000,bodyCount:bodyCount-fixed.length,
    irregular,minimumIrregular:Math.max(0,(irregular?2:0)-fixed.filter(b=>!rectangular(b.shape)).length),shapeProfile:'balanced',forbiddenFootprints:oldRegion.map(bodyFootprint)});
   partitionAdapter='connected-region-only; retain individually qualified fixed native assets';
   partition={...result,blocks:result.ok?[...structuredClone(fixed),...result.blocks]:undefined};
  }
 }
 const construction={version:HARD_REGION_VERSION,seed,protectedBodyIds:[...protectedBodyIds],region:{...region,cells:region.cells.map(p=>[...p])},
  oldRegionBodyIds:oldRegion.map(b=>b.id),retainedBodyIds:fixed.map(b=>b.id),retainedAreaRatio:1-region.ratio,
  referenceBodyCount:reference.blocks.length,candidateBodyCount:bodyCount,partitionNodes:partition.nodes,partitionTransitions:partition.transitions,partitionAdapter,
  oldRegionFootprintsForbidden:true,regionOutsidePositionShapeColourUnchanged:true,exitGeometryAndColoursUnchanged:true,
  sourceInventoryPolicy:'Normal source mask retained; full inventory is independently designed. This candidate retiles one connected 35–50% reference region.'};
 if(!partition.ok)return{ok:false,reason:partition.reason,construction};
 const fixedByFootprint=new Map(fixed.map(b=>[bodyFootprint(b),b]));
 const level=structuredClone(reference);level.name=`每日新大区设计 ${source.id}-${seed}`;
 const unusedOld=new Map(oldRegion.map(b=>[b.id,b])),bodyCorrespondence=[];
 level.blocks=partition.blocks.map(b=>{
  if(fixedByFootprint.has(bodyFootprint(b)))return structuredClone(fixedByFootprint.get(bodyFootprint(b)));
  const occupied=new Set(absoluteCells(b).map(key));
  const old=[...unusedOld.values()].sort((a,c)=>absoluteCells(c).filter(p=>occupied.has(key(p))).length-absoluteCells(a).filter(p=>occupied.has(key(p))).length)[0];
  if(old){unusedOld.delete(old.id);bodyCorrespondence.push({id:old.id,oldFootprint:bodyFootprint(old),newFootprint:bodyFootprint(b)});}
  return{...b,id:old?.id??b.id,color:old?.color??'red'};
 });
 const changed=level.blocks.filter(b=>!fixedByFootprint.has(bodyFootprint(b))).map(b=>b.id);
 if(!fixColors(level,changed,seed^0xa30c1e17,runtime,{keepProbability:0}))return{ok:false,reason:'native-exit-colour-domain',construction};
 const staticAudit=inspectHardRegionStatic(level,source,runtime);
 if(!staticAudit.valid)return{ok:false,reason:'static-invalid',construction,staticAudit};
 const shapeChanged=shapeInventory(reference)!==shapeInventory(level),colourChanged=cellColours(reference)!==cellColours(level),
  retained=compareLayouts(reference,level).footprintSimilarity;
 Object.assign(construction,{sourceShapeInventoryChanged:shapeChanged,sourceCellColoursChanged:colourChanged,
  changedNewBodyIds:changed,referenceOrbitFootprintSimilarity:retained,normalSourceLevelSha256:levelSha256(source)});
 construction.bodyCorrespondence=bodyCorrespondence;
 if(!shapeChanged||!colourChanged)return{ok:false,reason:'shape-inventory-and-colours-must-both-change',construction};
 if(retained>.65+1e-12)return{ok:false,reason:'reference-orbit-similarity',construction};
 return{ok:true,level,construction,staticAudit};
}

function collectSuccessfulPool(directory,out=[]){
 for(const item of fs.readdirSync(directory,{withFileTypes:true})){
  const p=`${directory}/${item.name}`;if(item.isDirectory())collectSuccessfulPool(p,out);
  else if(/^candidate.*\.json$/.test(item.name)){let q;try{q=read(p);}catch{continue;}if(q.accepted&&q.level)out.push({path:p,fileSha256:hash(p),level:q.level});}
 }return out;
}

export async function runHardRegionPool({label='hard-region-01',references=DEFAULT_HARD_REFERENCES,maxSearchesPerSource=5,
 maxConstructionsPerSource=30,selectedIndex=`${ROOT}/selection/unused-shared-selected-02/index.json`,previousReports=[],newInputQuotaPerSource=null,protectEarlyChain=false}={}){
 if(!/^[a-z0-9-]+$/.test(label)||!Array.isArray(references)||references.length<1||references.length>(newInputQuotaPerSource===null?8:16)
  ||!Number.isSafeInteger(maxSearchesPerSource)||maxSearchesPerSource<1||maxSearchesPerSource>5
  ||!Number.isSafeInteger(maxConstructionsPerSource)||maxConstructionsPerSource<1||maxConstructionsPerSource>30||!Array.isArray(previousReports)
  ||typeof protectEarlyChain!=='boolean'||newInputQuotaPerSource!==null&&(!Number.isSafeInteger(newInputQuotaPerSource)||newInputQuotaPerSource<1||newInputQuotaPerSource>10))
  throw Error('Invalid finite hard-region batch request');
 const directory=`${ROOT}/design/${label}`;if(fs.existsSync(directory))throw Error('Use a new immutable hard-region batch label');
 const refs=references.map(p=>({path:p,fileSha256:hash(p),packet:read(p)}));
 if(new Set(refs.map(r=>r.packet.sourceLevelId)).size!==refs.length)throw Error('At most one reference per source');
 if(refs.some(r=>!r.packet.accepted||r.packet.U<26||!r.packet.drags||r.packet.L<21))throw Error('Reference requires prior successful high D2 or D3');
 const visual=inheritedVisualExclusions(selectedIndex),excluded=new Set(visual.excluded.map(e=>e.designSha256));
 if(refs.some(r=>excluded.has(designFingerprints(r.packet.level).designSha256)))throw Error('Visually excluded physical reference cannot be selected again');
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!=='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804')throw Error('Frozen proof toolchain changed');
 const ledger=await createAttemptLedger(`${ROOT}/proof/attempts`),selected=read(selectedIndex).files.map(p=>({path:p,fileSha256:hash(p),level:read(p).level}));
 const oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldIndex).entries.map(e=>({path:e.path,level:read(e.path).level}));
 const pool=collectSuccessfulPool(`${ROOT}/design`),budget=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
 fs.mkdirSync(directory,{recursive:true});
 const modules=['formal-v3/design-hard-region-pool.mjs','formal-v3/diversity-layout-factory.mjs','formal-v3/diversity.mjs','formal-v3/bounded-proof.mjs','formal-v2/design-layout-factory.mjs'];
 const bindings=modules.map(p=>{const input=`tools/daily-challenge/${p}`;fs.copyFileSync(input,`${directory}/${p.replaceAll('/','-')}.snapshot`);return{path:input,sha256:hash(input)};});
 const protectionPlans=new Map(refs.map(r=>[r.packet.sourceLevelId,protectEarlyChain?deriveEarlyChainProtection(r.packet.level,r.packet.drags):{protectedBodyIds:[]}]));
 const referenceBindings=refs.map(r=>({path:r.path,fileSha256:r.fileSha256,sourceLevelId:r.packet.sourceLevelId,L:r.packet.L,U:r.packet.U,protectionPlan:protectionPlans.get(r.packet.sourceLevelId)}));
 const comparisonBindings={selectedIndex,selectedIndexSha256:hash(selectedIndex),selected:selected.map(({path,fileSha256})=>({path,fileSha256})),
  oldIndex,oldIndexSha256:hash(oldIndex),oldCount:old.length,acceptedNew:pool.map(({path,fileSha256})=>({path,fileSha256})),visualExclusions:visual};
 fs.writeFileSync(`${directory}/comparison-inputs.json`,JSON.stringify(comparisonBindings,null,2)+'\n',{flag:'wx'});
 const rows=[],records=[],parents=new Map(),searchCounts=new Map(),priorBindings=[];let priorRowsOutsideCurrentSourceScope=0;
 for(const reportPath of previousReports){
  const prior=read(reportPath);if(prior.status!=='FINITE_BATCH_COMPLETE')throw Error('Previous finite batch must be closed');
  priorBindings.push({path:reportPath,fileSha256:hash(reportPath)});
  for(const row of prior.rows.filter(r=>r.path&&r.proof)){
   if(!refs.some(r=>r.packet.sourceLevelId===row.sourceLevelId)){priorRowsOutsideCurrentSourceScope++;continue;}
   searchCounts.set(row.sourceLevelId,(searchCounts.get(row.sourceLevelId)??0)+1);
   if(!row.accepted)parents.set(row.sourceLevelId,designFingerprints(read(row.path).level));
  }
 }
 const inheritedSearches=[...searchCounts.values()].reduce((a,b)=>a+b,0);
 const inheritedSearchCounts=new Map(searchCounts);
 const write=status=>{
  fs.writeFileSync(`${directory}/report.json`,JSON.stringify({version:HARD_REGION_VERSION,status,formalReady:false,productionChanged:false,
   proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,ruleVersion:runtime.boundedRuleVersion,
   factoryVersion:FACTORY_VERSION,budget,searchUpper:128,floor:16,maxSearchesPerSource,maxConstructionsPerSource,
   totalSearches:[...searchCounts.values()].reduce((a,b)=>a+b,0),newSearches:[...searchCounts.values()].reduce((a,b)=>a+b,0)-inheritedSearches,
   inheritedSearches,inheritedSearchCounts:Object.fromEntries(inheritedSearchCounts),newInputQuotaPerSource,
   authorizedAdditionalInputLimit:newInputQuotaPerSource===null?null:refs.length*newInputQuotaPerSource,
   requestedDistinctReferenceSources:newInputQuotaPerSource===null?8:16,actualDistinctReferenceSources:refs.length,
   referencesFrozenBeforeBatch:true,protectEarlyChain,priorRowsOutsideCurrentSourceScope,priorBindings,searchCounts:Object.fromEntries(searchCounts),referenceBindings,bindings,
   diversity:{selectedMaximum:.65,acceptedNewMaximum:.65,old450Maximum:.75,allEightSymmetries:true,selectedCount:selected.length,oldCount:old.length},
   constructionIsNotBoardSearch:true,referenceRouteReplayedOnly:true,rows,records},null,2)+'\n');
  fs.writeFileSync(`${directory}/index.json`,JSON.stringify({records},null,2)+'\n');
 };
 for(const ref of refs){
  const {packet:reference}=ref,sourceId=reference.sourceLevelId,source=runtime.LEVELS.find(l=>l.id===sourceId);
  if(!source)throw Error(`Unknown source ${sourceId}`);
  const replay=runtime.replayRevisedRoute(reference.level,reference.drags);
  if(!replay.valid||!replay.complete||replay.nonClearingDrags!==reference.U)throw Error(`Reference route mismatch ${ref.path}`);
  const sourceSearchLimit=newInputQuotaPerSource===null?maxSearchesPerSource:(inheritedSearchCounts.get(sourceId)??0)+newInputQuotaPerSource;
  for(let constructionIndex=0;constructionIndex<maxConstructionsPerSource&&(searchCounts.get(sourceId)??0)<sourceSearchLimit;constructionIndex++){
   if(fs.existsSync(`${ROOT}/design/STOP`)){write('STOPPED_BY_COORDINATOR');return{directory,records:records.length};}
   const serial=rows.length,seed=(Math.imul(sourceId+1399,65537)+constructionIndex*8191+[...label].reduce((n,c)=>n+c.charCodeAt(0)*719,0))>>>0;
   const built=buildHardRegionCandidate(source,reference.level,runtime,{seed,protectedBodyIds:protectionPlans.get(sourceId).protectedBodyIds});
   const row={serial,sourceLevelId:sourceId,reference:ref.path,seed,status:'REJECTED_CONSTRUCTION',reason:built.reason??null,construction:built.construction};rows.push(row);
   if(!built.ok){write('RUNNING_FINITE_BATCH');continue;}
   const {level}=built;
   const nearest=entries=>entries.reduce((best,x)=>{const s=compareLayouts(x.level,level).footprintSimilarity;return s>best.similarity?{similarity:s,path:x.path}:best;},{similarity:0,path:null});
   Object.assign(row,{nearestSelected:nearest(selected),nearestAcceptedNew:nearest(pool),nearestOld450:nearest(old)});
   if(row.nearestSelected.similarity>.65+1e-12||row.nearestAcceptedNew.similarity>.65+1e-12||row.nearestOld450.similarity>.75+1e-12){row.status='REJECTED_SIMILARITY';write('RUNNING_FINITE_BATCH');continue;}
   const fingerprints=designFingerprints(level),previous=parents.get(sourceId);let attempt;
   if(excluded.has(fingerprints.designSha256)){row.status='REJECTED_INHERITED_VISUAL_INPUT';write('RUNNING_FINITE_BATCH');continue;}
   if(previous&&(previous.shapeSha256===fingerprints.shapeSha256||previous.colorSha256===fingerprints.colorSha256)){
    row.status='REJECTED_UNCHANGED_FAILED_SHAPES_OR_COLOURS';write('RUNNING_FINITE_BATCH');continue;
   }
   try{attempt=await ledger.claim(level,{...(previous?{redesignOf:previous.designSha256}:{}),allowRevalidation:false});}
   catch(e){row.status='REJECTED_PUBLIC_LEDGER';row.reason=e.message;write('RUNNING_FINITE_BATCH');continue;}
   searchCounts.set(sourceId,(searchCounts.get(sourceId)??0)+1);
   const packet={status:'UNKNOWN',accepted:false,formalReady:false,productionChanged:false,sourceLevelId:sourceId,sourceLevelSha256:levelSha256(source),
    level,levelSha256:levelSha256(level),provenance:{...built.construction,referencePath:ref.path,referenceFileSha256:ref.fileSha256},
    staticAudit:built.staticAudit,attempt,proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,inputBindings:bindings,
    pointerValidated:false,timeValidated:false};
   const proof=boundedPlainTask(level,runtime,{floor:16,searchUpper:128,...budget});packet.proof=proof;
   if(proof.discoveredStates>10000||proof.exploredStates>10000||proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates)throw Error('Raw complete-board budget mismatch');
   row.proof={status:proof.status,termination:proof.routeTermination??proof.termination,L:proof.certifiedFloor,U:proof.cost??null,
    rawFullBoardStates:proof.rawFullBoardStates,rawExploredStates:proof.rawExploredStates,transitions:proof.attemptedTransitions,microStates:proof.microDiscoveredStates};
   if(proof.drags){
    packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
    const U=packet.replay.nonClearingDrags,L=proof.certifiedFloor,difficulty=U<=20?1:U<=30?2:3;
    if(packet.replay.valid&&packet.replay.complete&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed
     &&packet.independentReplay.nonClearingDrags===U&&U>=L&&L>=[0,16,21,31][difficulty])
     Object.assign(packet,{accepted:true,status:'EXPLORATORY_SAME_OBJECT_LU_PENDING_V3_CONTRACT',L,U,difficulty});
   }
   if(!packet.accepted){packet.status='UNKNOWN_OR_OUTSIDE_DIFFICULTY_BAND';parents.set(sourceId,fingerprints);}
   await ledger.finish(attempt,{...packet,lowerBound:{result:proof},route:{search:proof}});
   const candidatePath=`${directory}/candidate-${String(serial).padStart(4,'0')}.json`;fs.writeFileSync(candidatePath,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
   Object.assign(row,{status:packet.status,path:candidatePath,accepted:packet.accepted,L:packet.L,U:packet.U,difficulty:packet.difficulty});
   if(packet.accepted){const entry={path:candidatePath,fileSha256:hash(candidatePath),sourceLevelId:sourceId,difficulty:packet.difficulty,L:packet.L,U:packet.U};records.push(entry);pool.push({...entry,level});}
   write('RUNNING_FINITE_BATCH');console.log(JSON.stringify({serial,sourceId,status:row.status,proof:row.proof,accepted:records.length,searchCounts:Object.fromEntries(searchCounts)}));
  }
 }
 write('FINITE_BATCH_COMPLETE');return{directory,searches:[...searchCounts.values()].reduce((a,b)=>a+b,0),accepted:records.length,constructed:rows.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 console.log(JSON.stringify(await runHardRegionPool({label:process.argv[2]??'hard-region-01',previousReports:process.argv.slice(3)})));
