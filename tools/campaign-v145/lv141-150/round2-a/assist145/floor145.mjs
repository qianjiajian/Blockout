import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';
import {payload,SOURCE,hash} from '../../../lv131-140/agent139-140/native-prefix-pruned.mjs';
import {payload as fullPayload,SOURCE as FULL} from '../../../lv131-140/root-native/native-axis-pruned.mjs';
import {digest,api} from '../common.mjs';
export const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a/assist145';fs.mkdirSync(OUT,{recursive:true});
export const save=(name,d)=>{const f=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return f;};
export function project(level){const p=structuredClone(level);for(const b of p.blocks)delete b.timedBombSeconds;return p;}
export function floor145(level,{floor=11,maxMilliseconds=3000,maxStates=300000,prefix=true}={}){
 assert.equal(level.id,145);assert.equal(level.shutters.length,1);assert.equal(level.shutters[0].count,10);assert(!level.generators?.length);
 const l=project(level),p=prefix?payload(l,api,{goalClears:10,floor,maxMilliseconds,maxStates}):fullPayload(l,api,{floor,maxMilliseconds,maxStates}),src=prefix?SOURCE:FULL,sourceHash=hash(fs.readFileSync(src));
 const exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(src)],{windowsHide:true,stdio:'pipe'});
 const folder=path.resolve(OUT,'proof-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p));const inputHash=digest(fs.readFileSync(input)),exeHash=digest(fs.readFileSync(exe));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+10000});assert.equal(hash(fs.readFileSync(src)),sourceHash);assert.equal(digest(fs.readFileSync(exe)),exeHash);assert.equal(digest(fs.readFileSync(input)),inputHash);
 return{...JSON.parse(fs.readFileSync(output)),prefix,source:src,sourceHash,exeHash,input,output,sourceLevelSha256:digest(level),projectionSha256:digest(l),qualificationRequired:true,bombProjection:'Deadline-only relaxation preserves all physical bodies, shells, positions, curtain and gate counters. Prefix mode stops at first curtain10 reveal, not a full solution with missing inventory.',pointerValidated:false};
}
if(process.argv[1]?.endsWith('floor145.mjs')){const d=JSON.parse(fs.readFileSync(process.argv[2])),r=floor145(d.level,{prefix:process.env.FULL!=='1',maxMilliseconds:Number(process.env.MS??3000)});console.log(JSON.stringify({file:save('floor145',r),...r}));}
