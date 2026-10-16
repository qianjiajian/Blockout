/** Bounded, hash-bound evaluation. Failed objects are never selected.
 * No arguments: records historical rim counterexamples without solving.
 * --candidates <JSON>: reads [{level,drags}] or {candidates:[{level,drags}]}.
 * Evidence is append-only; reruns reuse decisions for the same object/model.
 */
import fs from 'node:fs';
import path from 'node:path';
import { verifyRulesLock } from './verify-rules-lock.mjs';
import { loadContinuationRuntime, modelBinding, rejectedRimRoute, sha256 } from './continuation211-runtime.mjs';
import { CONTINUATION_211_BANDS, createFiniteRegenerationController, evaluateContinuationCandidate } from './continuation211-policy.mjs';

const lock = verifyRulesLock();
if (!lock.ok) throw new Error(lock.errors.join('\n'));
const api = await loadContinuationRuntime();
const toolSha256 = modelBinding();
const argument = process.argv.indexOf('--candidates');
const legacy = argument < 0;
const parsed = legacy ? null : JSON.parse(fs.readFileSync(process.argv[argument + 1], 'utf8'));
const candidates = legacy ? api.REMADE_211_220_IDS.flatMap(id => api.REMAKE211TO220_VARIANT_SEQUENCE.map(variant => {
  const level = api.makeRemake211to220Level(id, variant);
  return { level, drags: rejectedRimRoute(level), variant };
})) : (Array.isArray(parsed) ? parsed : parsed.candidates);
if (!Array.isArray(candidates)) throw new Error('Expected candidate objects with level and drags');
const directory = path.resolve('deliverables/continue211-220-20260930/finite-decisions');
fs.mkdirSync(directory, { recursive: true });
const rows = [];
const controllers = new Map();
for (const input of candidates) {
  const {level,drags} = input;
  const levelSha256 = sha256(level);
  const candidateInput = {levelId:level.id,difficulty:level.difficulty,levelSha256};
  const controller = controllers.get(level.id) ?? createFiniteRegenerationController({maxAttempts:32});
  controllers.set(level.id,controller);
  const admission = controller.begin(levelSha256);
  if (!admission.admitted) { rows.push({levelId:level.id,levelSha256,status:admission.reason}); continue; }
  const cacheFile = path.join(directory, `${level.id}-${levelSha256}-${toolSha256}.json`);
  let record;
  if (fs.existsSync(cacheFile)) {
    record = JSON.parse(fs.readFileSync(cacheFile,'utf8'));
    if (record.levelSha256 !== levelSha256 || record.toolSha256 !== toolSha256) throw new Error('Cache binding mismatch');
  } else {
    const route = {...api.replayRevisedRoute(level,drags),levelSha256};
    let evaluation = evaluateContinuationCandidate({...candidateInput,route});
    let lowerBound = null;
    if (evaluation.needsProof) {
      lowerBound = {...api.checkRevisedRepositionFloor(level,{
        floor:CONTINUATION_211_BANDS[level.difficulty][0], maxStates:5000,
        maxDragStates:1000,maxTransitions:250000,maxMilliseconds:1500,
      }),levelSha256,toolSha256};
      evaluation = evaluateContinuationCandidate({...candidateInput,route,lowerBound});
      if (!evaluation.acceptedSpatial && evaluation.needsProof) evaluation = {
        ...evaluation,status:'REGENERATE_PROOF_UNCERTIFIED',needsProof:false,
        detail:'Finite proof budget ended without certification; replace this object.',
      };
    }
    record = {levelId:level.id,levelSha256,toolSha256,manifestActiveVersion:lock.activeVersion,
      level,drags,route,lowerBound,evaluation,variant:input.variant??null,
      formalAdopted:false,releaseApproved:false};
    fs.writeFileSync(cacheFile,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  }
  controller.finish(levelSha256,record.evaluation);
  rows.push({levelId:level.id,levelSha256,status:record.evaluation.status,U:record.evaluation.U,
    L:record.evaluation.L??null,acceptedSpatial:record.evaluation.acceptedSpatial,evidence:path.relative(process.cwd(),cacheFile)});
}
const report = {status:legacy?'HISTORICAL_RIM_CANDIDATES_REJECTED':'FINITE_CANDIDATE_EVALUATION',
  generatedAt:new Date().toISOString(),manifestActiveVersion:lock.activeVersion,toolSha256,
  policy:{maxCandidatesPerLevel:32,maxProofMillisecondsPerCandidate:1500,routeBeforeProof:true,
    repeatedFingerprintUsesCache:true,failedCandidateSelected:false},
  levels:rows,controllers:[...controllers].map(([id,c])=>({id,...c.snapshot()})),
  formalAdopted:false,releaseApproved:false};
const output = path.join(directory,`run-${Date.now()}.json`);
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,levels:rows.map(({levelId,status,U,L})=>({levelId,status,U,L})),
  acceptedSpatial:rows.filter(row=>row.acceptedSpatial).length,formalAdopted:false},null,2));
