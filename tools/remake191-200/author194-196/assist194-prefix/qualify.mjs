import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from '../../replay.mjs';
import {digest,ruleGate,writeNew} from '../../common.mjs';
import {payload,native} from '../floor-countdown.mjs';
import {each,clearCount} from '../../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
import {normalize} from '../../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';

ruleGate();
const file=process.argv[2]??'deliverables/remake191-200-20260927/author197-199/assist194/candidate194-1790526106520-27432.json';
const d=JSON.parse(fs.readFileSync(file)),l=d.level,goal=10,{api}=await loadApi();
assert.equal(l.id,194);assert.equal(l.blocks.length,31);assert.equal(l.generators.length,1);
const gen=l.generators[0];assert.equal(gen.queueBlockIds.length,1);const queued=new Set(gen.queueBlockIds),q=l.blocks.find(b=>b.id===gen.queueBlockIds[0]);
assert(q);assert.equal(q.color,'orange');assert.equal(q.shape.length,4);assert.deepEqual(q.shape,[[0,0],[1,0],[0,1],[1,1]]);
for(const k of ['layers','frozen','keyId','lockedBy','timedBombSeconds','movementAxis','shutterId'])assert.equal(q[k],undefined);
const blocker=l.shutters.find(c=>c.count>=goal&&q.shape.every(([x,y])=>gen.spawn[0]+x>=c.x&&gen.spawn[0]+x<c.x+c.width&&gen.spawn[1]+y>=c.y&&gen.spawn[1]+y<c.y+c.height));assert(blocker);
assert.equal(blocker.id,'c10');assert.equal(blocker.count,10);
const projected=structuredClone(l);projected.blocks=projected.blocks.filter(b=>!queued.has(b.id));delete projected.generators;projected.mechanismRules='revised-2026-09-23-v1.4';
const {c,p}=payload(projected,{floor:11,maxMilliseconds:2000,maxStates:1000});p.goalClears=goal;
const selectedProof=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3])).prefix:d.proof;
const used=JSON.parse(fs.readFileSync(selectedProof.input));assert.equal(used.goalClears,goal);assert.equal(used.initial.length,30);
assert.deepEqual(used.initial,p.initial);assert.deepEqual(used.blocks,p.blocks);assert.deepEqual(used.covers,p.covers);p.groups=used.groups;
for(const g of p.groups){const signature=i=>JSON.stringify({shape:c.blocks[i].shape,layers:c.blocks[i].layers,ice:c.blocks[i].ice,reveal:c.blocks[i].reveal,axis:c.blocks[i].movementAxis});assert(g.every(i=>signature(i)===signature(g[0])));}
const key=s=>String.fromCharCode(...s),text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b.toString('base64');};
const canon=s=>{s=s.slice();for(const g of p.groups){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=v[j]);}return s;};
const states=[c.initial],seen=new Set([key(c.initial)]),stateOf=m=>Uint16Array.from(c.blocks.map(b=>{const a=m.getBlock(b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):511;}));
for(let i=0;i<states.length&&states.length<32;i++)each(c,states[i],(bi,v)=>{const s=states[i].slice();s[bi]=v;const k=key(s);if(!seen.has(k)){states.push(s);seen.add(k);}if(states.length>=32)return false;});
const actual=new api.PuzzleModel(l),copy=new api.PuzzleModel(projected);actual.startCountdown();copy.startCountdown();
let closures=0,modelEdges=0,goalStep=null;const timeline=[];
for(let step=0;step<=d.drags.length;step++){
 const a=actual.snapshot(),b=copy.snapshot(),s=stateOf(actual);assert.deepEqual(a.blocks.filter(b=>!queued.has(b.id)),b.blocks);assert.deepEqual(a.gates,b.gates);assert.deepEqual(a.shutters,b.shutters);assert.equal(a.cleared,b.cleared);
 if(!seen.has(key(s))){states.push(s);seen.add(key(s));}
 timeline.push({step,cleared:a.cleared,queueActive:Boolean(actual.getBlock(q.id)),generator:a.generators,shutters:a.shutters.map(x=>({id:x.id,count:x.count,revealed:x.revealed}))});
 if(a.cleared>=goal){assert.equal(a.cleared,goal);goalStep=step;break;}
 assert(!actual.getBlock(q.id),'FIFO body cannot be active before goal');assert(!a.shutters.find(x=>x.id===blocker.id).revealed);
 const edges=new Set();each(c,s,(i,v,k)=>edges.add(i+':'+v+':'+k));
 for(let i=0;i<c.blocks.length;i++){
  const body=actual.getBlock(c.blocks[i].id);if(!body||!actual.isBlockActive(body))continue;closures++;
  const stage=s[i]>>>7,poses=[[body.x,body.y]],visited=new Set([body.x+','+body.y]);
  for(let j=0;j<poses.length;j++){
   const [x,y]=poses[j],probe=actual.clone(),moving=probe.getBlock(body.id);moving.x=x;moving.y=y;const pos=y*c.W+x;
   if(pos!==(s[i]&127)){assert(edges.has(i+':'+(pos|(stage<<7))+':1'));modelEdges++;}
   for(const side of ['top','right','bottom','left'])if(probe.exitAttemptStatus(body.id,side)==='ok'){const v=stage+1<c.blocks[i].layers.length?pos|((stage+1)<<7):511;assert(edges.has(i+':'+v+':0'));modelEdges++;}
   for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(!visited.has(k)&&probe.canPlace(moving,xx,yy)){visited.add(k);poses.push([xx,yy]);}}
  }
 }
 const drag=d.drags[step];assert(drag);
 for(const m of [actual,copy]){m.beginAction();for(const xy of drag.path)assert(m.moveBlockStep(drag.blockId,...xy));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());}
}
assert(goalStep!==null);
const result=native({...p,successorsOnly:true,states:states.map(s=>[...s])});let checkedTransitions=0;
for(let i=0;i<states.length;i++){
 const s=states[i],expected=new Set();if(clearCount(c,s)<goal)each(c,s,(bi,v,cost)=>{const next=s.slice();next[bi]=v;expected.add(cost+':'+text(canon(normalize(c,next,goal).s)));});
 const normalized=normalize(c,s,goal).s;assert.deepEqual([...result.rows[i].successors].sort(),[...expected].sort());assert.equal(result.rows[i].normalized,text(normalized));assert.equal(result.rows[i].canonical,text(canon(normalized)));checkedTransitions+=expected.size;
}
const report={status:'PREFIX10_PROJECTION_QUALIFICATION_PASS_NOT_L11',candidate:file,levelSha256:digest(l),goalClears:goal,goalStep,queueId:q.id,blocker,projectionSha256:digest(projected),actualPrefixStates:timeline,actualModelInclusion:{closures,modelEdges},nativeQualification:{states:states.length,checkedTransitions,result},fullReplay:replay(l,d.drags,api,{complete:true,requirePointerCompatible:true}),argument:'Until strictly before clear10, the complete fixed spawn footprint is inside the unrevealed physical c10 cover. Queue body cannot enter; no moving body can vacate that cover. Removing sole undeployed queue and its inert generator changes no pregoal occupancy/counter/key state. Both models stop immediately when the tenth clear/peel event occurs, so no postreveal move, peel, spawn or queue credit is used. Every earlier c5/c7 reveal retains complete staged inventory; a revealed fully filled layer replaces its previously fully blocked cover. Optional contact/omitted exit sweep only add gestures; final body removal frees cells or opens counters, while shell peels remain independent. Reordered identities have identical shape/layers/ice/reveal count and no key/axis asymmetry. Cross-check qualifies the projection/model; the bound itself is the separately attached same-level selectedProof, and a prefix floor alone is not automatically L11.',newFloorSearch:false,selectedProof,sourceCodeHashes:Object.fromEntries(['tools/remake191-200/author194-196/assist194-prefix/qualify.mjs','tools/remake191-200/author194-196/floor-countdown.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs'].map(f=>[f,digest(fs.readFileSync(f))])),formalAdopted:false};
const out='deliverables/remake191-200-20260927/author194-196/assist194-prefix/qualification-'+Date.now()+'.json';writeNew(out,report);console.log(out);
