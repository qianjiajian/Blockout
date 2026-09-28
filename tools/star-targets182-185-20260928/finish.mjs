import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {loadApi,replay} from '../remake182-185-20260927/replay.mjs';
import {replayTiming} from '../remake182-185-20260927/observed-timing.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';
const ROOT='deliverables/star-targets182-185-20260928';
const files=process.argv.slice(2);assert.equal(files.length,4,'Four independently completed score input runs');
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version==='1.111.0'));
const before=JSON.parse(fs.readFileSync(ROOT+'/before.json')),applied=JSON.parse(fs.readFileSync(ROOT+'/applied.json'));
const {api}=await loadApi(),packets=Object.fromEntries([182,185].map(id=>[id,JSON.parse(fs.readFileSync(ROOT+`/packets/level${id}.json`))]));
assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[181])),packets[182].level);
assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[184])),before.levels[184].level,'185 remains original formal data');
assert.equal(digest(fs.readFileSync(before.modulePath)),applied.moduleAfterSha256,'Only this stage score addition');
for(const[p,h]of Object.entries(before.oldEvidence))assert.equal(digest(fs.readFileSync(p)),h,'Old evidence '+p);
const rows=[];
for(const file of files){
 const r=JSON.parse(fs.readFileSync(file));assert.equal(r.status,'PASS');assert.deepEqual(r.errors,[]);assert(r.naturalClock&&!r.clockFrozen&&!r.playerSaveTouched);assert.equal(r.rows.length,1);
 const row=r.rows[0],id=row.id,p=packets[id];assert(p);assert.equal(r.candidateOnly,id===185);assert.equal(r.formalDataValidated,id===182);assert.equal(row.formalObjectIdentity,id===182);assert.equal(row.candidateOverlay,id===185);assert.equal(row.sourceApprovalInferred,false);
 assert.equal(row.levelSha256,digest(p.level));assert.equal(row.routeSha256,digest(p.drags));assert.equal(row.status,'PASS');assert(row.final.complete&&!row.final.failed);
 assert.equal(row.actualStars,3);assert.equal(row.settlement.earnedStars,3);assert.equal(row.settlement.storage.save.bestStars[String(id)],3);assert.equal(row.settlement.storage.save.bestMoves[String(id)],p.drags.length);
 assert.equal(row.settlement.storage.backend,'MemoryHost');assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
 const score=api.levelStarTargets(p.level);assert.equal(row.settlement.conditions.moveTarget,score.moveTarget);assert.equal(row.settlement.conditions.timeTargetSeconds,score.timeTargetSeconds);
 assert(row.settlement.texts.includes(`${score.moveTarget}次拖动内完成`));assert(row.settlement.texts.includes(`${score.timeTargetSeconds}秒内完成`));assert.equal(row.settlement.starImages.filter(s=>!s.startsWith('empty')).length,3);
 const continuity=[];
 for(const[fileName,h]of Object.entries(r.bindings)){
  const old=fs.readFileSync(path.join(r.sourceSnapshot,fileName));assert.equal(digest(old),h);
  if(digest(fs.readFileSync(fileName))===h)continue;
  assert(/^src\/core\/(remake\d+to\d+|nativeRemake31to40)\.ts$/.test(fileName),'Unreviewed source drift '+fileName);
  continuity.push(inspectDisjointData(fileName,[182,185],old.toString('utf8')));
 }
 const timingFile=path.join(path.dirname(file),`lv${id}-observed-timing.json`),timing=replayTiming(p.level,JSON.parse(fs.readFileSync(timingFile)),api);
 const route=replay(p.level,p.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.effectiveDrags,score.moveTarget);
 rows.push({id,mode:p.mode,viewport:r.viewport,report:file,reportSha256:digest(fs.readFileSync(file)),levelSha256:digest(p.level),routeSha256:digest(p.drags),score,elapsedSeconds:row.settlement.conditions.elapsedSeconds,stars:3,bestMoves:p.drags.length,timingFile,timingFileSha256:digest(fs.readFileSync(timingFile)),timing,continuity,completeImage:path.join(path.dirname(file),`lv${id}-complete.png`)});
}
for(const id of [182,185])assert.deepEqual(rows.filter(r=>r.id===id).map(r=>r.viewport.width).sort((a,b)=>a-b),[320,496]);
const out=ROOT+'/root-input-review-'+Date.now()+'.json';
fs.writeFileSync(out,JSON.stringify({createdAt:new Date().toISOString(),status:'PASS_182_FORMAL_185_CANDIDATE_SCORE_INPUTS',ruleVersion:lock.activeVersion,rows,oldEvidenceUnchanged:true,formal185Unchanged:true,sourceInitialPhaseAcceptancePending:true,playerSaveTouched:false,published:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,rows:rows.map(({id,mode,viewport,elapsedSeconds,stars})=>({id,mode,width:viewport.width,elapsedSeconds,stars}))}));
