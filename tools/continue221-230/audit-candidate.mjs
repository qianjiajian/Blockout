import fs from 'node:fs';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
const {api}=await loadApi();
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),l=d.level??d;
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const r={levelId:l.id,levelSha256:digest(l),issues:api.auditRevisedCandidate(l).issues.filter(i=>!omit.has(i.code)),art:api.auditCandidateBlockArt(l),native:l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage({...l,mechanismRules:'revised-2026-09-23-v1.4'}),gates:auditGateSpanLimits(l),queue:auditGeneratorQueueColors(l),replay:d.drags?api.replayRevisedRoute(l,d.drags):null};
 console.log(JSON.stringify(r));
}
