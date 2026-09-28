import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileGeneratorLevel} from './remake41to50-full-generator-floor-v146.mjs';
import {equivalentBlockGroups} from './remake21to30-symmetry-floor-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const NATIVE_SOURCE='tools/remake41-optional-native-v146.cs';
export const NATIVE_ROOT='deliverables/remake41-50-v146-20260924/agent47-50/native41-review/native';
const int32=n=>Number.isSafeInteger(n)&&n>=0&&n<=2147483647;
export function nativePayload(level,api,options={}){
 assert.equal(level.id,41);api.validateLevel(level);
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors','seams','blocked'])assert(!level[k]?.length,k);
 for(const b of level.blocks)for(const k of Object.keys(b))assert(['id','x','y','shape','color','frozen','shutterId'].includes(k),'Unsupported block '+k);
 for(const g of level.gates)for(const k of Object.keys(g))assert(['id','color','side','offset','size','frozen'].includes(k),'Unsupported gate '+k);
 for(const s of level.shutters??[]){for(const k of Object.keys(s))assert(['id','x','y','width','height','count','skin'].includes(k),'Unsupported shutter '+k);assert(s.skin===undefined||s.skin==='shutter','Only countdown shutters');}
 const c=compileGeneratorLevel(level,api);assert(c.W*c.H<=96&&c.blocks.length<=32);assert(c.blocks.every(b=>b.layers.length===1));
 assert(c.blocks.every(b=>int32(b.ice)&&int32(b.revealAt)&&int32(b.ice+b.revealAt)));assert(c.covers.every(s=>int32(s.count)&&s.count>0));assert(c.gates.every(g=>int32(g.frozen)));
 const payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:c.covers.map(s=>({count:s.count,lo:s.mask[0],hi:s.mask[1],top:s.mask[2]})),generators:c.generators.map(g=>g.indices),groups:equivalentBlockGroups(c),floor:options.floor??21,maxStates:options.maxStates??10000000,maxMilliseconds:options.maxMilliseconds??180000,normalize:options.normalize!==false,symmetry:options.symmetry!==false,collect:options.collect===true};
 for(const k of ['floor','maxStates','maxMilliseconds'])assert(int32(payload[k])&&payload[k]>0);assert(payload.floor<=10000);assert(payload.maxStates<=15000000,'Native dictionary safety cap: at most 15 million states');return payload;
}
export function compileNative41(root=NATIVE_ROOT){
 fs.mkdirSync(root,{recursive:true});const sourceHash=digest(fs.readFileSync(NATIVE_SOURCE)),exe=path.resolve(root,`optional41-${sourceHash.slice(0,16)}.exe`);
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(NATIVE_SOURCE)],{windowsHide:true,stdio:'pipe'});
 return {exe,sourceHash,exeHash:digest(fs.readFileSync(exe))};
}
export function runNative41(level,api,options={}){
 const payload=nativePayload(level,api,options),binary=compileNative41(),folder=path.resolve(NATIVE_ROOT+'/run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder,{recursive:true});
 const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});const inputSha256=digest(fs.readFileSync(input));
 execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:payload.maxMilliseconds+120000});
 assert.equal(digest(fs.readFileSync(NATIVE_SOURCE)),binary.sourceHash);assert.equal(digest(fs.readFileSync(binary.exe)),binary.exeHash);assert.equal(digest(fs.readFileSync(input)),inputSha256);
 return {...JSON.parse(fs.readFileSync(output)),sourceLevelSha256:digest(level),binary,input,inputSha256,output,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false};
}
