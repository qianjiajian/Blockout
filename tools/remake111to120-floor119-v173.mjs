import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT='deliverables/remake111-120-v146-20260924/review119-fastnorm-20260927';
const WRAPPER=ROOT+'/run119-qualified-fastnorm-v3-v173.mjs';
const SELF='tools/remake111to120-floor119-v173.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function check119Floor(level,_api,{floor=16,maxStates=3000000,maxMilliseconds=120000,drags}={}){
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0&&n<=2147483647))return{status:'invalid',thresholdProven:false,floor,reason:'Budgets must be positive signed32-bit integers'};
 if(!Array.isArray(drags))return{status:'unsupported',thresholdProven:false,floor,reason:'A current full canonical route is required for model-to-optional projection'};
 const dir=ROOT+'/adapter-'+Date.now()+'-'+process.pid;
 fs.mkdirSync(dir,{recursive:true});
 const input=dir+'/candidate.json';
 fs.writeFileSync(input,JSON.stringify({level,drags},null,2)+'\n',{flag:'wx'});
 const before={wrapper:sha(fs.readFileSync(WRAPPER)),adapter:sha(fs.readFileSync(SELF)),input:sha(fs.readFileSync(input))};
 try{
  const stdout=execFileSync(process.execPath,[WRAPPER,input,''+floor,''+maxMilliseconds,''+maxStates,'adapter-proof','cargo-floor-fastnorm'],{encoding:'utf8',maxBuffer:5e6,timeout:maxMilliseconds+180000,windowsHide:true});
  const summary=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  assert(summary.artifactDirectory,'Fresh child produced no bound artifact');
  const resultFile=summary.artifactDirectory+'/result.json';
  const result=JSON.parse(fs.readFileSync(resultFile));
  assert.equal(result.floor,floor);
  assert.equal(result.thresholdProven,result.status==='threshold-proven');
  assert.equal(sha(fs.readFileSync(WRAPPER)),before.wrapper);
  assert.equal(sha(fs.readFileSync(SELF)),before.adapter);
  assert.equal(sha(fs.readFileSync(input)),before.input);
  if(result.thresholdProven){assert(result.qualification?.passed);assert(result.routeProjection?.valid&&result.routeProjection.complete);assert.deepEqual(result.drift,[]);}
  const bindings={...(result.dependencies??{}),...(result.freshArtifacts??{}),[input]:before.input,[WRAPPER]:before.wrapper,[SELF]:before.adapter,[resultFile]:sha(fs.readFileSync(resultFile))};
  for(const[file,hash]of Object.entries(bindings))assert.equal(sha(fs.readFileSync(path.resolve(file))),hash,'Proof binding changed before adapter returned: '+file);
  return{...result,bindings,freshResultFile:resultFile,adapterDirectory:dir};
 }catch(error){return{status:'unknown',thresholdProven:false,floor,reason:error.message,adapterDirectory:dir};}
}
