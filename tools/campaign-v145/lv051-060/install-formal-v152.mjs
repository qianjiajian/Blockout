import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadApi} from '../../native-block-repair-v143.mjs';

const batch='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const summaryFile=`${batch}/summary.json`;
const payloadFile=`${batch}/formal-integration-payload-v151.json`;
const baselineFile='deliverables/remake31-200-v145-20260924/baseline.json';
const modulePath='src/core/remake51to60.ts';
const levelsPath='src/core/levels.ts';
const artPath='src/game/formalBlockShapes.ts';
const fixturePath='tests/fixtures/native-remake51to60-v152.json';
const ids=[51,52,53,54,55,56,57,58,60];
const lock=verifyRulesLock();
assert(lock.ok&&lock.activeVersion==='1.52.0','Current active v1.52 lock required');
const summary=JSON.parse(fs.readFileSync(summaryFile));
assert.equal(summary.rulesLock,'PASS');
assert.deepEqual(summary.candidatePass,ids.filter(id=>id!==58));
assert.deepEqual(summary.candidatePassUserException,[58]);
assert.deepEqual(summary.formalEligible,ids);
const payload=JSON.parse(fs.readFileSync(payloadFile));
assert.deepEqual(payload.candidateRecords.map(r=>r.id),ids);
assert.deepEqual(payload.pendingRecords.map(r=>r.id),[59]);
const baseline=JSON.parse(fs.readFileSync(baselineFile));
assert.equal(digest(baseline.levels.map(r=>r.level)),'e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb');
const rows=ids.map(id=>summary.rows.find(r=>r.id===id));
for(const row of rows){
  assert(row&&['CANDIDATE_PASS','CANDIDATE_PASS_USER_EXCEPTION'].includes(row.status));
  assert.equal(row.formalAdopted,false);
  assert.equal(row.source,'PASS');assert.equal(row.static,'PASS');assert.equal(row.native,'PASS');assert.equal(row.route,'PASS');assert.equal(row.decisions,'PASS');assert.equal(row.pointer,'PASS');
  const candidate=JSON.parse(fs.readFileSync(row.candidate));
  assert.equal(candidate.level.id,row.id);assert.equal(digest(fs.readFileSync(row.candidate)),row.candidateSha256);
  assert.equal(digest(candidate.level),row.levelSha256);assert.equal(digest(candidate.drags),row.routeSha256);
  assert.equal(candidate.replay?.valid,true);assert.equal(candidate.replay?.complete,true);assert.equal(candidate.replay?.nonClearingDrags,row.U);
  const old=baseline.levels[row.id-1];
  for(const key of ['width','height','playable','blocked','seams','id','name','timeSeconds','reward','parMoves'])assert.deepEqual(candidate.level[key],old.level[key],`Lv${row.id} preserved ${key}`);
  if(row.id===58){assert.equal(row.floor,'WAIVED_BY_USER');assert.equal(row.L,null);}
  else {assert.equal(row.floor,'PASS');if(row.lowerBoundCertified!==undefined)assert.equal(row.lowerBoundCertified,true);assert(Number.isInteger(row.L));}
}
const {api}=await loadApi();
const campaignBefore=structuredClone(api.LEVELS);
for(const row of rows){const candidate=JSON.parse(fs.readFileSync(row.candidate));assert.doesNotThrow(()=>api.validateLevel(candidate.level));const replay=api.replayRevisedRoute(candidate.level,candidate.drags);assert(replay.valid&&replay.complete,`Lv${row.id} route`);}
const prior={module:fs.existsSync(modulePath)?fs.readFileSync(modulePath,'utf8'):null,levels:fs.readFileSync(levelsPath,'utf8'),art:fs.readFileSync(artPath,'utf8'),fixture:fs.existsSync(fixturePath)?fs.readFileSync(fixturePath,'utf8'):null};
assert(!prior.levels.includes('applyRemake51to60'),'51–60 formal layer already present');
assert(!prior.art.includes('REMADE_51_60_IDS'),'51–60 art layer already present');
const candidateById=Object.fromEntries(rows.map(row=>[String(row.id),JSON.parse(fs.readFileSync(row.candidate)).level]));
const moduleText=`// v1.52 formal adoption of the independently validated 51–60 subset; Lv59 remains pending and retains its preceding level.\nimport type {LevelSpec} from './types';\nexport const REMADE_51_60_IDS: readonly number[] = ${JSON.stringify(ids)};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(candidateById,null,2)};\nexport const applyRemake51to60 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
let levels=prior.levels;
levels=`import { applyRemake51to60 } from "./remake51to60";\n`+levels;
const stageLine='export const LEVELS_BEFORE_91_100_REMAKE: LevelSpec[] = LEVELS_BEFORE_41_50_REMAKE.map(applyRemake41to50);';
assert(levels.includes(stageLine),'Expected 41–50 stage line');
levels=levels.replace(stageLine,'export const LEVELS_BEFORE_51_60_REMAKE: LevelSpec[] = LEVELS_BEFORE_41_50_REMAKE.map(applyRemake41to50);\nexport const LEVELS_BEFORE_91_100_REMAKE: LevelSpec[] = LEVELS_BEFORE_51_60_REMAKE.map(applyRemake51to60);');
let art=prior.art;
art=`import { REMADE_51_60_IDS } from "../core/remake51to60";\n`+art;
const nativeNeedle=' || REMADE_41_50_IDS.includes(levelId)';
assert.equal(art.split(nativeNeedle).length,2);
art=art.replace(nativeNeedle,' || REMADE_51_60_IDS.includes(levelId)'+nativeNeedle);
const fixture={ruleVersion:'1.52.0',inheritedContract:'v1.51.0-for-51-60',rows:rows.map(row=>{const c=JSON.parse(fs.readFileSync(row.candidate));return{id:row.id,level:c.level,drags:c.drags,lowerBound:row.L,upperBound:row.U,totalDrags:c.drags.length,levelSha256:row.levelSha256,routeSha256:row.routeSha256,candidate:row.candidate,exception:row.id===58?'user-waived-below-11-floor':null};})};
// Refuse concurrent shared writes immediately before the production mutation.
assert.equal(fs.readFileSync(levelsPath,'utf8'),prior.levels);assert.equal(fs.readFileSync(artPath,'utf8'),prior.art);if(prior.module!==null)assert.equal(fs.readFileSync(modulePath,'utf8'),prior.module);
fs.writeFileSync(modulePath,moduleText);fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');fs.writeFileSync(levelsPath,levels);fs.writeFileSync(artPath,art);
const fresh=await loadApi();
for(const l of fresh.api.LEVELS){const row=rows.find(r=>r.id===l.id);assert.equal(digest(l),digest(row?JSON.parse(fs.readFileSync(row.candidate)).level:campaignBefore[l.id-1]),`Post-install Lv${l.id}`);}
assert.deepEqual(fresh.api.LEVELS.slice(0,30),campaignBefore.slice(0,30));assert.equal(fresh.api.LEVELS.length,200);
const stamp=Date.now(),report={status:'INSTALLED_AWAITING_FORMAL_POINTER',activeRuleVersion:lock.activeVersion,inheritedBatchRuleVersion:'1.51.0',ids,candidateFiles:Object.fromEntries(rows.map(r=>[r.id,r.candidate])),pendingIds:[59],campaignBeforeSha256:digest(campaignBefore),campaignAfterSha256:digest(fresh.api.LEVELS),moduleSha256:digest(fs.readFileSync(modulePath)),fixtureSha256:digest(fs.readFileSync(fixturePath)),levelsSha256:digest(fs.readFileSync(levelsPath)),artSha256:digest(fs.readFileSync(artPath)),otherLevelsPreserved:true,protected1to30Preserved:true,formalPointerValidated:false,releaseApproved:false,playerSaveTouched:false,productionLevelWrite:true,createdAt:new Date().toISOString()};
const reportFile=`${batch}/formal-install-v152-${stamp}.json`;fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({reportFile,status:report.status,ids,pendingIds:[59],campaignAfterSha256:report.campaignAfterSha256}));
