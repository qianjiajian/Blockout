import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
export const ROOT='deliverables/star-targets151-160-20260927';
export const baseline=JSON.parse(fs.readFileSync(ROOT+'/before.json'));
export const VERSION=baseline.taskRuleVersion??baseline.ruleVersion;
assert.equal(typeof VERSION,'string','before.json must name the frozen scoring task ruleVersion');
export const api=(await loadApi()).api;
const clean=v=>JSON.parse(JSON.stringify(v));
const originalLevels=baseline.levels.map(row=>row.level??row);
assert.equal(originalLevels.length,200);
export const ruleGate=()=>{const r=verifyRulesLock();assert(r.ok,r.errors.join('\n'));assert(r.verified.some(v=>v.version===VERSION),'Scoring task rule must be frozen');return r;};
export function expectedTargets(id){assert([157,158].includes(id));const target=api.levelStarTargets(originalLevels[id-1]);assert.equal(target.timeTargetSeconds,id===157?68:129);return {...target,moveTarget:id===157?47:59};}
const expectedLevel=id=>({...clean(originalLevels[id-1]),preservedMoveTarget:id===157?47:59});
export function auditCampaign(){ruleGate();for(let i=0;i<200;i++){const before=originalLevels[i],expected=[157,158].includes(i+1)?expectedLevel(i+1):before;assert.deepEqual(clean(api.LEVELS[i]),expected,`Only two authorized preservedMoveTarget fields may change: Lv${i+1}`);}return {passed:true,changedFields:[{id:157,key:'preservedMoveTarget',from:42,to:47},{id:158,key:'preservedMoveTarget',from:40,to:59}],otherLevels:198};}
export const campaignAudit=auditCampaign();
const adjacent=(a,b)=>a.shape.some(([dx,dy])=>b.shape.some(([sx,sy])=>Math.abs(a.x+dx-b.x-sx)+Math.abs(a.y+dy-b.y-sy)===1));
export function audit(level){
 ruleGate();assert([157,158].includes(level.id));api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert.deepEqual(clean(level),expectedLevel(level.id));assert.deepEqual(api.levelStarTargets(level),expectedTargets(level.id));
 assert.equal(api.levelStarTargets(originalLevels[level.id-1]).moveTarget,level.id===157?42:40);
 const m=new api.PuzzleModel(level),snap=m.snapshot(),visible=snap.blocks.filter(b=>!b.shutterId||snap.shutters.find(s=>s.id===b.shutterId)?.revealed);
 const result={campaign:campaignAudit,opening:auditOpeningCoverage(snap),hidden:{...auditHiddenCoverage({...level,mechanismRules:'revised-2026-09-23-v1.4'}),actualProfile:level.mechanismRules,staticGeometryProfile:'revised-2026-09-23-v1.4'},spans:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),art:api.auditCandidateBlockArt(level),native:{passed:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)},adjacency:{passed:!visible.some((a,i)=>visible.slice(i+1).some(b=>a.layers[0]===b.layers[0]&&adjacent(a,b)))}};
 return {passed:Object.values(result).every(r=>r.passed),...result};
}
export {digest,geometry};
