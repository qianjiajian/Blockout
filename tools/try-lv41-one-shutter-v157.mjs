import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadApi } from './native-block-repair-v143.mjs';
import { search as queueSearch } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import { checkFullGeneratorFloor } from './remake41to50-full-generator-floor-v146.mjs';
import { checkSymmetryFloor } from './remake21to30-symmetry-floor-v139.mjs';
import { projectGeneratorOpening } from './remake41to50-generator-floor-v146.mjs';
import { digest } from './revised-preview-validation-v160.mjs';

const input = 'deliverables/remake41-v157-20260925/candidate41-normal-v157.json';
const outDir = 'deliverables/remake41-v157-20260925';

function withoutShutter(source, removeId) {
  const level = structuredClone(source.level);
  level.difficulty = 'normal';
  level.shutters = level.shutters.filter(s => s.id !== removeId);
  for (const block of level.blocks) {
    if (block.shutterId === removeId) delete block.shutterId;
  }
  level.mechanismAdaptation = {
    ...(level.mechanismAdaptation ?? {}),
    userAuthorized: '2026-09-26',
    change: `Removed one shutter (${removeId}); all blocks in that region are visible at opening.`,
    preservedShutterIds: level.shutters.map(s => s.id),
  };
  return level;
}

function writeCandidate(source, level, variant, found, proof) {
  const replay = found.status === 'witness' ? found.runtimeReplay : null;
  const candidate = {
    ...source,
    level,
    seed: `lv41-normal-v157-one-shutter-${variant}`,
    drags: found.status === 'witness' ? found.drags : [],
    U: found.status === 'witness' ? found.cost : null,
    found,
    replay,
    regeneration: {
      ...(source.regeneration ?? {}),
      oneShutterVariant: variant,
      levelSha256: digest(level),
      sourceCandidate: input,
    },
    evidence: {
      ...(source.evidence ?? {}),
      oneShutterProof: proof,
      formalAdopted: false,
      status: 'CANDIDATE_ONLY',
    },
  };
  const file = `${outDir}/candidate41-normal-one-shutter-${variant}-v157.json`;
  fs.writeFileSync(file, JSON.stringify(candidate, null, 2) + '\n');
  return file;
}

const source = JSON.parse(fs.readFileSync(input, 'utf8'));
const { api } = await loadApi();
for (const [variant, removeId] of [['remove-cover14', '41-cover14'], ['remove-cover8', '41-cover8']]) {
  const level = withoutShutter(source, removeId);
  let validation = null;
  try { api.validateLevel(level); validation = { passed: true }; }
  catch (error) { validation = { passed: false, error: error.message }; }
  if (!validation.passed) { console.log(JSON.stringify({ variant, validation })); continue; }
  const found = queueSearch(level, { floor: 11, maxStates: 3000000, maxMilliseconds: 90000 });
  const proof = { validation };
  if (found.status === 'witness') {
    const replay = api.replayRevisedRoute(level, found.drags);
    proof.replay = replay;
    proof.projection = checkSymmetryFloor(projectGeneratorOpening(level, api).level, { floor: 11, maxStates: 1000000, maxMilliseconds: 30000 });
    proof.fullGenerator = checkFullGeneratorFloor(level, api, { floor: 11, maxStates: 1000000, maxMilliseconds: 30000 });
  }
  const file = writeCandidate(source, level, variant, found, proof);
  console.log(JSON.stringify({ variant, removeId, file, status: found.status, U: found.cost ?? null, states: found.states ?? null, proof: { projection: proof.projection?.status, projectionL: proof.projection?.relaxedNonClearingDrags, full: proof.fullGenerator?.status, fullL: proof.fullGenerator?.relaxedNonClearingDrags } }));
}
