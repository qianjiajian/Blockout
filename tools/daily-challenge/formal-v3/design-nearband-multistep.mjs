import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {localRetiles,fixColors,random} from '../formal-v2/design-layout-factory.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,boundedPlainTask,boundedBudget,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {compareLayouts,describeLayout} from './diversity.mjs';
import {inventorySummary} from './diversity-layout-factory.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {inheritedVisualExclusions,inspectHardRegionStatic} from './design-hard-region-pool.mjs';

export const VERSION='never-successful-root-multistep-v1.2';
const ROOT='deliverables/daily-formal-v3-20261008',DESIGN=`${ROOT}/design`,LEDGER=`${ROOT}/proof/attempts`;
const FROZEN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
function candidates(dir){return files(dir).filter(p=>/\/candidate-[^/]+\.json$/.test(p));}
function rootsOf(reader,p){const a=reader.inspect(p);return !a.unknownReasons.length&&a.roots.length===1?a.roots:[];}
export function isFailedCompleteUnderband(b){return b.accepted===false&&b.attempt?.id&&b.level&&b.drags&&b.proof?.cost>=12&&b.proof.cost<=15
 &&b.replay?.valid&&b.replay.complete&&b.replay.nonClearingDrags===b.proof.cost
 &&b.independentReplay?.valid&&b.independentReplay.complete&&!b.independentReplay.failed
 &&b.independentReplay.nonClearingDrags===b.proof.cost;}
export function rootAllowed(root,{acceptedRoots,reservedRoots}){return !acceptedRoots.has(root)&&!reservedRoots.has(root);}
export function proximityLayersPass(rootComparisons,referenceComparisons){return passes(rootComparisons)&&passes(referenceComparisons);}
function acceptedPool(reader){const records=[],acceptedRoots=new Set();
 for(const p of candidates(DESIGN)){let b;try{b=read(p);}catch{continue;}if(!b.accepted||!b.level)continue;
  records.push({path:p,fileSha256:sha(p),level:b.level});for(const root of reader.inspect(p).roots)acceptedRoots.add(root);}
 // A shared prototype with a successful league descendant is also no longer a failed family.
 const league='deliverables/league-v2-20261008/design';
 if(fs.existsSync(league))for(const p of candidates(league)){let b;try{b=read(p);}catch{continue;}if(b.accepted&&b.level)for(const root of reader.inspect(p).roots)acceptedRoots.add(root);}
 return{records,acceptedRoots};
}
function similarity(a,b){return Math.max(compareLayouts(a,b).footprintSimilarity,compareLayouts(b,a).footprintSimilarity);}
function compare(level,entries,limit){let max=0,nearest=null;for(const e of entries){const v=similarity(e.level,level);
 if(v>max){max=v;nearest=e.path;}if(v>limit)return{pass:false,maximum:v,nearest,limit};}return{pass:true,maximum:max,nearest,limit};}
function compareAll(level,source,sets){return{source:{maximum:similarity(source,level),limit:.55},
 selected:compare(level,sets.selected,.65),successful:compare(level,sets.successful,.65),visualRejected:compare(level,sets.visual,.65),old450:compare(level,sets.old,.75)};}
function passes(c){return c.source.maximum<=c.source.limit&&['selected','successful','visualRejected','old450'].every(k=>c[k].pass);}
function normalSets(selectionFile,pool){const selection=read(selectionFile),visual=inheritedVisualExclusions(selectionFile);
 const oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json';
 return{selected:selection.files.map(p=>({path:p,fileSha256:sha(p),level:read(p).level})),successful:pool.records,
 visual:visual.excluded.map(e=>({path:e.baseInputFile,fileSha256:sha(e.baseInputFile),level:read(e.baseInputFile).level})),
 old:read(oldIndex).entries.map(e=>({path:e.path,level:read(e.path).level})),visualBindings:visual,oldIndex};}
function failureBinding(b){const out={attemptId:b.attempt.id,levelSha256:levelSha256(b.level),files:[]};
 for(const suffix of ['request','result','blocked']){const p=`${LEDGER}/${b.attempt.id}.${suffix}.json`;if(!fs.existsSync(p))throw Error(`Missing failure ledger ${p}`);
  out.files.push({path:p,fileSha256:sha(p)});if(suffix==='result'&&read(p).accepted===true)throw Error('Failure reference ledger already accepted');}
 return out;}
