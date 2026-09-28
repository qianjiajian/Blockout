// Archives fresh candidate checks and verifies a reviewed subset in final LEVELS.
// Production edits remain a separate, explicit local integration step.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IDS,VERSION,OUTPUT,BASELINE,loadApi,ruleGate,assertBaseline,checkCandidate,writeNew,sourceCatalog} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const [mode,...args]=process.argv.slice(2),{api,inputs}=await loadApi();
const baseline=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(baseline);
const bind=()=>Object.fromEntries([...new Set([...inputs,BASELINE,'docs/rules/manifest.json',`docs/mechanism-rules-v${VERSION}.md`,
  'tools/adopt-remake31to40-v147.mjs','tools/remake31to40-v147.mjs','tools/remake31to40-v146.mjs',...Object.keys(sourceCatalog().bindings)])].map(p=>[p,digest(fs.readFileSync(p))]));
if(mode==='prepare'){
  const candidates=args.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
  const ids=candidates.map(c=>c.data.level.id);assert(ids.length&&new Set(ids).size===ids.length&&ids.every(id=>IDS.includes(id)));
  const folder=`${OUTPUT}/batch-${Date.now()}`,m={ruleVersion:VERSION,createdAt:new Date().toISOString(),ids,rows:[],baseline:BASELINE,baselineSha256:digest(fs.readFileSync(BASELINE)),
    campaignBefore:structuredClone(api.LEVELS),campaignBeforeSha256:digest(api.LEVELS),unchangedOutsideSubsetSha256:digest(api.LEVELS.filter(l=>!ids.includes(l.id))),inputs:bind(),humanBlindTested:false,releaseApproved:false};
  for(const {file,data}of candidates){
    const checks=checkCandidate(data,baseline,api),candidatePath=`${folder}/lv${data.level.id}.json`,checksPath=`${folder}/lv${data.level.id}-checks.json`;
    writeNew(candidatePath,data);writeNew(checksPath,checks);
    m.rows.push({id:data.level.id,source:file,sourceSha256:digest(fs.readFileSync(file)),candidatePath,candidateFileSha256:digest(fs.readFileSync(candidatePath)),checksPath,checksSha256:digest(fs.readFileSync(checksPath)),
      levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:checks.lowerBound,upperBound:checks.upperBound,starAssessment:checks.starAssessment});
    console.log(JSON.stringify({id:data.level.id,status:'candidate-pass',L:checks.lowerBound,U:checks.upperBound}));
  }
  const manifestPath=`${folder}/manifest.json`;writeNew(manifestPath,m);console.log(JSON.stringify({manifestPath,ids}));
}else if(mode==='verify'){
  const [file]=args,m=JSON.parse(fs.readFileSync(file));assert.equal(m.ruleVersion,VERSION);assert.equal(m.baselineSha256,digest(fs.readFileSync(BASELINE)));
  assert.equal(digest(m.campaignBefore),m.campaignBeforeSha256);assert.deepEqual(m.rows.map(r=>r.id),m.ids);
  assert.equal(new Set(m.ids).size,m.ids.length);assert(m.ids.every(id=>IDS.includes(id)));
  assert.equal(api.LEVELS.length,200);assert.equal(digest(api.LEVELS.filter(l=>!m.ids.includes(l.id))),m.unchangedOutsideSubsetSha256,'Do not overwrite concurrent batches');
  const rows=[];
  for(const row of m.rows){
    assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);assert.equal(digest(fs.readFileSync(row.checksPath)),row.checksSha256);
    const data=JSON.parse(fs.readFileSync(row.candidatePath));assert.deepEqual(api.LEVELS[row.id-1],data.level);
    assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
    const result=checkCandidate({...data,level:api.LEVELS[row.id-1]},baseline,api);rows.push(result);
    console.log(JSON.stringify({id:row.id,status:'formal-pass',L:result.lowerBound,U:result.upperBound}));
  }
  const reportPath=`${OUTPUT}/formal-verification-${Date.now()}.json`;
  writeNew(reportPath,{status:'PASS',ruleVersion:VERSION,manifestPath:file,manifestSha256:digest(fs.readFileSync(file)),rows,inputs:bind(),
    campaignSha256:digest(api.LEVELS),outsideSubsetUnchanged:true,protected1to30Unchanged:digest(api.LEVELS.slice(0,30))===digest(baseline.levels.slice(0,30).map(r=>r.level)),
    pointerValidated:false,humanBlindTested:false,releaseApproved:false});
  console.log(JSON.stringify({reportPath,status:'PASS'}));
}else throw Error('Usage: prepare CANDIDATE_FILES | verify MANIFEST');
