import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{ROOT,ruleGate,loadApi,digest,writeNew}from'./common.mjs';
import*as original from'../regeneration211-design/fifo-witness214.mjs';
import*as fast from'./author232-fast-route.mjs';
ruleGate();const{api}=await loadApi(),files=[`${ROOT}/author232/six-preview-3001.json`,`${ROOT}/author232/run-4701-1792401060632/candidate-4788.json`,`${ROOT}/author232/run-1701-1792399975605/candidate-1702.json`],results=[];
for(const file of files){
 const packet=JSON.parse(fs.readFileSync(file)),level=structuredClone(packet.level);level.mechanismRules='revised-2026-09-23-v1.4';const c=original.compileSpatial(level,api),d=fast.compileSpatial(structuredClone(level),api),states=[],seen=new Set();
 const push=s=>{const k=original.key(s);if(!seen.has(k)){seen.add(k);states.push(s.slice());}};push(c.initial);
 for(let head=0;head<states.length&&states.length<125;head++)original.eachReference(c,states[head],s=>{push(s);push(original.normalizeClears(c,s,{optionalExit:false}).s);return states.length<125;},{optionalExit:false});
 if(packet.row?.route?.drags){const model=new api.PuzzleModel(level),ages=c.covers.map(()=>original.NONE);model.startCountdown();const record=()=>{const snap=model.snapshot();for(let j=0;j<c.covers.length;j++)if(snap.shutters[j].revealed&&ages[j]===original.NONE)ages[j]=snap.cleared;};
  for(const drag of packet.row.route.drags){model.beginAction();for(const p of drag.path){assert(model.moveBlockStep(drag.blockId,...p));record();}if(drag.exitSide){assert(model.tryExit(drag.blockId,drag.exitSide).ok);record();}assert(model.commitAction());const snap=model.snapshot(),s=Uint16Array.from([...level.blocks.map(b=>{const p=snap.blocks.find(x=>x.id===b.id);return p?p.y*c.W+p.x:original.NONE;}),...ages]);original.assertStateMatches(c,s,snap);push(s);}
 }
 let comparisons=0,successors=0,prefixStates=0,elevenTransitions=0;
 for(const s of states){if(original.cleared(c,s)<11&&c.covers.every(co=>s[co.stateIndex]===original.NONE))prefixStates++;
  for(const optionalExit of[false,true])for(const clearOnly of[false,true]){
   const opts={optionalExit,clearOnly,orderSeed:comparisons%c.N},a=new Set(),b=new Set(),serialize=(n,cost,get)=>JSON.stringify({cost,state:[...n],drag:get()});
   original.eachReference(c,s,(n,cost,get)=>{a.add(serialize(n,cost,get));if(original.cleared(c,s)===10&&original.cleared(c,n)===11)elevenTransitions++;},opts);
   fast.each(d,s,(n,cost,get)=>b.add(serialize(n,cost,get)),opts);assert.deepEqual([...b].sort(),[...a].sort(),`successors ${file} state ${comparisons}`);comparisons++;successors+=a.size;
  }
 }
 results.push({file,levelSha256:digest(packet.level),states:states.length,prefixStates,comparisons,successors,tenToElevenTransitions:elevenTransitions,fullWorldSuccessorsAndDragPathsEqual:true});
}
const code=['tools/regeneration211-design/fifo-witness214.mjs','tools/continue231-240/author232-fast-route.mjs','tools/continue231-240/author232-prefix-fast-route-qualify.mjs'],out=`${ROOT}/author232/prefix-fast-route-qualification-${Date.now()}.json`;
writeNew(out,{status:'PASS_WITNESS_SUCCESSORS',witnessOnly:true,lowerProofQualification:false,results,reasoning:'While both curtain11 regions are solid and each coincident lift remains hidden, a held body cannot vacate the solid masks and trigger a lift, and moving does not change clear count. Thus the whole world remains static throughout a held motion. Exit events still call the original settle function, including count10 to11 transitions; after the guard ceases to hold the dispatcher restores the original reference closure.',rawSha256:Object.fromEntries([...files,...code].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))});console.log(JSON.stringify({out,status:'PASS',states:results.reduce((n,r)=>n+r.states,0),comparisons:results.reduce((n,r)=>n+r.comparisons,0),successors:results.reduce((n,r)=>n+r.successors,0),tenToElevenTransitions:results.reduce((n,r)=>n+r.tenToElevenTransitions,0)}));
