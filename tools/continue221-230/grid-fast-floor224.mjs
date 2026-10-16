import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gridPayload} from './author-hard20260930/grid-floor224.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

const original='tools/continue221-230/author-hard20260930/native-grid32.cs';
const root='deliverables/continue221-230-20260930/224-fast-native';fs.mkdirSync(root,{recursive:true});
let source=fs.readFileSync(original,'utf8');
const marker=' World Normalize(World s){for(;;)';assert.equal(source.split(marker).length,2);
source=source.replace(marker,` readonly Dictionary<World,World> normalizedMemo=new Dictionary<World,World>();
 World Normalize(World s){World value;if(normalizedMemo.TryGetValue(s,out value))return value;value=NormalizeUncached(s);if(normalizedMemo.Count<input.maxStates*2)normalizedMemo.Add(s,value);return value;}
 World NormalizeUncached(World s){for(;;)`);
const visit='World normalized=Key(Normalize(s));';assert.equal(source.split(visit).length,2);
source=source.replace(visit,'World raw=Key(s);int known;if(collect==null&&indices.TryGetValue(raw,out known)&&distances[known]<=nextCost)return;World normalized=Key(Normalize(raw));');
source=source.replace('native-mask128-colored-grid-fixed-cover-identity-quotient-v1','native-mask128-colored-grid-fixed-cover-exact-memo-v2');
const sourceHash=digest(source),sourcePath=path.resolve(root,'grid-'+sourceHash.slice(0,12)+'.cs'),exe=sourcePath.replace(/\.cs$/,'.exe');
if(!fs.existsSync(sourcePath))fs.writeFileSync(sourcePath,source,{flag:'wx'});
if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,sourcePath],{windowsHide:true,stdio:'pipe'});
export function runFastGrid(p){
  const dir=path.resolve(root,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);
  const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));
  execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+4000});
  return {...JSON.parse(fs.readFileSync(output)),input,output,source:sourcePath,sourceHash,inputSha256:digest(p),qualificationRequired:true,optimization:'Exact raw-state Normalize memo plus skip an already settled identical canonical normalized state at no larger cost. Every field including grid restrictions and fixed covers is retained.'};
}
export function fastGridFloor(level,opts={}){const {p}=gridPayload(level,{floor:16,maxMilliseconds:8000,maxStates:1500000,...opts});return runFastGrid(p);}
