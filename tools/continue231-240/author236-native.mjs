import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSpatial,each,normalizeClears,NONE} from '../continuation211-colored-witness.mjs';
import {ROOT,digest} from './common.mjs';

const source='tools/remake191-200/author194-196/native-keys32.cs';
export function payload(level,api,options={}){
 for(const field of ['shutters','generators','coloredGrids','flipDoors','seams','conveyors','elevators'])assert(!level[field]?.length,'Unsupported '+field);
 assert(level.blocks.length<=32&&level.width*level.height<=96);
 assert(level.blocks.every(b=>!b.timedBombSeconds&&!b.keyId&&!b.lockedBy&&!b.star));assert(level.gates.every(g=>!g.star));
 const c=compileSpatial(level,api),groups=new Map();
 for(const [i,b]of level.blocks.entries()){const sig=digest(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k))));if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);}
 const p={width:c.W,height:c.H,goalClears:c.totalClears,initial:[...c.initial].map(v=>v===NONE?511:v),groups:[...groups.values()].filter(g=>g.length>1),covers:[],floor:11,maxMilliseconds:6000,maxStates:500000,...options,
 blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:0,lockCount:0,keyIndices:[],poses:b.poses.map(p=>p&&({mask:Array.from({length:4},(_,i)=>p.mask[i]??0),neighbors:p.neighbors,exits:p.exits.map(ex=>ex.length?Math.min(...ex.map(e=>e.gate.frozen??0)):-1)}))}))};
 return {c,p};
}
export function runNative(p,id=236){
 assert([236,237].includes(id));const out=ROOT+`/author${id}/native`;fs.mkdirSync(out,{recursive:true});
 const sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex'),exe=path.resolve(out,`floor-${sourceHash.slice(0,12)}.exe`);
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(out,`run-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2,7)}`);fs.mkdirSync(dir);
 const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+6000});
 return {...JSON.parse(fs.readFileSync(output)),input,output,inputSha256:digest(p),source,sourceHash};
}
export function lower(level,api,options={}){const{p}=payload(level,api,options);return {...runNative(p,level.id),levelSha256:digest(level),projection:'Full labeled inventory, shell peels, body ice and gate ice retained. Optional gate contact and omitted concave exit sweep only add moves. No adverse mechanics; complete final-body removal is a monotone zero-cost normalization. Identity quotient includes every property except label and pose.'};}
export function qualify(level,drags,api){
 const{p,c}=payload(level,api),states=[c.initial],seen=new Set([JSON.stringify([...c.initial])]);
 for(let i=0;i<states.length&&states.length<64;i++)each(c,states[i],s=>{const k=JSON.stringify([...s]);if(!seen.has(k)){seen.add(k);states.push(s);}if(states.length>=64)return false;});
 const model=new api.PuzzleModel(level);model.startCountdown();for(const d of drags){model.beginAction();for(const q of d.path)assert(model.moveBlockStep(d.blockId,...q));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const s=model.snapshot();states.push(Uint16Array.from(level.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*level.width+a.x)|(((b.layers?.length??1)-a.layers.length)<<7):NONE;})));}
 const canonical=s=>{const x=s.slice();for(const g of p.groups){const v=g.map(i=>x[i]).sort((a,b)=>a-b);g.forEach((i,j)=>x[i]=v[j]);}return x;};
 const text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v===NONE?511:v,2*i));return b.toString('base64');};
 const native=runNative({...p,successorsOnly:true,states:states.map(s=>[...s].map(v=>v===NONE?511:v))},level.id);let transitions=0;
 for(const [i,s]of states.entries()){const expected=new Set();each(c,s,(n,cost)=>expected.add(cost+':'+text(canonical(normalizeClears(c,n).s))));assert.deepEqual([...expected].sort(),[...native.rows[i].successors].sort());assert.equal(text(normalizeClears(c,s).s),native.rows[i].normalized);transitions+=expected.size;}
 return {passed:true,states:states.length,transitions,levelSha256:digest(level),native,method:'Independent complete held-gesture enumeration on 64 opening branches and all strict original-route model states'};
}
