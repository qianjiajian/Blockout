import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,digest,replay,writeNew} from './common.mjs';
import {compileSpatial,each,key,NONE} from '../continuation211-optional-lift-domain.mjs';
import {normalizeFast} from '../continuation211-fast-normalize.mjs';
import {liftPayload,runNativeLift} from './author233-native.mjs';
ruleGate();const {api,inputs}=await loadApi();
const source=ROOT+'/author233/run-3000-1792396957780/report.json',packet=JSON.parse(fs.readFileSync(source)),{level,drags,row}=packet.accepted;
level.mechanismAdaptation.change+='；最终换形将红SQ2改q0红T4，补满绿/蓝H3各改V3，同体数同面积，重排后重新求证。';
const {p,c}=liftPayload(level,api,{floor:11,maxMilliseconds:7000,maxStates:350000});assert.equal(digest(p),row.lower.inputSha256);
const states=[c.initial],seen=new Set([key(c.initial)]);
for(let i=0;i<states.length&&states.length<96;i++)each(c,states[i],s=>{const sk=key(s);if(!seen.has(sk)){seen.add(sk);states.push(s);}if(states.length>=96)return false;});
const branchStates=states.length,model=new api.PuzzleModel(level);model.startCountdown();
const reveals=new Map(c.covers.filter(co=>c.initial[co.stateIndex]!==NONE).map(co=>[co.id,c.initial[co.stateIndex]]));
function state(){const snap=model.snapshot();for(const co of c.covers)if(snap.shutters.find(s=>s.id===co.id).revealed&&!reveals.has(co.id))reveals.set(co.id,snap.cleared);return Uint16Array.from([...level.blocks.map(b=>{const a=snap.blocks.find(a=>a.id===b.id);return a?(a.y*level.width+a.x)|(((b.layers?.length??1)-a.layers.length)<<7):NONE;}),...c.covers.map(co=>reveals.get(co.id)??NONE)]);}
const runtime=[state()];for(const d of drags){model.beginAction();for(const pos of d.path){assert(model.moveBlockStep(d.blockId,...pos));state();}if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());runtime.push(state());}assert(model.snapshot().complete);states.push(...runtime);
const canonical=s=>{const a=s.slice();for(const g of p.groups){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=v[j]);}return [...a].join(',');};
const native=runNativeLift({...p,successorsOnly:true,states:states.map(s=>[...s])});let transitions=0;
for(let i=0;i<states.length;i++){const expected=new Set();each(c,states[i],(raw,cost)=>expected.add(cost+':'+canonical(normalizeFast(c,raw).s)));assert.equal(native.rows[i].normalized,canonical(normalizeFast(c,states[i]).s));assert.deepEqual(new Set(native.rows[i].successors),expected);transitions+=expected.size;}
const sourceLedger=ROOT+'/author233/source-ledger.json';
const result={status:'HEADLESS_QUALIFIED_PENDING_DUAL_POINTER',level,drags,levelSha256:digest(level),routeSha256:digest(drags),L:11,U:15,starMoves:38,starTargets:api.levelStarTargets(level),sourceLedger,sourceLedgerSha256:digest(fs.readFileSync(sourceLedger)),lower:row.lower,lowerBinding:{source,originalLevelSha256:row.levelSha256,finalNativePayloadEqual:true,proofNotRerun:true},qualification:{passed:true,branchStates,routeStates:runtime.length,states:states.length,transitions,native,method:'Independent optional-lift graph and native all-successor/cost comparisons on opening branches and every real route state. The full lift inventory and static coloured-floor pose restriction are retained; optional delayed lift/optional exit contact only add choices. Strict actual Pointer-compatible route checked separately.'},audit:audit(level,api),replay:replay(level,drags,api,{complete:true,requirePointerCompatible:true}),codeSha256:Object.fromEntries([...inputs,'tools/continue231-240/author233-native.mjs','tools/continue231-240/finalize233.mjs','tools/continuation211-native-lift.cs','tools/continuation211-optional-lift-domain.mjs','tools/continuation211-fast-normalize.mjs'].map(f=>[f,digest(fs.readFileSync(f))])),pointerValidated:false,formalAdopted:false,releaseApproved:false};
writeNew(ROOT+'/author233/qualified233.json',result);console.log(JSON.stringify({L:11,U:15,drags:38,states:states.length,transitions,levelSha256:result.levelSha256}));
