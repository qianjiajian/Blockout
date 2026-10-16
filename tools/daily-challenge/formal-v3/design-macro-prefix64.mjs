import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {localRetiles} from '../formal-v2/design-layout-factory.mjs';
import {enumerateMacroSwaps,enumerateConnectedMacroSwaps,boundaryRetileAllowed} from './design-macro-region.mjs';
import {mapReferenceMacroPrefix,probeMappedMacroPrefix} from './design-macro-prefix-probe.mjs';
import {colourMacroForPrefix} from './design-macro-prefix-colouring.mjs';
import {compareLayouts} from './diversity.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';

const phase=Number(process.argv[2]??1);assert([1,2].includes(phase));
const root='deliverables/daily-formal-v3-20261008',batch=`${root}/design/macro-prefix64-04`,output=`${batch}/preview-${phase}`,indexFile=`${root}/selection/macro-fixed64-03-selected/index.json`;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert(!fs.existsSync(output));
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const tools=['design-macro-prefix64.mjs','design-macro-prefix-probe.mjs','design-macro-prefix-colouring.mjs','design-macro-region.mjs','diversity-layout-factory.mjs','diversity.mjs','reserved-guard-budget.mjs'].map(f=>`tools/daily-challenge/formal-v3/${f}`);
const bindings=tools.map(path=>({path,sha256:sha(path)}));
if(phase===1){assert(fs.existsSync(batch+'/reference-analysis.json')&&!fs.existsSync(batch+'/plan.json'));for(const b of bindings)fs.copyFileSync(b.path,`${batch}/${b.path.split('/').at(-1)}.snapshot`);
 fs.writeFileSync(`${batch}/plan.json`,JSON.stringify({status:'FIXED_64_NEW_INPUTS_PREDECLARED',formalReady:false,scope:'Macro whole-region geometry redesign, actual initial clear plus parking, one guarded joint search per new physical input.',
  maximumInputs:64,maximumPerSource:8,targetDifferentSources:10,firstPreviewCount:12,referenceAnalysis:{path:batch+'/reference-analysis.json',sha256:sha(batch+'/reference-analysis.json')},prefixParkingOrder:[12,10,8,5],staticPartitionInspectionLimitPerPhase:20000,staticPartitionLimitPerReferenceRound:800,
  macroMinimumArea:.35,minimumBodies:8,minimumQuadrants:3,knownAndFailedMacroNear:.65,old450Near:.75,mainlineSourceNear:.55,
  fixedSolver:{floor:16,searchUpper:128,maxStates:9999,guardAllowance:1,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
  initialClearCount:'Preserve1-2 witnessed initial clears; select longest geometrically compatible translated existing parking prefix in order12/10/8/5, never derive L from the prefix.',
  inputIndex:{file:indexFile,sha256:sha(indexFile)},bindings,toolchainSha256:runtime.toolchainSha256,
  rule:'No repeat of any failed physical input, no expansion past this64, no core/contract edits. Source latest failed branch bound at construction; immediately preceding same-source batch failure checked again before claim. Shape and colour must both change.',
  visual:'First12 actual Canvas previews inspected before their first solve; remaining actual previews then final all-new-board atlas inspected.'},null,2)+'\n',{flag:'wx'});
}else{const p=read(`${batch}/plan.json`);for(const b of p.bindings)assert.equal(sha(b.path),b.sha256);assert.equal(read(`${batch}/solve-1/report.json`).status,'FIXED_PHASE_FINISHED');}
const previous=phase===2?read(`${batch}/preview-1/report.json`).candidates:[],limit=phase===1?12:64-previous.length;
const sourceCounts=new Map(),previousStock=new Map();for(const x of previous){sourceCounts.set(x.sourceLevelId,(sourceCounts.get(x.sourceLevelId)??0)+1);previousStock.set(x.sourceLevelId,designFingerprints(read(x.path).level));}
const eligibleReferences=new Set(read(batch+'/reference-analysis.json').rows.filter(x=>x.available).map(x=>x.file));
const selected=read(indexFile).files.map(file=>({file,receipt:read(file)})),references=[],known=[],knownKeys=new Set(),latestFailure=new Map(),refKeys=new Set();
const add=(file,level)=>{if(!level?.blocks)return;const h=levelSha256(level);if(!knownKeys.has(h)){knownKeys.add(h);known.push({file,level,sha256:sha(file)});}};
for(const x of selected){add(x.file,x.receipt.level);if(x.receipt.difficulty<2)continue;const p=x.receipt;if(!eligibleReferences.has(p.baseInputFile))continue;const base=read(p.baseInputFile);try{assertPlainProofDomain(base.level,runtime);}catch{continue;}
 const h=levelSha256(base.level);if(refKeys.has(h))continue;refKeys.add(h);references.push({receipt:x.file,sourceLevelId:p.sourceLevelId,difficulty:p.difficulty,U:p.U,file:p.baseInputFile,sha256:sha(p.baseInputFile),level:base.level,drags:base.drags});add(p.baseInputFile,base.level);}
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=`${dir}/${e.name}`;if(e.isDirectory())scan(file);else if(/^candidate.*\.json$/.test(e.name)){
 const q=read(file);if(q.accepted&&q.level||q.level&&/macro-(?:region-preview|opening-preview|fixed64|prefix64)/.test(file))add(file,q.level);
 if(q.accepted===true||!q.attempt?.id||!/^[a-f0-9]{64}$/.test(q.attempt.id)||!q.level)continue;
 const resultFile=`${root}/proof/attempts/${q.attempt.id}.result.json`,requestFile=`${root}/proof/attempts/${q.attempt.id}.request.json`;if(!fs.existsSync(resultFile)||!fs.existsSync(requestFile))continue;
 const result=read(resultFile),request=read(requestFile);if(result.accepted)continue;const source=q.sourceLevelId??q.level.id,prior=latestFailure.get(source);
 if(!prior||prior.startedAt<request.startedAt)latestFailure.set(source,{id:request.id,startedAt:request.startedAt,file,sha256:sha(file),requestFile,requestSha256:sha(requestFile),resultFile,resultSha256:sha(resultFile),fingerprints:designFingerprints(q.level)});
}}}
scan(`${root}/design`);scan(`${root}/mechanisms`);
const old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>({file:e.path,level:read(e.path).level}));
references.sort((a,b)=>(sourceCounts.get(a.sourceLevelId)??0)-(sourceCounts.get(b.sourceLevelId)??0)||b.difficulty-a.difficulty||a.sourceLevelId-b.sourceLevelId||b.U-a.U);
const mask=l=>levelSha256({width:l.width,height:l.height,playable:boardCells(l).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const changedFrom=(a,b)=>{if(a.shapeSha256===b.shapeSha256||a.colorSha256===b.colorSha256)return false;const colours=new Map(a.colorAssignments.map(x=>[x.id,JSON.stringify(x.colors)])),shared=b.colorAssignments.filter(x=>colours.has(x.id));return shared.length?shared.some(x=>colours.get(x.id)!==JSON.stringify(x.colors)):JSON.stringify(a.colorAssignments.map(x=>x.colors).sort())!==JSON.stringify(b.colorAssignments.map(x=>x.colors).sort());};
fs.mkdirSync(output,{recursive:false});const candidates=[],referenceRows=[],rejections={},probeRecords=[],seenPartitions=new Set(),pairCache=new Map();let inspectedPartitions=0,totalProbeWorlds=0;
const reject=r=>{rejections[r]=(rejections[r]??0)+1;};
const write=status=>fs.writeFileSync(`${output}/report.json`,JSON.stringify({status,formalReady:false,accepted:false,newLUSearches:0,phase,maximumPhaseInputs:limit,plan:{file:`${batch}/plan.json`,sha256:sha(`${batch}/plan.json`)},bindings,
 knownGeometryCount:known.length,sourceCounts:Object.fromEntries(sourceCounts),latestFailedBySource:[...latestFailure].map(([source,{fingerprints,...r}])=>({source,...r})),referenceRows,candidates,inspectedPartitions,totalProbeWorlds,rejections,probeRecords},null,2)+'\n');
write('STATIC_FIXED_PHASE_RUNNING');
// Each pass gives every eligible source a chance before accepting another from
// that source. At most8 per source across both phases, all final partitions near-filtered.
for(let round=0;round<8&&candidates.length<limit&&inspectedPartitions<20000;round++){
 const inRound=new Set();
 for(const [ri,ref]of references.entries()){
  if(candidates.length>=limit||inspectedPartitions>=20000)break;
  if((sourceCounts.get(ref.sourceLevelId)??0)>=8||inRound.has(ref.sourceLevelId))continue;
  const source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId),originalF=designFingerprints(ref.level),parent=latestFailure.get(ref.sourceLevelId);
  if(!pairCache.has(ref.file)){const rect=enumerateMacroSwaps(ref.level),connected=enumerateConnectedMacroSwaps(ref.level);pairCache.set(ref.file,{pairs:[...rect.pairs,...connected.pairs],rect:rect.diagnostic,connected:connected.diagnostic});}
  const cached=pairCache.get(ref.file),row={reference:ref.file,source:ref.sourceLevelId,round,difficulty:ref.difficulty,U:ref.U,rectangle:cached.rect,connected:cached.connected,acceptedPreview:false};referenceRows.push(row);
  let done=false,perReference=0;
  for(const [si,swap]of cached.pairs.entries()){
   if(done||perReference>=800||inspectedPartitions>=20000)break;
   const variants=localRetiles(swap.level,{irregular:true,maxUnion:16}).filter(x=>boundaryRetileAllowed(swap,x.changedIds));
   for(const [vi,v]of variants.entries()){
    if(done||perReference>=800||inspectedPartitions>=20000)break;
    const partitionKey=levelSha256(v.level.blocks.map(b=>({x:b.x,y:b.y,shape:b.shape})).sort((a,b)=>a.y-b.y||a.x-b.x||JSON.stringify(a.shape).localeCompare(JSON.stringify(b.shape))));if(seenPartitions.has(partitionKey))continue;seenPartitions.add(partitionKey);perReference++;inspectedPartitions++;
    const shape=designFingerprints(v.level).shapeSha256;if(shape===originalF.shapeSha256||shape===parent?.fingerprints.shapeSha256||shape===previousStock.get(ref.sourceLevelId)?.shapeSha256){reject('shape-inventory-not-new');continue;}
    let mapped=null;const mappingAttempts=[];for(const minimumParking of [12,10,8,5]){const m=mapReferenceMacroPrefix(ref.level,ref.drags,v.level,{minimumParking});mappingAttempts.push({minimumParking,ok:m.ok,reason:m.reason,stats:m.stats});if(m.ok){mapped=m;break;}}
    if(!mapped){reject('mapped-prefix-incompatible');continue;}
    if(compareLayouts(v.level,ref.level).footprintSimilarity>.65){reject('reference-near');continue;}
    const nearSource=compareLayouts(v.level,source).footprintSimilarity;if(nearSource>.55){reject('source-near');continue;}
    let nearest=0,nearFile=null,tooNear=false;for(const k of known){const n=compareLayouts(v.level,k.level).footprintSimilarity;if(n>nearest){nearest=n;nearFile=k.file;}if(n>.65){tooNear=true;break;}}
    if(tooNear){reject('existing-or-failed-macro-near');continue;}
    let nearestOld=0;for(const k of old){nearestOld=Math.max(nearestOld,compareLayouts(v.level,k.level).footprintSimilarity);if(nearestOld>.75)break;}if(nearestOld>.75){reject('old450-near');continue;}
    const seed=187421973+phase*190081+ri*120071+si*1709+vi*19;
    const paint=colourMacroForPrefix(v.level,runtime,{seed,maxNodes:3000,maxTransitions:6000,paletteSize:8,mappedPrefix:mapped});if(!paint.ok){reject(`paint:${paint.reason}`);continue;}
    const level={...structuredClone(v.level),blocks:paint.blocks,gates:paint.gates},f=designFingerprints(level);
    if(!changedFrom(originalF,f)||parent&&!changedFrom(parent.fingerprints,f)||previousStock.has(ref.sourceLevelId)&&!changedFrom(previousStock.get(ref.sourceLevelId),f)){reject('real-colour-or-stock-not-new');continue;}
    if(levelSha256(level.gates)===levelSha256(ref.level.gates)){reject('unchanged-exits');continue;}
    const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),identityFile=`${root}/proof/attempts/identities/${identity}.json`;if(fs.existsSync(identityFile)){reject('previously-attempted-identity');continue;}
    const inventory=inventorySummary(level,runtime),staticAudit=runtime.auditRevisedCandidate(level,undefined);if(inventory.nonNativeOrMissingArtIds.length||staticAudit.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile')){reject('static-or-native-art');continue;}
    assert.equal(mask(level),mask(source));
    const priorConstructionWorldUpperBound=mappingAttempts.reduce((n,m)=>n+m.stats.staticWholeWorlds,0)+(paint.completeColourAssignments??0);assert(priorConstructionWorldUpperBound<10000);
    const probe=probeMappedMacroPrefix(runtime,level,mapped,{maxFullWorlds:10000-priorConstructionWorldUpperBound});totalProbeWorlds+=probe.fullWorlds;probeRecords.push({source:ref.sourceLevelId,seed,levelSha256:levelSha256(level),valid:probe.valid,reason:probe.reason,fullWorlds:probe.fullWorlds});if(!probe.valid){reject(`probe:${probe.reason}`);continue;}
    const file=`${output}/candidate-${String(previous.length+candidates.length).padStart(3,'0')}.json`,{level:ignored,assignment,...macro}=swap;
    const packet={status:'OPENING_CLEAR_AND_PARKING_PREVIEW_ONLY',accepted:false,formalReady:false,L:null,U:null,drags:null,newLUSearches:0,sourceLevelId:ref.sourceLevelId,
     level,levelSha256:levelSha256(level),sourceLevelSha256:levelSha256(source),sourceMaskSha256:mask(source),inventory,staticAudit,openingProbe:probe,prefixBlueprint:mapped,prefixConstructionAccounting:{mappingAttempts,completeColourAssignments:paint.completeColourAssignments??0,priorConstructionWorldUpperBound,actualPrefixFullWorlds:probe.fullWorlds,totalConservativeWorldBound:priorConstructionWorldUpperBound+probe.fullWorlds,hardLimit:10000},redesignOf:parent?.id??null,failedParent:parent?{...parent,fingerprints:undefined}:null,unattemptedIdentity:{identity,path:identityFile,exists:false},
     provenance:{strategy:'macro-translation-witnessed-long-prefix-compatible-rim-colouring',fixedBatchPlan:`${batch}/plan.json`,fixedBatchMaximum:64,reference:ref.file,referenceSha256:ref.sha256,referenceDifficulty:ref.difficulty,referenceU:ref.U,referenceProofNotTransferred:true,prefixHintOnlyNotL:true,preservedInitialGates:mapped.preservedGates,actualConsecutiveParking:probe.consecutiveParking,actualInitialClears:probe.initialClears,
      macro,boundaryRetileBodyIds:v.changedIds,sourceMaskExactlyRetained:true,rotationApplied:false,oldGates:ref.level.gates,newGates:level.gates,originalShapeInventorySha256:originalF.shapeSha256,newShapeInventorySha256:f.shapeSha256,
      originalColoursSha256:originalF.colorSha256,newColoursSha256:f.colorSha256,realShapeAndColourChangedFromReference:true,realShapeAndColourChangedFromLatestSourceFailure:parent?true:null,
      realShapeAndColourChangedFromPreviousSameSourceBatchPreview:previousStock.has(ref.sourceLevelId)?true:null,seed,colouring:{nodes:paint.nodes,transitions:paint.transitions,emptyBoardSingleBodyMicroStates:paint.emptyBoardSingleBodyMicroStates,initialExitCount:paint.initialExitCount}},
     similarity:{reference:compareLayouts(level,ref.level).footprintSimilarity,existingAndPriorFailedMacro:nearest,nearestFile:nearFile,old450:nearestOld,source:nearSource},bindings};
    fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});add(file,level);sourceCounts.set(ref.sourceLevelId,(sourceCounts.get(ref.sourceLevelId)??0)+1);previousStock.set(ref.sourceLevelId,f);inRound.add(ref.sourceLevelId);row.acceptedPreview=true;done=true;
    const result={path:file,sha256:sha(file),sourceLevelId:ref.sourceLevelId,redesignOf:packet.redesignOf,reference:ref.file,macroFraction:macro.areaFraction,macroBodies:macro.bodyCount,quadrants:macro.quadrants,kind:macro.kind,similarity:packet.similarity,openingDrags:probe.drags,openingProbeWorlds:probe.fullWorlds,prefixParking:probe.consecutiveParking,initialClears:probe.initialClears,initialExitCount:paint.initialExitCount};candidates.push(result);console.log(JSON.stringify({preview:candidates.length,phase,source:ref.sourceLevelId,macro:macro.areaFraction,prefix:probe.consecutiveParking,initialExits:paint.initialExitCount}));write('STATIC_FIXED_PHASE_RUNNING');
   }
  }
  row.inspectedPartitions=perReference;
 }
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256);write('STATIC_FIXED_PHASE_FINISHED');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'FIXED_LONG_PREFIX_ONLY_NO_COMPLETE_U',accepted:false,formalReady:false,files:candidates.map(x=>x.path)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,previews:candidates.length,sourceCounts:Object.fromEntries(sourceCounts),inspectedPartitions,totalProbeWorlds,rejections}));
