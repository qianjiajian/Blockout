import { describe, expect, it } from 'vitest';
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import fs from 'node:fs';
// @ts-expect-error This finite-generation helper is an executable Node module used by Vitest.
import { gameplayFingerprint, mutationChanges, retileAndRecolor, runFiniteCandidates } from '../tools/league-regeneration/finite-search-policy.mjs';

const base = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/mid-experiments/level63-variant7-rejected.json', 'utf8')).level;
const definitions = [
  { cells: [[0, 0], [1, 0]] }, { cells: [[0, 0], [0, 1]] },
  { cells: [[0, 0], [1, 0], [2, 0]] }, { cells: [[0, 0], [0, 1], [0, 2]] },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];

describe('league finite regeneration policy', () => {
  it('creates genuinely changed shape/color variants with unique gameplay fingerprints', () => {
    const candidates = retileAndRecolor(base, definitions, 8);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(8);
    expect(new Set(candidates.map(gameplayFingerprint)).size).toBe(candidates.length);
    for (const candidate of candidates) {
      const changes = mutationChanges(base, candidate);
      expect(changes.shapeBlockIds.length).toBeGreaterThan(0);
      expect(changes.colorBlockIds.length).toBeGreaterThan(0);
    }
  });

  it('stops after the declared finite batch and does not retry duplicate gameplay', async () => {
    const candidates = retileAndRecolor(base, definitions, 8);
    let calls = 0;
    const result = await runFiniteCandidates({
      base,
      candidates: [base, ...candidates],
      maxCandidates: 3,
      solve: async () => {
        calls += 1;
        return { accepted: false, failureReasons: ['bounded-test-failure'] };
      },
    });
    expect(calls).toBeLessThanOrEqual(3);
    expect(result.attempts.length).toBeLessThanOrEqual(3);
    expect(result.status).toBe('FINITE_BATCH_EXHAUSTED');
    expect(result.accepted).toBeNull();
    expect(result.attempts.some((attempt: { status?: string }) => attempt.status === 'SKIPPED_DUPLICATE')).toBe(true);
  });
});
