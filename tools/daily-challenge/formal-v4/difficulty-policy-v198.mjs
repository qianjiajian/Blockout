import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

// A new policy adapter. Historical BANDS and their proof receipts stay intact.
export const DIFFICULTY_RULE_VERSION = '1.198.0';
export const DIFFICULTY_RULE_FILE = 'docs/rules/mechanism-rules-v1.198.0.md';
export const DIFFICULTY_RULE_SHA = 'bdb39680642cd1c4a75214cdeee541feaf8a8e8e992a2b531f302b70990ef198';
const source = 'src/core/dailyChallengeDifficultyPolicy.ts';
const own = 'tools/daily-challenge/formal-v4/difficulty-policy-v198.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export async function loadDailyDifficultyPolicyV198() {
  const rule = await fs.readFile(DIFFICULTY_RULE_FILE);
  assert.equal(sha(rule.toString().replaceAll('\r\n', '\n')), DIFFICULTY_RULE_SHA);
  const built = await build({entryPoints:[source], bundle:true, write:false, metafile:true, platform:'node', format:'esm', logLevel:'silent'});
  const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  assert.equal(api.DAILY_CHALLENGE_DIFFICULTY_POLICY_VERSION, DIFFICULTY_RULE_VERSION);
  assert.equal(api.DAILY_CHALLENGE_DIFFICULTY_TOLERANCE, 3);
  const bands = api.DAILY_CHALLENGE_DIFFICULTY_BANDS;
  assert.deepEqual(Object.keys(bands), ['1','2','3']);
  for (const band of Object.values(bands)) {
    assert.equal(band.lower, band.nominalLower - 3);
    assert.equal(band.upper, band.nominalUpper === null ? null : band.nominalUpper + 3);
  }
  const bindings = {[own]:sha(await fs.readFile(own)), [DIFFICULTY_RULE_FILE]:sha(rule)};
  for (const file of Object.keys(built.metafile.inputs)) bindings[file.replaceAll('\\','/')] = sha(await fs.readFile(file));
  return Object.freeze({version:DIFFICULTY_RULE_VERSION, bands,
    accepts:api.isDailyChallengeProofWithinBand, bindings,
    meaning:'User-authorized daily band tolerance only; no proof values, solver core, search budgets, or historical evidence changed.'});
}
