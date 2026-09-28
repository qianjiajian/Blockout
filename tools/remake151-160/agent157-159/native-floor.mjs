import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {payload,SOURCE} from '../../campaign-v145/lv141-150/round2-c/native96.mjs';
import {digest,OUT,guard} from './common.mjs';
export function nativeFloor(level,api,options={}){
 guard();assert(!level.flipDoors?.length,'v1.5->v1.4 bridge only for levels without any flips');
 const projected={...level,mechanismRules:'revised-2026-09-23-v1.4'};let p;try{p=payload(projected,api,options);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 const sourceHash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const folder=path.resolve(OUT,'native-run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});
 return{...JSON.parse(fs.readFileSync(output)),sourceHash,exeHash:digest(fs.readFileSync(exe)),input,output,inputHash:digest(fs.readFileSync(input)),actualLevelHash:digest(level),projectedLevelHash:digest(projected),projection:'No flips; profile-only v1.5/v1.4 bridge. Existing qualified native96 and axis-floor graph, all inventory retained.',pointerValidated:false};
}
