import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileSymmetricImmediate} from './remake81to90-current-fast3-generator-floor-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const NATIVE_SOURCE='tools/remake88to90-native-v147.cs';
export const NATIVE_ROOT='deliverables/remake81-90-v146-20260924/native88-90';
export function nativePayload(level,api,options={}){
 const c=compileSymmetricImmediate(level,api);assert(c.blocks.length<=40&&c.W*c.H<=96);
 const bySignature=new Map();c.blocks.forEach((b,i)=>{const s=JSON.stringify({shape:b.shape,layers:b.layers});const a=bySignature.get(s)??[];a.push(i);bySignature.set(s,a);});
 const p={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({layers:b.layers.length,spawn:b.initial,poses:b.poses.map(v=>v?{mask:v.mask,exits:b.layers.map((_,s)=>v.exits[s]?(v.exits[s].frozen??0):-1),neighbors:v.neighbors}:null)})),generators:c.generators.map(g=>g.indices),groups:[...bySignature.values()].filter(g=>g.length>1),floor:options.floor??11,maxStates:options.maxStates??5000000,maxMilliseconds:options.maxMilliseconds??180000,weight:options.weight??1000,symmetry:options.symmetry!==false,collect:options.collect===true,successorsOnly:options.successorsOnly===true,optionalExit:options.optionalExit!==false};
 for(const k of ['floor','maxStates','maxMilliseconds'])assert(Number.isSafeInteger(p[k])&&p[k]>0&&p[k]<=2147483647);assert(Number.isInteger(p.weight)&&p.weight>=0&&p.weight<=10000);
 if(options.state){assert(p.successorsOnly,'Alternate state is allowed only for successor diagnostics');assert.equal(options.state.length,p.initial.length);p.initial=[...options.state];}return p;
}
export function compileNative(root=NATIVE_ROOT){
 fs.mkdirSync(root,{recursive:true});const sourceHash=digest(fs.readFileSync(NATIVE_SOURCE)),exe=path.resolve(root,'fifo88-90-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(NATIVE_SOURCE)],{windowsHide:true,stdio:'pipe'});
 return{exe,sourceHash,exeHash:digest(fs.readFileSync(exe))};
}
export function runNative(level,api,options={}){
 const root=options.artifactRoot??NATIVE_ROOT,payload=nativePayload(level,api,options),binary=compileNative(root),folder=path.resolve(root+'/run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder,{recursive:true});
 const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});const inputSha256=digest(fs.readFileSync(input));
 execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:payload.maxMilliseconds+120000});
 assert.equal(digest(fs.readFileSync(NATIVE_SOURCE)),binary.sourceHash);assert.equal(digest(fs.readFileSync(binary.exe)),binary.exeHash);assert.equal(digest(fs.readFileSync(input)),inputSha256);
 return{...JSON.parse(fs.readFileSync(output)),sourceLevelSha256:digest(level),binary,input,inputSha256,output,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false};
}
