import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {compileSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';
export {api,shapes,tile,recolor,recolorBag,rng,rect,adjacent,project,searchSpatial} from '../../author194-196/common.mjs';
import {api,project} from '../../author194-196/common.mjs';
import {digest,auditSpatial as baseAudit,writeNew,ruleGate} from '../../common.mjs';
export {digest,ruleGate};
export function auditSpatial(l,api){const out=baseAudit(l,api),queued=new Set((l.generators??[]).flatMap(g=>g.queueBlockIds));for(let i=0;i<l.blocks.length;i++)for(let j=0;j<i;j++){const a=l.blocks[i],b=l.blocks[j];if(queued.has(a.id)||queued.has(b.id))continue;const ca=a.shutterId?l.shutters.find(c=>c.id===a.shutterId).count:0,cb=b.shutterId?l.shutters.find(c=>c.id===b.shutterId).count:0;if(ca!==cb||a.color!==b.color)continue;assert(!a.shape.some(([dx,dy])=>b.shape.some(([sx,sy])=>Math.abs(a.x+dx-b.x-sx)+Math.abs(a.y+dy-b.y-sy)===1)),'Same-batch adjacent color '+a.id+'/'+b.id);}return{...out,sameBatchAdjacencyPassed:true};}
export const OUT='deliverables/remake191-200-20260927/author191-193/assist194';
fs.mkdirSync(OUT,{recursive:true});
export const save=(name,d)=>{const p=OUT+'/'+name+'-'+Date.now()+'-'+process.pid+'.json';writeNew(p,d);return p;};
const SOURCE='tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs';
export function lower(l,{goalClears=10,floor=11,maxMilliseconds=800,maxStates=120000,precredit=false}={}){
 const p=project(l),queued=new Set(p.generators.flatMap(g=>g.queueBlockIds));
 for(const g of p.generators)for(const id of g.queueBlockIds){const b=p.blocks.find(b=>b.id===id);assert(b.shape.every(([x,y])=>p.shutters.some(s=>s.count>=goalClears&&g.spawn[0]+x>=s.x&&g.spawn[0]+x<s.x+s.width&&g.spawn[1]+y>=s.y&&g.spawn[1]+y<s.y+s.height)));}
 if(precredit){assert.equal(queued.size,1);assert(p.blocks.filter(b=>queued.has(b.id)).every(b=>!b.layers&&!b.frozen&&!b.keyId&&!b.lockedBy));assert(p.blocks.every(b=>!b.frozen));for(const c of p.shutters){assert(!c.skin||c.skin==='shutter');c.count=Math.max(0,c.count-1);}for(const g of p.gates)if(g.frozen)g.frozen=Math.max(0,g.frozen-1);}
 p.blocks=p.blocks.filter(b=>!queued.has(b.id));delete p.generators;if(precredit)goalClears=p.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 const c=compileSpatial(p,api),groups=new Map(),pad=a=>Array.from({length:4},(_,i)=>a[i]??0);
 c.blocks.forEach((b,i)=>{const sig=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.cover?.count??0,axis:b.movementAxis,star:b.star});if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);});
 const payload={width:c.W,height:c.H,goalClears,initial:c.blocks.map(b=>b.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.cover?.count??0,poses:b.poses.map(q=>q&&({mask:pad(q.mask),exits:q.exits.map(e=>e.length?Math.min(...e.map(a=>a.gate.frozen??0)):-1),neighbors:q.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:pad(s.mask)})),groups:[...groups.values()].filter(g=>g.length>1),floor,maxStates,maxMilliseconds};
 const hash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native-'+hash.slice(0,12)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(OUT,'floor-'+Date.now()+'-'+process.pid+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=path.join(dir,'input.json'),output=path.join(dir,'output.json');fs.writeFileSync(input,JSON.stringify(payload));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+10000});
 return {...JSON.parse(fs.readFileSync(output)),input,output,sourceLevelSha256:digest(l),sourceCode:SOURCE,sourceSha256:hash,payloadSha256:digest(payload),qualificationRequired:true,projection:precredit?'Full completion with sole ordinary queue body removed and its one clear credited at initial time: every frozen gate and countdown cover reduced1. Advance reveals replace fully blocked regions by their exact full layer footprints; no hidden ice/flip/lift/key effect. Optional contact and omitted straight sweep add choices. Requires model-inclusion qualification.':'Prefix stops at first clear10. One FIFO body omitted only while its complete fixed spawn footprint is blocked by unopened c10; no postgoal action used. All staged inventory/layers/covers retained; optional exit contact and omitted straight sweep add choices.'};
}

