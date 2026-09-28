import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
export {loadApi};
export const VERSION='1.72.0',BASELINE='deliverables/remake31-200-v145-20260924/baseline.json',OUTPUT='deliverables/remake131-140-v146-20260924';
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(r=>r.version===VERSION),'131–140 authoring instruction must stay frozen');return lock;}
const floors={131:5,132:11,133:16,134:5,135:11,136:21,137:5,138:11,139:11,140:16};
export function checkCandidate(data,baseline,api){
 const l=data.level,old=baseline.levels[l.id-1];assert(l.id>=131&&l.id<=140);
 assert.deepEqual(geometry(l),old.geometry);for(const k of ['name','timeSeconds','reward','parMoves'])assert.deepEqual(l[k],old.level[k],`Preserve ${k}`);
 assert.deepEqual(api.levelStarTargets(l),old.starTargets);assert.equal(l.mechanismRules,'revised-2026-09-23-v1.4');
 api.validateLevel(l);
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage(l),gates:auditGateSpanLimits(l),queue:auditGeneratorQueueColors(l),art:api.auditCandidateBlockArt(l)};
 for(const [k,v]of Object.entries(checks))assert(v.passed,`${k}: ${JSON.stringify(v)}`);
 assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),'All native artwork');
 for(const b of l.blocks)if(b.movementAxis){const xs=b.shape.map(p=>p[0]),ys=b.shape.map(p=>p[1]);assert.equal(new Set(b.shape.map(p=>p.join(','))).size,(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1),'Axes must be rectangles');}
 const legacy=api.auditRevisedCandidate(l,undefined),allowed=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);assert.deepEqual(legacy.issues.filter(r=>!allowed.has(r.code)),[]);
 const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete,replay.error);assert(replay.nonClearingDrags>=floors[l.id]&&replay.nonClearingDrags<=({5:10,11:15,16:20,21:30})[floors[l.id]],'Witness inside band');
 const sourceBindings={};assert(data.sourceReview,'Source review required');let review=data.sourceReview,sourceFile;
 if(review.ledger){sourceFile=review.ledger;assert.equal(digest(fs.readFileSync(sourceFile)),review.sha256);sourceBindings[sourceFile]=review.sha256;review=JSON.parse(fs.readFileSync(sourceFile));}
 for(const row of review.sources??[]){assert.equal(digest(fs.readFileSync(row.file)),row.sha256);sourceBindings[row.file]=row.sha256;}
 for(const [file,hash]of Object.entries(review.evidence??{})){assert.equal(digest(fs.readFileSync(file)),hash);sourceBindings[file]=hash;}
 for(const field of ['opening','hidden'])if(typeof review[field]==='string')sourceBindings[review[field]]=digest(fs.readFileSync(review[field]));
 assert(Object.keys(sourceBindings).length>=2,'At least opening and hidden reviewed evidence');
 return {levelSha256:digest(l),checks,replay,source:{sourceBindings,sourceFile},floorRequired:floors[l.id],lowerBoundCertified:false};
}
