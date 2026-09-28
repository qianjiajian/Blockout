import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi, auditCandidate, proveFloor, geometry} from './remake41to50-v146.mjs';
import {verifyImmediateGeneratorRoute} from './remake41to50-immediate-generator-floor-v146.mjs';
import {observeMechanismProcess, verifyDecisions} from './review-remake41to50-decisions-v146.mjs';
import {verifyLocalMechanismChoices} from './remake21to30-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const candidatePath = process.argv[2];
if (!candidatePath) throw new Error('Usage: node tools/verify47-candidate-v151.mjs CANDIDATE.json');
const data = JSON.parse(fs.readFileSync(candidatePath));
if (data.level?.id !== 47) throw new Error(`Expected level 47, got ${data.level?.id}`);
const baselinePath = path.resolve('deliverables/remake41-50-v146-20260924/baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath));
const {api} = await loadApi();
const replay = api.replayRevisedRoute(data.level, data.drags);
const audit = auditCandidate(data, baseline, api);
const proof = proveFloor(data.level, api, {proofMode: data.proofMode ?? 'immediate-generator', maxStates: 5_000_000, maxMilliseconds: 120_000});
const projection = verifyImmediateGeneratorRoute(data.level, data.drags, api);
const mechanismProcess = observeMechanismProcess(data.level, data.drags, api);
const localMechanismChoices = verifyLocalMechanismChoices(data, api);
const decisions = verifyDecisions(data, api);
const report = {
  candidatePath: path.resolve(candidatePath),
  candidateSha256: digest(data),
  levelSha256: digest(data.level),
  geometry: geometry(data.level),
  audit,
  replay,
  proof,
  projection,
  mechanismProcess,
  localMechanismChoices,
  decisions,
  certificationStatus: {
    structuralAudit: audit.passed === true,
    completeRoute: replay.valid === true && replay.complete === true,
    lowerBound: proof.status === 'threshold-proven' && proof.thresholdProven === true ? 'threshold-proven' : proof.status,
    pointerValidated: data.certification?.pointerValidated === true,
    naturalTimeValidated: data.certification?.naturalTimeValidated === true,
    pointerReport: data.certification?.pointerReport ?? null,
    formalLevelIntegration: false,
    releaseApproved: false,
  },
};
const outputPath = process.argv[3] ?? path.resolve('deliverables/remake41-47-v151-20260925/search-v151/formal-verification47-v151.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({outputPath, levelSha256: report.levelSha256, routeUpper: replay.nonClearingDrags, proof: {status: proof.status, thresholdProven: proof.thresholdProven, floor: proof.floor, exploredStates: proof.exploredStates, attemptedTransitions: proof.attemptedTransitions}, projection: {valid: projection.valid, unitSteps: projection.unitSteps}, decisions: decisions.cases.length, certificationStatus: report.certificationStatus}, null, 2));
