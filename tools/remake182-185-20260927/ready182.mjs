import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {ROOT,digest,ruleGate,writeNew,auditSpatial} from './common.mjs';import {loadApi,replay} from './replay.mjs';
import {sourceCheck,mechanismCheck} from './author182/review.mjs';import {replayTiming} from './observed-timing.mjs';
import {search} from '../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';
const file=ROOT+'/author182/reviewed182-1790523598812.json',reviewFile=ROOT+'/review/candidate182-1790523820095.json';
const d=JSON.parse(fs.readFileSync(file)),review=JSON.parse(fs.readFileSync(reviewFile)),lock=ruleGate(),{api,inputs}=await loadApi();
assert.equal(review.status,'PASS_CANDIDATE182_INDEPENDENT_REVIEW');assert.equal(digest(d.level),review.levelSha256);assert.equal(digest(d.drags),review.routeSha256);
for(const [p,h]of Object.entries(review.bindings))assert.equal(digest(fs.readFileSync(p)),h,'Independent review binding '+p);
const spatial=auditSpatial(d.level,api),source=sourceCheck(d.level),mechanisms=mechanismCheck(d.level,d.drags),route=replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});
const lower=search({...d.level,mechanismRules:'revised-2026-09-23-v1.4'},{prove:true,floor:16,goalClears:4,maxStates:10000,maxMilliseconds:5000});assert(lower.thresholdProven);assert.equal(route.nonClearingDrags,20);
const names=['pointer-1790523479795-320x568-49696','pointer-1790523479795-496x1078-16592'],pointer=[];
for(const name of names){
 const dir=ROOT+'/'+name,reportFile=dir+'/report.json',report=JSON.parse(fs.readFileSync(reportFile)),row=report.rows.find(r=>r.id===182);assert.equal(report.status,'PASS');assert(report.candidateOnly&&!report.formalDataValidated);assert.deepEqual(report.errors,[]);assert.equal(row.levelSha256,digest(d.level));assert.equal(row.routeSha256,digest(d.drags));
 const continuity=[];for(const [p,h]of Object.entries(report.bindings)){
  const snap=path.join(report.sourceSnapshot,p),old=fs.readFileSync(snap);assert.equal(digest(old),h);if(digest(fs.readFileSync(p))===h)continue;
  if(/^src\/core\/(remake\d+to\d+|nativeRemake31to40)\.ts$/.test(p)){continuity.push(inspectDisjointData(p,[182],old.toString('utf8')));continue;}
  let restored=fs.readFileSync(p,'utf8');
  if(p==='src/game/formalBlockShapes.ts')restored=restored.replace("import { REMADE_191_200_IDS } from '../core/remake191to200';\n",'').replace(' || REMADE_191_200_IDS.includes(levelId)','');
  else if(p==='src/core/levels.ts')restored=restored.replace("import { applyRemake191to200 } from './remake191to200';\n",'').replace('export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);');
  else assert.fail('Unreviewed candidate Pointer source drift '+p);
  assert.equal(digest(Buffer.from(restored)),h,'Exact 191–200 inverse must restore Pointer bytes');continuity.push({file:p,exact191StageInverseRestored:true});
 }
 const timingFile=dir+'/lv182-observed-timing.json',timing=replayTiming(d.level,JSON.parse(fs.readFileSync(timingFile)),api);assert(row.final.complete&&row.final.remainingSeconds>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
 pointer.push({reportFile,sha256:digest(fs.readFileSync(reportFile)),viewport:report.viewport,timingFile,timing,continuity});
}
const row={id:182,file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),routeSha256:digest(d.drags),reviewFile,reviewSha256:digest(fs.readFileSync(reviewFile)),L:16,U:20,drags:48,spatial,lower,route,source,mechanisms,sourceStatus:'REVIEWED_KNOWN_FACTS_WITH_AUTHORIZED_SHAPE_COLOR_DIFFERENCES',sourceValidated:true,lowerBoundCertified:true,candidatePointerValidated:true,pointer,oldScore:api.levelStarTargets(d.level),oldMoveStarImpossible:true,guaranteedMinimumDrags:44};
const paths=[...inputs,file,reviewFile,...Object.keys(review.bindings),'tools/remake182-185-20260927/ready182.mjs','tools/remake182-185-20260927/author182/review.mjs'];
const out=ROOT+'/ready182-'+Date.now()+'.json';writeNew(out,{createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,status:'READY_FOR_FORMAL_ADOPTION',rows:[row],bindings:Object.fromEntries([...new Set(paths)].map(p=>[p,digest(fs.readFileSync(p))])),formal:false,release:false});console.log(JSON.stringify({out,L:16,U:20,total:48}));
