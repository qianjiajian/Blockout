// Fresh generation checks; historical candidate proofs are never accepted here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi,baseline} from './remake81to90-v151-local.mjs';
import {geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
export {loadApi,baseline};
export const ROOT='deliverables/remake84-88-90-v152-20260925';
export const TARGETS={84:{difficulty:'super',min:21,max:30},88:{difficulty:'hard',min:15,max:20},90:{difficulty:'normal',min:9,max:15}};
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.57.0'].includes(lock.activeVersion),'Unreviewed active rule version');return lock;}
export function freshBase(id){const b=baseline().levels[id-1],l=structuredClone(b.level);assert(TARGETS[id]);l.blocks=[];l.gates=[];delete l.shutters;delete l.generators;l.difficulty=TARGETS[id].difficulty;l.preservedMoveTarget=b.starTargets.moveTarget;return l;}
export function auditLayout(level,api,{requireOriginality=true}={}){
 const lock=ruleGate(),target=TARGETS[level.id];assert(target,'Only 84/88/90');
 const old=baseline().levels[level.id-1],mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(old.level),...Object.keys(level)]))if(!mutable.has(k))assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(level),old.geometry);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
 assert.equal(level.difficulty,target.difficulty);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');api.validateLevel(level);
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Locked or legacy ${k}`);
 for(const b of level.blocks){assert(!b.star&&!b.rotationBadge&&b.timedBombSeconds===undefined);assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0,`Native complete artwork ${b.id}`);}
 assert(level.gates.every(g=>!g.star));for(const s of level.shutters??[])assert((s.skin===undefined||['shutter','lift'].includes(s.skin))&&s.triggerBlockIds===undefined);
 const sourceOnly=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
 const issues=api.auditRevisedCandidate(level,undefined).issues.filter(i=>!(i.category==='source'&&sourceOnly.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 assert.deepEqual(issues,[],'Geometry/composition/mechanism checks');
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
 for(const [name,result]of Object.entries(checks))assert(result.passed,`${name}: ${JSON.stringify(result)}`);
 if(requireOriginality)assert(!isGlobalIsometry(old.level,level),'Recolour/isometry is not a new layout');
 return{passed:true,activeRuleVersion:lock.activeVersion,levelSha256:digest(level),target,checks,geometryPreserved:true,starTargetsPreserved:true,sourceAlignmentValidated:false,lowerBoundValidated:false,pointerValidated:false,adoptionReady:false};
}
export function checkWitness(data,api){const audit=auditLayout(data.level,api),replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags<=TARGETS[data.level.id].max);return {audit,replay,upperBound:replay.nonClearingDrags,routeSha256:digest(data.drags),lowerBoundValidated:false,adoptionReady:false};}
