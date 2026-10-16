import { describe, expect, it } from 'vitest';
import { FORMAL_LEAGUE_CANDIDATES } from '../src/core/formalLeagueCandidateData';

const filledRectangle = (shape: readonly (readonly [number, number])[]) => {
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return cells.size === (maxX - minX + 1) * (maxY - minY + 1)
    && Array.from({ length: maxX - minX + 1 }, (_, dx) => Array.from({ length: maxY - minY + 1 }, (_, dy) => cells.has(`${minX + dx},${minY + dy}`))).flat().every(Boolean);
};

describe('isolated formal league candidates', () => {
  it('keeps only the five independently accepted rows and their 1–3 late rectangular score blocks', () => {
    expect(FORMAL_LEAGUE_CANDIDATES.map(entry => entry.index)).toEqual([7, 9, 12, 71, 81]);
    for (const entry of FORMAL_LEAGUE_CANDIDATES) {
      expect(entry.specials.length).toBeGreaterThanOrEqual(1);
      expect(entry.specials.length).toBeLessThanOrEqual(3);
      const blocks = new Map(entry.level.blocks.map(block => [block.id, block]));
      for (const id of entry.specials) expect(filledRectangle(blocks.get(id)!.shape)).toBe(true);
      for (const evidence of entry.specialEvidence) {
        expect(evidence.lateClear).toBe(true);
        expect(evidence.completeClearVerified ?? true).toBe(true);
      }
    }
  });
});