function reportRoots(reader){const list=[];for(const e of fs.readdirSync(DESIGN)){if(!/^nearband1[4-8](?:-|$)/.test(e))continue;
 const p=`${DESIGN}/${e}/report.json`;if(!fs.existsSync(p))continue;const r=read(p);
 if(r.status!=='FINITE_NEARBAND_BATCH_FINISHED')continue;list.push({path:p,fileSha256:sha(p),report:r});}return list;}

export async function selectReferences({label='nearband-multistep-03',selectionFile=`${ROOT}/selection/nearband19-selected/index.json`,maxSources=20}={}){
 if(!/^[a-z0-9-]+$/.test(label)||maxSources<1||maxSources>20)throw Error('Finite independent batch required');
 const out=`${DESIGN}/${label}`;if(fs.existsSync(out))throw Error('Output already exists; never replace evidence');
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!==FROZEN)throw Error('Frozen proof changed');
 const reader=createReferenceLineageReader(),pool=acceptedPool(reader),sets=normalSets(selectionFile,pool),reports=reportRoots(reader);
 const fifth=`${DESIGN}/shared-underband-seeds-05/index.json`,reservedRoots=new Set();
 if(fs.existsSync(fifth))for(const p of read(fifth).files)for(const root of reader.inspect(p).roots)reservedRoots.add(root);
 for(const e of fs.readdirSync(DESIGN)){const m=/^shared-underband-seeds-(\d+)$/.exec(e);if(!m||Number(m[1])<6)continue;
  const p=`${DESIGN}/${e}/index.json`;if(fs.existsSync(p))for(const q of read(p).files??[])for(const root of reader.inspect(q).roots)reservedRoots.add(root);}
 const lowUReservations=`${DESIGN}/shared-independent-08-11-selected-20/report.json`;
 if(fs.existsSync(lowUReservations))for(const row of read(lowUReservations).selected??[])for(const root of reader.inspect(row.path).roots)reservedRoots.add(root);
 // Each new multistep batch starts with other original roots. Finished failures
 // remain immutable and are not silently retried by reopening a batch.
 for(const e of fs.readdirSync(DESIGN)){if(!e.startsWith('nearband-multistep-'))continue;const p=`${DESIGN}/${e}/references.json`;
  if(fs.existsSync(p))for(const r of read(p).chosen??[])reservedRoots.add(r.rootIndependentSeed);}
 for(const p of files(DESIGN).filter(p=>p.endsWith('/report.json'))){let r;try{r=read(p);}catch{continue;}
  if(r.status==='FINITE_NEARBAND_BATCH_RUNNING')for(const seed of r.selectedSeeds??[])for(const root of reader.inspect(seed.path).roots)reservedRoots.add(root);}
 const eligible=[],rejected=[],familyReport=new Map();
 for(const rr of reports)for(const row of rr.report.rows??[]){const p=row.path;if(!p||!fs.existsSync(p))continue;const b=read(p),roots=rootsOf(reader,p);
  if(roots.length!==1){rejected.push({path:p,reason:'UNBOUND_OR_MULTIPLE_WHOLEBOARD_ROOTS'});continue;}
  const root=roots[0];if(!familyReport.has(root))familyReport.set(root,{root,descendants:0,accepted:false,underband:0});const family=familyReport.get(root);family.descendants++;family.accepted||=b.accepted===true;
  if(!isFailedCompleteUnderband(b))continue;family.underband++;
  if(!rootAllowed(root,{acceptedRoots:pool.acceptedRoots,reservedRoots})){rejected.push({path:p,root,reason:pool.acceptedRoots.has(root)?'ROOT_HAS_ACCEPTED_DESCENDANT':'ROOT_RESERVED_OTHER_BATCH'});continue;}
  eligible.push({path:p,packet:b,root,cost:b.proof.cost,reportPath:rr.path});}
 const maskCounts=new Map(),sourceCounts=new Map();for(const row of sets.selected){const k=describeLayout(row.level).boardOutlineSha256;maskCounts.set(k,(maskCounts.get(k)??0)+1);const source=read(row.path).sourceLevelId;sourceCounts.set(source,(sourceCounts.get(source)??0)+1);}
 for(const e of eligible){e.boardOutlineSha256=describeLayout(e.packet.level).boardOutlineSha256;e.selectedMaskCount=maskCounts.get(e.boardOutlineSha256)??0;e.selectedSourceCount=sourceCounts.get(e.packet.sourceLevelId)??0;}
 eligible.sort((a,b)=>a.selectedMaskCount-b.selectedMaskCount||a.selectedSourceCount-b.selectedSourceCount||b.cost-a.cost||(a.packet.proof.rawFullBoardStates??Infinity)-(b.packet.proof.rawFullBoardStates??Infinity)||a.path.localeCompare(b.path));
 const chosen=[],sources=new Set(),rootsUsed=new Set();
 for(const e of eligible){if(chosen.length>=maxSources)break;const b=e.packet;if(sources.has(b.sourceLevelId)||rootsUsed.has(e.root))continue;
  const source=runtime.LEVELS.find(l=>l.id===b.sourceLevelId);let failure;
  try{assertPlainProofDomain(b.level,runtime);failure=failureBinding(b);}catch(error){rejected.push({path:e.path,reason:error.message});continue;}
  const staticAudit=inspectHardRegionStatic(b.level,source,runtime);if(!staticAudit.valid){rejected.push({path:e.path,reason:'STATIC_REFERENCE_REJECTED',staticAudit});continue;}
  const rootPacket=read(e.root),comparisons=compareAll(b.level,source,sets),rootComparisons=compareAll(rootPacket.level,source,sets);
  if(!proximityLayersPass(rootComparisons,comparisons)){rejected.push({path:e.path,reason:'ROOT_OR_REFERENCE_TOO_SIMILAR',comparisons,rootComparisons});continue;}
  const replay=runtime.replayRevisedRoute(b.level,b.drags),independent=independentReplay(runtime,b.level,b.drags,{});
  if(!replay.valid||!replay.complete||!independent.valid||!independent.complete||independent.failed||replay.nonClearingDrags!==e.cost||independent.nonClearingDrags!==e.cost){rejected.push({path:e.path,reason:'FRESH_KNOWN_ROUTE_FAILED'});continue;}
  const lineage=reader.inspect(e.path);
  chosen.push({path:e.path,fileSha256:sha(e.path),sourceLevelId:b.sourceLevelId,U:e.cost,levelSha256:levelSha256(b.level),failure,
   boardOutlineSha256:e.boardOutlineSha256,selectedMaskCount:e.selectedMaskCount,selectedSourceCount:e.selectedSourceCount,
   rootIndependentSeed:e.root,rootIndependentSeedSha256:sha(e.root),rootLevelSha256:levelSha256(rootPacket.level),rootDesignSha256:designFingerprints(rootPacket.level).designSha256,
   originalWholeBoardProvenance:rootPacket.provenance,lineage:{...lineage,bindings:lineage.ancestors.map(path=>({path,fileSha256:sha(path)}))},
   reportPath:e.reportPath,comparisons,rootComparisons,staticAudit,freshReferenceReplay:{canonical:replay,independent},referenceReplayIsSearch:false});
  sources.add(b.sourceLevelId);rootsUsed.add(e.root);
 }
 fs.mkdirSync(out,{recursive:false});const modules=['design-nearband-multistep.mjs','reference-lineage.mjs','design-hard-region-pool.mjs','diversity.mjs','diversity-layout-factory.mjs','bounded-proof.mjs'].map(p=>`tools/daily-challenge/formal-v3/${p}`).concat(['tools/daily-challenge/formal-v2/design-layout-factory.mjs']);
 const inputBindings=modules.map(p=>{const snapshot=`${out}/${p.split('/').at(-1)}.snapshot`;fs.copyFileSync(p,snapshot);return{path:p,fileSha256:sha(p),snapshot};});
 const report={status:'READONLY_REFERENCES_LOCKED_NO_NEW_SEARCH',version:VERSION,formalReady:false,label,selectionFile,selectionFileSha256:sha(selectionFile),maxSources,perSource:8,
  policy:'Never-successful independent whole-board families only; a failed U12–15 descendant is a read-only reference, never searched again. One accepted child per original root and one root per source.',
  originalReports:reports.map(({path,fileSha256})=>({path,fileSha256})),allFamilyRows:[...familyReport.values()],
  acceptedRoots:[...pool.acceptedRoots],reservedRoots:[...reservedRoots],eligibleUnderbandDescendants:eligible.length,rejected,chosen,inputBindings,
  preference:'Prioritize normal board outlines least represented in the current selection, then source coverage, then known U and finite previous raw cost.',
  selectedBindings:sets.selected.map(({level,...r})=>r),successfulBindings:sets.successful.map(({level,...r})=>r),visualExclusions:sets.visualBindings,
  oldIndex:sets.oldIndex,oldIndexSha256:sha(sets.oldIndex),proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings};
 write(`${out}/references.json`,report);console.log(JSON.stringify({out,chosen:chosen.map(r=>({source:r.sourceLevelId,U:r.U,path:r.path,root:r.rootIndependentSeed})),eligible:eligible.length}));return report;
}

