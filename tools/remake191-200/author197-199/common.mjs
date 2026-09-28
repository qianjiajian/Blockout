import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi,readBaseline,PROFILE,auditSpatial,digest,TARGETS,ruleGate} from '../common.mjs';
import {loadSpatialApi,searchSpatial} from '../../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {compileSpatial} from '../../remake111to120-spatial-floor-v147.mjs';
export {digest,searchSpatial,PROFILE,TARGETS};
export {tile,recolor,recolorBag,rng,rect,adjacent} from '../../remake161-170/author164-167/common.mjs';
ruleGate();
export const api={...(await loadApi()).api,...await loadSpatialApi()};
export const ROOT='deliverables/remake191-200-20260927/author197-199';fs.mkdirSync(ROOT,{recursive:true});
export const baseline=readBaseline();
export const shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
export const project=l=>({...structuredClone(l),mechanismRules:'revised-2026-09-23-v1.4'});
export const base=id=>({...structuredClone(baseline.levels[id-1].level),mechanismRules:PROFILE,difficulty:TARGETS[id].difficulty});
export const audit=l=>auditSpatial(l,api);
export const save=(name,data)=>{const p=ROOT+'/'+name+'-'+Date.now()+'-'+process.pid+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const SOURCE='tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs';
export function lower(level,{floor=11,maxMilliseconds=2500,maxStates=250000,goalClears}={}){
 const p=project(level);assert(!p.flipDoors?.length);for(const b of p.blocks)for(const k of ['keyId','lockedBy','lockCount'])delete b[k];
 const c=compileSpatial(p,api);assert(c.covers.every(s=>!s.skin||s.skin==='shutter'));
 const groups=new Map();c.blocks.forEach((b,i)=>{const sig=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.cover?.count??0,axis:b.movementAxis,star:b.star});if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);});
 const pad=a=>Array.from({length:4},(_,i)=>a[i]??0);
 const payload={width:c.W,height:c.H,goalClears:goalClears??c.totalClears,initial:c.blocks.map(b=>b.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.cover?.count??0,poses:b.poses.map(q=>q&&({mask:pad(q.mask),exits:q.exits.map(e=>e.length?Math.min(...e.map(a=>a.gate.frozen??0)):-1),neighbors:q.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:pad(s.mask)})),groups:[...groups.values()].filter(g=>g.length>1),floor,maxStates,maxMilliseconds};
 const exe=path.resolve(ROOT,'native-prefix-'+digest(fs.readFileSync(SOURCE)).slice(0,12)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(ROOT,'native-'+Date.now()+'-'+process.pid+'-'+Math.random().toString(16).slice(2,5));fs.mkdirSync(dir);const input=path.join(dir,'input.json'),output=path.join(dir,'output.json');fs.writeFileSync(input,JSON.stringify(payload));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+15000});
 return {...JSON.parse(fs.readFileSync(output)),input,output,payloadSha256:digest(payload),sourceLevelSha256:digest(level),projectedSha256:digest(p),sourceCode:SOURCE,sourceSha256:digest(fs.readFileSync(SOURCE)),qualificationRequired:true,projection:'All bodies, layers, numeric ice, ordinary countdown curtains, star eligibility and axes retained. Only key restrictions removed; optional exit contact and omitted straight sweep add choices. No flip, lift, generator, grid or timer in domain.'};
}
