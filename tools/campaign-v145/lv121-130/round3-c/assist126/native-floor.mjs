import fs from'node:fs';
import path from'node:path';
import assert from'node:assert/strict';
import{execFileSync}from'node:child_process';
import{compileLevel}from'../../../../remake21to30-mask-floor.mjs';
import{equivalentBlockGroups}from'../../../../remake21to30-symmetry-floor-v139.mjs';
import{digest}from'../../../../revised-preview-validation-v160.mjs';
export const SOURCE='tools/campaign-v145/lv121-130/round3-c/assist126/native-floor.cs';
export const OUT='deliverables/campaign121-130-v146-20260924/round3-c/assist126';
export function payload(level,api,options={}){
 assert.equal(level.id,126);assert.equal(level.width,6);assert.equal(level.height,9);assert(!level.blocked?.length);assert.equal(level.playable?.length??54,54);
 assert.equal(level.blocks.filter(b=>b.layers?.length>1).length,9);assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen),[5,5]);
 assert.deepEqual(level.shutters?.map(s=>s.count),[12,12]);assert.deepEqual(level.gates.map(g=>[g.color,g.frozen??0]).sort(),[['red',0],['blue',3],['yellow',5],['green',8],['cyan',12],['purple',14],['pink',16]].sort());
 api.validateLevel(level);const c=compileLevel(level);assert(c.blocks.length<=32);
 return{width:c.W,height:c.H,initial:Array.from(c.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.revealAt,poses:b.poses.map(p=>p&&({mask:p.mask,exits:p.exits.map(e=>e?e.frozen:-1),neighbors:p.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:s.mask})),groups:equivalentBlockGroups(c),floor:options.floor??21,maxStates:options.maxStates??2000000,maxMilliseconds:options.maxMilliseconds??20000,successorsOnly:options.successorsOnly??false,states:options.states};
}
export function runNative126(level,api,options={}){
 const p=payload(level,api,options);fs.mkdirSync(OUT,{recursive:true});const sourceHash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const exeHash=digest(fs.readFileSync(exe)),folder=path.resolve(OUT,'run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});const inputHash=digest(fs.readFileSync(input));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});assert.equal(digest(fs.readFileSync(SOURCE)),sourceHash);assert.equal(digest(fs.readFileSync(exe)),exeHash);assert.equal(digest(fs.readFileSync(input)),inputHash);
 return{...JSON.parse(fs.readFileSync(output)),sourceHash,exeHash,input,output,inputSha256:inputHash,sourceLevelSha256:digest(level),wrapperHash:digest(fs.readFileSync('tools/campaign-v145/lv121-130/round3-c/assist126/native-floor.mjs'))};
}