/** Read-only eligibility refresh after an explicitly changed design comparator.
 * Old reference evidence remains immutable; no failed object is searched here. */
export async function qualifyReferences(referenceFile,selectionFile){
 const prior=read(referenceFile),out=referenceFile.replaceAll('\\','/').slice(0,referenceFile.replaceAll('\\','/').lastIndexOf('/'));
 if(fs.existsSync(`${out}/report.json`))throw Error('Cannot requalify a started search batch');
 const target=`${out}/references-qualified-v32.json`;if(fs.existsSync(target))throw Error('Qualification already recorded');
 const modules=prior.inputBindings.map(b=>b.path),atStart=modules.map(path=>({path,fileSha256:sha(path)}));
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!==FROZEN)throw Error('Frozen proof changed');
 const pool=acceptedPool(createReferenceLineageReader()),sets=normalSets(selectionFile,pool),chosen=[],qualificationRejected=[];
 for(const ref of prior.chosen){
  if(sha(ref.path)!==ref.fileSha256||sha(ref.rootIndependentSeed)!==ref.rootIndependentSeedSha256)throw Error('Original reference changed');
  const base=read(ref.path),source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId),rootLevel=read(ref.rootIndependentSeed).level;
  const comparisons=compareAll(base.level,source,sets),rootComparisons=compareAll(rootLevel,source,sets),staticAudit=inspectHardRegionStatic(base.level,source,runtime);
  if(pool.acceptedRoots.has(ref.rootIndependentSeed)||!proximityLayersPass(rootComparisons,comparisons)||!staticAudit.valid){qualificationRejected.push({path:ref.path,rootIndependentSeed:ref.rootIndependentSeed,reason:pool.acceptedRoots.has(ref.rootIndependentSeed)?'ROOT_HAS_NEW_ACCEPTED_DESCENDANT':'FRESH_STATIC_OR_SYMMETRIC_PROXIMITY_REJECTION',comparisons,rootComparisons,staticAudit});continue;}
  assertPlainProofDomain(base.level,runtime);const failure=failureBinding(base),canonical=runtime.replayRevisedRoute(base.level,base.drags),independent=independentReplay(runtime,base.level,base.drags,{});
  if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||independent.failed||canonical.nonClearingDrags!==ref.U||independent.nonClearingDrags!==ref.U)throw Error('Known reference route no longer replays');
  chosen.push({...ref,comparisons,rootComparisons,staticAudit,failure,freshReferenceReplay:{canonical,independent}});
 }
 for(const b of atStart)if(sha(b.path)!==b.fileSha256)throw Error('Comparator or construction tools changed during qualification');
 const inputBindings=atStart.map(b=>{const snapshot=`${out}/${b.path.split('/').at(-1)}.qualification-v32.snapshot`;fs.copyFileSync(b.path,snapshot,fs.constants.COPYFILE_EXCL);return{...b,snapshot};});
 const updated={...prior,status:'REFERENCES_QUALIFIED_CURRENT_SYMMETRIC_COMPARATOR_NO_SEARCH',version:VERSION,
  priorReferenceEvidence:{path:referenceFile,fileSha256:sha(referenceFile)},selectionFile,selectionFileSha256:sha(selectionFile),chosen,qualificationRejected,inputBindings,
  acceptedRoots:[...pool.acceptedRoots],selectedBindings:sets.selected.map(({level,...r})=>r),successfulBindings:sets.successful.map(({level,...r})=>r),visualExclusions:sets.visualBindings,
  proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,newSearchInvocations:0};
 write(target,updated);console.log(JSON.stringify({path:target,qualified:chosen.length,rejected:qualificationRejected.map(r=>({path:r.path,reason:r.reason}))}));return updated;
}

