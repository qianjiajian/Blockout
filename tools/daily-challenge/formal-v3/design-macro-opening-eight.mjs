import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {localRetiles} from '../formal-v2/design-layout-factory.mjs';
import {enumerateMacroSwaps,enumerateConnectedMacroSwaps,boundaryRetileAllowed} from './design-macro-region.mjs';
import {probeInitialClearThenParking} from './design-macro-opening-probe.mjs';
import {compareLayouts} from './diversity.mjs';
import {boardCells,inventorySummary,colourAndPlaceExits} from './diversity-layout-factory.mjs';

const root='deliverables/daily-formal-v3-20261008',output=`${root}/design/macro-opening-preview-02`,indexFile=`${root}/selection/nearband21-selected/index.json`;
assert(!fs.existsSync(output));const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const selected=read(indexFile).files.map(file=>({file,receipt:read(file)})),references=[],known=[],knownKeys=new Set(),latestFailure=new Map();
const add=(file,level)=>{if(!level?.blocks)return;const h=levelSha256(level);if(!knownKeys.has(h)){knownKeys.add(h);known.push({file,level,sha256:sha(file)});}};
for(const x of selected){add(x.file,x.receipt.level);if(x.receipt.difficulty<2)continue;const p=x.receipt,base=read(p.baseInputFile);try{assertPlainProofDomain(base.level,runtime);}catch{continue;}
 references.push({receipt:x.file,sourceLevelId:p.sourceLevelId,difficulty:p.difficulty,U:p.U,file:p.baseInputFile,sha256:sha(p.baseInputFile),level:base.level});add(p.baseInputFile,base.level);}
