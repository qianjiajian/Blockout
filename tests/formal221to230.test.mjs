import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  FORMAL_221_230_LEVELS,
  FORMAL_221_230_EVIDENCE,
  getFormal221to230LevelStrict,
} from '../src/core/formal221to230Data';
import {
  LEVELS,
  FORMAL_201_210_LEVELS,
  FORMAL_221_230_LEVELS as PUBLIC_FORMAL_LEVELS,
  FORMAL_221_230_EVIDENCE as PUBLIC_FORMAL_EVIDENCE,
  getFormal221to230LevelStrict as getPublicFormalLevelStrict,
  getLevelStrict,
} from '../src/core/levels';
import { PuzzleModel, validateLevel } from '../src/core/PuzzleModel';
import { levelStarTargets, evaluateLevelStars } from '../src/core/levelStarConditions';
import { matchingContinuousExitPortals, choosePortalReleaseCandidate } from '../src/game/continuousDrag';
import { replay } from '../tools/remake191-200/replay.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fileDigest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const root = 'deliverables/continue221-230-20260930/formal-adoption';
const ids = Array.from({ length: 10 }, (_, index) => index + 221);
const contracts = [
  ['easy', 5, 6, 36, 86, 120],
  ['normal', 11, 15, 45, 86, 120],
  ['normal', 11, 15, 49, 86, 120],
  ['hard', 16, 20, 47, 108, 150],
  ['easy', 5, 10, 38, 108, 150],
  ['normal', 11, 14, 45, 129, 180],
  ['hard', 16, 19, 49, 129, 180],
  ['easy', 5, 9, 27, 151, 210],
  ['normal', 11, 15, 33, 151, 210],
  ['super', 21, 28, 51, 151, 210],
];
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] };
const replayApi = { PuzzleModel, validateLevel, matchingContinuousExitPortals, choosePortalReleaseCandidate };

