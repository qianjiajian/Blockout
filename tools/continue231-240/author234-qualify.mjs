import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {ROOT,ruleGate,loadApi,audit,digest,replay} from './common.mjs';
import {compileSpatial,each,key,NONE} from '../continuation211-optional-lift-domain.mjs';
import {normalizeFast} from '../continuation211-fast-normalize.mjs';
import {liftPayload,runNativeLift} from './author234-native.mjs';
ruleGate();const{api}=await loadApi();
const source=ROOT+'/author234/shape-preserved-1792396149371/report.json';
const packet=JSON.parse(fs.readFileSync(source)),{level,drags,row}=packet.accepted;
const{p,c}=liftPayload(level,api,{floor:16,maxMilliseconds:10000,maxStates:500000});
assert.equal(digest(p),row.lower.inputSha256,'Final level payload exactly matches actual lower proof input');
const states=[c.initial],seen=new Set([key(c.initial)]);
for(let i=0;i<states.length&&states.length<96;i++)each(c,states[i],s=>{const sk=key(s);if(!seen.has(sk)){seen.add(sk);states.push(s);}if(states.length>=96)return false;});
const branchStates=states.length,model=new api.PuzzleModel(level);model.startCountdown();
const runtimeStates=[];
function capture(){const snap=model.snapshot();return Uint16Array.from([...level.blocks.map(b=>{const a=snap.blocks.find(a=>a.id===b.id);return a?(a.y*level.width+a.x)|(((b.layers?.length??1)-a.layers.length)<<7):NONE;}),...c.covers.map(co=>{const a=snap.shutters.find(a=>a.id===co.id);return a.revealed?snap.cleared-(co.members.length?Math.max(0,c.blocks[co.members[0]].ice-(snap.blocks.find(b=>b.id===c.blocks[co.members[0]].id)?.frozen??0)):0):NONE;})]);}
// Exact reveal counts cannot be reconstructed from a removed member. Capture
// first visibility directly during the complete authoritative route instead.
const reveals=new Map(c.covers.filter(co=>c.initial[co.stateIndex]!==NONE).map(co=>[co.id,c.initial[co.stateIndex]]));
function state(){const snap=model.snapshot();for(const co of c.covers)if(snap.shutters.find(s=>s.id===co.id).revealed&&!reveals.has(co.id))reveals.set(co.id,snap.cleared);return Uint16Array.from([...level.blocks.map(b=>{const a=snap.blocks.find(a=>a.id===b.id);return a?(a.y*level.width+a.x)|(((b.layers?.length??1)-a.layers.length)<<7):NONE;}),...c.covers.map(co=>reveals.get(co.id)??NONE)]);}
runtimeStates.push(state());
for(const d of drags){model.beginAction();for(const pos of d.path){assert(model.moveBlockStep(d.blockId,...pos));state();}if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());runtimeStates.push(state());}
assert(model.snapshot().complete);states.push(...runtimeStates);
const canonical=s=>{const a=s.slice();for(const g of p.groups){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=v[j]);}return[...a].join(',');};
const native=runNativeLift({...p,successorsOnly:true,states:states.map(s=>[...s])});let transitions=0;
for(let i=0;i<states.length;i++){
 const expected=new Set();each(c,states[i],(raw,cost)=>expected.add(cost+':'+canonical(normalizeFast(c,raw).s)));
 assert.equal(native.rows[i].normalized,canonical(normalizeFast(c,states[i]).s),'normalized '+i);
 assert.deepEqual(new Set(native.rows[i].successors),expected,'successors '+i);transitions+=expected.size;
}
const replayResult=replay(level,drags,api,{complete:true,requirePointerCompatible:true}),stat=audit(level,api);
const codeFiles=['tools/continue231-240/author234-native.mjs','tools/continuation211-native-lift.cs','tools/continuation211-optional-lift-domain.mjs','tools/continuation211-fast-normalize.mjs','tools/continuation211-colored-witness.mjs'];
const result={passed:true,levelSha256:digest(level),branchStates,routeStates:runtimeStates.length,states:states.length,transitions,native,replay:replayResult,static:stat,lower:row.lower,L:16,U:replayResult.nonClearingDrags,totalDrags:replayResult.effectiveDrags,method:'All normalized successor/cost sets of 96 opening relaxed-graph branches and every strict original-route state independently match the existing optional-lift C# solver. Ordinary cover counts, full 19-body inventory, hidden ice reveal-age, actual gate geometry and all layer areas retained. Optional lift activation and optional exit contact only add legal choices; original route is separately strict.',codeSha256:Object.fromEntries(codeFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),pointerValidated:false,naturalClockValidated:false,formalAccepted:false};
const out=ROOT+'/author234/final';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/qualification.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/candidate.json',JSON.stringify(level,null,2));fs.writeFileSync(out+'/route.json',JSON.stringify({drags,L:16,U:result.U,totalDrags:result.totalDrags,levelSha256:digest(level)},null,2));
console.log(JSON.stringify({out,passed:true,L:16,U:result.U,totalDrags:result.totalDrags,states:states.length,transitions,levelSha256:digest(level)}));