// These previous failed layouts are also geometry exclusions, so an outlet
// edit or another tiny boundary retile cannot recycle their macro partition.
for(const file of read(`${root}/design/macro-region-preview-01/index.json`).files)add(file,read(file).level);
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=`${dir}/${e.name}`;if(e.isDirectory())scan(file);else if(/^candidate.*\.json$/.test(e.name)){
 const q=read(file);if(q.accepted&&q.level)add(file,q.level);
 if(q.accepted===true||!q.attempt?.id||!/^[a-f0-9]{64}$/.test(q.attempt.id)||!q.level)continue;
 const resultFile=`${root}/proof/attempts/${q.attempt.id}.result.json`,requestFile=`${root}/proof/attempts/${q.attempt.id}.request.json`;if(!fs.existsSync(resultFile)||!fs.existsSync(requestFile))continue;
 const result=read(resultFile),request=read(requestFile);if(result.accepted)continue;const source=q.sourceLevelId??q.level.id,prior=latestFailure.get(source);
 if(!prior||prior.startedAt<request.startedAt)latestFailure.set(source,{id:request.id,startedAt:request.startedAt,file,sha256:sha(file),requestFile,requestSha256:sha(requestFile),resultFile,resultSha256:sha(resultFile),fingerprints:designFingerprints(q.level)});
}}}
scan(`${root}/design`);scan(`${root}/mechanisms`);
const old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>({file:e.path,level:read(e.path).level}));
const priority=[42,198,52,35,80,54,14,2],priorSources=new Set(read(`${root}/design/macro-region-preview-01/report.json`).candidates.map(x=>x.sourceLevelId));
references.sort((a,b)=>(priority.includes(a.sourceLevelId)?priority.indexOf(a.sourceLevelId):20+Number(priorSources.has(a.sourceLevelId)))-(priority.includes(b.sourceLevelId)?priority.indexOf(b.sourceLevelId):20+Number(priorSources.has(b.sourceLevelId)))||b.difficulty-a.difficulty||b.U-a.U);
const mask=l=>levelSha256({width:l.width,height:l.height,playable:boardCells(l).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const changedFrom=(a,b)=>{if(a.shapeSha256===b.shapeSha256||a.colorSha256===b.colorSha256)return false;const oldColours=new Map(a.colorAssignments.map(x=>[x.id,JSON.stringify(x.colors)])),shared=b.colorAssignments.filter(x=>oldColours.has(x.id));return shared.length?shared.some(x=>oldColours.get(x.id)!==JSON.stringify(x.colors)):JSON.stringify(a.colorAssignments.map(x=>x.colors).sort())!==JSON.stringify(b.colorAssignments.map(x=>x.colors).sort());};
fs.mkdirSync(output,{recursive:false});const toolFiles=['tools/daily-challenge/formal-v3/design-macro-opening-eight.mjs','tools/daily-challenge/formal-v3/design-macro-opening-probe.mjs','tools/daily-challenge/formal-v3/design-macro-region.mjs','tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','tools/daily-challenge/formal-v3/diversity.mjs'];
const bindings=toolFiles.map(path=>({path,sha256:sha(path)}));for(const x of bindings)fs.copyFileSync(x.path,`${output}/${x.path.split('/').at(-1)}.snapshot`);
const candidates=[],referenceRows=[],rejections={},probeRecords=[],usedSources=new Set(),seenPartitions=new Set();let inspectedPartitions=0,totalProbeWorlds=0;
const reject=r=>{rejections[r]=(rejections[r]??0)+1;};
const write=status=>fs.writeFileSync(`${output}/report.json`,JSON.stringify({status,formalReady:false,accepted:false,newLUSearches:0,inputIndex:{file:indexFile,sha256:sha(indexFile)},bindings,
 policy:{maximumPreviews:8,onePerSource:true,maximumInspectedPartitions:2000,geometryNearAllSuccessAndFailedPriorMacro:.65,old450:.75,source:.55,
  outletAndColourDesign:'New rim packing and actual native colour CSP per new shape partition; never preserve prior outlets by default.',
  openingProbe:'Choose first actual initial clear by ID, then first actual single-unit parking by ID and U/R/D/L; no alternate clear and no expansion after parking.',
  searchPerformed:false,solverLedgerClaims:false},knownGeometryCount:known.length,latestFailedBySource:[...latestFailure].map(([source,{fingerprints,...r}])=>({source,...r})),
 referenceRows,candidates,inspectedPartitions,totalProbeWorlds,rejections,probeRecords},null,2)+'\n');
write('STATIC_NEW_EXITS_AND_FIXED_TWO_GESTURES_RUNNING');
for(const [ri,ref]of references.entries()){
 if(candidates.length>=8||inspectedPartitions>=2000)break;if(usedSources.has(ref.sourceLevelId))continue;
 const source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId),originalF=designFingerprints(ref.level),parent=latestFailure.get(ref.sourceLevelId);
 const rect=enumerateMacroSwaps(ref.level),connected=enumerateConnectedMacroSwaps(ref.level),pairs=[...rect.pairs,...connected.pairs],row={reference:ref.file,sha256:ref.sha256,source:ref.sourceLevelId,difficulty:ref.difficulty,U:ref.U,rectangle:rect.diagnostic,connected:connected.diagnostic,acceptedPreview:false};referenceRows.push(row);
 let done=false,perReference=0;
 for(const [si,swap]of pairs.entries()){
  if(done||perReference>=300||inspectedPartitions>=2000)break;
  for(const [vi,v]of localRetiles(swap.level,{irregular:true,maxUnion:16}).filter(x=>boundaryRetileAllowed(swap,x.changedIds)).entries()){
   if(done||perReference>=300||inspectedPartitions>=2000)break;const partitionKey=levelSha256(v.level.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape})));if(seenPartitions.has(partitionKey))continue;seenPartitions.add(partitionKey);perReference++;inspectedPartitions++;
   const shape=designFingerprints(v.level).shapeSha256;if(shape===originalF.shapeSha256||shape===parent?.fingerprints.shapeSha256){reject('shape-inventory-not-new');continue;}
   if(compareLayouts(v.level,ref.level).footprintSimilarity>.65){reject('reference-near');continue;}
   const nearSource=compareLayouts(v.level,source).footprintSimilarity;if(nearSource>.55){reject('source-near');continue;}
   let nearest=0,nearFile=null,tooNear=false;for(const k of known){const n=compareLayouts(v.level,k.level).footprintSimilarity;if(n>nearest){nearest=n;nearFile=k.file;}if(n>.65){tooNear=true;break;}}
   if(tooNear){reject('existing-or-failed-macro-near');continue;}
   let nearestOld=0;for(const k of old){nearestOld=Math.max(nearestOld,compareLayouts(v.level,k.level).footprintSimilarity);if(nearestOld>.75)break;}if(nearestOld>.75){reject('old450-near');continue;}
   const seed=8420911+ri*120071+si*1709+vi*19,paint=colourAndPlaceExits(v.level,runtime,{seed,maxNodes:3000,maxTransitions:6000,paletteSize:8});
   if(!paint.ok){reject(`paint:${paint.reason}`);continue;}
   const level={...structuredClone(v.level),blocks:paint.blocks,gates:paint.gates},f=designFingerprints(level);
   if(!changedFrom(originalF,f)||parent&&!changedFrom(parent.fingerprints,f)){reject('real-colour-or-stock-not-new');continue;}
   if(levelSha256(level.gates)===levelSha256(ref.level.gates)){reject('unchanged-exits');continue;}
   const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),identityFile=`${root}/proof/attempts/identities/${identity}.json`;if(fs.existsSync(identityFile)){reject('previously-attempted-identity');continue;}
   const inventory=inventorySummary(level,runtime),staticAudit=runtime.auditRevisedCandidate(level,undefined);if(inventory.nonNativeOrMissingArtIds.length||staticAudit.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile')){reject('static-or-native-art');continue;}
   assert.equal(mask(level),mask(source));
   const probe=probeInitialClearThenParking(runtime,level);totalProbeWorlds+=probe.fullWorlds;probeRecords.push({source:ref.sourceLevelId,seed,levelSha256:levelSha256(level),valid:probe.valid,reason:probe.reason,fullWorlds:probe.fullWorlds});
   if(!probe.valid){reject(`probe:${probe.reason}`);continue;}
   const file=`${output}/candidate-${String(candidates.length).padStart(3,'0')}.json`,{level:ignored,assignment,...macro}=swap;
   const packet={status:'OPENING_CLEAR_AND_PARKING_PREVIEW_ONLY',accepted:false,formalReady:false,L:null,U:null,drags:null,newLUSearches:0,sourceLevelId:ref.sourceLevelId,
    level,levelSha256:levelSha256(level),sourceLevelSha256:levelSha256(source),sourceMaskSha256:mask(source),inventory,staticAudit,openingProbe:probe,redesignOf:parent?.id??null,
    failedParent:parent?{...parent,fingerprints:undefined}:null,unattemptedIdentity:{identity,path:identityFile,exists:false},
    provenance:{strategy:'macro-translation-new-rim-new-colours-fixed-actual-opening',reference:ref.file,referenceSha256:ref.sha256,referenceDifficulty:ref.difficulty,referenceU:ref.U,referenceProofNotTransferred:true,
     macro,boundaryRetileBodyIds:v.changedIds,sourceMaskExactlyRetained:true,rotationApplied:false,oldGates:ref.level.gates,newGates:level.gates,
     originalShapeInventorySha256:originalF.shapeSha256,newShapeInventorySha256:f.shapeSha256,originalColoursSha256:originalF.colorSha256,newColoursSha256:f.colorSha256,
     realShapeAndColourChangedFromReference:true,realShapeAndColourChangedFromLatestSourceFailure:parent?true:null,seed,colouring:{nodes:paint.nodes,transitions:paint.transitions,emptyBoardSingleBodyMicroStates:paint.emptyBoardSingleBodyMicroStates,initialExitCount:paint.initialExitCount}},
    similarity:{reference:compareLayouts(level,ref.level).footprintSimilarity,existingAndPriorFailedMacro:nearest,nearestFile:nearFile,old450:nearestOld,source:nearSource},bindings};
   fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});add(file,level);usedSources.add(ref.sourceLevelId);row.acceptedPreview=true;done=true;
   const result={path:file,sha256:sha(file),sourceLevelId:ref.sourceLevelId,redesignOf:packet.redesignOf,reference:ref.file,macroFraction:macro.areaFraction,macroBodies:macro.bodyCount,kind:macro.kind,similarity:packet.similarity,
    openingDrags:probe.drags,openingProbeWorlds:probe.fullWorlds,openingClears:1,openingNonClears:1,remainingInventory:probe.remainingInventory};candidates.push(result);console.log(JSON.stringify(result));write('STATIC_NEW_EXITS_AND_FIXED_TWO_GESTURES_RUNNING');
  }
 }
 row.inspectedPartitions=perReference;
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256);write('FIXED_EIGHT_PREVIEW_CONSTRUCTION_FINISHED_NO_LU_SEARCH');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'FIXED_TWO_GESTURES_ONLY_NO_COMPLETE_U',accepted:false,formalReady:false,files:candidates.map(x=>x.path)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,previews:candidates.length,sources:[...usedSources],inspectedPartitions,totalProbeWorlds,rejections}));
