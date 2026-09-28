import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {IDS,BASELINE,OUTPUT,loadApi,ruleGate,checkCandidate,floorFor,assertBaseline} from './remake21to30-v120.mjs';
import {proveRemakeFloor} from './remake21to30-proof.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const [mode,...args]=process.argv.slice(2);
ruleGate();const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(baseline);
inputs.push('tools/remake21to30-adoption.mjs','tools/remake21to30-v120.mjs','tools/remake21to30-proof.mjs','tools/remake21to30-freeze-bound.mjs','tools/level21-reposition-floor.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.20.0.md');
const writeNew=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
const bind=paths=>Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const check=data=>{
  const checked=checkCandidate(data,baseline,api),proof=proveRemakeFloor(data.level,api,{floor:floorFor(data.level.id)});
  assert(proof.thresholdProven,`Unproved Lv${data.level.id}: ${JSON.stringify(proof)}`);
  assert(proof.lowerBound<=checked.replay.nonClearingDrags,'Lower bound cannot exceed a verified upper bound');
  assert.notEqual(digest(data.level),baseline.levels[data.level.id-1].sha256,'A remake must change actual gameplay');
  const clearLoad=data.level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
  const guaranteedMinimumDrags=clearLoad+proof.lowerBound;
  return {...checked,proof,lowerBoundCertified:true,exactNecessaryRepositions:proof.lowerBound===checked.replay.nonClearingDrags?proof.lowerBound:null,
    starAssessment:{preservedTargets:baseline.levels[data.level.id-1].starTargets,clearLoad,guaranteedMinimumDrags,
      moveTargetImpossible:guaranteedMinimumDrags>baseline.levels[data.level.id-1].starTargets.moveTarget,
      witnessWithinMoveTarget:checked.replay.effectiveDrags<=baseline.levels[data.level.id-1].starTargets.moveTarget,
      timeAndStarsCalibrated:false},humanBlindTested:false};
};
if(mode==='prepare'){
  assert.equal(args.length,10,'All ten candidates are required before formal adoption');
  assert.equal(digest(api.LEVELS),baseline.campaignSha256,'Formal campaign changed since captured baseline');
  const rows=args.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
  assert.deepEqual(rows.map(r=>r.data.level.id),IDS);
  const verified=rows.map(({file,data})=>({file,data,checks:check(data)}));
  const folder=`${OUTPUT}/batch-${Date.now()}`,manifest={ruleVersion:'1.20.0',createdAt:new Date().toISOString(),baseline:BASELINE,
    baselineSha256:digest(fs.readFileSync(BASELINE)),ids:IDS,other190Sha256:baseline.other190Sha256,rows:[],inputs:bind(inputs),humanBlindTested:false,releaseApproved:false};
  for(const {file,data,checks}of verified){
    const candidatePath=`${folder}/lv${data.level.id}.json`,checksPath=`${folder}/lv${data.level.id}-checks.json`;
    writeNew(candidatePath,data);writeNew(checksPath,checks);
    manifest.rows.push({id:data.level.id,source:file,sourceSha256:digest(fs.readFileSync(file)),candidatePath,candidateFileSha256:digest(fs.readFileSync(candidatePath)),checksPath,levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:checks.proof.lowerBound,witnessNonClearingDrags:checks.replay.nonClearingDrags,starAssessment:checks.starAssessment});
  }
  const manifestPath=`${folder}/manifest.json`;writeNew(manifestPath,manifest);
  console.log(JSON.stringify({manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),rows:manifest.rows.map(r=>({id:r.id,lowerBound:r.lowerBound,witness:r.witnessNonClearingDrags,starAssessment:r.starAssessment}))},null,2));
}else if(mode==='verify'){
  const [manifestPath]=args,manifest=JSON.parse(fs.readFileSync(manifestPath));
  assert.equal(manifest.ruleVersion,'1.20.0');assert.deepEqual(manifest.ids,IDS);assert.equal(manifest.baselineSha256,digest(fs.readFileSync(BASELINE)));
  assert.equal(api.LEVELS.length,200);assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
  for(const level of api.LEVELS)assert.deepEqual(api.levelStarTargets(level),baseline.levels[level.id-1].starTargets,`All 200 actual star targets preserved: Lv${level.id}`);
  const other=api.LEVELS.filter(l=>!IDS.includes(l.id));assert.equal(digest(other),baseline.other190Sha256,'All other 190 levels must remain exactly unchanged');
  assert.deepEqual(manifest.rows.map(r=>r.id),IDS);
  const rows=manifest.rows.map(row=>{
    assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);
    const data=JSON.parse(fs.readFileSync(row.candidatePath));assert.deepEqual(api.LEVELS[row.id-1],data.level,'Final runtime data must equal independently checked data');
    assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
    const checks=check({...data,level:api.LEVELS[row.id-1]});assert.equal(checks.proof.lowerBound,row.lowerBound);return checks;
  });
  const output=`${OUTPUT}/formal-verification-${Date.now()}.json`;
  const report={status:'PASS',ruleVersion:'1.20.0',manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),campaignSha256:digest(api.LEVELS),other190Sha256:digest(other),other190Unchanged:true,rows,inputs:bind(inputs),pointerValidated:false,humanBlindTested:false,releaseApproved:false};
  writeNew(output,report);console.log(JSON.stringify({output,status:report.status,campaignSha256:report.campaignSha256,rows:rows.map(r=>({id:r.levelId,lowerBound:r.proof.lowerBound,upperBound:r.replay.nonClearingDrags,drags:r.replay.effectiveDrags,moveTargetImpossible:r.starAssessment.moveTargetImpossible}))},null,2));
}else throw Error('Usage: node tools/remake21to30-adoption.mjs prepare TEN_FILES | verify MANIFEST');
