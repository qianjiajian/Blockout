import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,checkCandidate,baseline,OUTPUT,ruleGate} from './remake141to150-v173.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {inspectDisjointWiring,inspectScopedAxisChange} from './remake121to130-wiring-drift.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {verifyQualification} from './campaign-v145/lv141-150/round2-b/qualification-gate.mjs';
ruleGate();const {api}=await loadApi(),fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake141to150-v173.json'));
const ids=fixture.rows.map(r=>r.id),b=baseline(),rows=[],reports=[],decisions=[];
for(const name of fs.readdirSync(OUTPUT).filter(n=>/^decision-verification-\d+\.json$/.test(n)).sort().reverse()){const file=OUTPUT+'/'+name,d=JSON.parse(fs.readFileSync(file));if(d.passed)for(const row of d.rows)decisions.push({file,sha256:digest(fs.readFileSync(file)),row});}
for(const e of fs.readdirSync(OUTPUT,{withFileTypes:true}))if(e.isDirectory()&&e.name.startsWith('pointer-')){const file=OUTPUT+'/'+e.name+'/report.json';if(!fs.existsSync(file))continue;const d=JSON.parse(fs.readFileSync(file));if(d.status==='PASS'&&!d.candidateOnly&&d.formalDataValidated)reports.push({file,data:d});}
reports.sort((a,b)=>b.file.localeCompare(a.file));
const driftChecked=new Map();
function checkRuntime(file,r){
 if(driftChecked.has(file))return driftChecked.get(file);const changes=[];
 for(const[p,h]of Object.entries(r.bindings))if(/^(src\/|public\/assets\/art\/)/.test(p)&&digest(fs.readFileSync(p))!==h){
  const old=fs.readFileSync(path.join(r.sourceSnapshot,p),'utf8');assert.equal(digest(Buffer.from(old)),h);
  if(['src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(p))changes.push(inspectDisjointWiring(p,r.requestedIds,old));
  else if(p==='src/core/axisRectangularRepairs.ts')changes.push(inspectScopedAxisChange(p,r.requestedIds,old));
  else if(/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+)\.ts$/.test(p))changes.push(inspectDisjointData(p,r.requestedIds,old));
  else assert.fail('Formal runtime/art drift: '+p);
 }
 for(const[p,h]of Object.entries(r.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,'Source binding drift '+p);
 driftChecked.set(file,changes);return changes;
}
for(const row of fixture.rows){
 const d=JSON.parse(fs.readFileSync(row.candidate)),l=api.LEVELS[row.id-1];assert.deepEqual(l,d.level);assert.deepEqual(row.drags,d.drags);
 const qualificationGate=verifyQualification(d),checked=await checkCandidate(d,b,api),views=new Set(),pointer=[];
 if(qualificationGate){assert.equal(checked.proof.sourceHash,qualificationGate.sourceHash);assert.equal(checked.proof.wrapperHash,qualificationGate.wrapperHash);qualificationGate.candidateFloorRecomputed=true;}
 for(const {file,data:r}of reports){const v=JSON.stringify(r.viewport),p=r.rows.find(x=>x.id===row.id);if(views.has(v)||p?.status!=='PASS'||p.levelSha256!==digest(l)||p.routeSha256!==digest(d.drags))continue;
  assert(r.naturalClock&&!r.clockFrozen&&!r.playerSaveTouched);assert.deepEqual(r.errors,[]);assert(p.formalObjectIdentity&&!p.candidateOverlay&&p.oldStarTargetsPreserved);assert(p.naturalTimingReplay.passed&&p.naturalTimingReplay.wholeModelReplay);assert(p.nativeDrawAudit.calls>0&&p.nativeDrawAudit.rotated===0&&p.nativeDrawAudit.canvasRotationCalls===0);assert(p.final.complete&&!p.final.failed&&p.final.remainingSeconds>0);assert.equal(p.nonClearingDrags,checked.upperBound);assert.equal(p.steps.length,d.drags.length);
  const log=path.join(path.dirname(file),'lv'+row.id+'-observed-timing.json');assert.equal(digest(JSON.parse(fs.readFileSync(log))),p.naturalTimingReplay.logSha256);
  pointer.push({file,reportSha256:digest(fs.readFileSync(file)),viewport:r.viewport,activeSeconds:p.naturalTimingReplay.activeSeconds,remainingSeconds:p.final.remainingSeconds,acceptedDataDrift:checkRuntime(file,r)});views.add(v);if(pointer.length===2)break;
 }
 assert.equal(pointer.length,2,'Two final formal viewports required for '+row.id);
 const decision=decisions.find(x=>x.row.id===row.id&&x.row.levelSha256===digest(l)&&x.row.routeSha256===digest(d.drags));assert(decision&&decision.row.cases.length>=2,'Strict decisions required for '+row.id);assert.equal(digest(fs.readFileSync(decision.row.decisionFile)),decision.row.decisionFileSha256);assert(decision.row.cases.every(c=>c.complete&&c.positiveTime.valid&&c.positiveTime.complete));
 rows.push({id:row.id,candidate:row.candidate,levelSha256:digest(l),routeSha256:digest(d.drags),L:checked.lowerBound,U:checked.upperBound,drags:d.drags.length,starAssessment:checked.starAssessment,proof:checked.proof,qualificationGate,pointer,decision});
}
const output=OUTPUT+'/formal-verified-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify({ruleVersion:ruleGate().activeVersion,passed:true,ids,completeTenLevelBatch:ids.length===10,rows,playerSaveTouched:false,released:false},null,2),{flag:'wx'});console.log(JSON.stringify({output,ids,passed:true,completeTenLevelBatch:ids.length===10}));
