import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {qualifyFixedIcedFlip} from './qualify-fixed-iced-flip.mjs';

// Single orchestration call. The frozen qualified entry owns every shared
// construction reservation and the sole fresh final-object lower proof.
const [planFile, reviewFile, output] = process.argv.slice(2);
assert(planFile && reviewFile && output);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async p => {
  const bytes = await fs.readFile(p);
  return {value: JSON.parse(bytes), descriptor: {path: p, sha256: sha(bytes)}};
};
const write = async (p, value) => {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  await fs.writeFile(p, bytes, {flag: 'wx'});
  return {path: p, sha256: sha(bytes)};
};
const plan = await read(planFile), review = await read(reviewFile);
assert.equal(review.value.status, 'INDEPENDENT_FIXED_ICED_FLIP_PLAN_PASS');
assert.deepEqual(review.value.plan, plan.descriptor);
const index = await read(plan.value.inputSelection.path);
assert.deepEqual(index.descriptor, plan.value.inputSelection);
const selected = await Promise.all(index.value.files.map(async p => (await read(p)).value));
const runtime = await loadV4CatalogRuntime();
await fs.mkdir(output, {recursive: false});
const startedAt = new Date().toISOString();
const result = await qualifyFixedIcedFlip(runtime, {
  plan: plan.descriptor, planReview: review.descriptor, selected,
});
const receipt = await write(`${output}/candidate.json`, result);
if (result.accepted) await write(`${output}/candidate-index.json`, {
  schemaVersion: 4, scope: 300, files: [receipt.path],
  status: 'ONE_MATHEMATICAL_CANDIDATE_AWAITING_INDEPENDENT_AND_POINTER',
  formalReady: false, productionChanged: false,
});
await write(`${output}/completion.json`, {
  startedAt, completedAt: new Date().toISOString(), receipt,
  status: result.status, accepted: result.accepted,
  L: result.L, U: result.U, reasons: result.reasons,
  constructionAttemptStarted: result.constructionAttemptStarted,
  finalProofStarted: result.finalProofStarted, formalReady: false,
});
console.log(JSON.stringify({receipt, status: result.status,
  accepted: result.accepted, L: result.L, U: result.U, reasons: result.reasons}));
