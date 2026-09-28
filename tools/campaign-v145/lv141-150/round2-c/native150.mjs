import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {payload} from '../../lv131-140/root-native/native-axis-pruned.mjs';
import {projectAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const SOURCE='tools/campaign-v145/lv131-140/root-native/native-axis-pruned.cs',OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/native150';
export function nativeProof(level,api){fs.mkdirSync(OUT,{recursive:true});const hash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native-'+hash.slice(0,16)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const proj=projectAdvancedFloor(level,api),p=payload(proj.level,api,{floor:5,maxStates:3000000,maxMilliseconds:15000}),folder=OUT+'/run-'+Date.now()+'-'+process.pid;fs.mkdirSync(folder);const input=folder+'/input.json',output=folder+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:30000});assert.equal(digest(fs.readFileSync(SOURCE)),hash);return{...JSON.parse(fs.readFileSync(output)),nativeSource:SOURCE,nativeSourceSha256:hash,sourceLevelSha256:digest(level),projection:proj,input,output};}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const d=JSON.parse(fs.readFileSync(process.argv[2])),{api}=await loadApi(),proof=nativeProof(d.level,api);const out=OUT+'/proof-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(proof,null,2));console.log(JSON.stringify({out,proof:{...proof,projection:undefined}}));}
