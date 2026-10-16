import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)});
const root='deliverables/daily-formal-v4-20261008',out=`${root}/design/remaining-capacity-plan-01`;
const runtime=await loadV4CatalogRuntime(),previousPath=`${root}/design/unused-capacity-plan-02/report.json`,previous=read(previousPath),previousQa=read(`${root}/design/unused-capacity-plan-02/qa.json`);
assert.equal(sha(previousPath),previousQa.report.sha256);assert.equal(sha(previous.sourceIndex.path),previous.sourceIndex.sha256);
const selectedPath=`${root}/selection/capacity12-01/index.json`,selectedIndex=read(selectedPath),selected=selectedIndex.files.map(file=>read(file));assert.equal(selected.length,126);
const completionPath=`${root}/selection/capacity12-01/completion.json`,completion=read(completionPath);assert.equal(completion.attempts,12);assert.equal(completion.accepted,10);
const priorBases=new Set(previous.plans.map(r=>r.basePath)),priorRoots=new Set(previous.plans.flatMap(r=>r.roots));
const remaining=previous.rows.filter(r=>!priorBases.has(r.path));assert.equal(remaining.length,20);
const history='deliverables/daily-formal-v3-20261008/proof/attempts',construction=`${root}/proof/capacity-construction-attempts`;
const fingerprints=l=>{const f=designFingerprints(l);return{...f,retryIdentity:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
const selectedIdentity=new Set(selected.map(r=>fingerprints(r.level).retryIdentity));
const old450=[...runtime.priorDailySlots.values()].map(p=>read(p.sourceReport));
const definitions=[['generator','generatorDisjoint','mechanisms-generator-35'],['colored-grid','grid','mechanisms-colored-grid-200'],['layered-lift','lift','mechanisms-layered-lift-65'],['axis-block','axis','mechanisms-axis-block-50']];
const total=i=>Object.values(i).reduce((n,x)=>n+x.length,0),rows=[];
for(const input of remaining){
 const packet=read(input.path);assert.equal(sha(input.path),input.fileSha256);assert.equal(levelSha256(packet.level),input.levelSha256);assert.equal(routeSha256(packet.drags),input.routeSha256);
 assert(packet.accepted);runtime.assertPlainProofDomain(packet.level);
 const f=fingerprints(packet.level),identityFile=`${history}/identities/${f.retryIdentity}.json`,origin=read(identityFile).origin;
 const requestFile=`${history}/${origin}.request.json`,resultFile=`${history}/${origin}.result.json`,request=read(requestFile),result=read(resultFile),reject=[];
 assert.equal(request.shapeSha256,f.shapeSha256);assert.equal(request.colorSha256,f.colorSha256);
 if(!result.accepted||fs.existsSync(`${history}/${origin}.blocked.json`)||fs.existsSync(`${history}/identities/${f.retryIdentity}.blocked.json`))reject.push('public-failed-or-blocked');
 if(fs.existsSync(`${construction}/${f.designSha256}.request.json`)||fs.existsSync(`${construction}/identities/${f.retryIdentity}.json`)||fs.existsSync(`${construction}/aliases/${f.retryIdentity}.json`))reject.push('capacity-identity-already-attempted');
 if(selectedIdentity.has(f.retryIdentity))reject.push('already-selected-physical-identity');
 if(input.roots.some(r=>priorRoots.has(r)))reject.push('previous-twelve-family');
 const replay=replayDecorated(runtime,packet.level,packet.drags);assert(replay.complete);assert.equal(replay.nonClearingDrags,input.analysis.route.nonClearingDrags);
 const source=runtime.LEVELS.find(r=>r.id===input.sourceLevelId),sourceSimilarity=compareLayouts(packet.level,source).footprintSimilarity;
 if(sourceSimilarity>.55)reject.push('source-near');
 const oldSimilarity=Math.max(...old450.map(r=>compareLayouts(packet.level,r.level).footprintSimilarity));if(oldSimilarity>.75)reject.push('old450-near');
 const comparisons=selected.map(r=>({id:r.formalId,stageKey:r.stageKey,difficulty:r.difficulty,...compareLayouts(packet.level,r.level)}));
 if(comparisons.some(r=>r.footprintSimilarity>.75))reject.push('selected-global-near');
 const options=[];
 if(!reject.length)for(const [mechanism,key,stageKey]of definitions){
  const instances=input.analysis[key],available=instances.length;if(!available)continue;
  const primary=Math.min(available,input.difficulty+1),support=input.analysis.support,distinctSupport=[...new Set(support.map(r=>r.count))];
  const existingGroup=selected.filter(r=>r.stageKey===stageKey&&r.difficulty===input.difficulty);
  const description=describeLayout(packet.level);
  if(existingGroup.filter(r=>describeLayout(r.level).gateGeometrySha256===description.gateGeometrySha256).length>=2)continue;
  if(existingGroup.length===9&&(new Set([...existingGroup.map(r=>describeLayout(r.level).boardOutlineSha256),description.boardOutlineSha256]).size<3
   ||new Set([...existingGroup.map(r=>r.sourceLevelId),input.sourceLevelId]).size<4))continue;
  for(const slot of runtime.slots.filter(s=>s.stageKey===stageKey&&s.difficulty===input.difficulty&&!selected.some(r=>r.formalId===s.formalId))){
   const prior=runtime.priorDailySlots.get(slot.formalId),needed=Math.max(input.difficulty+1,total(prior.inventory)+1);
   assert.equal(sha(prior.sourceReport),prior.sourceReportSha256);
   if(primary<prior.inventory[mechanism].length)continue;
   const minimumSupport=Math.max(0,needed-primary),supportCount=minimumSupport?Math.max(2,minimumSupport):0;
   if(supportCount>support.length||(supportCount>0||mechanism==='layered-lift')&&distinctSupport.length<2)continue;
   if(comparisons.some(r=>r.stageKey===stageKey&&r.difficulty===slot.difficulty&&r.footprintSimilarity>.65))continue;
   options.push({...slot,primaryInstancesAvailable:available,primaryInstancesProposal:primary,minimumCombinedInstances:needed,supportInstancesNeeded:supportCount,
    priorSlot:{formalId:slot.formalId,levelSha256:prior.levelSha256,sourceReport:prior.sourceReport,sourceReportSha256:prior.sourceReportSha256,totalInstances:total(prior.inventory),latestInstances:prior.inventory[mechanism].length},
    mechanismOptions:instances,supportOptions:support,distinctReleaseEventsRequired:mechanism==='layered-lift'||supportCount>0?2:0});
  }
 }
 rows.push({...input,base:packet,publicLedger:{origin,retryIdentity:f.retryIdentity,request:bind(requestFile),result:bind(resultFile),blocked:reject.some(r=>r.includes('blocked'))},
  actualReplay:{complete:true,U:replay.nonClearingDrags,totalDrags:replay.effectiveDrags,unitSteps:input.analysis.route.unitSteps},sourceSimilarity,old450Similarity:oldSimilarity,
  nearestSelected:comparisons.sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0],gateGeometrySha256:describeLayout(packet.level).gateGeometrySha256,rejections:reject,options});
 console.log(JSON.stringify({scanned:rows.length,source:input.sourceLevelId,options:options.length,scope:'read-only-existing-route-and-static-slots'}));
}
// Static bipartite slot matching is not a puzzle-state or construction search.
// One family/base can occur once, and every chosen slot is initially empty.
const slots=new Map(),ordered=[...rows].sort((a,b)=>new Set(a.options.map(o=>o.stageKey)).size-new Set(b.options.map(o=>o.stageKey)).size||a.options.length-b.options.length||a.path.localeCompare(b.path));
function match(row,seen=new Set()){
 const sorted=[...row.options].sort((a,b)=>definitions.findIndex(d=>d[0]===a.newestMechanism)-definitions.findIndex(d=>d[0]===b.newestMechanism)||a.slot-b.slot);
 for(const option of sorted){if(seen.has(option.formalId))continue;seen.add(option.formalId);
  const old=slots.get(option.formalId);if(!old||match(old.row,seen)){slots.set(option.formalId,{row,option});return true;}}
 return false;
}
for(const row of ordered)if(row.options.length)match(row);
const assigned=[...slots.values()].sort((a,b)=>a.option.formalId.localeCompare(b.option.formalId)),plans=[],pending=[...selected],usedRoots=new Set();
for(const {row,option}of assigned){
 assert(!row.roots.some(r=>usedRoots.has(r)));row.roots.forEach(r=>usedRoots.add(r));
 const candidate={...option,sourceLevelId:row.sourceLevelId,level:row.base.level};
 pending.push(candidate);
 plans.push({...option,basePath:row.path,baseFileSha256:row.fileSha256,baseLevelSha256:row.levelSha256,baseRouteSha256:row.routeSha256,
  sourceLevelId:row.sourceLevelId,roots:row.roots,U:row.actualReplay.U,phase:'PREDECLARED_READ_ONLY_ADAPTATION_PLAN',requiresFreshConstructedObject:true,
  caveat:['generator','layered-lift'].includes(option.newestMechanism)?'Only physical capacity and exact base route are verified; added FIFO/hidden inventory has no constructed route yet.':'Exact base route is compatible with spatial restrictions; combined actual mechanism object still needs construction and fresh acceptance.'});
}
const allocated=new Set(plans.map(p=>p.basePath));assert.equal(allocated.size,plans.length);assert(plans.length<=20);
assert.equal(auditV4Diversity(pending,runtime.slots).reasons.length,0,'Combined provisional assignment diversity');
const data={status:'READ_ONLY_REMAINING_CAPACITY_PLAN_READY',formalReady:false,scope:300,selectedIndex:bind(selectedPath),priorTwelveCompletion:bind(completionPath),
 sourceIndex:previous.sourceIndex,sourceAudit:previous.sourceAudit,previousCapacityReport:bind(previousPath),previousCapacityQa:bind(`${root}/design/unused-capacity-plan-02/qa.json`),
 checked:20,proposed:plans.length,newCandidates:0,newConstructionCalls:0,ledgerClaims:0,proofSearches:0,heldReachabilitySearches:0,existingWitnessReplays:20,
 excludedAllPriorTwelveBases:true,uniqueSlots:true,noAutomaticStageFallback:true,noRetryOfFailedBase:true,
 selectionPolicy:'Match only initially empty unique slots. A failed construction does not reserve its slot permanently; a later independently predeclared batch may use the still-empty slot with a different fresh base.',
 mathToolchainSha256:runtime.toolchainSha256,tool:bind('tools/daily-challenge/formal-v4/plan-remaining-capacity-bases.mjs'),
 plans,unallocated:rows.filter(r=>!allocated.has(r.path)).map(r=>({path:r.path,source:r.sourceLevelId,difficulty:r.difficulty,reasons:r.rejections.length?r.rejections:r.options.length?['compatible-stage-slots-consumed-by-other-independent-bases']:['no-available-spatial-capacity-options']})),
 rows:rows.map(({base,...r})=>r)};
fs.mkdirSync(out,{recursive:false});fs.writeFileSync(`${out}/report.json`,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${out}/plan.json`,JSON.stringify({status:data.status,sourceReport:`${out}/report.json`,sourceReportSha256:sha(`${out}/report.json`),selectedIndex:data.selectedIndex,inputSelection:data.selectedIndex,
 rows:plans,constructionAuthorizedByThisPlan:false,formalReady:false},null,2)+'\n',{flag:'wx'});
fs.copyFileSync(data.tool.path,`${out}/planner-source.mjs.snapshot`,fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({output:out,checked:20,planned:plans.length,plans:plans.map(p=>({slot:p.formalId,source:p.sourceLevelId,base:p.basePath,primary:p.primaryInstancesProposal,support:p.supportInstancesNeeded})),unallocated:data.unallocated}));
