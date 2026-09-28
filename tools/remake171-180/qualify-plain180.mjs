import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,replay} from './replay.mjs';
import {ROOT,digest,writeNew,ruleGate} from './common.mjs';
import {compile,stateOf,each,key,checkAxisFloor} from '../remake131to140-axis-floor-v172.mjs';
import {plainTerminalFloor} from './plain-terminal-floor.mjs';
ruleGate();const {api}=await loadApi(),file=ROOT+'/author178-180/native180-1790523293350.json',d=JSON.parse(fs.readFileSync(file)),p=structuredClone(d.level);p.mechanismRules='revised-2026-09-23-v1.4';const c=compile(p,api);
const m=new api.PuzzleModel(d.level);m.startCountdown();let states=0,moves=0,exits=0;
const verify=()=>{const s=stateOf(c,m.snapshot()),successors=new Set();each(c,s,(i,v,cost)=>{const n=s.slice();n[i]=v;successors.add(cost+':'+key(n));});states++;
 for(const b of m.snapshot().blocks){for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=m.clone();n.beginAction();if(n.moveBlockStep(b.id,b.x+dx,b.y+dy)){moves++;assert(successors.has('1:'+key(stateOf(c,n.snapshot()))),'Real unit move included');}}
 for(const side of ['left','right','top','bottom']){const n=m.clone();n.beginAction();if(n.tryExit(b.id,side).ok){exits++;assert(successors.has('0:'+key(stateOf(c,n.snapshot()))),'Real full exit included');}}}
};
for(const drag of d.drags){verify();m.beginAction();for(const at of drag.path)assert(m.moveBlockStep(drag.blockId,...at));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());}assert(m.snapshot().complete);
const fixtures=[];
for(let n=0;n<6;n++){
 const level={id:180,name:'plain qualification',width:3,height:3,mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',timeSeconds:120,reward:0,parMoves:10,
 blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:2,y:0,color:'blue',shape:[[0,0],[0,1]]},{id:'c',x:0,y:1,color:'blue',shape:[[0,0]]},{id:'d',x:1,y:1,color:'red',shape:[[0,0]]}],
 gates:[{id:'red',side:'bottom',offset:0,size:3,color:'red',...(n%3?{frozen:n%3}:{})},{id:'blue',side:'left',offset:0,size:3,color:'blue',...(n>=3?{frozen:1}:{})}]};
 for(const floor of [1,2,3,4]){const ref=checkAxisFloor(level,api,{floor,maxStates:10000,maxMilliseconds:3000}),fresh=plainTerminalFloor(level,api,{floor,maxStates:10000,maxMilliseconds:3000});assert(!['unknown','unsupported'].includes(ref.status));assert.equal(fresh.thresholdProven,ref.thresholdProven);assert.equal(fresh.status,ref.status);if(!ref.thresholdProven)assert.equal(fresh.cost,ref.cost);fixtures.push({n,floor,reference:ref,pruned:fresh});}
}
const out=ROOT+'/plain180-qualification-'+Date.now()+'.json';writeNew(out,{passed:true,levelSha256:digest(d.level),routeSha256:digest(d.drags),realModelPrefixStates:states,allLegalUnitMoves:moves,allLegalCompleteExits:exits,fixtures,scope:'Fresh plain180 route-state edge inclusion and24 pruned/unpruned small-floor comparisons; mathematical final-depth pruning restricted to nonlayered plain bodies after all zero-cost clears. Not all-state deadlock proof.',bindings:Object.fromEntries(['tools/remake171-180/plain-terminal-floor.mjs','tools/remake171-180/qualify-plain180.mjs','tools/remake131to140-axis-floor-v172.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'].map(f=>[f,digest(fs.readFileSync(f))]))});console.log(JSON.stringify({out,states,moves,exits,comparisons:fixtures.length}));
