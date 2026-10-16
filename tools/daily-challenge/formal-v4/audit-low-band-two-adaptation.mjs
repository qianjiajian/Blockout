import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';

const V4='deliverables/daily-formal-v4-20261008',out=`${V4}/design/low-band-two-adaptation-readonly-01`;assert(!fs.existsSync(out));
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=(p,h)=>{const b=fs.readFileSync(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h);return JSON.parse(b);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const indexPath=`${V4}/selection/gate-aware-basic-147-01/index.json`,index=read(indexPath,'049a2cea87672b4fbf54afdb06ae01d8b3c964af85a0e9447c23b5ec3e1f39dd');
const selected=index.files.map(p=>read(p));
const proofAuditPath=`${V4}/proof/low-band-prefix-actual-independent-02/report.json`,proofAudit=read(proofAuditPath,'77260857025930f25c8fcc3023d095cc92196fd58593725eb3f5a9911e8fc080');
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const remaining=runtime.slots.filter(s=>s.difficulty===2&&!selected.some(q=>q.formalId===s.formalId));
const files=['009','013'].map(n=>`${V4}/design/low-band-sixteen-math-01/candidate-${n}.json`),rows=[];
// Exact conservative mount predicates from the frozen known-route adapter.
// This only lists possibilities; no generator or cargo object is constructed.
function mounts(level,b){const out=[],w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;if(w>3||h>3)return out;
 for(const side of ['left','right','top','bottom']){if(side==='left'&&b.x!==0||side==='right'&&b.x+w!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+h!==level.height)continue;
  const vertical=['left','right'].includes(side),length=vertical?level.height:level.width,first=vertical?b.y:b.x,last=first+(vertical?h:w)-1;
  for(let offset=Math.max(1,first);offset<=Math.min(length-2,last);offset++){if(first<offset-1||last>offset+1)continue;if(level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;out.push({side,offset,rimSpan:3,rimMount:'rim',spawn:[b.x,b.y]});}
 }return out;}
for(const file of files){const q=read(file);assert(q.accepted&&q.difficulty===2&&q.L===21&&q.U===28);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
 const model=new runtime.PuzzleModel(q.level);model.startCountdown();const info=new Map(q.level.blocks.map(b=>[b.id,{id:b.id,color:b.color,firstAction:null,clearsBeforeFirst:null,exitDrag:null,movedAxes:new Set(),openingMounts:mounts(q.level,b)}])),events=[];
 for(const [i,d]of q.drags.entries()){const row=info.get(d.blockId),before=model.snapshot(),body=model.getBlock(d.blockId);assert(body);
  if(row.firstAction===null){row.firstAction=i+1;row.clearsBeforeFirst=before.cleared;}
  let position=[body.x,body.y];for(const p of d.path){if(p[0]!==position[0])row.movedAxes.add('x');if(p[1]!==position[1])row.movedAxes.add('y');position=p;}
  const tryExit=model.tryExit;model.tryExit=function(id,side){const state=this.snapshot(),result=tryExit.call(this,id,side);if(result.ok)events.push({drag:i+1,blockId:id,gateId:result.gateId,side,clearedBefore:state.cleared});return result;};
  try{applyNativeDrag(model,d);}finally{model.tryExit=tryExit;}if(d.exitSide)row.exitDrag=i+1;
 }
 const final=model.snapshot(),independent=independentReplay(runtime,q.level,q.drags);assert(final.complete&&!final.failed&&!final.blocks.length);assert(independent.complete&&independent.nonClearingDrags===28);
 const bodies=[...info.values()].map(r=>({...r,movedAxes:[...r.movedAxes]})),keys=events.slice(0,6);
 const lock6=bodies.findLast(b=>!keys.some(k=>k.blockId===b.id)&&keys.every(k=>k.drag<b.firstAction));
 const lock5=bodies.find(b=>b.id!==lock6?.id&&!keys.some(k=>k.blockId===b.id)&&keys.slice(0,5).every(k=>k.drag<b.firstAction));
 const compatibleOwners=bodies.filter(b=>b.firstAction===b.exitDrag&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<q.level.blocks.length-2&&b.openingMounts.length);
 const axisBodies=bodies.filter(b=>b.movedAxes.length===1),nearest=selected.map(s=>({formalId:s.formalId,ratio:compareLayouts(q.level,s.level).footprintSimilarity})).sort((a,b)=>b.ratio-a.ratio)[0];
 const priorByProposedMechanism=Object.fromEntries(['generator','key-lock','axis-block'].map(mechanism=>{const slot=remaining.find(s=>s.newestMechanism===mechanism);assert(slot);const prior=runtime.priorDailySlots.get(slot.formalId);return[mechanism,{slot,prior}];}));
 rows.push({base:desc(file),sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,routeSha256:q.routeSha256,L:q.L,U:q.U,drags:q.drags.length,bodies:q.level.blocks.length,
  fullOriginalReplay:{canonicalComplete:true,independentComplete:true,noNewSearch:true},nearestCurrentSelected:nearest,
  generator:{openingBodyMountPossibilities:bodies.filter(b=>b.openingMounts.length),compatibleKnownRouteOwners:compatibleOwners,
   possibleOwnerCount:compatibleOwners.length,notACompleteGeneratorWitness:true,queueAndAuxiliaryInstancesNotConstructed:true},
  key:{knownRouteCompatible:!!(lock5&&lock6),proposedKeys:keys,proposedLocks:[lock5?{...lock5,count:5}:null,lock6?{...lock6,count:6}:null],
   distinctReleaseDrags:[keys[4]?.drag,keys[5]?.drag],requiresNewReviewedD2Entry:true,oldD1FrozenEntryNotApplicable:true,designChoiceNotUniformUserQuota:true},
  axis:{knownRouteCompatibleBodies:axisBodies,instancesAreNotYetConstructed:true},priorByProposedMechanism,
  firstActions:bodies,actualPortalEvents:events,mechanismConstructionCalls:0,publicClaims:0,newLowerCalls:0});
}
const mutual=compareLayouts(read(files[0]).level,read(files[1]).level).footprintSimilarity;
const report={status:'READ_ONLY_LOW_BAND_TWO_ADVANCED_CAPACITY_OPTIONS',selection:desc(indexPath),mathematicalIndependentAudit:desc(proofAuditPath),rows,mutualFootprintSimilarity:mutual,
 currentD2Missing:remaining.length,stageAssignmentNotCommitted:true,constructionNotAuthorizedByThisReport:true,
 notes:['Generator entries are actual geometric and known-route necessary conditions; cargo schedules still require one real construction and full replay.',
 'Key5/6 with6 keys is a proposed D2 configuration chosen from the actual original route; no new mechanism object or proof exists yet.',
 'The frozen capacity context cannot be assumed to accept all147 newer admission types; a reviewed current147 context and accepted low-band receipt adapter are required.',
 'One base gets one predetermined advanced stage. An actual construction failure seals the base across stages; no fallback after claim.'],
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,formalReady:false,newConstructions:0,newSearches:0,ledgerWrites:0,bindings};
fs.mkdirSync(out);fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:desc(`${out}/report.json`),mutual,rows:rows.map(r=>({file:r.base.path,generatorOwners:r.generator.compatibleKnownRouteOwners,lockPlan:r.key.proposedLocks?.map(x=>x?{id:x.id,count:x.count,firstAction:x.firstAction,clearsBeforeFirst:x.clearsBeforeFirst}:null),keys:r.key.proposedKeys,axis:r.axis.knownRouteCompatibleBodies.map(b=>b.id),nearest:r.nearestCurrentSelected,slots:Object.fromEntries(Object.entries(r.priorByProposedMechanism).map(([m,s])=>[m,s.slot.formalId]))}))},null,2));
