// A later level's failure does not erase a completed earlier isolated page.
// Re-verify every binding and its recorded natural tick log, retain the failed
// parent report, and explicitly exclude every unfinished row. No input rerun.
import fs from 'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{loadApi,ruleGate,OUTPUT,writeNew}from'./remake41to50-v146.mjs';
import{digest}from'./revised-preview-validation-v160.mjs';
import{replayObservedModelTiming}from'./revised-model-timing-observer.mjs';
import{verifyAdditionalDataModule}from'./remake41to50-data-only-v146.mjs';
import{verifyObservedUnitPaths}from'./remake41to50-pointer-path-v146.mjs';
ruleGate();const[file,...idsText]=process.argv.slice(2),ids=idsText.map(Number),r=JSON.parse(fs.readFileSync(file)),{api}=await loadApi();assert(ids.length&&ids.every(id=>id>=41&&id<=50));assert.equal(new Set(ids).size,ids.length);assert.equal(r.candidateOnly,false);assert.equal(r.formalDataValidated,true);assert.equal(r.naturalClock,true);assert.equal(r.clockFrozen,false);assert.deepEqual(r.errors,[]);
const allowed=new Set(['src/core/nativeRemake31to40.ts','src/core/remake41to50.ts','src/core/remake61to70.ts','src/core/remake71to80.ts','src/core/remake81to90.ts','src/core/remake91to100.ts','src/core/remake181to190.ts']);
const drift=Object.entries(r.bindings).filter(([p,h])=>digest(fs.readFileSync(path.join(r.sourceSnapshot,p)))!==h);assert.deepEqual(drift,[]);
const sourceEvidenceDrift=Object.entries(r.sourceBindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(sourceEvidenceDrift,[]);
const currentWorkspaceDrift=Object.entries(r.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p,priorSha256])=>({path:p,priorSha256,currentSha256:digest(fs.readFileSync(p))}));
const additionalDataStages=[];for(const d of currentWorkspaceDrift)if(!allowed.has(d.path)){const before=verifyAdditionalDataModule(d.path,fs.readFileSync(path.join(r.sourceSnapshot,d.path),'utf8')),after=verifyAdditionalDataModule(d.path,fs.readFileSync(d.path,'utf8'));additionalDataStages.push({before,after});}
const rows=ids.map(id=>{const row=r.rows.find(r=>r.id===id);assert.equal(row?.status,'PASS');assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);assert.equal(row.steps.length,row.final.moves);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert(row.nativeDrawAudit.calls>0);assert(row.naturalTimingReplay?.passed);
 const d=JSON.parse(fs.readFileSync(row.candidate));assert.equal(digest(d.level),row.levelSha256);assert.equal(digest(d.drags),row.routeSha256);assert.deepEqual(api.LEVELS[id-1],d.level);
 const log=JSON.parse(fs.readFileSync(path.join(path.dirname(file),`lv${id}-observed-timing.json`))),fresh=replayObservedModelTiming(d.level,log,api);assert.deepEqual(JSON.parse(JSON.stringify(fresh)),row.naturalTimingReplay);verifyObservedUnitPaths(d.drags,log);return row;});
const out=`${OUTPUT}/completed-pointer-subset-${Date.now()}.json`;
const verifierBindings=Object.fromEntries(['tools/verify-remake41to50-completed-pointer-subset-v146.mjs','tools/remake41to50-data-only-v146.mjs','tools/remake41to50-pointer-path-v146.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));
const result={...r,status:'PASS',scope:'independently-reverified-completed-subset',requestedIds:ids,fullBatchValidated:false,rows,drift,sourceEvidenceDrift,currentWorkspaceDrift,additionalDataStages,verifierBindings,parentReport:{path:file,sha256:digest(fs.readFileSync(file)),status:r.status,error:r.error},excludedLevelIds:r.requestedIds.filter(id=>!ids.includes(id)),inputRerun:false,recordedNaturalTimingReplayedAgain:true,verifiedAt:new Date().toISOString()};delete result.error;delete result.lastState;writeNew(out,result);console.log(JSON.stringify({out,status:'PASS',ids,parentStatus:r.status,excluded:result.excludedLevelIds,inputRerun:false}));
