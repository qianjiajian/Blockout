import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {api,write,digest,OUT} from './common.mjs';
import {openDoorFloorProjection} from '../spatial-bridge.mjs';
import {payload} from '../../campaign-v145/lv141-150/round2-c/assist146/native-stars.mjs';
export function proofNative(level,floor=16){
 const projection=openDoorFloorProjection(level,api),source='tools/campaign-v145/lv141-150/round2-c/native96.cs',sourceHash=digest(fs.readFileSync(source)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(level.id===154){projection.removedKeyConstraints=[];for(const b of projection.level.blocks)for(const k of ['keyId','lockedBy','lockCount'])if(b[k]!==undefined){projection.removedKeyConstraints.push({id:b.id,key:k,value:b[k]});delete b[k];}projection.keyRelaxation='All bodies and clearing counts remain unchanged; making locked bodies immediately movable only adds legal moves. Keys cannot influence any retained mechanism after their paired locks are removed.';projection.projectedLevelSha256=digest(projection.level);}
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const budget={floor,maxStates:1000000,maxMilliseconds:3000},data=payload(projection.level,api,budget),prefix='native-'+level.id+'-'+Date.now()+'-'+process.pid;
 const input=write(prefix+'-input',data),output=path.resolve(OUT,prefix+'-output.json');execFileSync(exe,[path.resolve(input),output],{windowsHide:true,stdio:'pipe',timeout:10000});
 assert.equal(sourceHash,digest(fs.readFileSync(source)));
 return {projection,budget,input,output,source,sourceHash,exeHash:digest(fs.readFileSync(exe)),proof:JSON.parse(fs.readFileSync(output))};
}
if(process.argv[1]?.endsWith('native-proof.mjs')){const d=JSON.parse(fs.readFileSync(process.argv[2])),p=proofNative(d.level,d.level.id===154?11:16),out=write('native-proof-'+d.level.id+'-'+d.seed+'-'+Date.now(),p);console.log(JSON.stringify({out,proof:p.proof}));}
