import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {payload} from '../../campaign-v145/lv131-140/agent139-140/native-prefix-pruned.mjs';
import {digest} from '../common.mjs';
export const OUT='deliverables/remake182-185-20260927/author185';
export const SOURCE='tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs';
export function runPrefix(level,api,{floor=16,goalClears=4,maxMilliseconds=1000,maxStates=100000,...extra}={}){
 assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert(!level.flipDoors?.length);
 const projected={...level,mechanismRules:'revised-2026-09-23-v1.4'};const p={...payload(projected,api,{floor,goalClears,maxMilliseconds,maxStates}),...extra};
 const sourceHash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'prefix-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const folder=path.resolve(OUT,'prefix-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+15000});assert.equal(digest(fs.readFileSync(SOURCE)),sourceHash);
 return {...JSON.parse(fs.readFileSync(output)),levelSha256:digest(level),input,output,inputSha256:digest(fs.readFileSync(input)),source:SOURCE,sourceHash,exeHash:digest(fs.readFileSync(exe)),goalClears,projection:'185 only: all five flips permanently open in relaxation, all retained ice14 gate counts and real C14 cover preserved. Stop at14 clears: all14 opening bodies removed,17 hidden bodies cannot move before this terminal reveal. v1.5 to1.4 restricted spatial bridge has no flips remaining. Optional contact and omitted exit sweep only add choices. This is a prefix lower-bound qualification target, not a complete-route claim.',qualificationRequired:true};
}
