import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {loadV3CatalogRuntime,qualifyV3Slot,qualifyV3DesignedSlot,auditV3Catalog} from './catalog-contract.mjs';
import {designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {describeLayout,compareLayouts} from './diversity.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {historicalPromotedFamilies} from './family-promotion-history.mjs';

const [poolFile,label,priorIndex]=process.argv.slice(2);
if(!poolFile||!label||!/^[a-z0-9-]+$/.test(label))throw Error('Usage: select-diverse-pool.mjs <pool-index.json> <new-batch-label> [prior-selection-index.json]');
const output=`deliverables/daily-formal-v3-20261008/selection/${label}`;
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output,{recursive:false});
const runtime=await loadV3CatalogRuntime(),slots=expectedDailySlots(runtime.MECHANISM_GUIDE);
const pool=JSON.parse(await fs.readFile(poolFile,'utf8')),selected=[],files=[];
const lineageReader=createReferenceLineageReader();
if(priorIndex){const prior=JSON.parse(await fs.readFile(priorIndex,'utf8'));
 for(const file of prior.files){const r=JSON.parse(await fs.readFile(file,'utf8'));selected.push(r);files.push(file);}}
const retiredFamilies=await historicalPromotedFamilies(priorIndex,selected);
// A mathematically valid object rejected by actual image review must not be
// silently reselected from a later full exploratory-pool snapshot.
const visuallyExcluded=new Map(),reviewedFamilies=[],seenIndices=new Set();let historyIndex=priorIndex;
// Some candidates fail real-image review before they ever occupy a slot.
// Keep those decisions outside selection ancestry, with immutable input/image
// bindings, so a later exploratory-pool snapshot cannot silently admit them.
const preselectionReviews='deliverables/daily-formal-v3-20261008/proof/preselection-visual-exclusions.json';
const exclusions=JSON.parse(await fs.readFile(preselectionReviews,'utf8'));
for(const item of exclusions.records){
 const bytes=await fs.readFile(item.reviewFile);
 if(createHash('sha256').update(bytes).digest('hex')!==item.reviewSha256)throw Error('Preselection visual review changed');
 const review=JSON.parse(bytes);
 if(review.decision!=='REJECT_REPEATED_VISUAL_FAMILY'||review.rootActuallyViewed!==true)throw Error('Actual rejection required');
 for(const binding of [review.candidate,review.actualImage]){
  if(createHash('sha256').update(await fs.readFile(binding.path)).digest('hex')!==binding.sha256)throw Error('Reviewed physical input/image changed');
 }
 const base=JSON.parse(await fs.readFile(review.candidate.path,'utf8'));
 visuallyExcluded.set(designFingerprints(base.level).designSha256,{reviewFile:item.reviewFile,removedFormalId:null});
}
while(historyIndex&&!seenIndices.has(historyIndex)){
 seenIndices.add(historyIndex);const history=JSON.parse(await fs.readFile(historyIndex,'utf8'));
 for(const removed of history.visualCuration?.removed??[]){
  const receipt=JSON.parse(await fs.readFile(removed.file,'utf8'));
  const base=JSON.parse(await fs.readFile(receipt.baseInputFile,'utf8'));
  visuallyExcluded.set(designFingerprints(base.level).designSha256,{reviewFile:history.visualCuration.reviewFile,removedFormalId:removed.formalId});
 }
 if(history.visualCuration?.reviewFile){
  const bytes=await fs.readFile(history.visualCuration.reviewFile);
  if(createHash('sha256').update(bytes).digest('hex')!==history.visualCuration.reviewSha256)throw Error('Actual visual review changed');
  const review=JSON.parse(bytes);
  for(const family of review.families??[])if(family.decision==='KEEP_ONE_REPRESENTATIVE'
   &&family.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&family.gateTopologyAndColourEvidence?.allMembersExactlyEqual)
   reviewedFamilies.push({...family,reviewFile:history.visualCuration.reviewFile});
 }
 historyIndex=history.priorIndex;
}
const bodyAnchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[x+b.x,y+b.y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gateSignature=gates=>JSON.stringify(gates.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
function pendingVisualFamily(level){
 const anchors=new Set(level.blocks.map(bodyAnchor)),gates=gateSignature([...(level.gates??[]),...(level.flipDoors??[])]);
 return reviewedFamilies.find(f=>gateSignature(f.gateTopologyAndColourEvidence.canonicalTopology)===gates
  &&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(bodyAnchor(b))));
}
const old=JSON.parse(await fs.readFile('deliverables/daily-formal-v2-20261007/final-qualified/index.json','utf8'));
const oldById=new Map(old.entries.map(e=>[e.formalId,e.path]));
const mechanismOrder=['generator','layered-lift','key-lock','axis-block','multilayer-shell','shutter','numeric-ice','frozen-exit',
 'colored-grid','flip-door','star','bomb','irregular-block','irregular-board','color-exit'];
const unlock=new Map(runtime.MECHANISM_GUIDE.map(s=>[s.id,s.unlockLevel])),attempts=[];
const write=async()=>{
 await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,formalReady:false,productionChanged:false,poolFile,priorIndex:priorIndex??null,files},null,2)+'\n');
 await fs.writeFile(`${output}/attempts.json`,JSON.stringify({attempts,selected:files.length,formalReady:false},null,2)+'\n');
};
for(const item of pool.records){
 const bytes=await fs.readFile(item.path);
 if(createHash('sha256').update(bytes).digest('hex')!==item.fileSha256)throw Error(`Pool file changed ${item.path}`);
 const base=JSON.parse(bytes);
 if(base.replacementOf){
  attempts.push({basePath:item.path,status:'ATOMIC_FAMILY_REPLACEMENT_REQUIRED',accepted:false});await write();continue;
 }
 const ancestry=retiredFamilies.size?lineageReader.inspect(item.path):null;
 if(ancestry&&(ancestry.unknownReasons.length||ancestry.roots.length!==1)){
  attempts.push({basePath:item.path,status:'SKIPPED_UNRESOLVED_ANCESTRY_WITH_RETIRED_FAMILIES',accepted:false});await write();continue;
 }
 if(ancestry?.roots.some(root=>retiredFamilies.has(root))){
  attempts.push({basePath:item.path,status:'SKIPPED_LIVE_PROMOTED_FAMILY_ALREADY_REPRESENTED',accepted:false});await write();continue;
 }
 if(selected.some(r=>r.baseLevelSha256===base.levelSha256))continue;
 const fingerprints=designFingerprints(base.level);
 if(visuallyExcluded.has(fingerprints.designSha256)){
  attempts.push({basePath:item.path,status:'SKIPPED_ACTUAL_VISUAL_REPETITION',accepted:false,...visuallyExcluded.get(fingerprints.designSha256)});await write();continue;
 }
 const repeatedFamily=pendingVisualFamily(base.level);
 if(repeatedFamily){
  attempts.push({basePath:item.path,status:'PENDING_ACTUAL_REVIEW_OF_REPEATED_VISUAL_SKELETON',accepted:false,
   reviewFile:repeatedFamily.reviewFile,familySource:repeatedFamily.source,
   reason:'Preserves every previously reviewed shared body anchor and the identical exit field; not automatically accepted as another layout.'});await write();continue;
 }
 const retryIdentity=levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256});
 if(await fs.stat(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${retryIdentity}.blocked.json`).then(()=>true).catch(()=>false)){
  attempts.push({basePath:item.path,status:'SKIPPED_PREVIOUSLY_FAILED_PHYSICAL_DESIGN',accepted:false});await write();continue;
 }
 // Earlier failed physical inputs remain rejected by the common proof ledger.
 const baseUsed=runtime.mechanismsUsedByDailyLevel(base.level),baseUnlock=Math.max(...baseUsed.map(m=>unlock.get(m)));
 const directMechanism=base.mechanismFirst===true;
 const reservedGenerators=(base.provenance?.reservedGeneratorBerths?.length??0)>0;
 const openStages=runtime.MECHANISM_GUIDE.filter(s=>s.unlockLevel>=baseUnlock&&(!reservedGenerators||s.id==='generator')
  &&(!directMechanism||base.stageKey===`mechanisms-${s.id}-${s.unlockLevel}`)).map(stage=>{
  const stageKey=`mechanisms-${stage.id}-${stage.unlockLevel}`;
  const group=selected.filter(r=>r.stageKey===stageKey&&r.difficulty===base.difficulty);
  const slot=slots.find(s=>s.stageKey===stageKey&&s.difficulty===base.difficulty&&!selected.some(r=>r.formalId===s.formalId));
  const repeatSource=group.filter(r=>r.sourceLevelId===base.sourceLevelId).length;
  const repeatOutline=group.filter(r=>describeLayout(r.level).boardOutlineSha256===describeLayout(base.level).boardOutlineSha256).length;
  return{stage,slot,group,priority:group.length*100+repeatSource*30+repeatOutline*10+mechanismOrder.indexOf(stage.id)};
 }).filter(x=>x.slot).sort((a,b)=>a.priority-b.priority);
 for(const {slot,group}of openStages){
  if(group.some(r=>compareLayouts(r.level,base.level).footprintSimilarity>.65))continue;
  if(selected.some(r=>compareLayouts(r.level,base.level).footprintSimilarity>.75))continue;
  const oldPath=oldById.get(slot.formalId),priorLevel=oldPath?JSON.parse(await fs.readFile(oldPath,'utf8')).level:undefined;
  const qualify=directMechanism?qualifyV3DesignedSlot:qualifyV3Slot;
  const report=await qualify(runtime,base,slot,{selected,priorLevel,intensityOptions:{priorLevel,maxAttempts:12},
   proofOptions:{ledgerDirectory:'deliverables/daily-formal-v3-20261008/proof/attempts',
    // Reserve one terminal, unregistered candidate; the frozen engine returns
    // immediately on its first raw guard. Total inspected worlds stay <=10000.
    lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
    routeBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}}});
  report.baseInputFile=item.path;report.baseInputFileSha256=item.fileSha256;
  const file=`${output}/attempt-${String(attempts.length).padStart(4,'0')}.json`;
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const row={path:file,basePath:item.path,formalId:slot.formalId,status:report.status,accepted:report.accepted,
   L:report.L??null,U:report.U??null,reason:report.reasons??report.adaptation?.failedAttempts?.at(-1)?.error??null};attempts.push(row);
  if(report.accepted){selected.push(report);files.push(file);}
  await write();process.stdout.write(JSON.stringify({...row,selected:files.length})+'\n');
  // A searched failed input cannot be recycled into a new mechanism/metadata variant.
  if(report.accepted||report.attempt||report.status==='INVALID_ATTEMPT')break;
 }
}
const audit=await auditV3Catalog(runtime,selected,{expectFull:selected.length===450});
await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});await write();
process.stdout.write(JSON.stringify({output,selected:files.length,verified:audit.verified,status:audit.status,formalReady:false})+'\n');
