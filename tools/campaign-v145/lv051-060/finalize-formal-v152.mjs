import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadApi} from '../../native-block-repair-v143.mjs';

const batch='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const summaryFile=`${batch}/summary.json`;
const installFile='deliverables/remake31-200-v145-20260924/batches/lv051-060/formal-install-v152-1790322592470.json';
const pointer496=`${batch}/pointer-isolated-1790324280194/report.json`;
const pointer320=`${batch}/pointer-isolated-1790324734050/report.json`;
const fixtureFile='tests/fixtures/native-remake51to60-v152.json';
const ids=[51,52,53,54,55,56,57,58,60];
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.52.0');
const summary=JSON.parse(fs.readFileSync(summaryFile)); const install=JSON.parse(fs.readFileSync(installFile));
assert.equal(install.status,'INSTALLED_AWAITING_FORMAL_POINTER');assert.deepEqual(install.ids,ids);assert.deepEqual(install.pendingIds,[59]);
const reports=[pointer496,pointer320].map(p=>({path:p,data:JSON.parse(fs.readFileSync(p))}));
const sourceAudit=[];
const oldStages='export const LEVELS_BEFORE_51_60_REMAKE: LevelSpec[] = LEVELS_BEFORE_41_50_REMAKE.map(applyRemake51to60);\nexport const LEVELS_BEFORE_91_100_REMAKE: LevelSpec[] = LEVELS_BEFORE_51_60_REMAKE.map(applyRemake41to50);';
const namedStages='export const LEVELS_BEFORE_51_60_REMAKE: LevelSpec[] = LEVELS_BEFORE_41_50_REMAKE.map(applyRemake41to50);\nexport const LEVELS_BEFORE_91_100_REMAKE: LevelSpec[] = LEVELS_BEFORE_51_60_REMAKE.map(applyRemake51to60);';
for(const {path:reportPath,data} of reports){
  const changes=[];
  for(const [file,expected] of Object.entries(data.sourceCapture)){
    const actual=fs.readFileSync(file),actualHash=digest(actual);
    if(actualHash===expected)continue;
    assert.equal(file,'src/core/levels.ts',`Runtime drift after Pointer: ${file}`);
    const contents=actual.toString('utf8');assert(contents.includes(namedStages));
    assert.equal(digest(contents.replace(namedStages,oldStages)),expected,'Only the two disjoint remake stage calls may exchange order');
    changes.push({file,before:expected,after:actualHash,reason:'Stage names aligned with pre-remake contents; final 200-level data hash remains identical.'});
  }
  sourceAudit.push({reportPath,filesChecked:Object.keys(data.sourceCapture).length,changes});
}
for(const {data}of reports){assert.equal(data.status,'PASS');assert.equal(data.ruleVersion,'1.52.0');assert.equal(data.candidateInjected,false);assert.equal(data.formalAdopted,true);assert.equal(data.formalDataValidated,true);assert.equal(data.clockFrozen,false);assert.equal(data.playerSaveTouched,false);assert.deepEqual(data.errors,[]);assert.deepEqual(data.drift,[]);assert.deepEqual(data.requestedIds,ids);assert.equal(data.rows.length,ids.length);}
const apiLoaded=await loadApi();const api=apiLoaded.api;const formalRows={};
assert.equal(digest(api.LEVELS),install.campaignAfterSha256,'Final campaign retains the validated data');
for(const id of ids){
  const row=summary.rows.find(r=>r.id===id);assert(row);
  const bytes=fs.readFileSync(row.candidate),candidate=JSON.parse(bytes);
  assert.equal(digest(bytes),row.candidateSha256,`Candidate file hash ${id}`);
  assert.equal(digest(candidate.drags),row.routeSha256,`Candidate route hash ${id}`);
}
for(const id of ids){const row=summary.rows.find(r=>r.id===id);assert(row);const candidate=JSON.parse(fs.readFileSync(row.candidate));const formal=api.LEVELS[id-1];assert.equal(digest(formal),row.levelSha256,`formal level hash ${id}`);assert.deepEqual(formal,candidate.level,`formal level data ${id}`);const route=api.replayRevisedRoute(formal,candidate.drags);assert(route.valid&&route.complete);const pointerRows=reports.map(x=>x.data.rows.find(r=>r.id===id));for(const pr of pointerRows){assert.equal(pr.status,'PASS');assert.equal(pr.formalObjectIdentity,true);assert.equal(pr.candidateInjected,false);assert.equal(pr.candidateOverlay,false);assert.equal(pr.levelSha256,row.levelSha256);assert.equal(pr.routeSha256,row.routeSha256);assert(pr.final?.complete&&!pr.final?.failed);assert(pr.naturalTimingReplay?.passed);assert(pr.nativeDrawAudit?.calls>0);assert.equal(pr.nativeDrawAudit.rotated,0);assert.equal(pr.nativeDrawAudit.canvasRotationCalls,0);assert(pr.final.remainingSeconds>0);}formalRows[id]={pointer496,pointer320,formalLevelSha256:row.levelSha256,formalRouteSha256:row.routeSha256,naturalClock:true};}
const fixture=JSON.parse(fs.readFileSync(fixtureFile));fixture.formalPointerReports={viewport496x1078:pointer496,viewport320x568:pointer320};fixture.formalAdoptedIds=ids;fixture.formalAdopted=true;fs.writeFileSync(fixtureFile,JSON.stringify(fixture,null,2)+'\n');
for(const row of summary.rows.filter(r=>ids.includes(r.id))){row.formalAdopted=true;row.formalIntegrationRuleVersion='1.52.0';row.formalPointerValidated=true;}
for(const id of ids){const row=summary.rows.find(r=>r.id===id);row.formalPointerReports={viewport496x1078:pointer496,viewport320x568:pointer320};}
summary.updatedAt=new Date().toISOString();summary.formalIntegrationRuleVersion='1.52.0';summary.formalAdoptedIds=ids;summary.formalAdopted=true;summary.productionLevelWrite=true;summary.finalProductionPointerValidated=true;summary.published=false;summary.pendingIds=[59];
fs.writeFileSync(summaryFile,JSON.stringify(summary,null,2)+'\n');
const candidateRecords=ids.map(id=>{const r=summary.rows.find(x=>x.id===id);return{id,status:r.status,candidate:r.candidate,candidateSha256:r.candidateSha256,levelSha256:r.levelSha256,routeSha256:r.routeSha256,L:r.L??null,U:r.U,totalDrags:r.totalDrags,source:r.source,static:r.static,native:r.native,route:r.route,floor:r.floor,decisions:r.decisions,pointer:'PASS',formalAdopted:true,formalPointerReports:r.formalPointerReports,userException:r.userException??null,rangeException:r.rangeException??null};});
const pending=summary.rows.filter(r=>!ids.includes(r.id)).map(r=>({id:r.id,status:r.status,L:r.L??null,U:r.U,totalDrags:r.totalDrags,latestProof:r.latestProof,missing:r.missing}));
const payload={schemaVersion:1,ruleVersion:'1.52.0',inheritedCandidateRuleVersion:'1.51.0',createdAt:new Date().toISOString(),scope:[51,60],candidateRecords,pendingRecords:pending,production:{formalAdopted:true,productionLevelWrite:true,finalProductionPointerValidated:true,published:false,formalAdoptedIds:ids},reports:{install:installFile,viewport496x1078:pointer496,viewport320x568:pointer320},limits:['Lv59 remains excluded because L16 is UNKNOWN.','Lv58 remains eligible under the recorded user exception and does not claim an L11 certificate.','Formal Pointer is current v1.52 and uses the exact production LEVELS objects; releaseApproved remains false.']};
const payloadFile=`${batch}/formal-integration-payload-v152.json`;fs.writeFileSync(payloadFile,JSON.stringify(payload,null,2)+'\n');
const out={status:'FORMAL_LEVEL_COMPLETE',activeRuleVersion:'1.52.0',inheritedCandidateRuleVersion:'1.51.0',ids,pendingIds:[59],installFile,pointerReports:[pointer496,pointer320],productionLevelWrite:true,formalPointerValidated:true,releaseApproved:false,playerSaveTouched:false,campaignSha256:digest(api.LEVELS),reports:{viewport496x1078:pointer496,viewport320x568:pointer320},createdAt:new Date().toISOString()};
out.sourceAudit=sourceAudit;
out.productionFileHashes=Object.fromEntries(['src/core/levels.ts','src/core/remake51to60.ts','src/game/formalBlockShapes.ts',fixtureFile].map(file=>[file,digest(fs.readFileSync(file))]));
const reportFile=`${batch}/formal-adoption-v152-${Date.now()}.json`;fs.writeFileSync(reportFile,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({reportFile,payloadFile,status:out.status,ids,pendingIds:[59],campaignSha256:out.campaignSha256}));
