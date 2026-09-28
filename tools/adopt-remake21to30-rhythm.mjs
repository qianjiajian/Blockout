// Prepare immutable reviewed inputs, or re-verify the final production LEVELS.
// This tool deliberately never writes production source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IDS,VERSION,OUTPUT,BASELINE,loadApi,ruleGate,assertBaseline,checkCandidate,writeNew} from './remake21to30-rhythm.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [mode,...args]=process.argv.slice(2);
ruleGate();const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(baseline);
const extra=['tools/adopt-remake21to30-rhythm.mjs','tools/remake21to30-rhythm.mjs','tools/remake21to30-counter-reference.mjs',
  'tools/remake21to30-mask-floor.mjs','tools/review-remake21to30-decisions.mjs','tools/revised-hidden-coverage.mjs',
  'tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs','docs/rules/manifest.json',`docs/mechanism-rules-v${VERSION}.md`,
  'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json'];
const bind=()=>Object.fromEntries([...new Set([...inputs,...extra])].map(p=>[p,digest(fs.readFileSync(p))]));
if(mode==='prepare'){
  assert.equal(args.length,10);assert.equal(digest(api.LEVELS),baseline.campaignSha256,'Concurrent formal edits must not be overwritten');
  const sources=args.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
  assert.deepEqual(sources.map(s=>s.data.level.id),IDS);
  const accepted=[];
  for(const {file,data} of sources){
    const checks=checkCandidate(data,baseline,api);accepted.push({file,data,checks});
    console.log(JSON.stringify({id:data.level.id,status:'candidate-pass',lower:checks.lowerBound,upper:checks.upperBound,stars:checks.starAssessment}));
  }
  const folder=`${OUTPUT}/batch-${Date.now()}`,manifest={ruleVersion:VERSION,createdAt:new Date().toISOString(),baseline:BASELINE,
    baselineSha256:digest(fs.readFileSync(BASELINE)),ids:IDS,other190Sha256:baseline.other190Sha256,rows:[],inputs:bind(),humanBlindTested:false,releaseApproved:false};
  for(const {file,data,checks}of accepted){
    const candidatePath=`${folder}/lv${data.level.id}.json`,checksPath=`${folder}/lv${data.level.id}-checks.json`;
    writeNew(candidatePath,data);writeNew(checksPath,checks);
    manifest.rows.push({id:data.level.id,source:file,sourceSha256:digest(fs.readFileSync(file)),candidatePath,candidateFileSha256:digest(fs.readFileSync(candidatePath)),
      checksPath,checksSha256:digest(fs.readFileSync(checksPath)),levelSha256:digest(data.level),routeSha256:digest(data.drags),
      lowerBound:checks.lowerBound,upperBound:checks.upperBound,target:checks.target,starAssessment:checks.starAssessment});
  }
  // Preserve construction programs too; source filenames/seed strings alone
  // are not reproducible evidence if a working search script later changes.
  const sourceDirs=[...new Set(accepted.map(r=>r.file.replaceAll('\\','/').replace(/\/[^/]+$/,'')))];
  const programs=sourceDirs.flatMap(dir=>fs.readdirSync(dir).filter(name=>name.endsWith('.mjs')).map(name=>{
    const file=`${dir}/${name}`;return {file,sha256:digest(fs.readFileSync(file)),source:fs.readFileSync(file,'utf8')};
  }));
  const archivePath=`${folder}/construction-sources.json`;writeNew(archivePath,{createdAt:manifest.createdAt,programs});
  manifest.constructionArchive={path:archivePath,sha256:digest(fs.readFileSync(archivePath))};
  const manifestPath=`${folder}/manifest.json`;writeNew(manifestPath,manifest);console.log(JSON.stringify({manifestPath}));
}else if(mode==='verify'){
  const [manifestPath]=args,m=JSON.parse(fs.readFileSync(manifestPath));assert.equal(m.ruleVersion,VERSION);assert.deepEqual(m.ids,IDS);
  assert.deepEqual(m.rows.map(r=>r.id),IDS);assert.equal(m.baselineSha256,digest(fs.readFileSync(BASELINE)));
  assert.equal(digest(fs.readFileSync(m.constructionArchive.path)),m.constructionArchive.sha256);
  assert.equal(api.LEVELS.length,200);assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
  for(const l of api.LEVELS)assert.deepEqual(api.levelStarTargets(l),baseline.levels[l.id-1].starTargets);
  const other=api.LEVELS.filter(l=>!IDS.includes(l.id));assert.equal(digest(other),baseline.other190Sha256);
  const rows=[];
  for(const row of m.rows){
    assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);assert.equal(digest(fs.readFileSync(row.checksPath)),row.checksSha256);
    const data=JSON.parse(fs.readFileSync(row.candidatePath));assert.deepEqual(api.LEVELS[row.id-1],data.level);
    assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
    const checks=checkCandidate({...data,level:api.LEVELS[row.id-1]},baseline,api);rows.push(checks);
    assert.equal(checks.lowerBound,row.lowerBound);assert.equal(checks.upperBound,row.upperBound);
    console.log(JSON.stringify({id:row.id,status:'formal-pass',lower:checks.lowerBound,upper:checks.upperBound}));
  }
  const output=`${OUTPUT}/formal-verification-${Date.now()}.json`;
  writeNew(output,{status:'PASS',ruleVersion:VERSION,manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),rows,inputs:bind(),
    campaignSha256:digest(api.LEVELS),other190Sha256:digest(other),other190Unchanged:true,oldStarTargetsPreserved:true,pointerValidated:false,humanBlindTested:false,releaseApproved:false});
  console.log(JSON.stringify({output,status:'PASS',campaignSha256:digest(api.LEVELS)}));
}else throw Error('Usage: prepare TEN_FILES | verify MANIFEST');