export async function runBatch(referenceFile){const refs=read(referenceFile),out=referenceFile.replaceAll('\\','/').slice(0,referenceFile.replaceAll('\\','/').lastIndexOf('/'));if(fs.existsSync(`${out}/report.json`))throw Error('Prior batch cannot resume');
 if(refs.version!==VERSION||refs.chosen.length>20||refs.perSource!==8)throw Error('Invalid finite reference contract');
 for(const b of refs.inputBindings)if(sha(b.path)!==b.fileSha256)throw Error(`Input changed ${b.path}`);
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!==FROZEN)throw Error('Frozen proof changed');
 const ledger=await createAttemptLedger(LEDGER),reader=createReferenceLineageReader(),pool=acceptedPool(reader),sets=normalSets(refs.selectionFile,pool);
 const budget=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}),rows=[],accepted=[],rejectedClaims=[],skipped=[],rootDone=new Set();
 const save=status=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status,version:VERSION,formalReady:false,productionChanged:false,referenceFile,referenceFileSha256:sha(referenceFile),
  policy:refs.policy,perSource:8,maxSources:20,budget,proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,rows,accepted,rejectedClaims,skipped},null,2)+'\n');
 save('FINITE_MULTISTEP_BATCH_RUNNING');
 for(const [si,ref]of refs.chosen.entries()){
  if(sha(ref.path)!==ref.fileSha256||sha(ref.rootIndependentSeed)!==ref.rootIndependentSeedSha256)throw Error('Reference changed');
  // Re-read accepted files between sources, so a concurrently completed sibling cannot be extended.
  const latest=acceptedPool(createReferenceLineageReader());sets.successful=latest.records;
  if(latest.acceptedRoots.has(ref.rootIndependentSeed)||rootDone.has(ref.rootIndependentSeed)){skipped.push({path:ref.path,reason:'ROOT_NOW_HAS_ACCEPTED_DESCENDANT'});save('FINITE_MULTISTEP_BATCH_RUNNING');continue;}
  const base=read(ref.path),source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId),origin=designFingerprints(base.level);
  if(!proximityLayersPass(compareAll(read(ref.rootIndependentSeed).level,source,sets),compareAll(base.level,source,sets))){skipped.push({path:ref.path,reason:'ROOT_OR_REFERENCE_NOW_TOO_SIMILAR'});save('FINITE_MULTISTEP_BATCH_RUNNING');continue;}
  let previous=origin,previousParentId=base.attempt.id,solved=0;const failedChain=[ref.failure];
  const rng=random(982131+si*13987+[...refs.label].reduce((n,c)=>n+c.charCodeAt(0)*1831,0));
  const variants=localRetiles(base.level,{irregular:true,maxUnion:16}).map(v=>({...v,sort:rng()})).sort((a,b)=>a.sort-b.sort);
  if(variants.length>10000)throw Error('Construction variants exceed finite budget');
  for(const [vi,v]of variants.entries()){
   if(solved>=8)break;const level=v.level;level.timeSeconds=source.timeSeconds;
   if(!fixColors(level,v.changedIds,Math.floor(rng()*4294967296),runtime,{keepProbability:.4}))continue;
   const f=designFingerprints(level);if(f.shapeSha256===origin.shapeSha256||f.colorSha256===origin.colorSha256||f.shapeSha256===previous.shapeSha256||f.colorSha256===previous.colorSha256)continue;
   if(inventorySummary(level,runtime).nonNativeOrMissingArtIds.length)continue;
   const staticAudit=inspectHardRegionStatic(level,source,runtime);if(!staticAudit.valid)continue;
   const comparisons=compareAll(level,source,sets);if(!passes(comparisons))continue;
   const composition=runtime.auditRevisedCandidate(level,undefined);if(composition.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;
   let attempt;try{attempt=await ledger.claim(level,{redesignOf:previousParentId});}catch(error){rejectedClaims.push({reference:ref.path,variantIndex:vi,reason:error.message});continue;}solved++;
   let proof;const packet={status:'NEW_MULTISTEP_INPUT_NOT_ACCEPTED',accepted:false,formalReady:false,level,levelSha256:levelSha256(level),sourceLevelId:ref.sourceLevelId,sourceLevelSha256:levelSha256(source),attempt,
    proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
    provenance:{strategy:VERSION,rootIndependentSeed:ref.rootIndependentSeed,rootIndependentSeedSha256:ref.rootIndependentSeedSha256,rootLevelSha256:ref.rootLevelSha256,rootDesignSha256:ref.rootDesignSha256,
     originalWholeBoardProvenance:ref.originalWholeBoardProvenance,input:ref.path,inputFileSha256:ref.fileSha256,inputLevelSha256:ref.levelSha256,inputCost:ref.U,
     lineage:ref.lineage,failedParents:structuredClone(failedChain),immediateFailureParent:previousParentId,changedBodyIds:v.changedIds,
     oldShapeSha256:previous.shapeSha256,newShapeSha256:f.shapeSha256,oldColorSha256:previous.colorSha256,newColorSha256:f.colorSha256,newShapesAndColours:true,
     sourceBoardExactlyRetained:true,sourceClockSeconds:source.timeSeconds,constructionVariants:variants.length,variantIndex:vi,comparisons,staticAudit}};
   try{proof=boundedPlainTask(level,runtime,{floor:16,searchUpper:64,...budget});packet.proof=proof;
    if(proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates||proof.discoveredStates>10000||proof.exploredStates>10000)throw Error('Raw board budget mismatch');
    if(proof.drags){packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
     const U=packet.replay.nonClearingDrags,L=proof.certifiedFloor,difficulty=U<=20?1:U<=30?2:3;
     if(packet.replay.valid&&packet.replay.complete&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed
      &&packet.independentReplay.nonClearingDrags===U&&L>=[0,16,21,31][difficulty]&&U>=L)Object.assign(packet,{accepted:true,L,U,difficulty,status:'EXPLORATORY_MULTISTEP_SAME_OBJECT_LU_PENDING_V3_CONTRACT'});}
   }catch(error){packet.accepted=false;packet.status='SEARCH_OR_REPLAY_EXCEPTION';packet.error=error.message;}
   finally{await ledger.finish(attempt,{...packet,lowerBound:{result:proof??null},route:{search:proof??null}});}
   const p=`${out}/candidate-${String(rows.length).padStart(4,'0')}.json`;write(p,packet);
   const row={path:p,fileSha256:sha(p),sourceLevelId:ref.sourceLevelId,reference:ref.path,rootIndependentSeed:ref.rootIndependentSeed,variantIndex:vi,
    accepted:packet.accepted,L:packet.L,U:packet.U,cost:proof?.cost,rawStates:proof?.rawFullBoardStates,rawExpanded:proof?.rawExploredStates,reason:packet.error??proof?.routeTermination??proof?.termination};rows.push(row);
   if(packet.accepted){accepted.push(row);sets.successful.push({path:p,level});rootDone.add(ref.rootIndependentSeed);}
   else{previous=f;previousParentId=attempt.id;failedChain.push(failureBinding(packet));}
   save('FINITE_MULTISTEP_BATCH_RUNNING');console.log(JSON.stringify({...row,acceptedCount:accepted.length}));if(packet.accepted)break;
  }
 }
 save('FINITE_MULTISTEP_BATCH_FINISHED');write(`${out}/index.json`,{status:'EXPLORATORY_PENDING_V3_CONTRACT',formalReady:false,records:accepted.map(r=>({path:r.path,fileSha256:r.fileSha256,sourceLevelId:r.sourceLevelId,difficulty:r.U<=20?1:r.U<=30?2:3,L:r.L,U:r.U}))});
 console.log(JSON.stringify({out,references:refs.chosen.length,searches:rows.length,accepted:accepted.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const[mode,arg,selectionFile]=process.argv.slice(2);if(mode==='scan')await selectReferences({...(arg?{label:arg}:{}),...(selectionFile?{selectionFile}:{})});else if(mode==='qualify'&&arg&&selectionFile)await qualifyReferences(arg,selectionFile);else if(mode==='run'&&arg)await runBatch(arg);else throw Error('Use scan [label] [selection], qualify <references.json> <selection>, or run <references.json>');}
