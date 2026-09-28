// Current-rule wrapper for the already reviewed 31–40 formal batch.
// v1.51 changes only lower-bound exceptions for 74/88/90/98; this wrapper
// reuses the immutable v1.47 batch checks while requiring the active lock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyRulesLock } from './verify-rules-lock.mjs';
import * as previous from './remake31to40-v147.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { measureRoute } from './remake21to30-quality.mjs';
import { observeMechanismProcess, verifyDecisions } from './review-remake31to40-decisions.mjs';
import { verifyLocalMechanismChoices } from './remake21to30-v139.mjs';
import { verifyGeneratorRouteProjection } from './remake31to40-generator-floor.mjs';
import { verifyFullGeneratorRouteProjection } from './remake31to40-full-generator-floor-v141.mjs';

export const VERSION = '1.51.0';
export const BASELINE = previous.BASELINE;
export const OUTPUT = previous.OUTPUT;
export const { IDS, TARGETS, loadApi, geometry, writeNew, assertBaseline, sourceCatalog } = previous;

export function ruleGate() {
  const lock = verifyRulesLock();
  assert(lock.ok, lock.errors.join('\n'));
  assert.equal(lock.activeVersion, VERSION);
  return lock;
}

export const auditCandidate = previous.auditCandidate;

export function proveFloor(level, api, options = {}) {
  return previous.proveFloor(level, api, options);
}

export function checkCandidate(data, baseline, api, options = {}) {
  const { level, drags } = data;
  const target = TARGETS[level.id];
  assert(target);
  assert(data.seed && data.design?.primaryMechanism && data.design?.concreteDecision);
  const audit = auditCandidate(data, baseline, api);
  const replay = api.replayRevisedRoute(level, drags);
  assert(replay.valid && replay.complete, JSON.stringify(replay));
  assert(replay.nonClearingDrags >= target.min && replay.nonClearingDrags <= target.max,
    `Witness ${replay.nonClearingDrags} outside ${target.min}–${target.max}`);
  const final = JSON.parse(replay.finalStateKey);
  for (const gate of level.gates.filter(g => g.frozen > 0)) {
    assert.equal(final.gates.find(g => g.id === gate.id).frozen, 0);
  }
  const measurements = measureRoute(level, drags, api);
  assert(measurements.multiCellDrags > measurements.singleCellDrags, 'Do not rely on single-cell repositioning');
  const proof = proveFloor(level, api, { ...options, proofMode: options.proofMode ?? data.floorStrategy });
  assert(proof.thresholdProven, JSON.stringify(proof));
  let projectionReplay = null;
  if (level.generators?.length) {
    projectionReplay = proof.abstraction.startsWith('opening-visible')
      ? verifyGeneratorRouteProjection(level, drags, api)
      : verifyFullGeneratorRouteProjection(level, drags, api);
    assert(projectionReplay.valid, projectionReplay.error);
  }
  const mechanismProcess = observeMechanismProcess(level, drags, api);
  const localMechanismChoices = verifyLocalMechanismChoices(data, api);
  const decisions = options.requireDecisions === false ? null : verifyDecisions(data, api);
  if (options.requireDecisions !== false) {
    assert.deepEqual(localMechanismChoices.filter(c => c.kind === 'curtain').map(c => c.id).sort(),
      (level.shutters ?? []).map(s => s.id).sort(), 'Each curtain needs a concrete local effect case');
    for (const generator of level.generators ?? []) {
      assert(mechanismProcess.generatorEvents.some(e => e.generatorId === generator.id)
        || new api.PuzzleModel(level).snapshot().generators.find(g => g.id === generator.id).remaining === 0,
      'Observe each actual generator through completion');
    }
  }
  const clearLoad = level.blocks.reduce((n, block) => n + (block.layers?.length ?? 1), 0);
  const stars = baseline.levels[level.id - 1].starTargets;
  return {
    id: level.id,
    ruleVersion: VERSION,
    baselineRuleVersion: '1.46.0',
    checkedAt: new Date().toISOString(),
    levelSha256: digest(level),
    routeSha256: digest(drags),
    target, audit, replay, measurements, proof, projectionReplay, mechanismProcess,
    decisions, localMechanismChoices,
    lowerBound: target.min,
    upperBound: replay.nonClearingDrags,
    exactNecessaryRepositions: target.min === replay.nonClearingDrags ? target.min : null,
    starAssessment: {
      preservedTargets: stars,
      clearLoad,
      guaranteedMinimumDrags: clearLoad + target.min,
      moveTargetImpossible: clearLoad + target.min > stars.moveTarget,
      witnessWithinMoveTarget: drags.length <= stars.moveTarget,
      timeAndStarsCalibrated: false,
    },
    pointerValidated: false,
    humanBlindTested: false,
    releaseApproved: false,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  ruleGate();
  const [mode, ...files] = process.argv.slice(2);
  assert(['audit', 'check'].includes(mode));
  const { api } = await loadApi();
  const baseline = JSON.parse(fs.readFileSync(BASELINE));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file));
    const result = mode === 'audit' ? auditCandidate(data, baseline, api) : checkCandidate(data, baseline, api);
    console.log(JSON.stringify({ file, id: data.level.id, status: 'PASS', ruleVersion: VERSION,
      lower: result.lowerBound, upper: result.upperBound }));
  }
}
