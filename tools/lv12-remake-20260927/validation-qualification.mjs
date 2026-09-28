import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from '../remake21to30-mask-floor.mjs';
import {compileNative41,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';

// Sparse fixtures isolate real numbered ice and V3 cross-sections; they are not
// new levels, layouts or difficulty certificates.
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.82.0');
const {api,inputs}=await loadApi(),root=`deliverables/lv12-remake-20260927/validation-qualification-${Date.now()}`;
fs.mkdirSync(root,{recursive:true});
const bindings=Object.fromEntries([...inputs,'tools/lv12-remake-20260927/validation-qualification.mjs','tools/remake21to30-mask-floor.mjs','tools/remake41-optional-native-v146.mjs',NATIVE_SOURCE,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.81.0.md','docs/rules/mechanism-rules-v1.82.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const binary=compileNative41(path.join(root,'native')),report={generatedAt:new Date().toISOString(),status:'running',scope:'Numeric ice1/2, gate3/5 and rigid V3 side3/top1 qualification only',ruleVersion:lock.activeVersion,bindings,binary,fixtures:[],gateSpans:[]};
const key=s=>Buffer.from(s).toString('base64'),V3=[[0,0],[0,1],[0,2]];
function clearGraph(c,initial){
 const nodes=[initial],seen=new Map([[key(initial),0]]),edges=new Map();
 for(let at=0;at<nodes.length;at++){
  const s=nodes[at],k=key(s),nextSet=new Set();
  forEachGesture(c,s,(i,value,cost)=>{if(cost)return;const n=s.slice();n[i]=value;const nk=key(n);nextSet.add('0:'+nk);if(!seen.has(nk)){seen.set(nk,0);nodes.push(n);}});edges.set(k,[...nextSet].sort());
 }
 return{distances:[...seen].sort(),edges:[...edges].sort()};
}
function nativeGraph(c,initial,label){
 const payload={width:c.W,height:c.H,initial:[...initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:[],generators:[],groups:[],floor:1,maxStates:1000,maxMilliseconds:5000,normalize:false,symmetry:false,collect:true};
 const input=path.resolve(root,`${label}-input.json`),output=path.resolve(root,`${label}-output.json`);fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:10000});
 const actual=JSON.parse(fs.readFileSync(output)),expected=clearGraph(c,initial);assert.notEqual(actual.status,'unknown');assert.deepEqual(actual.distances.sort(),expected.distances);assert.deepEqual(actual.edges.map(([k,v])=>[k,v.sort()]).sort(),expected.edges);
 return{input,output,states:actual.discoveredStates,edges:expected.edges.reduce((n,[,es])=>n+es.length,0),exactNativeMaskClearGraph:true};
}
try{
 for(const[bodyIce,gateIce]of [[1,0],[2,0],[0,3],[0,5],[1,3],[2,5]]){
  const threshold=Math.max(bodyIce,gateIce),level={id:12,name:'qualification-only',difficulty:'hard',reward:45,timeSeconds:120,mechanismRules:'revised-2026-09-23-v1.4',width:6,height:5,
   gates:[{id:'feed-gate',color:'red',side:'top',offset:0,size:3},{id:'ice-gate',color:'blue',side:'right',offset:1,size:3,...(gateIce?{frozen:gateIce}:{})}],
   blocks:[...Array.from({length:threshold},(_,i)=>({id:`feed-${i}`,color:'red',shape:[[0,0]],x:i%3,y:Math.floor(i/3)})),{id:'ice-body',color:'blue',shape:V3,x:5,y:1,...(bodyIce?{frozen:bodyIce}:{})}]};
  const c=compileLevel(level),m=new api.PuzzleModel(level),prefix=[];m.startCountdown();let beforeRelease;
  for(let removed=0;removed<threshold;removed++){
   const snap=m.snapshot(),s=stateFromSnapshot(c,snap),body=snap.blocks.find(b=>b.id==='ice-body'),actualIce=body.frozen??0;assert.equal(actualIce,Math.max(0,bodyIce-removed));assert.equal(snap.gates.find(g=>g.id==='ice-gate').frozen??0,Math.max(0,gateIce-removed));
   let clears=0,gestures=0;forEachGesture(c,s,(i,v,cost)=>{if(c.blocks[i].id==='ice-body'){gestures++;if(v===255&&cost===0)clears++;}});assert.equal(clears,0);
   if(actualIce){assert.equal(gestures,0);assert.equal(m.moveBlockStep('ice-body',4,1),false);}assert.equal(m.tryExit('ice-body','right').ok,false);
   if(removed===threshold-1)beforeRelease=s;const b=snap.blocks.find(b=>b.id===`feed-${removed}`);m.beginAction();for(let y=b.y-1;y>=0;y--)assert(m.moveBlockStep(b.id,b.x,y));assert(m.tryExit(b.id,'top').ok);assert(m.commitAction());prefix.push({cleared:removed,bodyIce:actualIce,gateIce:Math.max(0,gateIce-removed),clearEdges:clears});
  }
  const released=m.snapshot(),afterRelease=stateFromSnapshot(c,released);assert.equal(released.cleared,threshold);assert.equal(released.blocks.find(b=>b.id==='ice-body').frozen??0,0);
  const graphs=[nativeGraph(c,beforeRelease,`${bodyIce}-${gateIce}-before`),nativeGraph(c,afterRelease,`${bodyIce}-${gateIce}-after`)];m.beginAction();assert(m.tryExit('ice-body','right').ok);assert(m.commitAction());assert(m.snapshot().complete);
  report.fixtures.push({bodyIce,gateIce,threshold,prefix,graphs,modelCompleted:true});
 }
 for(const[side,size,expected]of [['right',2,false],['right',3,true],['top',1,true]]){
  const level={id:12,name:'cross-section-only',difficulty:'hard',timeSeconds:120,reward:45,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:5,gates:[{id:'gate',color:'red',side,offset:side==='right'?1:2,size}],blocks:[{id:'v3',color:'red',shape:V3,x:2,y:side==='right'?1:0}]};
  const c=compileLevel(level),m=new api.PuzzleModel(level);let maskClear=false;forEachGesture(c,c.initial,(i,v,cost)=>{if(v===255&&!cost)maskClear=true;});assert.equal(maskClear,expected);m.beginAction();assert.equal(m.tryExit('v3',side).ok,expected);report.gateSpans.push({side,size,expected,maskClear,modelAgrees:true});
 }
 assert.equal(digest(fs.readFileSync(binary.exe)),binary.exeHash);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
const output=path.join(root,'report.json');fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,status:report.status,fixtures:report.fixtures.length,gateSpans:report.gateSpans.length,error:report.error}));
