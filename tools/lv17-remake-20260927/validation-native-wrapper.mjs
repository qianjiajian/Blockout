import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileLevel} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups} from '../remake21to30-symmetry-floor-v139.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
export const SOURCE='tools/campaign-v145/lv141-150/round2-c/native96.cs';
export const WRAPPER='tools/lv17-remake-20260927/validation-native-wrapper.mjs';
export const OUT='deliverables/lv17-remake-20260927/validation-native-runs';
export function payload(level,options={}){
 const c=compileLevel(level);assert(c.blocks.length<=32,'Native has 32 body slots');
 return {width:c.W,height:c.H,initial:Array.from(c.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.revealAt,poses:b.poses.map(p=>p&&({mask:p.mask,exits:p.exits.map(g=>g?(g.frozen??0):-1),neighbors:p.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:s.mask})),groups:equivalentBlockGroups(c),floor:options.floor??11,maxStates:options.maxStates??1000000,maxMilliseconds:options.maxMilliseconds??10000,successorsOnly:options.successorsOnly??false,states:options.states?.map(s=>Array.from(s))};
}
export function nativeFloor(level,options={}){
 let p;try{p=payload(level,options);}catch(e){return {status:'unsupported',thresholdProven:false,reason:e.message};}
 fs.mkdirSync(OUT,{recursive:true});const sourceHash=digest(fs.readFileSync(SOURCE)),wrapperHash=digest(fs.readFileSync(WRAPPER)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const exeHash=digest(fs.readFileSync(exe)),folder=path.resolve(OUT,'run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});const inputHash=digest(fs.readFileSync(input));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});
 for(const[file,hash]of [[SOURCE,sourceHash],[WRAPPER,wrapperHash],[exe,exeHash],[input,inputHash]])assert.equal(digest(fs.readFileSync(file)),hash);
 return {...JSON.parse(fs.readFileSync(output)),sourceHash,wrapperHash,exeHash,input,output,inputSha256:inputHash,sourceLevelSha256:digest(level),solvabilityValidated:false,pointerValidated:false,timeValidated:false};
}

