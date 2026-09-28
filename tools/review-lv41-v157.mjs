import fs from 'node:fs';
import { loadApi, proveFloor, auditCandidate, geometry } from './remake41to50-v146.mjs';
import { digest } from './revised-preview-validation-v160.mjs';

const candidatePath = process.argv[2] || 'deliverables/remake41-47-v151-20260925/candidate41-competitor-regenerated-v151-1790308522304.json';
const baselinePath = 'deliverables/remake41-50-v146-20260924/baseline.json';
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const { api } = await loadApi();
const level = candidate.level;
const out = {
  candidatePath,
  id: level.id,
  levelSha256: digest(level),
  geometry: geometry(level),
  shape: { difficulty: level.difficulty, blocks: level.blocks.length, gates: level.gates.length, shutters: level.shutters.length, generators: level.generators.length },
};
try {
  out.audit = auditCandidate(candidate, baseline, api);
  out.auditStatus = 'PASS';
} catch (error) {
  out.auditStatus = 'FAIL';
  out.auditError = String(error?.stack || error);
}
out.replay = api.replayRevisedRoute(level, candidate.drags);
for (const mode of ['full-generator', 'immediate-generator', 'emitted-generator-suffix', 'compact-generator-suffix', 'immediate-generator-suffix']) {
  try {
    const proof = proveFloor(level, api, { proofMode: mode, maxStates: 3_000_000, maxMilliseconds: 180_000 });
    out[`proof_${mode}`] = { status: proof.status, thresholdProven: proof.thresholdProven, floor: proof.floor, exploredStates: proof.exploredStates, attemptedTransitions: proof.attemptedTransitions, abstraction: proof.abstraction, solvabilityValidated: proof.solvabilityValidated, timeValidated: proof.timeValidated };
  } catch (error) {
    out[`proof_${mode}`] = { status: 'ERROR', error: String(error?.message || error) };
  }
}
console.log(JSON.stringify(out, null, 2));
