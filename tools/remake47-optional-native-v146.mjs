import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {compileGeneratorLevel} from './remake41to50-full-generator-floor-v146.mjs';import {equivalentBlockGroups} from './remake21to30-symmetry-floor-v139.mjs';import {digest} from './revised-preview-validation-v160.mjs';
export const NATIVE_SOURCE='tools/remake47-optional-native-v146.cs';
export function nativePayload(level,api,options={}){
 assert.equal(level.id,47);api.validateLevel(level);for(const k of ['shutters','flipDoors','coloredGrids','elevators','conveyors','seams','blocked'])assert(!level[k]?.length,k);
 for(const b of level.blocks)for(const k of Object.keys(b))assert(['id','x','y','shape','color','frozen'].includes(k),'Unsupported block '+k);
 for(const g of level.gates)for(const k of Object.keys(g))assert(['id','color','side','offset','size','frozen'].includes(k),'Unsupported gate '+k);
 const c=compileGeneratorLevel(level,api);assert(c.W*c.H<=64&&c.blocks.length<=32);assert(c.blocks.every(b=>b.layers.length===1&&!b.revealAt));
 const payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:b.ice,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),generators:c.generators.map(g=>g.indices),groups:equivalentBlockGroups(c),floor:options.floor??11,maxStates:options.maxStates??10000000,maxMilliseconds:options.maxMilliseconds??180000,normalize:options.normalize!==false,symmetry:options.symmetry!==false,collect:options.collect===true};
 for(const k of ['floor','maxStates','maxMilliseconds'])assert(Number.isSafeInteger(payload[k])&&payload[k]>0&&payload[k]<=2147483647);return payload;
}
export function compileNative47(root='deliverables/remake41-50-v146-20260924/root47/native'){
 fs.mkdirSync(root,{recursive:true});const sourceHash=digest(fs.readFileSync(NATIVE_SOURCE)),exe=path.resolve(root,`optional47-${sourceHash.slice(0,16)}.exe`);
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(NATIVE_SOURCE)],{windowsHide:true,stdio:'pipe'});
 return {exe,sourceHash,exeHash:digest(fs.readFileSync(exe))};
}
export function runNative47(level,api,options={}){
 const payload=nativePayload(level,api,options),binary=compileNative47(),folder=path.resolve('deliverables/remake41-50-v146-20260924/root47/native/run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder,{recursive:true});
 const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});const inputSha256=digest(fs.readFileSync(input));
 execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:payload.maxMilliseconds+120000});
 assert.equal(digest(fs.readFileSync(NATIVE_SOURCE)),binary.sourceHash);assert.equal(digest(fs.readFileSync(binary.exe)),binary.exeHash);assert.equal(digest(fs.readFileSync(input)),inputSha256);
 return {...JSON.parse(fs.readFileSync(output)),sourceLevelSha256:digest(level),binary,input,inputSha256,output,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false};
}
