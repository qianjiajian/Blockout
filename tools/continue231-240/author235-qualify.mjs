import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {ROOT,ruleGate,loadApi,audit,digest,replay} from './common.mjs';
import {fifoPayload,runNativeFifo,eachDelayed,normalizeDelayed,key} from './author235-native.mjs';
const NONE=65535;ruleGate();const{api}=await loadApi();
const origin=ROOT+'/author235/run-401-1792397302204/report.json',packet=JSON.parse(fs.readFileSync(origin)),{level,drags,row}=packet.accepted;
const{p,c}=fifoPayload(level,api,{floor:5,maxMilliseconds:6000,maxStates:300000});assert.equal(digest(p),row.lower.inputSha256);
const states=[c.initial],seen=new Set([key(c.initial)]);for(let i=0;i<states.length&&states.length<128;i++)eachDelayed(c,states[i],s=>{const k=key(s);if(!seen.has(k)){seen.add(k);states.push(s);}if(states.length>=128)return false;});const branchStates=states.length;
const model=new api.PuzzleModel(level);model.startCountdown();const runtimeStates=[],trace=[];
function capture(step){const snap=model.snapshot(),queued=new Set(snap.queuedBlocks.map(b=>b.id));
 const values=c.blocks.map(b=>{if(queued.has(b.id))return b.initial;const live=snap.blocks.find(x=>x.id===b.id);if(!live)return NONE;const[dx,dy]=b.graphOffset??[0,0];return(live.y+dy)*c.W+live.x+dx;});
 const covers=c.covers.map(co=>co.queue?(queued.has(c.blocks[co.members[0]].id)?NONE:0):(snap.shutters.find(s=>s.id===co.id).revealed?0:NONE));
 runtimeStates.push(Uint16Array.from([...values,...covers]));trace.push({step,cleared:snap.cleared,shutters:snap.shutters.map(s=>({id:s.id,revealed:s.revealed})),generators:snap.generators.map(g=>({id:g.id,head:g.head,remaining:g.remaining,nextBlockId:g.nextBlockId})),gates:snap.gates.map(g=>({id:g.id,frozen:g.frozen}))});
}
capture(0);for(let i=0;i<drags.length;i++){const d=drags[i];model.beginAction();for(const pos of d.path)assert(model.moveBlockStep(d.blockId,...pos));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());capture(i+1);}assert(model.snapshot().complete);states.push(...runtimeStates);
const canonical=s=>{const a=s.slice();for(const g of p.groups){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=v[j]);}return[...a].join(',');};
const native=runNativeFifo({...p,successorsOnly:true,states:states.map(s=>[...s])});let transitions=0;
for(let i=0;i<states.length;i++){const expected=new Set();eachDelayed(c,states[i],(raw,cost)=>expected.add(cost+':'+canonical(normalizeDelayed(c,raw))));assert.equal(native.rows[i].normalized,canonical(normalizeDelayed(c,states[i])),'normalize '+i);assert.deepEqual(new Set(native.rows[i].successors),expected,'successors '+i);transitions+=expected.size;}
const rr=replay(level,drags,api,{complete:true,requirePointerCompatible:true}),stat=audit(level,api);
const previous='deliverables/continue211-220-20260930/design-new/fifo214-qualification-v4.json',prior=JSON.parse(fs.readFileSync(previous));assert.equal(prior.status,'PASS');
const files=['tools/continue231-240/author235-native.mjs','tools/regeneration211-design/native-fifo214.cs','tools/regeneration211-design/fifo-witness214.mjs','tools/continuation211-optional-lift-domain.mjs'];const fileSha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const file of files.slice(1))assert.equal(fileSha(file),prior.codeSha256[file],'Frozen full-graph qualification code drift '+file);
const result={passed:true,levelSha256:digest(level),L:5,U:rr.nonClearingDrags,totalDrags:rr.effectiveDrags,branchStates,routeStates:runtimeStates.length,states:states.length,transitions,native,lower:row.lower,static:stat,replay:rr,mechanismTrace:trace,priorFullGraphQualification:{file:previous,sha256:fileSha(previous),completeGraphs:32,thresholds:160,codeMatches:true},method:prior.theorem,codeSha256:Object.fromEntries(files.map(f=>[f,fileSha(f)])),pointerValidated:false,naturalClockValidated:false,formalAccepted:false};
const out=ROOT+'/author235/final';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/candidate.json',JSON.stringify(level,null,2));fs.writeFileSync(out+'/route.json',JSON.stringify({drags,L:5,U:result.U,totalDrags:result.totalDrags,levelSha256:digest(level)},null,2));fs.writeFileSync(out+'/qualification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({out,L:5,U:result.U,totalDrags:result.totalDrags,states:states.length,transitions,levelSha256:digest(level)}));
