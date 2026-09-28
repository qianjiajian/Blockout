import fs from 'node:fs';import assert from 'node:assert/strict';
import{loadApi}from'../replay.mjs';import{digest,writeNew,ruleGate}from'../common.mjs';
import{compile,each,stateOf}from'../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
const {api,inputs}=await loadApi(),lock=ruleGate();
const bindings=Object.fromEntries([...inputs,'tools/remake182-185-20260927/review/flip-prefix-projection.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));
const S=[[0,0]],H2=[[0,0],[1,0]],H3=[[0,0],[1,0],[2,0]],reports=[];
const base={id:185,name:'frozen flip projection qualifier',width:3,height:3,timeSeconds:999,reward:0,parMoves:99,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',gates:[{id:'red',color:'red',side:'top',offset:0,size:2}],shutters:[{id:'cover',x:0,y:2,width:3,height:1,count:2}],blocks:[{id:'r',x:0,y:0,color:'red',shape:H2},{id:'b',x:2,y:0,color:'blue',shape:S},{id:'g',x:0,y:1,color:'green',shape:S},{id:'h',x:0,y:2,color:'red',shape:H3,shutterId:'cover'}]};
for(const[caseIndex,[openBlue,frozenBlue,openGreen,frozenGreen]]of [[true,0,false,0],[false,1,true,0],[true,1,false,2],[false,0,true,1]].entries()){
 const level={...structuredClone(base),flipDoors:[{id:'blue',color:'blue',side:'right',offset:0,size:2,initiallyOpen:openBlue,...(frozenBlue?{frozen:frozenBlue}:{})},{id:'green',color:'green',side:'left',offset:0,size:2,initiallyOpen:openGreen,...(frozenGreen?{frozen:frozenGreen}:{})}]};
 api.validateLevel(level);const projected={...level,mechanismRules:'revised-2026-09-23-v1.4',gates:[...level.gates,...level.flipDoors.map(({initiallyOpen,...g})=>g)],flipDoors:[]},c=compile(projected,api,2);
 const start=new api.PuzzleModel(level,{deferExitCompletion:true});start.startCountdown();
 const projection=m=>String.fromCharCode(...stateOf(c,m.snapshot()));
 const key=m=>{const s=m.snapshot();return JSON.stringify([projection(m),s.flipDoors.map(g=>[g.id,g.frozen,g.open]),Object.values(s.pendingExitFlipDoorIds??{}).map(ids=>[...ids].sort().join(',')).sort()]);};
 const q=[start],seen=new Set([key(start)]);let actualEdges=0,callbacks=0,poses=0,exitEdges=0,maxPending=0;
 for(let at=0;at<q.length;at++){
  assert(q.length<12000,'Small qualifier state guard');const model=q[at],snap=model.snapshot();if(snap.cleared>=2)continue;
  const pending=snap.pendingExitAnimations??[];maxPending=Math.max(maxPending,pending.length);
  const add=m=>{const k=key(m);if(!seen.has(k)){seen.add(k);q.push(m);}};
  for(const id of pending){const child=model.clone();assert(child.completeExitAnimation(id));assert.equal(projection(child),projection(model));add(child);callbacks++;}
  const state=stateOf(c,snap),fast=new Set();each(c,state,(i,v,cost)=>{const n=state.slice();n[i]=v;fast.add(cost+':'+String.fromCharCode(...n));});
  const accept=(child,cost)=>{assert(fast.has(cost+':'+projection(child)),'An actual phase-constrained edge is absent from the always-open relaxation');actualEdges++;add(child);};
  for(const b of snap.blocks){if(!model.isBlockActive(model.getBlock(b.id)))continue;
   const locations=[{x:b.x,y:b.y,path:[]}],visited=new Set([b.x+','+b.y]);
   for(let j=0;j<locations.length;j++){
    const position=locations[j],walk=()=>{const child=model.clone();child.beginAction();for(const xy of position.path)assert(child.moveBlockStep(b.id,...xy));return child;},held=walk();poses++;
    if(position.path.length){const child=walk();assert(child.commitAction());accept(child,1);}
    for(const side of ['top','right','bottom','left']){const child=walk();if(child.tryExit(b.id,side).ok){assert(child.commitAction());accept(child,0);exitEdges++;}}
    for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const x=position.x+dx,y=position.y+dy,k=x+','+y;if(visited.has(k))continue;const child=held.clone();if(!child.moveBlockStep(b.id,x,y))continue;visited.add(k);locations.push({x,y,path:[...position.path,[x,y]]});}
   }
  }
 }
 reports.push({caseIndex,phaseParameters:{openBlue,frozenBlue,openGreen,frozenGreen},states:q.length,actualEdges,callbacks,poses,exitEdges,maxPending,exhausted:true,allActualEdgesIncluded:true,callbacksMapToFreeStutter:true});console.log(JSON.stringify(reports.at(-1)));
}
for(const[p,sha]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),sha,'source drift '+p);
const result={createdAt:new Date().toISOString(),status:'PASS_FROZEN_FLIP_PREFIX_ALWAYS_OPEN_PROJECTION',activeRuleVersion:lock.activeVersion,reports,bindings,projection:'Replace each flip door by same-id/color/side/offset/size/frozen ordinary gate; remove only initiallyOpen/phase eligibility and preserve all ice counts, cover masks and all source bodies before terminal prefix. Stop at earliest reveal. Source v1.5 frozen phase retained in the authoritative model.',reasoning:'All actual exits, whether before/after/interleaved with delayed callbacks, require the same color, geometry and ice threshold. An always-open door satisfies a superset. Callback events only change phases and therefore project to free unchanged states. Hidden bodies cannot move before earliest reveal. Greedy final-removal normalization is applied only to the resulting no-flip relaxation, not the actual phase-constrained model.',limitation:'Finite complete fixtures qualify the adapter; each candidate still needs its own field-preservation audit, first-reveal applicability and fresh threshold search. No candidate lower-bound or full-solution claim here.'};
const out='deliverables/remake182-185-20260927/review/flip-prefix-projection-'+Date.now()+'.json';writeNew(out,result);console.log(JSON.stringify({out,status:result.status}));
