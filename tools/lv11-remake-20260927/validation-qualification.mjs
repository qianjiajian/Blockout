import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from '../remake21to30-mask-floor.mjs';
import {compileNative41,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';

// Qualification fixtures are not level designs: sparse geometry and adjacent
// same-color feed bodies deliberately isolate the real 13..17 clear counters.
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const {api,inputs}=await loadApi();
const root=`deliverables/lv11-remake-20260927/validation-qualification-${Date.now()}`;
fs.mkdirSync(root,{recursive:true});
const bindings=Object.fromEntries([...inputs,'tools/lv11-remake-20260927/validation-qualification.mjs','tools/remake21to30-mask-floor.mjs','tools/remake41-optional-native-v146.mjs',NATIVE_SOURCE,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.79.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const binary=compileNative41(path.join(root,'native'));
const report={generatedAt:new Date().toISOString(),status:'running',scope:'Independent real 13..17 numbered-body and ice-gate threshold qualification; not Lv11 difficulty certification',ruleVersion:lock.activeVersion,bindings,binary,fixtures:[]};
const key=s=>Buffer.from(s).toString('base64');
function clearGraph(c,initial){
 const nodes=[initial],seen=new Map([[key(initial),0]]),edges=new Map();
 for(let at=0;at<nodes.length;at++){
  const s=nodes[at],k=key(s),nextSet=new Set();
  forEachGesture(c,s,(i,value,cost)=>{if(cost)return;const n=s.slice();n[i]=value;const nk=key(n);nextSet.add('0:'+nk);if(!seen.has(nk)){seen.set(nk,0);nodes.push(n);}});
  edges.set(k,[...nextSet].sort());
 }
 return {distances:[...seen].sort(),edges:[...edges].sort()};
}
function nativeGraph(c,initial,label){
 const payload={width:c.W,height:c.H,initial:[...initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:[],generators:[],groups:[],floor:1,maxStates:1000,maxMilliseconds:5000,normalize:false,symmetry:false,collect:true};
 const input=path.resolve(root,`${label}-input.json`),output=path.resolve(root,`${label}-output.json`);
 fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:10000});
 const result=JSON.parse(fs.readFileSync(output));assert.notEqual(result.status,'unknown');
 const expected=clearGraph(c,initial);assert.deepEqual(result.distances.sort(),expected.distances);assert.deepEqual(result.edges.map(([k,v])=>[k,v.sort()]).sort(),expected.edges);
 return {input,output,inputSha256:digest(fs.readFileSync(input)),outputSha256:digest(fs.readFileSync(output)),states:result.discoveredStates,edges:expected.edges.reduce((n,[,es])=>n+es.length,0),exactNativeMaskClearGraph:true};
}
try{
 for(const ice of [13,14,15,16,17]){
  const level={id:11,name:`numeric-threshold-${ice}`,difficulty:'hard',reward:40,timeSeconds:120,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:8,
   gates:[{id:'feed-gate',color:'cyan',side:'top',offset:0,size:3},{id:'ice-gate',color:'green',side:'bottom',offset:0,size:3,frozen:ice}],
   blocks:[...Array.from({length:ice},(_,i)=>({id:`feed-${i}`,color:'cyan',shape:[[0,0]],x:i%3,y:Math.floor(i/3)})),{id:'ice-body',color:'green',shape:[[0,0],[1,0],[2,0]],x:0,y:7,frozen:ice}]};
  const c=compileLevel(level),m=new api.PuzzleModel(level),prefix=[];m.startCountdown();
  let beforeRelease;
  for(let removed=0;removed<ice;removed++){
   const snap=m.snapshot(),s=stateFromSnapshot(c,snap),body=snap.blocks.find(b=>b.id==='ice-body');assert.equal(body.frozen,ice-removed);assert.equal(snap.gates.find(g=>g.id==='ice-gate').frozen,ice-removed);
   let targetEdges=0;forEachGesture(c,s,(i)=>{if(c.blocks[i].id==='ice-body')targetEdges++;});assert.equal(targetEdges,0);
   assert.equal(m.moveBlockStep('ice-body',0,6),false);assert.equal(m.tryExit('ice-body','bottom').ok,false);
   if(removed===ice-1)beforeRelease=s;
   const b=snap.blocks.find(b=>b.id===`feed-${removed}`);m.beginAction();for(let y=b.y-1;y>=0;y--)assert(m.moveBlockStep(b.id,b.x,y));assert(m.tryExit(b.id,'top').ok);assert(m.commitAction());
   prefix.push({cleared:removed,bodyIce:body.frozen,gateIce:snap.gates.find(g=>g.id==='ice-gate').frozen,targetEdges});
  }
  const released=m.snapshot();assert.equal(released.cleared,ice);assert.equal(released.blocks.find(b=>b.id==='ice-body').frozen,0);assert.equal(released.gates.find(g=>g.id==='ice-gate').frozen,0);
  const afterRelease=stateFromSnapshot(c,released);let canClear=false;forEachGesture(c,afterRelease,(i,v,cost)=>{if(c.blocks[i].id==='ice-body'&&v===255&&cost===0)canClear=true;});assert(canClear);
  const graphs=[nativeGraph(c,beforeRelease,`ice-${ice}-before`),nativeGraph(c,afterRelease,`ice-${ice}-after`)];
  m.beginAction();assert(m.tryExit('ice-body','bottom').ok);assert(m.commitAction());assert(m.snapshot().complete);
  report.fixtures.push({ice,levelSha256:digest(level),clearsAtRelease:released.cleared,prefix,graphs,modelCompleted:true});
 }
 assert.equal(digest(fs.readFileSync(binary.exe)),binary.exeHash);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
const output=path.join(root,'report.json');fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,status:report.status,fixtures:report.fixtures.length,error:report.error}));
