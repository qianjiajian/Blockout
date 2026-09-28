import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {checkStationaryObligations,validateObligationPrefix} from '../root-native/stationary-obligations.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const api=await loadSpatialApi(),tool='tools/campaign-v145/lv131-140/root-native/stationary-obligations.mjs',toolHash=digest(fs.readFileSync(tool));
const base={id:139,name:'independent K2',difficulty:'normal',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0,gates:[{id:'p',side:'left',offset:0,size:2,color:'purple'},{id:'r',side:'bottom',offset:0,size:3,color:'red',frozen:2}],blocks:[{id:'target',x:1,y:1,shape:[[0,0],[1,0],[0,1],[1,1]],color:'purple'},{id:'target2',x:2,y:0,shape:[[0,0]],color:'purple'},{id:'blocker',x:0,y:0,shape:[[0,0]],color:'red'}]};
const K3=structuredClone(base);K3.blocks.push({id:'target3',x:0,y:2,shape:[[0,0]],color:'purple'});K3.gates[1].frozen=3;
const twoBlockers=structuredClone(base);twoBlockers.blocks.push({id:'blocker2',x:1,y:0,shape:[[0,0]],color:'red'});
const hidden=structuredClone(base);hidden.width=4;hidden.shutters=[{id:'cover',x:3,y:0,width:1,height:3,count:2}];hidden.blocks.push({id:'hidden-purple',x:3,y:0,shape:[[0,0],[0,1],[0,2]],color:'purple',shutterId:'cover'});
const frozenTarget=structuredClone(base);frozenTarget.blocks[0].frozen=1;
const queue=structuredClone(base);queue.height=4;queue.generators=[{id:'gen',side:'right',offset:1,rimSpan:3,rimMount:'rim',spawn:[2,1],queueBlockIds:['q0']}];queue.blocks.push({id:'q0',color:'red',x:0,y:0,shape:[[0,0]]});
const dirs=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];
const world=m=>{const s=m.snapshot();return JSON.stringify([s.blocks,s.queuedBlocks,s.gates,s.shutters,s.generators,s.cleared,s.complete]);};
function apply(m,d){const n=m.clone();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());return n;}
function gestures(m,visit){
 for(const b of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(b.id)))continue;const nodes=[{m,path:[]}],seen=new Set([world(m)]);
  for(let i=0;i<nodes.length;i++){const n=nodes[i];if(i>0)visit({blockId:b.id,path:n.path});
   for(const side of sides){const t=n.m.clone();t.beginAction();if(t.tryExit(b.id,side).ok)visit({blockId:b.id,path:n.path,exitSide:side});}
   const pos=n.m.getBlock(b.id);for(const [dx,dy]of dirs){const t=n.m.clone();t.beginAction();const p=[pos.x+dx,pos.y+dy];if(!t.moveBlockStep(b.id,...p))continue;const k=world(t);if(seen.has(k))continue;seen.add(k);nodes.push({m:t,path:[...n.path,p]});}
  }
 }
}
const rows=[];
for(const [name,l]of [['K2',base],['K3',K3],['K2-two-distinct-blockers',twoBlockers],['K2-cover-equals-K-hidden-purple',hidden],['K2-target-ice-free-relaxation',frozenTarget],['K2-automatic-queue',queue]]){
 const contract=validateObligationPrefix(l,api),proof=checkStationaryObligations(l,api,{floor:1}),initial=new api.PuzzleModel(l);initial.startCountdown();
 const nodes=[initial],indices=new Map([[world(initial),0]]),edges=[];let transitionCount=0;const start=Date.now();
 for(let i=0;i<nodes.length;i++){assert(nodes.length<20000);assert(Date.now()-start<45000);const m=nodes[i],out=[];
  if(m.snapshot().cleared<contract.goalClears)gestures(m,d=>{const n=apply(m,d),k=world(n);let j=indices.get(k);if(j===undefined){j=nodes.length;indices.set(k,j);nodes.push(n);}out.push({to:j,cost:Number(n.snapshot().cleared===m.snapshot().cleared),id:d.blockId,drag:d});transitionCount++;});edges.push(out);
 }
 const distance=nodes.map(n=>n.snapshot().cleared>=contract.goalClears?0:Infinity);let changed=true;
 while(changed){changed=false;for(let i=0;i<nodes.length;i++)for(const e of edges[i])if(distance[e.to]+e.cost<distance[i]){distance[i]=distance[e.to]+e.cost;changed=true;}}
 assert(Number.isFinite(distance[0]));assert(proof.provedObligations<=distance[0]);assert.equal(new Set(proof.obligations.map(o=>o.blockerId)).size,proof.provedObligations);
 const perBody=[];
 for(const obligation of proof.obligations){
  const seen=new Set([0]),pending=[0];let goalWithoutMoving=false;
  for(let at=0;at<pending.length;at++){const i=pending[at];if(nodes[i].snapshot().cleared>=contract.goalClears){goalWithoutMoving=true;break;}for(const e of edges[i])if(e.id!==obligation.blockerId&&!seen.has(e.to)){seen.add(e.to);pending.push(e.to);}}
  assert(!goalWithoutMoving);perBody.push({blockerId:obligation.blockerId,goalImpossibleWithoutAnyGestureByThisBody:true,statesWithFixedBody:seen.size});
 }
 rows.push({name,K:contract.goalClears,states:nodes.length,transitions:transitionCount,exhausted:true,exactPrefixMinimum:distance[0],obligations:proof.provedObligations,perBody,ms:Date.now()-start});console.log(JSON.stringify(rows.at(-1)));
}
const rejects=[];
for(const [name,l,mutate]of [
 ['single-layer-body-color-mismatch',base,l=>{l.blocks[2].layers=['purple'];}],
 ['single-layer-target-color-mismatch',base,l=>{l.blocks[0].layers=['red'];}],
 ['ice-counter-less-than-K',base,l=>{l.gates[1].frozen=1;}],
 ['cover-counter-less-than-K',hidden,l=>{l.shutters[0].count=1;}],
 ['ordinary-color-queue',queue,l=>{l.blocks.at(-1).color='purple';}],
 ['ordinary-active-layer-queue',queue,l=>{l.blocks.at(-1).layers=['purple'];}],
 ['timed-generator',queue,l=>{l.generators[0].trigger='time';l.generators[0].intervalSeconds=1;}],
 ['shell-extra-clear',base,l=>{l.blocks[2].layers=['red','purple'];}],
 ['hidden-block-outside-cover',hidden,l=>{l.blocks.at(-1).x=2;}]
]){const d=structuredClone(l);mutate(d);const p=checkStationaryObligations(d,api,{floor:1});assert.equal(p.status,'unsupported',name);rejects.push({name,status:p.status,reason:p.reason});}
assert.equal(digest(fs.readFileSync(tool)),toolHash,'Tool changed during independent qualification');
const report={passed:true,tool,toolSha256:toolHash,rootQualification:'deliverables/remake131-140-v146-20260924/root-native/qualification-stationary-1790477004383.json',mathematicalReview:{verdict:'SOUND_WITH_CURRENT_EXPLICIT_SINGLE_LAYER_COLOR_CHECK_AND_VALIDATED_PREFIX',firstOtherColorArgument:'Until K initial target-color clears, all non-target exits remain frozen, no cover can reveal, and no queue target-color clear exists. Hence every target must leave before any non-target can leave or a curtain can change occupancy.',stationaryRelaxation:'Deleting every other active body and the automatic queues only removes obstacles. Curtains are retained, since they stay physically closed before the tested target leaves. The target ice is deleted, which further relaxes motion. No target gesture changes a gate, curtain or active blocker before its own exit; a pose-only visited set therefore suffices.',mapping:'If a real winning route never moved blocker B before target T left, the concatenation of T poses from its initial pose to exit would be a legal path in the reduced puzzle containing only T, B and still-closed curtains. Reduced unreachability contradicts that path.',additivity:'Each distinct obliged initial non-target body must be selected and moved before K clears. It cannot clear at that time, so its first movement is a non-clearing drag. One gesture moves one body; deduplication by blocker ID makes these costs additive.',qualificationLimit:'Small-graph qualification supports implementation correctness; the theorem and strict guards supply general scope. This does not certify solvability, time, artwork, source parity, or a candidate not passed to the tool.'},rows,rejected:rejects,historicalFinding:{counterexample:'deliverables/remake131-140-v146-20260924/agent131-134/stationary-counterexample-1790476967481.json',oldToolSha256:'50f5f9f130a1d4f7e9ce4af96e3b062576b249e999ee93543e540303fce2d8fe',status:'FIXED_IN_REVIEWED_TOOL; current body/target/queue mismatch rejection tested'},boundFiles:[tool,'src/core/PuzzleModel.ts',import.meta.filename].map(file=>({file,sha256:digest(fs.readFileSync(file))})),formalCandidateCertified:false};
const out=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-independent-review-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,passed:true,fixtures:rows.length,states:rows.reduce((n,r)=>n+r.states,0),edges:rows.reduce((n,r)=>n+r.transitions,0),rejected:rejects.length,toolSha256:toolHash}));
