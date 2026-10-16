import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {keyPayload} from '../remake191-200/author194-196/key-floor.mjs';
import {compileSpatial,each,normalizeClears} from '../remake111to120-spatial-floor-v147.mjs';
const out=path.resolve('deliverables/continue221-230-20260930/author229/native');fs.mkdirSync(out,{recursive:true});
const source='tools/remake191-200/author194-196/native-keys32.cs';
const digest=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const sourceHash=digest(fs.readFileSync(source)),exe=path.join(out,`native-keys-${sourceHash.slice(0,12)}.exe`);
export function runNativePayload(p){
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.join(out,`run-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2,7)}`);fs.mkdirSync(dir);
 const input=path.join(dir,'input.json'),output=path.join(dir,'output.json');fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+3000});
 return {...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash,inputSha256:digest(fs.readFileSync(input))};
}
const run=runNativePayload;
function prepare(l,opts){
 for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!l[k]?.length,`Unsupported ${k}`);
 assert(l.blocks.every(b=>!b.star&&!b.timedBombSeconds&&!b.rotationBadge));
 assert(l.gates.every(g=>!g.star));
 if(!opts.countdown){assert(l.blocks.every(b=>!b.layers?.length&&!b.frozen));assert(l.gates.every(g=>!g.frozen));}
 const{p}=keyPayload(l,opts),groups=new Map();
 // The historical key wrapper omitted movementAxis in its signature. Keep
 // it explicitly here; exchanging an axis and a free piece is unsound.
 for(const[i,b]of l.blocks.entries()){const sig=JSON.stringify({shape:b.shape,color:b.color,layers:b.layers,frozen:b.frozen,movementAxis:b.movementAxis,keyId:b.keyId,lockedBy:b.lockedBy,lockCount:b.lockCount});if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);}
 p.groups=[...groups.values()].filter(g=>g.length>1);return p;
}
export function nativeKeyFloor(l,opts={}){const p=prepare(l,opts);return {...run(p),levelSha256:digest(l),domain:opts.countdown?'Full inventory ice/shell/key/axis domain, no flip/lift/queue/grid/timer. Profile v1.5→v1.4 exact without flips; optional contact, monotone full-removal closure (shell peels never forced), full-property identity quotient.':'Full inventory no-adverse-events keys/axis only. Profile v1.5→v1.4 exact without flips; optional contact, monotone full-removal closure, full-property identity quotient.',qualificationRequired:true};}
export function qualifyNativeKeyFloor(l,drags,api,opts={}){
 const p=prepare(l,{floor:11,maxMilliseconds:3000,maxStates:40000,...opts}),c=compileSpatial({...structuredClone(l),mechanismRules:'revised-2026-09-23-v1.4'},api);
 const states=[c.initial],seen=new Set([JSON.stringify([...c.initial])]);
 for(let at=0;at<states.length&&states.length<64;at++)each(c,states[at],s=>{const k=JSON.stringify([...s]);if(!seen.has(k)){states.push(s);seen.add(k);}if(states.length>=64)return false;});
 const model=new api.PuzzleModel(l);model.startCountdown();
 for(const d of drags){model.beginAction();for(const[x,y]of d.path)assert(model.moveBlockStep(d.blockId,x,y));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const snap=model.snapshot();states.push(Uint16Array.from(l.blocks.map(b=>{const now=snap.blocks.find(a=>a.id===b.id);return now?(now.y*l.width+now.x)|(((b.layers?.length??1)-now.layers.length)<<7):65535;})));}
 const canonical=s=>{const v=[...s];for(const g of p.groups){const a=g.map(i=>v[i]).sort((a,b)=>a-b);g.forEach((i,j)=>v[i]=a[j]);}return v;};
 const encode=s=>{const bytes=Buffer.alloc(s.length*2);s.forEach((v,i)=>bytes.writeUInt16LE(v===65535?511:v,i*2));return bytes.toString('base64');};
 const native=run({...p,successorsOnly:true,states:states.map(s=>[...s].map(v=>v===65535?511:v))});let transitions=0;
 states.forEach((s,i)=>{const expected=new Set();each(c,s,(n,cost)=>expected.add(cost+':'+encode(canonical(normalizeClears(c,n).s))));assert.deepEqual([...expected].sort(),[...native.rows[i].successors].sort());assert.equal(encode(normalizeClears(c,s).s),native.rows[i].normalized);transitions+=expected.size;});
 return {passed:true,levelSha256:digest(l),states:states.length,transitions,native,reason:'Compared independent v147 complete held-gesture/key graph on 64 branch states and all full-route states; real PuzzleModel generated every route-state snapshot. No unsupported mechanics deleted.'};
}
