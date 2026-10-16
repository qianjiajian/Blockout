// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { createHash } from 'node:crypto';
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FORMAL_201_210_EVIDENCE,
  FORMAL_201_210_LEVELS,
  FORMAL_ISOLATED_201_210_LEVELS,
  getFormal201to210LevelStrict,
} from '../src/core/formal201to210Data';
import {
  LEVELS,
  FORMAL_201_210_LEVELS as PUBLIC_FORMAL_201_210_LEVELS,
  getFormal201to210LevelStrict as getPublicFormal201to210LevelStrict,
  getLevelStrict,
} from '../src/core/levels';
import { replayRevisedRoute } from '../src/core/revisedLevelSearch';
import { matchFormalBlockShape } from '../src/game/formalBlockShapes';

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [
      key, canonical((value as Record<string, unknown>)[key]),
    ]))
    : value;
const sha256 = (value: unknown): string => createHash('sha256')
  .update(JSON.stringify(value)).digest('hex');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const fixture = json('tests/fixtures/remake201-210-hidden-repair-20260930.json');
const aggregate = json('deliverables/continue201-210-20260930/formal-adoption/aggregate.json');

describe('accepted 201–210 formal data', () => {
  it('registers ten exact isolated objects without expanding the production campaign', () => {
    const ids = Array.from({ length: 10 }, (_, index) => index + 201);
    expect(FORMAL_201_210_LEVELS.map(level => level.id)).toEqual(ids);
    expect(PUBLIC_FORMAL_201_210_LEVELS).toBe(FORMAL_201_210_LEVELS);
    expect(getPublicFormal201to210LevelStrict(201)).toBe(FORMAL_201_210_LEVELS[0]);
    expect(FORMAL_ISOLATED_201_210_LEVELS.map(level => level.id)).toEqual(ids);
    expect(FORMAL_201_210_EVIDENCE.map(entry => entry.id)).toEqual(ids);
    expect(aggregate.ids).toEqual(ids);
    expect(aggregate.status).toBe('FORMAL_DATA_ACCEPTED');
    expect(aggregate.productionBoundary).toBe(200);
    expect(aggregate.productionCampaignIntegrated).toBe(false);
    expect(aggregate.releaseApproved).toBe(false);
    expect(LEVELS.map(level => level.id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));
    expect(() => getLevelStrict(201)).toThrow(RangeError);
    expect(() => getFormal201to210LevelStrict(200)).toThrow(RangeError);
    expect(() => getFormal201to210LevelStrict(211)).toThrow(RangeError);
  });

  it.each(FORMAL_201_210_EVIDENCE)('binds Lv$id to fresh L/U, route and both actual Pointer settlements', entry => {
    const level = getFormal201to210LevelStrict(entry.id);
    const record = json(entry.evidence);
    const route = fixture.levels[String(entry.id)];
    const staticAudit = json(record.evidence.staticAudit);
    const sourceReview = json(record.evidence.sourceReview);
    const staticRow = staticAudit.levels.find((row: { id: number }) => row.id === entry.id);
    const sourceRow = sourceReview.levels.find((row: { id: number }) => row.id === entry.id);
    expect(level).toBe(FORMAL_ISOLATED_201_210_LEVELS[entry.id - 201]);
    expect(sha256(level)).toBe(entry.rawLevelSha256);
    expect(sha256(canonical(level))).toBe(entry.levelSha256);
    expect(record).toMatchObject({
      id: entry.id,
      status: 'FORMAL_DATA_ACCEPTED',
      rawLevelSha256: entry.rawLevelSha256,
      canonicalLevelSha256: entry.levelSha256,
      L: entry.L,
      U: entry.U,
      routeMoves: entry.routeMoves,
      starMoves: entry.starMoves,
      productionCampaignIntegrated: false,
      releaseApproved: false,
    });
    expect(staticRow).toMatchObject({ levelSha256: entry.levelSha256, staticPassed: true, failures: [] });
    expect(sourceRow).toMatchObject({
      currentCanonicalLevelSha256: entry.levelSha256,
      sourceParity: 'NOT_CLAIMED',
    });
    expect(sourceRow.sourceUnknowns.length).toBeGreaterThan(0);
    const replay = replayRevisedRoute(level, route.route);
    expect(replay).toMatchObject({
      valid: true,
      complete: true,
      nonClearingDrags: entry.U,
      effectiveDrags: entry.routeMoves,
    });
    expect(route.lowerBound).toBe(entry.L);
    expect(route.starTargets.moveTarget).toBe(entry.starMoves);
    expect(entry.routeMoves).toBeLessThanOrEqual(entry.starMoves);
    expect(level.blocks.every(block => matchFormalBlockShape(block.shape, 'native-only')?.quarterTurns === 0)).toBe(true);

    const viewports: string[] = [];
    for (const pointer of record.evidence.pointer) {
      const report = json(pointer.reportPath);
      const row = report.rows.find((candidate: { id: number }) => candidate.id === entry.id);
      viewports.push(`${report.viewport.width}x${report.viewport.height}`);
      expect(report).toMatchObject({
        status: 'PASS',
        naturalClock: true,
        clockFrozen: false,
        playerSaveTouched: false,
        productionDataValidated: false,
      });
      expect(row).toMatchObject({
        id: entry.id,
        status: 'PASS',
        levelSha256: entry.levelSha256,
        nonClearingDrags: entry.U,
        settlement: { earnedStars: 3, starConditions: { moveTarget: entry.starMoves } },
      });
      expect(row.final.moves).toBe(entry.routeMoves);
      expect(row.naturalTimingReplay.passed).toBe(true);
    }
    expect(viewports.sort()).toEqual(['320x568', '496x1078']);
  });
});
