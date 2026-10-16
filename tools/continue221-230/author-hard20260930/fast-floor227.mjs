import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {keyPayload} from '../../remake191-200/author194-196/key-floor.mjs';import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/continue221-230-20260930/hard/native-fast';fs.mkdirSync(root,{recursive:true});
const source='tools/continue221-230/author-hard20260930/native-fast32.cs';
export function run227(p){
 const sourceHash=digest(fs.readFileSync(source)),exe=path.resolve(root,'keys-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(root,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+3000});return {...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash,inputSha256:digest(p)};
}
export function floor227(level,opts={}){const projected=structuredClone(level);for(const b of projected.blocks)delete b.timedBombSeconds;const {p}=keyPayload(projected,{floor:16,maxMilliseconds:1800,maxStates:500000,...opts});return {proof:run227(p),levelSha256:digest(level),projectedLevelSha256:digest(projected),projection:'Remove only timedBombSeconds, retaining all bodies/shapes/colors/layers and curtain count8 plus all real cargo. Ignoring a deadline removes restrictions only. Optional exit contact and omitted exit sweep are further cost-nonincreasing relaxations. Witness replay retains the original timer.',qualificationRequired:true};}
