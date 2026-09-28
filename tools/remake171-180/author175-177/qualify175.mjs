import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {api,project,save,OUT,digest} from './common.mjs';
import {compile,each,normalize,canonical,stateText,payload,SOURCE} from '../../campaign-v145/lv141-150/round2-c/native96.mjs';
import {stateOf,checkAxisFloor} from '../../remake131to140-axis-floor-v172.mjs';
const candidate=process.argv[2]??'deliverables/remake171-180-20260927/assist175/candidate175-1790524719836.json',d=JSON.parse(fs.readFileSync(candidate)),l=d.level;
const sourceHash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native96-'+sourceHash.slice(0,16)+'.exe');
if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
function native(level,options){const p=payload(project(level),api,options),f=save('native96-input',p),o=f.replace('input','output');execFileSync(exe,[path.resolve(f),path.resolve(o)],{windowsHide:true,stdio:'pipe',timeout:options.maxMilliseconds+10000});return{...JSON.parse(fs.readFileSync(o)),input:f,output:o,sourceHash,exeHash:digest(fs.readFileSync(exe)),inputSha256:digest(fs.readFileSync(f))};}
const key=s=>String.fromCharCode(...s),base={id:175,name:'fresh finite shell countdown qualifier',difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',timeSeconds:180,reward:20,parMoves:50};
const fixtures=[];
for(const high of[false,true])for(const hiddenShell of[false,true]){
 const y=high?8:0,level={...base,width:high?8:3,height:high?10:2,playable:Array.from({length:6},(_,i)=>[i%3,y+Math.floor(i/3)]),gates:[{id:'r',color:'red',side:'left',offset:y,size:2},{id:'b',color:'blue',side:'bottom',offset:1,size:2,frozen:1}],blocks:[{id:'s',color:'red',layers:['red','blue'],shape:[[0,0]],x:0,y},{id:'b0',color:'blue',shape:[[0,0]],x:1,y},{id:'h',color:'red',...(hiddenShell?{layers:['red','blue']}:{frozen:1}),shape:[[0,0]],x:2,y:y+1,shutterId:'c'}],shutters:[{id:'c',x:2,y:y+1,width:1,height:1,count:2}]};
 const c=compile(project(level),api),states=[c.initial],seen=new Set([key(c.initial)]);let edges=0;
 for(let i=0;i<states.length;i++){assert(states.length<20000);each(c,states[i],(bi,v)=>{edges++;const s=states[i].slice();s[bi]=v;const k=key(s);if(!seen.has(k)){seen.add(k);states.push(s);}});}
 const n=native(level,{successorsOnly:true,states,maxMilliseconds:10000});
 for(let i=0;i<states.length;i++){const expected=new Set();each(c,states[i],(bi,v,cost)=>{const s=states[i].slice();s[bi]=v;expected.add(cost+':'+stateText(canonical(c,normalize(c,s).s)));});assert.deepEqual([...n.rows[i].successors].sort(),[...expected].sort());assert.equal(n.rows[i].normalized,stateText(normalize(c,states[i]).s));}
 fixtures.push({level,high,hiddenShell,states:states.length,rawEdges:edges,allNativeSuccessorsAndNormalizationEqualJS:true,input:n.input,output:n.output});
}
const c=compile(project(l),api),model=new api.PuzzleModel(l);model.startCountdown();assert.deepEqual(stateOf(c,model.snapshot()),c.initial);const actualStates=[],rows=[];let moves=0,exits=0,heldPoses=0;
for(let step=0;step<=d.drags.length;step++){
 const s=stateOf(c,model.snapshot()),fast=new Set();each(c,s,(i,v,cost)=>{const n=s.slice();n[i]=v;fast.add(cost+':'+key(n));});actualStates.push(s);
 for(const b of model.snapshot().blocks){if(!model.isBlockActive(model.getBlock(b.id)))continue;const queue=[{p:[b.x,b.y],path:[]}],seen=new Set([queue[0].p.join(',')]);for(let at=0;at<queue.length;at++){const q=queue[at],walk=()=>{const m=model.clone();m.beginAction();for(const p of q.path)assert(m.moveBlockStep(b.id,...p));return m;},held=walk();heldPoses++;
  if(q.path.length){const m=walk();assert(m.commitAction());assert(fast.has('1:'+key(stateOf(c,m.snapshot()))));moves++;}
  for(const side of['top','right','bottom','left']){const m=walk();if(m.tryExit(b.id,side).ok){assert(m.commitAction());assert(fast.has('0:'+key(stateOf(c,m.snapshot()))));exits++;}}
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q.p[0]+dx,q.p[1]+dy],k=p.join(',');if(seen.has(k))continue;const m=held.clone();if(!m.moveBlockStep(b.id,...p))continue;seen.add(k);queue.push({p,path:[...q.path,p]});}
 }}
 rows.push({step,cleared:model.snapshot().cleared,relaxedEdges:fast.size});if(step===d.drags.length)break;const r=d.drags[step];model.beginAction();for(const p of r.path)assert(model.moveBlockStep(r.blockId,...p));if(r.exitSide)assert(model.tryExit(r.blockId,r.exitSide).ok);assert(model.commitAction());
}
assert(model.snapshot().complete);
const currentNative=native(l,{successorsOnly:true,states:actualStates,maxMilliseconds:10000});
for(let i=0;i<actualStates.length;i++){const expected=new Set();each(c,actualStates[i],(bi,v,cost)=>{const s=actualStates[i].slice();s[bi]=v;expected.add(cost+':'+stateText(canonical(c,normalize(c,s).s)));});assert.deepEqual([...currentNative.rows[i].successors].sort(),[...expected].sort());assert.equal(currentNative.rows[i].normalized,stateText(normalize(c,actualStates[i]).s));}
const nativeProof=native(l,{floor:16,maxMilliseconds:5000,maxStates:50000});assert(nativeProof.thresholdProven);
const independentJS=checkAxisFloor(project(l),api,{floor:16,maxMilliseconds:15000,maxStates:50000});
const result={passed:true,ruleVersion:'1.106.0',candidate,levelSha256:digest(l),fixtures,currentRoute:{snapshots:actualStates.length,moves,exits,heldPoses,rows,actualEdgesEmbedInRelaxedGraph:true,nativeAllSuccessorsAndNormalizationMatch:true,native:currentNative},nativeProof,independentJS,justification:'All21 source bodies, five two-stage shells, countdown10 and frozen gates retained. No lifts/generators/flips/keys/stars/axes/timers/grids. Every actual held gesture maps to a relaxed move of equal cost; optional exit contact and omitted offboard sweep add edges. Full-body removals only free occupancy/weaken gates and countdown, whose reveal replaces a full obstacle by a subset; greedy full removals commute without added cost. Shell peels are never greedily normalized. Group signatures retain shape/layers/ice/reveal/cover/axis. Profile1.5 to1.4 has identical semantics without flips. Four complete raw small graphs cover opening/hidden shells, countdown reveal, numeric ice, and masks above bit63; all native successors and normalizations equal JS. Current full route all actual held gesture edges and native/JS transitions are freshly checked.',bindings:Object.fromEntries([SOURCE,'tools/campaign-v145/lv141-150/round2-c/native96.mjs','tools/remake131to140-axis-floor-v172.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs','src/core/PuzzleModel.ts'].map(p=>[p,digest(fs.readFileSync(p))]))};
console.log(JSON.stringify({file:save('qualified175',result),fixtures:fixtures.map(f=>({states:f.states,edges:f.rawEdges})),currentRoute:{snapshots:actualStates.length,moves,exits,heldPoses},nativeStates:nativeProof.discoveredStates,independentJS:{status:independentJS.status,states:independentJS.states,ms:independentJS.ms}}));
