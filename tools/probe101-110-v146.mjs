import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {loadSpatialApi,compileSpatial,searchSpatial} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
export const OUTPUT='deliverables/remake101-110-v146-20260924/pipeline';
export const DOMAIN=OUTPUT+'/spatial-star-domain.mjs';
export const TEST=OUTPUT+'/spatial-star-domain.test.mjs';
const baselineFile='deliverables/remake31-200-v145-20260924/baseline.json';
const fresh=(label,report)=>{const file=`${OUTPUT}/${label}-${Date.now()}.json`;fs.mkdirSync(OUTPUT,{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return file;};
function rules(){const r=verifyRulesLock();assert(r.ok,r.errors.join('\n'));assert(['1.46.0','1.47.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0'].includes(r.activeVersion));return r;}
function bindings(){
 const files=[DOMAIN,TEST,'tools/probe101-110-v146.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md',baselineFile,'deliverables/remake101-110-v146-20260924/enriched108-1790270760651.json'];
 for(const dir of ['src/core','src/game'])for(const name of fs.readdirSync(dir))if(name.endsWith('.ts'))files.push(`${dir}/${name}`);
 return Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(f))]));
}
export async function inventory(){
 const r=rules(),api=await loadSpatialApi(),baseline=JSON.parse(fs.readFileSync(baselineFile));
 const rows=campaignCadence().rows.filter(t=>t.id>=101&&t.id<=110).map(t=>{
  const saved=baseline.levels[t.id-1],l=saved.level;let compiled;
  try{const c=compileSpatial(l,api);compiled={status:'supported',bodies:c.N,covers:c.covers.length,allClearEvents:c.totalClears};}catch(e){compiled={status:'unsupported',reason:e.message};}
  return {id:l.id,difficulty:t.difficulty,range:t.range,role:t.role,sourceLevelSha256:digest(l),geometry:saved.geometry,stars:saved.starTargets,timeSeconds:l.timeSeconds,historicalReward:l.reward,
   inventory:{blocks:l.blocks.length,stars:l.blocks.filter(b=>b.star).length,axis:l.blocks.filter(b=>b.movementAxis).length,keys:l.blocks.filter(b=>b.keyId).length,locks:l.blocks.filter(b=>b.lockedBy).length,ice:l.blocks.filter(b=>b.frozen).map(b=>({id:b.id,value:b.frozen,owner:b.shutterId??'opening'})),shells:l.blocks.filter(b=>b.layers?.length>1).length,shutters:l.shutters??[],generators:l.generators??[]},
   nonNative:l.blocks.flatMap(b=>{const match=api.matchFormalBlockShape(b.shape,'native-only');return match?.quarterTurns===0?[]:[{id:b.id,shape:b.shape}];}),compiled};
 });
 return fresh('inventory',{activeVersion:r.activeVersion,description:'Old immutable baseline diagnostics only. Not newly authored candidates or difficulty certificates.',rows,newLevelCount:0,releaseApproved:false});
}
export function qualify(){
 const r=rules(),before=bindings(),run=spawnSync(process.execPath,['--test',TEST],{encoding:'utf8',timeout:60000,maxBuffer:2e6}),after=bindings();
 const changed=Object.keys(before).filter(f=>before[f]!==after[f]);
 // Other batches can change pure campaign data while these isolated fixtures run;
 // still record any mutation and do not issue a strict stable-input PASS.
 const status=run.status===0&&!changed.length?'PASS':'FAIL';
 return fresh('qualification',{status,activeVersion:r.activeVersion,command:`node --test ${TEST}`,exitCode:run.status,stdout:run.stdout,stderr:run.stderr,error:run.error?.message,bindings:before,changed,qualificationOnly:true,newLevelCount:0,releaseApproved:false});
}
export async function diagnostic(file){
 rules();const api=await loadSpatialApi(),data=JSON.parse(fs.readFileSync(file)),l=data.level??data;
 const result=searchSpatial(l,api,{prove:false,maxStates:50000,maxMilliseconds:3000,maxTransitions:500000,diagnosticTrace:true});
 const replay=result.drags?api.replayRevisedRoute(l,result.drags):null;
 return fresh(`diagnostic${l.id}`,{inputFile:file,inputSha256:digest(fs.readFileSync(file)),result,replay,description:'Finite witness diagnostic; no lower bound or adoption implied.'});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [mode,file]=process.argv.slice(2);if(mode==='inventory')console.log(await inventory());else if(mode==='qualify')console.log(qualify());else if(mode==='diagnostic')console.log(await diagnostic(file));else throw Error('Usage: inventory | qualify | diagnostic CANDIDATE');
}
