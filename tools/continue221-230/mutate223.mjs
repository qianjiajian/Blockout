import fs from 'node:fs';
import {api,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {keyPayload} from '../remake191-200/author194-196/key-floor.mjs';
import {runNativePayload} from './native-key-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const sourceFile=process.argv[2],base=JSON.parse(fs.readFileSync(sourceFile)),out='deliverables/continue221-230-20260930/author223',run=Date.now(),R=rng(Number(process.argv[3]??22411)),seen=new Set();
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
export function prefix223(level){const copy=structuredClone(level),guard=copy.blocks.find(b=>b.frozen===11),lift=copy.shutters[0];
 if(!guard.shape.some(([dx,dy])=>guard.x+dx>=lift.x&&guard.x+dx<lift.x+lift.width&&guard.y+dy>=lift.y&&guard.y+dy<lift.y+lift.height))throw Error('No frozen lift guard');
 copy.blocks=copy.blocks.filter(b=>!b.shutterId);delete copy.shutters;
 for(const g of copy.gates){if(g.portals){const p=g.portals[0],expected=g.side==='top'?[g.offset,0]:g.side==='bottom'?[g.offset,copy.height-1]:g.side==='left'?[0,g.offset]:[copy.width-1,g.offset];if(g.portals.length!==1||JSON.stringify(p.origin)!==JSON.stringify(expected)||p.side!==g.side||p.size!==g.size)throw Error('Non-equivalent outer portal');delete g.portals;}}
 const {p}=keyPayload(copy,{floor:11,maxMilliseconds:2600,maxStates:600000}),groups=new Map();
 for(const[i,b]of copy.blocks.entries()){const {id,x,y,...props}=b,key=JSON.stringify(props);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}p.groups=[...groups.values()].filter(g=>g.length>1);p.goalClears=11;
 return {proof:runNativePayload(p),projection:copy,payload:p,guard:guard.id,reason:'Frozen11 body overlaps lift. Until eleven clear events it cannot move and lift cannot reveal. Exact opening inventory prefix ending at eleven clears retains all original counters; no hidden-body deletion is used for a full-completion claim.'};}
const deadline=Date.now()+180000;
for(let n=0;n<180&&Date.now()<deadline;n++){
 const level=structuredClone(base.level),ordinary=level.blocks.filter(b=>!b.layers&&!b.frozen&&!b.movementAxis&&!b.shutterId&&b.id!=='l223-b20');
 const a=R.shuffle(ordinary)[0],b=R.shuffle(ordinary.filter(b=>b.color!==a.color))[0];[a.color,b.color]=[b.color,a.color];
 if(n%3===0){const g=level.gates.find(g=>g.color==='yellow');g.size=3;g.portals[0].size=3;}
 if(n%4===0){const green=level.gates.find(g=>g.color==='green'),orange=level.gates.find(g=>g.color==='orange');green.size=3;green.portals[0].size=3;orange.offset=4;orange.portals[0].origin[0]=4;}
 const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code));if(issues.length)continue;
 const w=searchSpatial({...level,mechanismRules:'revised-2026-09-23-v1.4'},api,{floor:16,maxMilliseconds:1800,maxStates:30000,maxTransitions:600000,orderSeed:n%31});let replay,floor;
 if(w.status==='witness'){replay=api.replayRevisedRoute(level,w.drags);if(replay.valid&&replay.complete&&replay.nonClearingDrags>=11)floor=prefix223(level);
 const output=out+`/mutation-${run}-${n}.json`;fs.writeFileSync(output,JSON.stringify({level,drags:w.drags,replay,proof:floor?.proof,prefix:floor,sourceFile,sha,status:'PENDING_INDEPENDENT_QUALIFICATION'},null,2));console.log(JSON.stringify({output,U:replay.nonClearingDrags,proof:floor?.proof.status}));if(floor?.proof.thresholdProven)break;}
 else if(n%15===0)console.log(JSON.stringify({n,status:w.status,clears:w.maxClearsSeen}));
 fs.appendFileSync(out+`/mutation-log-${run}.jsonl`,JSON.stringify({n,sha,status:w.status,U:replay?.nonClearingDrags,proof:floor?.proof.status})+'\n');
}
