import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compile,key,normalize,each} from '../../../remake131to140-axis-floor-v172.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export {compile,key,normalize,each};
export const SOURCE='tools/campaign-v145/lv141-150/round2-c/native96.cs';
export const WRAPPER='tools/campaign-v145/lv141-150/round2-c/native96.mjs';
export const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/native96';
export function groupsOf(c){const groups=new Map();c.blocks.forEach((b,i)=>{const signature=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.reveal,cover:b.cover?.id,axis:b.movementAxis});if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(i);});return [...groups.values()].filter(g=>g.length>1);}
export function canonical(c,s){s=s.slice();for(const g of groupsOf(c)){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=v[j]);}return s;}
export const toByteState=s=>[...s].map(v=>v===511?255:v);
export const stateText=s=>Buffer.from(toByteState(s)).toString('base64');
export function payload(level,api,options={}){
 const c=compile(level,api);assert(c.W*c.H<=96,'This native backend is restricted to96 cells');assert(c.blocks.length<=32,'32 bodies maximum');
 return {width:c.W,height:c.H,initial:toByteState(c.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.reveal,poses:b.poses.map(p=>p&&({mask:p.mask,exits:p.exits.map(g=>g?(g.frozen??0):-1),neighbors:p.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:s.mask})),groups:groupsOf(c),floor:options.floor??11,maxStates:options.maxStates??1000000,maxMilliseconds:options.maxMilliseconds??10000,successorsOnly:options.successorsOnly??false,states:options.states?.map(toByteState)};
}
/** Exact acceleration of the qualified axis graph, not new game semantics.
 * All geometry, axes and exits are compiled by the same restricted JS compiler.
 * Native code consumes its explicit pose masks/neighbor lists/exit thresholds.
 * It forces only full body removals, never peels, and quotients identical
 * shape/layers/ice/reveal/owner/axis bodies. Byte255 encodes JS sentinel511;
 * every live position is below96 and its stage is0 or1, hence no alias.
 */
export function checkNativePrunedFloor(level,api,options={}){
 let p;try{p=payload(level,api,options);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 fs.mkdirSync(OUT,{recursive:true});const sourceHash=digest(fs.readFileSync(SOURCE)),wrapperHash=digest(fs.readFileSync(WRAPPER)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const exeHash=digest(fs.readFileSync(exe)),folder=path.resolve(OUT,'run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});const inputHash=digest(fs.readFileSync(input));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});assert.equal(digest(fs.readFileSync(SOURCE)),sourceHash);assert.equal(digest(fs.readFileSync(WRAPPER)),wrapperHash);assert.equal(digest(fs.readFileSync(exe)),exeHash);assert.equal(digest(fs.readFileSync(input)),inputHash);
 return {...JSON.parse(fs.readFileSync(output)),sourceHash,wrapperHash,exeHash,input,output,inputSha256:inputHash,sourceLevelSha256:digest(level),solvabilityValidated:false,pointerValidated:false,timeValidated:false};
}
