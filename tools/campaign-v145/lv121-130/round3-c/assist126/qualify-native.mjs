import fs from'node:fs';
import assert from'node:assert/strict';
import{loadIsolatedApi}from'../isolated-api.mjs';
import{runNative126,payload,OUT}from'./native-floor.mjs';
import{compileLevel,forEachGesture,stateFromSnapshot}from'../../../../remake21to30-mask-floor.mjs';
import{normalizeMonotoneClears,canonicalStateKey,equivalentBlockGroups,checkSymmetryFloor}from'../../../../remake21to30-symmetry-floor-v139.mjs';
import{digest}from'../../../../revised-preview-validation-v160.mjs';
const api=await loadIsolatedApi(),files=process.argv.slice(2),reports=[];
const b64=s=>Buffer.from(s).toString('base64');
for(const file of files){
 const raw=JSON.parse(fs.readFileSync(file)),d=raw.candidate??raw,l=d.level,drags=d.drags??d.search.drags,replay=api.replayRevisedRoute(l,drags);assert(replay.valid&&replay.complete);
 const c=compileLevel(l),groups=equivalentBlockGroups(c),m=new api.PuzzleModel(l),sample=[Array.from(c.initial)];m.startCountdown();
 for(const drag of drags){m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());sample.push(Array.from(stateFromSnapshot(c,m.snapshot())));}
 const native=runNative126(l,api,{successorsOnly:true,states:sample,maxMilliseconds:10000}),rows=[];
 for(let i=0;i<sample.length;i++){const state=Uint8Array.from(sample[i]),normalized=normalizeMonotoneClears(c,state).state,edges=new Set();forEachGesture(c,state,(j,v,cost)=>{const next=state.slice();next[j]=v;const end=normalizeMonotoneClears(c,next).state;edges.add(cost+':'+b64(Uint8Array.from([...canonicalStateKey(end,groups)].map(x=>x.charCodeAt(0)))));});
  assert.equal(native.rows[i].normalized,b64(normalized));assert.equal(native.rows[i].canonical,b64(Uint8Array.from([...canonicalStateKey(normalized,groups)].map(x=>x.charCodeAt(0)))));assert.deepEqual([...native.rows[i].successors].sort(),[...edges].sort());rows.push({step:i,successors:edges.size});
 }
 const mutations=[['foreign-id',x=>x.id=127],['missing-shell',x=>delete x.blocks.find(b=>b.layers).layers],['changed-ice',x=>x.blocks.find(b=>b.frozen).frozen=4],['changed-cover',x=>x.shutters[0].count=11],['changed-gate',x=>x.gates.find(g=>g.color==='blue').frozen=4],['generator',x=>x.generators=[{id:'bad',side:'top',offset:0,spawn:[0,0],queueBlockIds:[x.blocks[0].id]}]],['axis',x=>x.blocks[0].movementAxis='horizontal'],['key',x=>x.blocks[0].keyId='bad'],['bomb',x=>x.blocks[0].timedBombSeconds=10],['star',x=>x.blocks[0].star=true],['lift',x=>x.shutters[0].skin='lift']];
 const negative=mutations.map(([label,mutate])=>{const x=structuredClone(l);mutate(x);let reason;try{payload(x,api);}catch(e){reason=e.message;}assert(reason,label);return{label,rejected:true,reason};});
 const tinyNative=runNative126(l,api,{floor:3,maxStates:100000,maxMilliseconds:4000}),tinyJS=checkSymmetryFloor(l,{floor:3,maxStates:100000,maxMilliseconds:4000});assert.equal(tinyNative.status,tinyJS.status);assert.equal(tinyNative.thresholdProven,tinyJS.thresholdProven);assert.equal(tinyNative.relaxedNonClearingDrags??null,tinyJS.relaxedNonClearingDrags??null);
 reports.push({file,levelSha256:digest(l),routeSha256:digest(drags),routeReplay:replay,rows,negative,nativeBindings:{sourceHash:native.sourceHash,exeHash:native.exeHash,input:native.input,inputSha256:native.inputSha256,output:native.output},tinyNative,tinyJS});
 console.log(JSON.stringify({file,states:sample.length,successors:rows.reduce((n,r)=>n+r.successors,0),negative:negative.length,status:tinyNative.status}));
}
const out=`${OUT}/qualification-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({passed:true,reports},null,2)+'\n');console.log(JSON.stringify({qualification:out}));
