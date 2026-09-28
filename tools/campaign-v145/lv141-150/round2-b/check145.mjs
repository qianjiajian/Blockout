import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {payload,SOURCE,WRAPPER} from '../../lv131-140/root-native/native-axis-pruned.mjs';
export const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b';
export function project(level){const l=structuredClone(level);for(const b of l.blocks)delete b.timedBombSeconds;return l;}
export function native145(level,api,options={}){
 assert.equal(level.id,145);const p=payload(project(level),api,{floor:11,maxMilliseconds:30000,maxStates:2000000,...options});
 fs.mkdirSync(OUT,{recursive:true});const hash=digest(fs.readFileSync(SOURCE));const exe=path.resolve(OUT,'native-'+hash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const run=path.resolve(OUT,'native145-'+Date.now());fs.mkdirSync(run);const input=path.join(run,'input.json'),output=path.join(run,'output.json');fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});assert.equal(digest(fs.readFileSync(SOURCE)),hash);
 return {...JSON.parse(fs.readFileSync(output)),sourceLevelSha256:digest(level),projectionSha256:digest(project(level)),sourceHash:hash,wrapperHash:digest(fs.readFileSync(WRAPPER)),input,output,bombProjection:'Only deadline removed; every physical body, layer, clear, position and gate retained. A timed winning play projects to an equal-cost spatial play.'};
}
if(process.argv[1]?.endsWith('check145.mjs')){const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{api}=await loadApi();const replay=api.replayRevisedRoute(project(d.level),d.drags??[]);const proof=native145(d.level,api);const result={file,ruleVersion:'1.73.0',levelSha256:digest(d.level),replay,proof};const out=OUT+'/check145-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({out,replay:{valid:replay.valid,complete:replay.complete,U:replay.nonClearingDrags},proof}));}
