import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi} from '../../remake182-185-20260927/replay.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
export const ROOT='deliverables/star-targets182-185-20260928',VERSION='1.111.0';
export const baseline=JSON.parse(fs.readFileSync(ROOT+'/before.json'));
export const api=(await loadApi()).api;
export const ORIGINALS=Object.freeze({182:'deliverables/remake182-185-20260927/author182/reviewed182-1790523598812.json',185:'deliverables/remake182-185-20260927/author185/enriched-1790524540984.json'});
export const clean=v=>JSON.parse(JSON.stringify(v));
export const ruleGate=()=>{const r=verifyRulesLock();assert(r.ok,r.errors.join('\n'));assert(r.verified.some(v=>v.version===VERSION),'Scoring task rule must be frozen');return r;};
export function expectedTargets(id){assert([182,185].includes(id));return{moveTarget:id===182?48:50,timeTargetSeconds:id===182?97:93};}
export function audit(level){ruleGate();const id=level.id;assert([182,185].includes(id));const old=JSON.parse(fs.readFileSync(ORIGINALS[id])),expected={...old.level,preservedMoveTarget:expectedTargets(id).moveTarget};assert.deepEqual(level,expected,'Only scoring field differs from the previously accepted source candidate');assert.equal(level.timeSeconds,id===182?135:130);assert.equal(level.parMoves,31);assert.deepEqual(api.levelStarTargets(level),expectedTargets(id));api.validateLevel(level);if(id===182)assert.deepEqual(clean(api.LEVELS[181]),level,'182 must be the current formal object');else assert.deepEqual(clean(api.LEVELS[184]),clean(baseline.levels[184].level??baseline.levels[184]),'185 production remains untouched');return{passed:true,id,scope:id===182?'FORMAL_SCORE':'CANDIDATE_SCORE_ONLY',previousCandidate:ORIGINALS[id],previousCandidateSha256:digest(fs.readFileSync(ORIGINALS[id])),timeAndAllMapFieldsPreserved:true,sourceInitialPhaseApprovalPending:id===185,sourceApprovalInferred:false};}
export function auditPacket(data){const a=audit(data.level),old=JSON.parse(fs.readFileSync(ORIGINALS[data.level.id]));assert.deepEqual(data.drags,old.drags,'Use exactly the established complete route');assert.equal(data.drags.length,expectedTargets(data.level.id).moveTarget);return a;}
export {digest};
