import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileSpatial} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new/native219';
export const source='tools/continue221-230/author-hard20260930/native-lastcost32.cs';
export function staticPayload(level,api,{floor=11,maxMilliseconds=2000,maxStates=300000}={}){
 assert(!level.shutters?.length,'Adapter qualification excludes covers');
 assert(level.blocks.every(b=>!b.lockedBy&&!b.keyId),'Adapter qualification excludes keys');
 const c=compileSpatial(level,api);assert(c.N<=32&&c.W*c.H<=96);
 const groups=new Map();for(let i=0;i<c.N;i++){const b=level.blocks[i],k=JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 const pad=m=>Array.from({length:4},(_,i)=>m[i]??0);
 const p={width:c.W,height:c.H,floor,maxMilliseconds,maxStates,goalClears:c.totalClears,initial:[...c.initial].map(v=>v===65535?511:v),covers:[],groups:[...groups.values()].filter(g=>g.length>1),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:0,lockCount:0,keyIndices:[],poses:b.poses.map(q=>q&&({mask:pad(q.mask),neighbors:q.neighbors,exits:q.exits.map(es=>es.length?Math.min(...es.map(e=>e.gate.frozen??0)):-1)}))}))};
 return{p,c};
}
export function runStatic(p){
 fs.mkdirSync(OUT,{recursive:true});const sourceHash=digest(fs.readFileSync(source)),exe=path.resolve(OUT,'floor-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(OUT,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+3000});return{...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash,exeHash:digest(fs.readFileSync(exe)),inputSha256:digest(p)};
}
export function staticFloor(level,api,options){const{p}=staticPayload(level,api,options);return{...runStatic(p),levelSha256:digest(level),adapterSha256:digest(fs.readFileSync('tools/regeneration211-design/native-static219.mjs')),qualificationRequired:true};}
