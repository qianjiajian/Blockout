import fs from'node:fs';import assert from'node:assert/strict';
import{loadApi,ruleGate,digest}from'../common.mjs';import{loadSpatialApi}from'../../remake111to120-spatial-floor-v147.mjs';const api={...(await loadApi()).api,...await loadSpatialApi()},project=l=>({...structuredClone(l),mechanismRules:'revised-2026-09-23-v1.4'}),rect=(x,y,w,h)=>Array.from({length:w*h},(_,p)=>[x+p%w,y+Math.floor(p/w)]),shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
import{compile,each,normalize,settle,graphKey}from'../../remake161-170/assist166/lift-floor.mjs';
import{NONE,cleared,key,active,occupied}from'../../remake111to120-spatial-floor-v147.mjs';
ruleGate();const ROOT='deliverables/remake171-180-20260927/author178-180',overlap=(a,b)=>a.some((v,i)=>v&b[i]);
const solverStartHash=digest(fs.readFileSync('tools/remake161-170/assist166/lift-floor.mjs'));
function refEach(c,s,visit){
 for(const co of c.covers)if(co.skin==='lift'&&s[co.stateIndex]===NONE){const occ=occupied(c,s,-1,co);if(co.members.some(i=>overlap(c.blocks[i].poses[s[i]&127].mask,occ)))continue;const n=s.slice();n[co.stateIndex]=0;visit(n,0);}
 const count=cleared(c,s);for(let i=0;i<c.N;i++){const b=c.blocks[i];if(!active(c,s,i))continue;const states=[s],seen=new Set([key(s)]);for(let ni=0;ni<states.length;ni++){
  const cur=states[ni],p=cur[i]&127,pose=b.poses[p];for(const ex of pose.exits[0])if(count>=(ex.gate.frozen??0)){const n=cur.slice();n[i]=NONE;settle(c,n);visit(n,0);}if(ni)visit(cur,1);
  const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlap(b.poses[to].mask,occ))continue;const n=cur.slice();n[i]=to;settle(c,n);const k=key(n);if(!seen.has(k)){seen.add(k);states.push(n);}}
 }}
}
function fixture(index){
 const l={id:166,name:'qualification',width:2,height:3,playable:rect(0,0,2,3),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',timeSeconds:100,reward:0,parMoves:20,blocks:[],gates:[{id:'red',color:'red',side:'top',offset:index%2,size:1},{id:'blue',color:'blue',side:'left',offset:0,size:3,frozen:1},{id:'green',color:'green',side:'right',offset:0,size:3,frozen:index%3+1}],shutters:[]};
 if(index<6){l.shutters=[{id:'c',x:0,y:2,width:2,height:1,count:2},{id:'lift',x:0,y:2,width:2,height:1,count:1,skin:'lift'}];l.blocks=[{id:'o0',x:0,y:0,color:index%2?'blue':'green',shape:shapes[1]},{id:'o1',x:1,y:0,color:'red',shape:shapes[1]},{id:'o2',x:0,y:1,color:'red',shape:shapes[1]},{id:'o3',x:1,y:1,color:'blue',shape:shapes[1]},{id:'h0',x:0,y:2,color:'red',shape:shapes[1],shutterId:'c',frozen:index%2+1},{id:'h1',x:1,y:2,color:'blue',shape:shapes[1],shutterId:'c'},{id:'l0',x:0,y:2,color:'green',shape:shapes[1],shutterId:'lift'},{id:'l1',x:1,y:2,color:'blue',shape:shapes[1],shutterId:'lift'}];}
 else{l.shutters=[{id:'liftA',x:0,y:1,width:2,height:1,count:1,skin:'lift'},{id:'liftB',x:0,y:2,width:2,height:1,count:1,skin:'lift'}];l.blocks=[{id:'o0',x:0,y:0,color:'blue',shape:shapes[1]},{id:'o1',x:1,y:0,color:'red',shape:shapes[1]},{id:'o2',x:0,y:1,color:'red',shape:shapes[8]},{id:'o3',x:0,y:2,color:'blue',shape:shapes[8]},{id:'a0',x:0,y:1,color:'green',shape:shapes[8],shutterId:'liftA'},{id:'b0',x:0,y:2,color:index%2?'red':'blue',shape:shapes[8],shutterId:'liftB'}];l.gates[0].size=2;l.gates[0].offset=0;}
 if(index===8){l.gates=[{id:'red',color:'red',side:'top',offset:1,size:1,frozen:1},{id:'blue',color:'blue',side:'right',offset:1,size:2},{id:'green',color:'green',side:'left',offset:0,size:3,frozen:2}];l.shutters=[{id:'liftA',x:0,y:2,width:2,height:1,count:1,skin:'lift'}];l.blocks=[{id:'o0',x:0,y:0,color:'red',shape:shapes[2]},{id:'o1',x:1,y:0,color:'green',shape:shapes[1]},{id:'o2',x:1,y:1,color:'blue',shape:shapes[2]},{id:'o3',x:0,y:2,color:'green',shape:shapes[1]},{id:'a0',x:0,y:2,color:'blue',shape:shapes[8],shutterId:'liftA'}];}
 return l;
}
const results=[];
for(const index of(process.env.FIXTURE?process.env.FIXTURE.split(',').map(Number):[0,1,2,3,6,7,8])){
 const level=fixture(index),c=compile(project(level),api),states=[c.initial],seen=new Map([[key(c.initial),0]]),edges=[],reverse=[];let transitions=0;
 for(let at=0;at<states.length;at++){
  assert(states.length<70000,'Small graph budget exceeded');const state=states[at],fast=new Map(),slow=new Set();each(c,state,(s,cost)=>fast.set(cost+':'+key(s),{s,cost}));refEach(c,state,(s,cost)=>slow.add(cost+':'+key(s)));assert.deepEqual([...fast.keys()].sort(),[...slow].sort(),'Optimized pose flood omitted/added reference edge');const outgoing=[];
  for(const{ s,cost }of fast.values()){const sk=key(s);let to=seen.get(sk);if(to===undefined){to=states.length;states.push(s);seen.set(sk,to);}outgoing.push({to,cost});(reverse[to]??=[]).push({to:at,cost});transitions++;}edges.push(outgoing);
 }
 const distance=new Float64Array(states.length).fill(Infinity),todo=[];states.forEach((s,i)=>{if(cleared(c,s)===c.totalClears){distance[i]=0;todo.push(i);}});for(let q=0;q<todo.length;q++){const at=todo[q];for(const e of reverse[at]??[]){const v=distance[at]+e.cost;if(v<distance[e.to]){distance[e.to]=v;todo.push(e.to);}}}
 for(let i=0;i<states.length;i++){const norm=normalize(c,states[i]),target=seen.get(key(norm.s));assert.notEqual(target,undefined);assert.equal(distance[i],distance[target],'Greedy whole-clear normalization changed optimal remaining cost');}
 // Complete current-model state graph: each real held gesture may map to a
 // relaxed gesture followed by zero-cost whole-lift arrival transitions.
 const initial=new api.PuzzleModel(level);initial.startCountdown();const mapped=m=>{const snap=m.snapshot();return Uint16Array.from([...c.blocks.map(b=>{const a=snap.blocks.find(a=>a.id===b.id);return a?a.y*c.W+a.x:NONE;}),...c.covers.map(co=>snap.shutters.find(a=>a.id===co.id).revealed?(co.skin==='lift'?0:co.count):NONE)]);};
 const quotientDistance=new Map();states.forEach((s,i)=>{const k=graphKey(c,s);if(quotientDistance.has(k))assert.equal(quotientDistance.get(k),distance[i],'Identity quotient changed distance');else quotientDistance.set(k,distance[i]);});
 const models=[initial],modelSeen=new Set([key(mapped(initial))]);let modelMoves=0,modelExits=0;
 for(let mi=0;mi<models.length;mi++){
  assert(models.length<70000,'Small authoritative graph budget exceeded');const m=models[mi],s=mapped(m),from=seen.get(key(s));assert.notEqual(from,undefined);const closureByCost=[new Set(),new Set()];for(const e of edges[from]){
   const sub=[e.to],subseen=new Set([e.to]);for(let j=0;j<sub.length;j++){const si=sub[j];closureByCost[e.cost].add(key(states[si]));for(const ne of edges[si]){if(ne.cost!==0)continue;const changed=[];states[si].forEach((v,k)=>{if(v!==states[ne.to][k])changed.push(k);});if(changed.some(k=>k<c.N)||!changed.length)continue;if(!subseen.has(ne.to)){subseen.add(ne.to);sub.push(ne.to);}}}
  }
  const accept=(child,cost)=>{const k=key(mapped(child));assert(closureByCost[cost].has(k),'Actual gesture missing even after delayed arrival closure');if(!modelSeen.has(k)){modelSeen.add(k);models.push(child);}};
  for(const b of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(b.id)))continue;const poses=[{x:b.x,y:b.y,path:[]}],visited=new Set([key(mapped(m))]);for(let pi=0;pi<poses.length;pi++){
   const p=poses[pi],walk=()=>{const ch=m.clone();ch.beginAction();for(const xy of p.path)assert(ch.moveBlockStep(b.id,...xy));return ch;};
   if(p.path.length){const ch=walk();assert(ch.commitAction());accept(ch,1);modelMoves++;}
   for(const side of['top','right','bottom','left']){const ch=walk();if(ch.tryExit(b.id,side).ok){assert(ch.commitAction());accept(ch,0);modelExits++;}}
   const held=walk();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy;const ch=held.clone();if(ch.moveBlockStep(b.id,x,y)){const k=key(mapped(ch));if(visited.has(k))continue;visited.add(k);poses.push({x,y,path:[...p.path,[x,y]]});}}
  }}
 }
 const r={index,level,rawStates:states.length,rawEdges:transitions,rawMinimum:Number.isFinite(distance[0])?distance[0]:null,statesWithPositiveFiniteRemainingCost:[...distance].filter(v=>Number.isFinite(v)&&v>0).length,allRawStatesNormalizationCostEqual:true,identityQuotientDistanceEqual:true,authoritativeHoldVisitedKeyIncludesWholeWorld:true,poseFloodEdgeSetEqual:true,currentModelStates:models.length,currentModelMoves:modelMoves,currentModelExits:modelExits,allAuthoritativeEdgesEmbedded:true,exhausted:true};results.push(r);console.log(JSON.stringify({...r,level:undefined}));
}
assert.equal(digest(fs.readFileSync('tools/remake161-170/assist166/lift-floor.mjs')),solverStartHash,'Solver changed during qualification');
const files=['tools/remake161-170/assist166/lift-floor.mjs','tools/remake171-180/author178-180/qualify-lift.mjs','tools/remake111to120-spatial-floor-v147.mjs'],out=ROOT+'/optional-lift-qualification-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({passed:true,results,bindings:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))])),scope:'Six complete raw optional-lift graphs: reference fullworld and optimized pose floods agree; at every raw state greedy final-clear normal form has identical minimum remaining cost; complete current-model held gestures embed via one relaxed same-cost gesture followed only by whole-lift arrival transitions. No inventory deletion, no ice on lift cargo; countdown reveal/hidden ice retain their exact clear age.'},null,2),{flag:'wx'});console.log(out);

