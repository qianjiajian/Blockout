/* Rebind the already accepted isolated index-8 route to a fresh lower-bound
 * proof on the exact candidate object.  No level mutation or production write. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck } from './round3-contract.mjs';

const ROOT = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/early-fixes/accepted-8-13-18.json'), 'utf8')).rows.find(row => row.index === 8);
const api = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const level = source.accepted ? source.accepted.level : source.level;
const drags = source.accepted ? source.accepted.drags : source.drags;
const replay = runtime.replayRevisedRoute(level, drags);
const lower = searchSpatial(level, api, { floor: 21, prove: true, normalize: false, maxStates: 700000, maxTransitions: 3500000, maxMilliseconds: 10000, orderSeed: 8008 });
const candidate = { index: 8, target: { lower: 21, upper: 30 }, level, levelSha256: source.accepted?.levelSha256 ?? source.levelSha256, routeSha256: source.accepted?.routeSha256 ?? source.routeSha256, drags, lowerBound: { ...lower, sourceLevelSha256: lower.sourceLevelSha256 }, replay: { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags }, scoreBlocks: source.accepted?.scoreBlocks ?? source.scoreBlocks, route: source.accepted?.route ?? source.route };
const contract = await evidenceCheck({ ...candidate, formalEligibility: true }, { strictQ0: true, replayRoute: async (l, d) => runtime.replayRevisedRoute(l, d) });
const out = { index: 8, status: contract.status === 'PASS' ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', formalEligibility: contract.status === 'PASS', target: { lower: 21, upper: 30 }, accepted: contract.status === 'PASS' ? candidate : null, lowerSummary: { status: lower.status, thresholdProven: lower.thresholdProven === true, sourceLevelSha256: lower.sourceLevelSha256, exploredStates: lower.exploredStates, attemptedTransitions: lower.attemptedTransitions, termination: lower.termination }, contract, productionChanged: false };
const outPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair/index8-rebound.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outPath).replaceAll('\\', '/'), status: out.status, lower: out.lowerSummary, errors: contract.errors }, null, 2));
