import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{execFileSync}from 'node:child_process';import{createHash}from 'node:crypto';
import{compile}from './axis128-masked-prefix-floor.mjs';
export const SOURCE='tools/campaign-v145/lv131-140/agent139-140/native-prefix.cs',WRAPPER='tools/campaign-v145/lv131-140/agent139-140/native-prefix.mjs',OUT='deliverables/remake131-140-v146-20260924/agent139-140';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export function payload(level,api,options={}){
 const c=compile(level,api,options.goalClears),groups=new Map();assert(c.blocks.length<=64);
 c.blocks.forEach((b,i)=>{const s=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.reveal,cover:b.cover?.id,axis:b.movementAxis});if(!groups.has(s))groups.set(s,[]);groups.get(s).push(i);});
 return{width:c.W,height:c.H,goalClears:options.goalClears,initial:Array.from(c.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.reveal,poses:b.poses.map(p=>p&&({mask:p.mask,exits:p.exits.map(e=>e?e.frozen??0:-1),neighbors:p.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:s.mask})),groups:[...groups.values()].filter(g=>g.length>1),floor:options.floor??11,maxStates:options.maxStates??200000,maxMilliseconds:options.maxMilliseconds??8000,successorsOnly:options.successorsOnly??false,states:options.states};
}
export function runNativePrefix(level,api,options={}){
 const p=payload(level,api,options);fs.mkdirSync(OUT,{recursive:true});const sourceHash=hash(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native-prefix-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const exeHash=hash(fs.readFileSync(exe)),folder=path.resolve(OUT,'native-prefix-run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});const inputHash=hash(fs.readFileSync(input));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});assert.equal(hash(fs.readFileSync(SOURCE)),sourceHash);assert.equal(hash(fs.readFileSync(exe)),exeHash);assert.equal(hash(fs.readFileSync(input)),inputHash);
 return{...JSON.parse(fs.readFileSync(output)),sourceHash,exeHash,input,output,inputSha256:inputHash,sourceLevelSha256:hash(JSON.stringify(level)),wrapperHash:hash(fs.readFileSync(WRAPPER))};
}
