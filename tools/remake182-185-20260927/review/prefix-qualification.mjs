import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi} from '../replay.mjs';
import {digest,ruleGate,writeNew} from '../common.mjs';
import {compile,each,clearCount,stateOf,normalize} from '../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {payload} from '../../campaign-v145/lv131-140/agent139-140/native-prefix-pruned.mjs';

const OUT='deliverables/remake182-185-20260927/review';
const FIXTURES='deliverables/remake161-170-20260927/author164-167/qualification165-1790517146861.json';
const SOURCE='tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs';
const {api,inputs}=await loadApi(),lock=ruleGate();
const files=[...inputs,FIXTURES,SOURCE,'tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs','tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.mjs','tools/remake182-185-20260927/review/prefix-qualification.mjs'];
const bindings=Object.fromEntries(files.map(file=>[file,digest(fs.readFileSync(file))]));
fs.mkdirSync(OUT,{recursive:true});
const executable=path.resolve(OUT,'native-prefix-'+bindings[SOURCE].slice(0,16)+'.exe');
if(!fs.existsSync(executable))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+executable,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
const reports=[],fixtureData=JSON.parse(fs.readFileSync(FIXTURES));
const text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b.toString('base64');};
for(const index of [0,7,9,18,23,25]){
 const f=fixtureData.smallFullGraph[index],level=structuredClone(f.level);level.mechanismRules='revised-2026-09-27-v1.5';
 const projected={...level,mechanismRules:'revised-2026-09-23-v1.4'},c=compile(projected,api,f.goal),p=payload(projected,api,{goalClears:f.goal,floor:3,maxMilliseconds:10000,maxStates:300000});
 const start=new api.PuzzleModel(level);start.startCountdown();
 const key=m=>String.fromCharCode(...stateOf(c,m.snapshot())),models=[start],seen=new Set([key(start)]);let moves=0,exits=0;
 for(let at=0;at<models.length;at++){
  assert(models.length<20000,'Qualification fixture state guard');
  const model=models[at],state=stateOf(c,model.snapshot());if(clearCount(c,state)>=f.goal)continue;
  const fast=new Set();each(c,state,(i,v,k)=>{const s=state.slice();s[i]=v;fast.add(k+':'+String.fromCharCode(...s));});
  const accept=(m,cost)=>{const k=key(m);assert(fast.has(cost+':'+k),`Missing current model edge fixture${index} state${at}`);if(!seen.has(k)){seen.add(k);models.push(m);}};
  for(const b of model.snapshot().blocks){
   if(!model.isBlockActive(model.getBlock(b.id)))continue;
   const poses=[{x:b.x,y:b.y,path:[]}],positions=new Set([b.x+','+b.y]);
   for(let j=0;j<poses.length;j++){
    const pose=poses[j],walk=()=>{const child=model.clone();child.beginAction();for(const xy of pose.path)assert(child.moveBlockStep(b.id,...xy));return child;},held=walk();
    if(pose.path.length){const child=walk();assert(child.commitAction());accept(child,1);moves++;}
    for(const side of ['top','right','bottom','left']){const child=walk();if(child.tryExit(b.id,side).ok){assert(child.commitAction());accept(child,0);exits++;}}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=pose.x+dx,y=pose.y+dy,k=x+','+y;if(positions.has(k))continue;const child=held.clone();if(!child.moveBlockStep(b.id,x,y))continue;positions.add(k);poses.push({x,y,path:[...pose.path,[x,y]]});}
   }
  }
 }
 const canonical=s=>{s=s.slice();for(const g of p.groups){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=values[j]);}return s;};
 const states=models.map(m=>[...stateOf(c,m.snapshot())]);
 const input=OUT+`/prefix-input-${Date.now()}-${index}.json`,output=input.replace('input','output');
 writeNew(input,{...p,successorsOnly:true,states});
 execFileSync(executable,[path.resolve(input),path.resolve(output)],{windowsHide:true,stdio:'pipe',timeout:30000});
 const native=JSON.parse(fs.readFileSync(output));assert.equal(native.rows.length,states.length);let nativeEdges=0;
 for(const [i,raw]of states.entries()){
  const s=Uint16Array.from(raw),row=native.rows[i],expected=new Set();
  assert.equal(row.state,text(s));assert.equal(row.normalized,text(normalize(c,s,f.goal).s));assert.equal(row.canonical,text(canonical(normalize(c,s,f.goal).s)));
  if(clearCount(c,s)<f.goal)each(c,s,(bi,v,cost)=>{const n=s.slice();n[bi]=v;expected.add(cost+':'+text(canonical(normalize(c,n,f.goal).s)));});
  assert.deepEqual([...row.successors].sort(),[...expected].sort());nativeEdges+=expected.size;
 }
 reports.push({fixtureIndex:index,states:models.length,moves,exits,nativeEdges,goal:f.goal,allCurrentModelEdgesIncluded:true,nativeEdgesExactlyMatchNormalizedJs:true,exhausted:true,input,output,inputSha256:digest(fs.readFileSync(input)),outputSha256:digest(fs.readFileSync(output))});
 console.log(JSON.stringify(reports.at(-1)));
}
for(const[file,sha]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(file)),sha,'Source drift '+file);
const report={createdAt:new Date().toISOString(),status:'PASS_DOMAIN_QUALIFICATION_ONLY',ruleVersion:lock.activeVersion,reports,bindings,executable,executableSha256:digest(fs.readFileSync(executable)),proofArgument:[
 'A prefix ends at the earliest countdown reveal. No hidden body is active before that terminal clear; all cover regions remain fixed obstacles.',
 'Omitting complete exit sweep and permitting a drag to postpone contact can only add actions. Every real held-drag path is included in the optional-contact unit-step closure.',
 'Before this prefix goal, removing an unshelled final body only frees occupancy and lowers ice counters; it cannot add a body or switch a door. Commuting an available zero-cost final removal before later actions never increases reposition cost. Shell peels are not normalized.',
 'Identity quotient groups require identical shape, layer sequence, ice age, reveal count, cover and movement axis. Swapping identities in such groups is a graph automorphism.',
 'The terminal single-stage prune is applied only after all free final-body exits have been exhausted at cost floor-1, so no remaining below-floor completion can be lost.'
],scope:'Supports no-flip/no-generator/no-lift/no-key/no-star/no-timer fixed-cover prefixes only; a candidate still needs its own applicability, fresh L16 and complete U<=20 plus Pointer/natural clock checks. This is not an 182 or185 difficulty certificate.'};
const out=OUT+'/prefix-qualification-'+Date.now()+'.json';writeNew(out,report);console.log(JSON.stringify({out,status:report.status}));