describe('accepted 221–230 independent formal registry', () => {
  it('exposes all ten exact objects through both APIs while preserving production 1–200', () => {
    expect(FORMAL_221_230_LEVELS.map(level => level.id)).toEqual(ids);
    expect(FORMAL_221_230_EVIDENCE.map(entry => entry.id)).toEqual(ids);
    expect(PUBLIC_FORMAL_LEVELS).toBe(FORMAL_221_230_LEVELS);
    expect(PUBLIC_FORMAL_EVIDENCE).toBe(FORMAL_221_230_EVIDENCE);
    expect(getPublicFormalLevelStrict).toBe(getFormal221to230LevelStrict);
    for (const level of FORMAL_221_230_LEVELS) {
      expect(getFormal221to230LevelStrict(level.id)).toBe(level);
      expect(getPublicFormalLevelStrict(level.id)).toBe(level);
      expect(() => getLevelStrict(level.id)).toThrow(RangeError);
    }
    for (const invalid of [0, 200, 201, 220, 231, 999, 221.5, NaN, Infinity, -Infinity, '221', null, undefined]) {
      expect(() => getFormal221to230LevelStrict(invalid)).toThrow(RangeError);
    }
    const before = json(`${root}/before.json`);
    expect(LEVELS.map(level => level.id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));
    expect(digest(LEVELS)).toBe(before.productionSha256);
    expect(digest(FORMAL_201_210_LEVELS)).toBe(before.formal201to210Sha256);
    const aggregate = json(`${root}/aggregate.json`);
    expect(aggregate).toMatchObject({
      status: 'FORMAL_DATA_ACCEPTED', acceptedCount: 10, acceptedIds: ids,
      productionBoundary: 200, productionCampaignIntegrated: false,
      playerSaveTouched: false, releaseApproved: false,
    });
    expect(aggregate.levels.map(({ id, levelSha256, routeSha256, L, U, starMoves, evidence }) =>
      ({ id, levelSha256, routeSha256, L, U, starMoves, evidence }))).toEqual(FORMAL_221_230_EVIDENCE);
  });

  it.each(FORMAL_221_230_EVIDENCE)('binds Lv$id acceptance, lower proof and complete strict route to the registered object', entry => {
    const level = getFormal221to230LevelStrict(entry.id);
    const record = json(entry.evidence);
    const source = json(record.sourceEvidence);
    const [difficulty, L, U, starMoves, starSeconds, timeLimit] = contracts[entry.id - 221];
    expect([level.difficulty, entry.L, entry.U, entry.starMoves, levelStarTargets(level).timeTargetSeconds, level.timeSeconds])
      .toEqual([difficulty, L, U, starMoves, starSeconds, timeLimit]);
    expect(entry.L).toBeGreaterThanOrEqual(bands[difficulty][0]);
    expect(entry.U).toBeLessThanOrEqual(bands[difficulty][1]);
    expect(entry.L).toBeLessThanOrEqual(entry.U);
    expect(digest(level)).toBe(entry.levelSha256);
    expect(source.level).toEqual(level);
    expect(digest(source.drags)).toBe(entry.routeSha256);
    expect(record).toMatchObject({
      id: entry.id,
      status: 'FORMAL_DATA_ACCEPTED',
      levelSha256: entry.levelSha256,
      routeSha256: entry.routeSha256,
      L: entry.L,
      U: entry.U,
      starMoves: entry.starMoves,
      eligibility: { eligible: true, sameObjectLowerBound: true, completePointerCompatibleRoute: true },
      productionCampaignIntegrated: false,
      releaseApproved: false,
    });
    expect(record.sourceEvidenceSha256).toBe(fileDigest(record.sourceEvidence));
    expect(record.proofSha256).toBe(digest(source.proof));
    const lower = record.lowerBoundEvidence;
    expect(lower.originalQualifiedPacket).toBe(record.sourceEvidence);
    expect(digest(lower.originalProof)).toBe(record.proofSha256);
    expect(fileDigest(lower.currentPreflight)).toBe(lower.currentPreflightSha256);
    const preflight = json(lower.currentPreflight);
    expect(preflight.passed).toBe(true);
    expect(preflight.rows.find(row => row.id === entry.id)).toMatchObject({
      passed: true, levelSha256: entry.levelSha256, routeSha256: entry.routeSha256,
      objectBinding: { candidateDataExact: true, qaExact: true, statusExact: true, routeExact: true, proofArtifactExact: true, formalRegistryExact: true },
      toolQualification: { passed: true },
      assets: { passed: true },
    });
    expect(source.proof).toMatchObject({
      status: 'threshold-proven', thresholdProven: true, floor: entry.L,
      termination: 'below-threshold-exhausted',
    });
    if (source.proof.input) {
      // native-key-floor.mjs records raw input bytes for 228–230; the other
      // adapters record the canonical parsed payload. These are fixed formats.
      const inputHash = entry.id >= 228 ? fileDigest(source.proof.input) : digest(json(source.proof.input));
      expect(inputHash).toBe(source.proof.inputSha256);
      expect(fileDigest(source.proof.source)).toBe(source.proof.sourceHash ?? source.proof.sourceSha256);
      expect(json(source.proof.output)).toMatchObject({
        status: 'threshold-proven', thresholdProven: true, floor: entry.L,
        termination: 'below-threshold-exhausted',
      });
    }
    if (entry.id === 225) {
      expect(fileDigest(lower.freshCertificate)).toBe(lower.freshCertificateSha256);
      const certificate = json(lower.freshCertificate);
      expect(certificate).toMatchObject({ passed: true, levelSha256: entry.levelSha256, routeSha256: entry.routeSha256 });
      expect(certificate.level).toEqual(level);
      const projection = structuredClone(level);
      projection.gates.push(...projection.flipDoors.map(({ initiallyOpen, ...gate }) => gate));
      projection.flipDoors = [];
      // The v147 solver accepts v1.4. The v1.5 difference governs flip-door
      // ice capture, which is absent after this always-open door relaxation.
      projection.mechanismRules = 'revised-2026-09-23-v1.4';
      expect(certificate.projection).toEqual(projection);
      expect(digest(projection)).toBe(certificate.projectionSha256);
      expect(certificate.proof).toMatchObject({
        status: 'threshold-proven', thresholdProven: true, floor: entry.L,
        sourceLevelSha256: certificate.projectionSha256,
      });
      for (const binding of [certificate.solver, ...certificate.solver.dependencies]) {
        expect(fileDigest(binding.file)).toBe(binding.sha256);
      }
    }
    const result = replay(level, source.drags, replayApi, {
      timed: true, complete: true, requirePointerCompatible: true,
    });
    expect(result).toMatchObject({
      valid: true, complete: true, nonClearingDrags: entry.U,
      effectiveDrags: entry.starMoves,
      levelSha256: entry.levelSha256, routeSha256: entry.routeSha256,
    });
    expect(levelStarTargets(level)).toEqual({ moveTarget: starMoves, timeTargetSeconds: starSeconds });
    expect(evaluateLevelStars(level, { moves: starMoves, elapsedSeconds: starSeconds }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: starMoves + 1, elapsedSeconds: starSeconds }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: starMoves, elapsedSeconds: starSeconds + 1 }).earnedStars).toBe(2);
  });

  it.each(FORMAL_221_230_EVIDENCE)('binds Lv$id to both new formal Pointer runs and actual MemoryHost settlements', entry => {
    const record = json(entry.evidence);
    expect(record.pointerEvidence).toHaveLength(2);
    const viewports = [];
    for (const file of record.pointerEvidence) {
      const report = json(file);
      const binding = record.pointerBindings.find(pointer => pointer.file === file);
      expect(binding).toMatchObject({ levelSha256: entry.levelSha256, routeSha256: entry.routeSha256 });
      expect(fileDigest(file)).toBe(binding.fileSha256);
      expect(report).toMatchObject({
        status: 'PASS', candidateOnly: false, formalDataValidated: true,
        naturalClock: true, clockFrozen: false, playerSaveTouched: false,
        releaseApproved: false,
      });
      expect(report.errors).toEqual([]);
      expect(report.requestedIds).toEqual(ids);
      expect(report.rows.map(row => row.id)).toEqual(ids);
      const row = report.rows.find(candidate => candidate.id === entry.id);
      viewports.push(`${report.viewport.width}x${report.viewport.height}`);
      expect(row).toMatchObject({
        id: entry.id, status: 'PASS', formalObjectIdentity: true, candidateOverlay: false,
        levelSha256: entry.levelSha256, routeSha256: entry.routeSha256,
        nonClearingDrags: entry.U,
        final: { complete: true, failed: false, moves: entry.starMoves, timeFreezeSeconds: 0 },
        naturalTimingReplay: { passed: true, wholeModelReplay: true, levelSha256: entry.levelSha256 },
        nativeDrawAudit: { rotated: 0, canvasRotationCalls: 0 },
        storage: { backend: 'MemoryHost' },
        settlement: {
          status: 'committed', earnedStars: 3,
          starConditions: {
            moveTarget: entry.starMoves, timeTargetSeconds: contracts[entry.id - 221][4],
            moveAchieved: true, timeAchieved: true,
          },
        },
      });
      expect(row.naturalClockProbe.after).toBeLessThan(row.naturalClockProbe.before);
      expect(row.final.remainingSeconds).toBeGreaterThan(0);
      expect(row.naturalTimingReplay.ticks).toBeGreaterThan(0);
      expect(row.nativeDrawAudit.calls).toBeGreaterThan(0);
      expect(row.storage.save.bestStars[String(entry.id)]).toBe(3);
      expect(row.storage.save.bestMoves[String(entry.id)]).toBe(entry.starMoves);
    }
    expect(viewports.sort()).toEqual(['320x568', '496x1078']);
  });
});
