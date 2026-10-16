import fs from 'node:fs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {designFingerprints as leagueFingerprints} from '../../league-v2/proof-bounded.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {describeLayout,compareLayouts} from './diversity.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';

// Read-only reference inspection. No solver, ledger claim, ledger finish,
// mechanism decoration, candidate mutation or production write occurs here.
const [output,dailyIndex,previousSeedIndex,optionsFile]=process.argv.slice(2);
assert(output&&dailyIndex,'Usage: inspect-shared-reference-domain.mjs NEW_OUTPUT_DIRECTORY DAILY_SELECTION_INDEX PREVIOUS_SEED_INDEX OPTIONS_JSON');
assert(!fs.existsSync(output),'Preserve prior evidence');
const DAILY='deliverables/daily-formal-v3-20261008';
const LEAGUE='deliverables/league-v2-20261008';
const leagueIndex=`${LEAGUE}/selection/render-current-100/selection.json`;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fileSha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const norm=p=>p.replaceAll('\\','/');
const options=optionsFile?read(optionsFile):{};
const minimumU=options.minimumU??12,maximumU=options.maximumU??15;
assert((minimumU===12&&maximumU===15)||(minimumU===8&&maximumU===11),'Only read-only 12–15 or 8–11 reference surveys');
const maximumReferences=options.maximumReferences??(minimumU===8?20:30);
assert(Number.isSafeInteger(maximumReferences)&&maximumReferences>=1&&maximumReferences<=(minimumU===8?20:30),'Finite reference survey required');
const reservedRoots=new Set((options.reservedPrototypePaths??[]).map(norm));
const acceptedRoots=new Set();
const runtime=await loadBoundedRuntime();
assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804','Frozen proof changed');
const binding=p=>({path:norm(p),sha256:fileSha(p)});
const candidateFiles=[],comparisonFiles=new Map(),rejected=[],screened=[],parseErrors=[];
const excludedOriginalPaths=new Set(),excludedVisualFamilyBodyIds=new Set(),extraBindings=[];
const lineageReader=createReferenceLineageReader({onError:e=>parseErrors.push(e)});
if(optionsFile)extraBindings.push(binding(optionsFile));
extraBindings.push(binding('tools/daily-challenge/formal-v3/reference-lineage.mjs'));
for(const p of reservedRoots){assert(fs.existsSync(p),`Reserved prototype missing: ${p}`);extraBindings.push(binding(p));}
const addComparison=(p,c,category)=>{
  if(!c?.level)return;
  const current=comparisonFiles.get(p);
  if(current){if(!current.categories.includes(category))current.categories.push(category);return;}
  comparisonFiles.set(p,{...binding(p),levelSha256:levelSha256(c.level),categories:[category],level:c.level});
};
function walk(dir,visit){
  if(!fs.existsSync(dir))return;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;
    if(e.isDirectory())walk(p,visit);else if(e.name.endsWith('.json'))visit(p,e.name);
  }
}
const daily=read(dailyIndex),league=read(leagueIndex);
assert(Array.isArray(daily.files)&&Array.isArray(league.selections));
for(const p of daily.files)addComparison(p,read(p),'current-daily-selection');
for(const r of league.selections)addComparison(r.proofFile,read(r.proofFile),'formal-league-100');
if(previousSeedIndex){
  extraBindings.push(binding(previousSeedIndex));
  for(const p of read(previousSeedIndex).files){const seed=read(p),original=seed.sourceLedger?.snapshots?.candidate?.original;
    assert(original?.path,'Previous seed must bind its original candidate');
    assert.equal(fileSha(original.path),original.sha256);
    excludedOriginalPaths.add(norm(original.path));
    addComparison(original.path,read(original.path),'previous-reference-batch');
  }
}
for(const visualAuditPath of [`${DAILY}/proof/visual-family-audit-next18-v1.json`,`${DAILY}/proof/visual-family-audit-nearest122-v1.json`])if(fs.existsSync(visualAuditPath)){
  extraBindings.push(binding(visualAuditPath));
  for(const r of read(visualAuditPath).records.filter(r=>r.recommendation==='EXCLUDE_FOR_VISUAL_FAMILY_REPETITION')){
    assert.equal(fileSha(r.receipt.path),r.receipt.sha256);
    const receipt=read(r.receipt.path);
    for(const b of receipt.level.blocks)excludedVisualFamilyBodyIds.add(b.id);
    addComparison(r.receipt.path,receipt,'visually-excluded-family-do-not-reuse');
  }
}
for(const root of [`${LEAGUE}/design`,`${DAILY}/design`])walk(root,(p,name)=>{
  if(!/^candidate-.*\.json$/.test(name))return;
  let c;try{c=read(p);}catch(error){parseErrors.push({path:p,error:error.message});return;}
  if(c.accepted===true||c.proof?.accepted===true){addComparison(p,c,'mathematical-success-design-pool');for(const root of lineageReader.inspect(p).roots)acceptedRoots.add(root);}
  if(root===`${LEAGUE}/design`)candidateFiles.push(p);
});
// Include successful non-design mathematical receipts too. Repeated layouts
// are deduplicated for comparisons, with all original bindings retained.
for(const root of [`${LEAGUE}/proof`,`${DAILY}/proof`,`${LEAGUE}/selection`,`${DAILY}/selection`])walk(root,(p,name)=>{
  if(name.endsWith('.request.json')||name.endsWith('.blocked.json')||name==='report.json')return;
  let c;try{c=read(p);}catch(error){parseErrors.push({path:p,error:error.message});return;}
  if(c.accepted===true)addComparison(p,c,'mathematical-success-receipt-pool');
});
const comparisonGroups=new Map();
for(const record of comparisonFiles.values()){
  const k=describeLayout(record.level).exactPartitionSha256;
  const group=comparisonGroups.get(k)??{...record,equivalentInputs:[]};
  group.equivalentInputs.push({path:record.path,sha256:record.sha256,levelSha256:record.levelSha256,categories:record.categories});
  comparisonGroups.set(k,group);
}
const comparisons=[...comparisonGroups.values()];
const nearest=(level,others)=>{
  let winner=null;
  for(const r of others){const forward=compareLayouts(level,r.level),reverse=compareLayouts(r.level,level);
    const comparison={...(reverse.footprintSimilarity>forward.footprintSimilarity?reverse:forward),comparisonDirection:'maximum-of-both-directions'};
    if(!winner||comparison.footprintSimilarity>winner.footprintSimilarity)winner={path:r.path,levelSha256:r.levelSha256,categories:r.categories,...comparison};
  }
  return winner;
};
const sortedMask=l=>boardCells(l).map(p=>p.join(',')).sort();
const historicalPhysics=l=>{
  const p=structuredClone(l);
  for(const f of ['id','name','difficulty','reward','parMoves','preservedMoveTarget','designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation'])delete p[f];
  return levelSha256(p);
};
let attemptedReplays=0;
for(const file of candidateFiles){
  if(excludedOriginalPaths.has(norm(file)))continue;
  let c;try{c=read(file);}catch(error){parseErrors.push({path:file,error:error.message,phase:'candidate-second-read'});continue;}
  const U=c.U??c.proof?.U??c.proof?.cost??c.proof?.lower?.cost??c.replay?.nonClearingDrags;
  const drags=c.drags??c.proof?.drags??c.proof?.lower?.drags;
  if(c.accepted||c.proof?.accepted||!Number.isSafeInteger(U)||U<minimumU||U>maximumU||!c.level||!Array.isArray(drags))continue;
  const lineage=lineageReader.inspect(file);
  const row={path:file,sourceLevelId:c.sourceLevelId,U,lineage,lineageBindings:[...new Set([...lineage.roots,...lineage.ancestors])].map(binding)};
  if(lineage.roots.some(p=>reservedRoots.has(p))){rejected.push({...row,reason:'prototype-reserved-by-parallel-task'});continue;}
  if(options.requireDirectWholeBoard&&!lineage.directWholeBoard){rejected.push({...row,reason:'not-direct-independent-whole-board-prototype'});continue;}
  if(options.excludeAnyAcceptedDescendant&&lineage.roots.some(p=>acceptedRoots.has(p))){rejected.push({...row,reason:'prototype-already-has-accepted-descendant'});continue;}
  if((options.requireDirectWholeBoard||options.requireKnownLineage)&&(!lineage.roots.length||lineage.unknownReasons.length)){rejected.push({...row,reason:'independent-prototype-lineage-unconfirmed'});continue;}
  if(c.level.blocks.some(b=>excludedVisualFamilyBodyIds.has(b.id))){rejected.push({...row,reason:'visually-excluded-family-entity-lineage'});continue;}
  try{
    assert.equal(levelSha256(c.level),c.levelSha256,'Candidate full object SHA');
    assertPlainProofDomain(c.level);runtime.validateLevel(c.level);
    const source=runtime.LEVELS.find(l=>l.id===c.sourceLevelId);assert(source,'Mainline source exists');
    assert.equal(c.sourceLevelSha256,levelSha256(source),'Source full object SHA');
    assert.equal(c.level.width,source.width);assert.equal(c.level.height,source.height);
    assert.deepEqual(sortedMask(c.level),sortedMask(source),'Normal source mask retained without rotation');
    const inventory=inventorySummary(c.level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0,'Native shape and color art exists');
    const proofPath=c.proof?.proofReceipt;assert(proofPath,'Historical result path required');
    const requestPath=proofPath.replace(/\.result\.json$/,'.request.json');
    const old=read(proofPath),request=read(requestPath),fingerprints=leagueFingerprints(c.level);
    assert.equal(old.accepted,false,'Reference must remain historically failed');
    assert.equal(old.levelSha256,c.levelSha256);assert.equal(levelSha256(old.level),c.levelSha256);
    assert.equal(request.levelSha256,c.levelSha256);assert.equal(request.id,historicalPhysics(c.level),'Old physical attempt ID');
    assert.equal(old.attempt.id,request.id);assert.equal(c.proof.attempt.id,request.id);
    for(const f of ['shapeSha256','colorSha256','designSha256'])assert.equal(request[f],fingerprints[f],`Historical ${f}`);
    assert.equal(old.lower?.cost,U,'Historical emitted route cost');
    assert.equal(routeSha256(old.lower.drags),routeSha256(drags),'Historical emitted route identity');
    const near=nearest(c.level,comparisons);row.nearestSuccess=near;
    if(near&&near.footprintSimilarity>.65){row.reason='too-near-mathematical-success';rejected.push(row);continue;}
    attemptedReplays++;
    const canonical=runtime.replayRevisedRoute(c.level,drags),independent=independentReplay(runtime,c.level,drags);
    for(const replay of [canonical,independent]){
      assert(replay.valid&&replay.complete&&!replay.failed,'Fresh original-model full replay');
      assert.equal(replay.nonClearingDrags,U,'Actual replay matches requested reference band');
    }
    assert.equal(levelSha256(c.level),c.levelSha256,'Replay must not mutate candidate');
    const item={...row,...binding(file),status:'VERIFIED_UNDERBAND_REFERENCE_REQUIRES_NEW_SHAPES_AND_COLOURS',
      levelSha256:c.levelSha256,routeSha256:routeSha256(drags),sourceLevelSha256:c.sourceLevelSha256,
      sourceMask:{width:c.level.width,height:c.level.height,playableCells:sortedMask(c.level).length,exactNormalSourceMask:true},
      partitionSha256:describeLayout(c.level).exactPartitionSha256,oldFingerprints:fingerprints,currentDailyFingerprints:designFingerprints(c.level),
      historicalFailedAttempt:{request:{...binding(requestPath),id:request.id},result:{...binding(proofPath),status:old.status,accepted:old.accepted},
        physicalInputSha256:request.id,budget:old.lower.budget,discoveredStates:old.lower.discoveredStates,rawFullBoardStates:old.lower.rawFullBoardStates??null,
        rawCountUnavailable:old.lower.rawFullBoardStates===undefined,shapeAndColorBindingValidated:true,doNotRetryOriginal:true},
      originalProvenance:c.provenance,nativeArtValidated:true,canonicalReplay:canonical,independentReplay:independent,
      replayIsSearch:false,newSearchInvocations:0,formalReady:false,level:c.level};
    screened.push(item);
  }catch(error){rejected.push({...row,reason:'identity-geometry-ledger-or-replay-rejected',detail:error.message});}
  if((screened.length+rejected.length)%50===0)console.log(JSON.stringify({screened:screened.length,rejected:rejected.length,replays:attemptedReplays}));
}
// Ongoing producers may finish new packets during replays. Take a second
// read-only success snapshot, recording incomplete JSON rather than accepting
// it, and exclude references that became too close to a newly completed file.
const beforeRefresh=new Set(comparisonFiles.keys());
for(const root of [`${LEAGUE}/design`,`${DAILY}/design`])walk(root,(p,name)=>{
  if(!/^candidate-.*\.json$/.test(name))return;
  let c;try{c=read(p);}catch(error){parseErrors.push({path:p,error:error.message,phase:'final-success-snapshot'});return;}
  if(c.accepted===true||c.proof?.accepted===true){addComparison(p,c,'mathematical-success-design-pool');for(const root of lineageReader.inspect(p).roots)acceptedRoots.add(root);}
});
const newComparisons=[...comparisonFiles.values()].filter(x=>!beforeRefresh.has(x.path));
const comparisonSnapshotAt=new Date().toISOString();
for(let i=screened.length-1;i>=0;i--){const row=screened[i],near=nearest(row.level,newComparisons);
  if(options.excludeAnyAcceptedDescendant&&row.lineage.roots.some(p=>acceptedRoots.has(p))){rejected.push({path:row.path,sourceLevelId:row.sourceLevelId,U:row.U,reason:'prototype-has-newly-completed-accepted-descendant',lineage:row.lineage});screened.splice(i,1);continue;}
  if(near&&near.footprintSimilarity>(row.nearestSuccess?.footprintSimilarity??0))row.nearestSuccess=near;
  if(near&&near.footprintSimilarity>.65){rejected.push({path:row.path,sourceLevelId:row.sourceLevelId,U:row.U,reason:'too-near-newly-completed-success',nearestSuccess:near});screened.splice(i,1);}
}
// Prefer higher underband U, then greater visual separation. One reference per
// actual source. Selected references must also be mutually below the threshold.
screened.sort((a,b)=>b.U-a.U||(a.nearestSuccess?.footprintSimilarity??0)-(b.nearestSuccess?.footprintSimilarity??0)||a.path.localeCompare(b.path));
const chosen=[],usedSources=new Set();
for(const item of screened){
  if(chosen.length>=maximumReferences)break;
  if(usedSources.has(item.sourceLevelId))continue;
  const near=nearest(item.level,chosen);
  if(near&&near.footprintSimilarity>.65){item.selectionRejection={reason:'too-near-another-reference',nearest:near};continue;}
  item.nearestEarlierSelectedReference=near;chosen.push(item);usedSources.add(item.sourceLevelId);
}
const comparisonBindings=[...comparisonFiles.values()].map(({level,...r})=>r);
const comparisonByCategory={};for(const c of comparisonBindings)for(const k of c.categories)comparisonByCategory[k]=(comparisonByCategory[k]??0)+1;
const report={schemaVersion:1,status:previousSeedIndex?'READ_ONLY_REFERENCE_BATCH_READY':chosen.length>=30?'THIRTY_OR_MORE_READ_ONLY_REDESIGN_REFERENCES':'READ_ONLY_REFERENCE_SHORTFALL',
  ruleVersion:'1.155.0',createdAt:new Date().toISOString(),comparisonSnapshotAt,requestedMaximum:maximumReferences,requestedMinimum:previousSeedIndex?0:maximumReferences,selectedCount:chosen.length,sourceCount:usedSources.size,
  candidatePacketsScanned:candidateFiles.length,underbandPacketsScreened:screened.length+rejected.length,freshReplayCount:attemptedReplays,
  validNonNearReferenceCount:screened.length,comparisonByCategory,uniqueComparisonPartitions:new Set([...comparisonFiles.values()].map(x=>describeLayout(x.level).exactPartitionSha256)).size,
  validSourceIds:[...new Set(screened.map(x=>x.sourceLevelId))].sort((a,b)=>a-b),
  validPacketsBySource:screened.reduce((a,r)=>(a[r.sourceLevelId]=(a[r.sourceLevelId]??0)+1,a),{}),
  validIndependentPrototypeCount:new Set(screened.flatMap(x=>x.lineage.roots)).size,
  priorOriginalPathsExcluded:[...excludedOriginalPaths],newlyCompletedSuccessFilesIncluded:newComparisons.map(x=>binding(x.path)),
  visualFamilyPolicy:'Exclude shared opaque entity-ID lineage with every explicitly visually rejected object in both bound review files, in addition to footprint similarity.',
  referenceSurveyOptions:options,acceptedPrototypeCount:acceptedRoots.size,reservedPrototypeCount:reservedRoots.size,
  criteria:{originalActualU:[minimumU,maximumU],maximumFootprintSimilarity:.65,maximumPerSource:1,normalMainlineMask:true,
    scope:'League-v2 design references versus its formal100, current daily selection, and all discoverable accepted design/proof/selection objects in the two current redesign workspaces.'},
  suppliedIndexes:[binding(dailyIndex),binding(leagueIndex),...extraBindings],toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  inspector:binding('tools/daily-challenge/formal-v3/inspect-shared-reference-domain.mjs'),comparisonBindings,
  selected:chosen.map(({level,...x})=>x),allScreened:screened.map(({level,canonicalReplay,independentReplay,...x})=>x),rejected,parseErrors,
  safety:{newSolverSearches:0,ledgerClaims:0,ledgerWrites:0,productionChanged:false,proofCoreChanged:false,originalFailureStatusChanged:false,realSaveAccessed:false},
  limitations:['These are failed underband references, not accepted candidates or lower-bound certificates.','Known routes were replayed; no failed object was searched again.','Any subsequent attempt must genuinely change shape and color and bind its failed parent before a first bounded search.','Global footprint filtering is not a replacement for actual visual review of the new redesigned outputs.'],formalReady:false};
for(const x of [...comparisonBindings,...report.suppliedIndexes,report.inspector])assert.equal(fileSha(x.path),x.sha256,`Input changed: ${x.path}`);
for(const x of report.selected)for(const b of [x,x.historicalFailedAttempt.request,x.historicalFailedAttempt.result,...x.lineageBindings])assert.equal(fileSha(b.path),b.sha256,`Reference changed: ${b.path}`);
fs.mkdirSync(output,{recursive:false});fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'index.json'),JSON.stringify({status:report.status,formalReady:false,newSearchInvocations:0,report:'report.json',
  files:chosen.map(x=>x.path),sources:chosen.map(x=>x.sourceLevelId),selectedCount:chosen.length},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,selected:chosen.length,validNonNear:screened.length,rejected:rejected.length,comparisonByCategory,parseErrors:parseErrors.length}));
