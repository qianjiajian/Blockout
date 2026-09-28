// Combine disjoint real-input runs only when every input remains identical.
// A partial/failed run or a changed shared source may never become a batch PASS.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {ruleGate,VERSION,IDS,OUTPUT,BASELINE,loadApi,writeNew} from './remake21to30-v139.mjs';
import {replayObservedModelTiming} from './revised-model-timing-observer.mjs';
ruleGate();
const [manifestPath,...reports]=process.argv.slice(2);
assert(manifestPath&&reports.length>0);
const manifest=JSON.parse(fs.readFileSync(manifestPath)),baseline=JSON.parse(fs.readFileSync(BASELINE));
assert.equal(manifest.ruleVersion,VERSION);assert.deepEqual(manifest.ids,IDS);
assert.deepEqual(manifest.rows.map(r=>r.id),IDS);
assert.equal(digest(fs.readFileSync(BASELINE)),manifest.baselineSha256);
assert.equal(manifest.other190Sha256,baseline.other190Sha256);
const {api,inputs}=await loadApi(),rows=[],bindings={},parts=[];
const relative=file=>path.relative(process.cwd(),path.resolve(file)).replaceAll('\\','/');
const tree=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const treeInputs=[...tree('src'),...tree('public/assets/art')];
const requiredInputs=[...treeInputs,...inputs,...Object.keys(manifest.inputs),...Object.keys(baseline.sources.bindings),
  BASELINE,'tools/playtest-remake21to30-v139.mjs'];
const candidatePaths=new Set(manifest.rows.map(r=>relative(r.candidatePath)));
let sharedKeys;
for(const file of reports){
  const report=JSON.parse(fs.readFileSync(file));
  assert.equal(report.status,'PASS');assert.equal(report.ruleVersion,VERSION);
  assert.equal(report.naturalClock,true);assert.equal(report.clockFrozen,false);
  assert.equal(report.playerSaveTouched,false);assert.deepEqual(report.errors,[]);assert.deepEqual(report.drift,[]);
  assert.deepEqual(report.rows.map(r=>r.id),report.requestedIds);
  for(const input of requiredInputs)assert(Object.hasOwn(report.bindings,relative(input)),`Missing required binding: ${input}`);
  const commonKeys=Object.keys(report.bindings).filter(k=>!candidatePaths.has(k)).sort();
  if(sharedKeys)assert.deepEqual(commonKeys,sharedKeys,'Different shared binding inventories');else sharedKeys=commonKeys;
  for(const [input,hash]of Object.entries(report.bindings)){
    assert.equal(digest(fs.readFileSync(input)),hash,`Current source drift: ${input}`);
    if(Object.hasOwn(bindings,input))assert.equal(bindings[input],hash,`Cross-run source drift: ${input}`);
    bindings[input]=hash;
  }
  for(const row of report.rows){
    const entry=manifest.rows.find(r=>r.id===row.id);assert(entry);
    assert.equal(relative(row.candidate),relative(entry.candidatePath));
    assert(Object.hasOwn(report.bindings,relative(row.candidate)));
    const candidate=JSON.parse(fs.readFileSync(row.candidate));
    assert.equal(digest(candidate.level),entry.levelSha256);assert.equal(digest(candidate.drags),entry.routeSha256);
    assert.deepEqual(candidate.level,api.LEVELS[row.id-1]);
    assert.equal(row.steps.length,candidate.drags.length);
    assert.equal(row.status,'PASS');assert.equal(row.formalObjectIdentity,true);assert.equal(row.oldStarTargetsPreserved,true);
    assert.equal(row.levelSha256,entry.levelSha256);assert.equal(row.routeSha256,entry.routeSha256);
    assert.equal(row.nonClearingDrags,entry.upperBound);assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);
    assert.equal(row.steps.length,row.final.moves);assert.equal(row.naturalTimingReplay.passed,true);
    assert(row.naturalClockProbe.after<row.naturalClockProbe.before);
    assert.equal(digest(api.LEVELS[row.id-1]),entry.levelSha256);
    assert.equal(digest(fs.readFileSync(row.candidate)),entry.candidateFileSha256);
    const timingPath=path.join(path.dirname(file),`lv${row.id}-observed-timing.json`);
    const timing=JSON.parse(fs.readFileSync(timingPath));
    assert.equal(digest(timing),row.naturalTimingReplay.logSha256);
    assert.equal(row.naturalTimingReplay.levelSha256,entry.levelSha256);
    assert.deepEqual(timing.final,row.final);assert.deepEqual(row.naturalTimingReplay.finalSnapshot,row.final);
    const replay=replayObservedModelTiming(candidate.level,timing,api);
    assert.equal(replay.logSha256,row.naturalTimingReplay.logSha256);
    // Recorded browser observations cross a JSON boundary. Compare the same
    // transport representation (optional own-undefined fields are omitted).
    assert.deepEqual(JSON.parse(JSON.stringify(replay.finalSnapshot)),row.final);
    rows.push({...row,sourceReport:file,timingPath,openingPng:path.join(path.dirname(file),`lv${row.id}-opening.png`),completePng:path.join(path.dirname(file),`lv${row.id}-complete.png`)});
  }
  parts.push({file,sha256:digest(fs.readFileSync(file)),viewport:report.viewport});
}
rows.sort((a,b)=>a.id-b.id);assert.deepEqual(rows.map(r=>r.id),IDS,'Exactly once each; no missing or duplicated level');
assert.equal(api.LEVELS.length,200);assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
assert.equal(digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),manifest.other190Sha256);
for(const l of api.LEVELS)assert.deepEqual(api.levelStarTargets(l),baseline.levels[l.id-1].starTargets);
const output=`${OUTPUT}/pointer-batch-${Date.now()}.json`;
writeNew(output,{status:'PASS',ruleVersion:VERSION,scope:'complete-21-30-batch',fullBatchValidated:true,
  manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),parts,rows,bindings,
  aggregatorSha256:digest(fs.readFileSync('tools/aggregate-remake21to30-pointer-v139.mjs')),
  campaignSha256:digest(api.LEVELS),other190Unchanged:true,naturalClock:true,clockFrozen:false,
  playerSaveTouched:false,humanBlindTested:false,phoneTested:false,releaseApproved:false});
console.log(JSON.stringify({output,status:'PASS',ids:IDS,totalDrags:rows.reduce((n,r)=>n+r.final.moves,0)}));
